// Secure credential management for integrations.
// - Caller must be authenticated and an owner/editor of the business that
//   owns the integration (or platform admin).
// - On GET-style requests we return a masked summary only (never the raw
//   secret), so the UI can show "Connected · ••••1234" without exposing the
//   token to the browser.
// - On set/delete we update credentials with the service role.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";
import { encryptJson, decryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Authentication required" }, 401);
    const userId = userData.user.id;

    const rl = await rateLimit({ key: `intcred:${userId}`, max: 20, windowSec: 60 });
    if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;
    const integrationId = body?.integration_id as string | undefined;
    if (!action || typeof action !== "string" || action.length > 64) return json({ error: "Missing or invalid action" }, 400);
    if (!integrationId || !uuidSchema.safeParse(integrationId).success) return json({ error: "Missing or invalid integration_id" }, 400);

    const { data: integ } = await admin
      .from("integrations")
      .select("id, business_id, provider, credentials, credentials_encrypted, status")
      .eq("id", integrationId)
      .maybeSingle();
    if (!integ) return json({ error: "Integration not found" }, 404);

    // Authorization: owner/editor of business or platform admin
    const [{ data: profile }, { data: membership }] = await Promise.all([
      admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
      admin
        .from("business_users")
        .select("role")
        .eq("business_id", integ.business_id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const role = membership?.role;
    const allowed = profile?.is_admin || role === "owner" || role === "editor";
    if (!allowed) return json({ error: "Not allowed" }, 403);

    // Resolve current credentials: prefer encrypted, fall back to plaintext jsonb.
    let creds: Record<string, string | undefined> = {};
    if (piiEncryptionEnabled && integ.credentials_encrypted) {
      const decoded = await decryptJson<Record<string, string | undefined>>(
        integ.credentials_encrypted as unknown as string,
      );
      creds = decoded ?? {};
    } else {
      creds = (integ.credentials ?? {}) as Record<string, string | undefined>;
    }

    const integBusinessId = integ.business_id;
    const integRowId = integ.id;
    async function persistCreds(next: Record<string, string | undefined>, status: string) {
      const update: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (piiEncryptionEnabled) {
        update.credentials_encrypted = await encryptJson(next);
        update.credentials = {}; // clear plaintext
      } else {
        update.credentials = next;
      }
      const { error: upErr } = await admin.from("integrations").update(update).eq("id", integrationId);
      if (upErr) throw new Error(upErr.message);
      await admin.from("pii_encryption_audit").insert({
        actor_user_id: userId,
        business_id: integBusinessId,
        resource_table: "integrations",
        resource_id: integRowId,
        action: status === "disconnected" ? "clear" : "encrypt",
        context: { field: "credentials" },
      });
    }

    if (action === "summary") {
      return json({
        ok: true,
        has_token: !!creds.access_token,
        masked_token: maskSecret(creds.access_token ?? null),
        provider: integ.provider,
        status: integ.status,
        encrypted: piiEncryptionEnabled && !!integ.credentials_encrypted,
      });
    }

    if (action === "set") {
      const accessToken = body?.access_token;
      if (typeof accessToken !== "string" || accessToken.trim().length < 4) {
        return json({ error: "Provide a valid access token" }, 400);
      }
      const next = { ...creds, access_token: accessToken.trim() };
      try {
        await persistCreds(next, "connected");
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Update failed" }, 500);
      }
      return json({ ok: true, masked_token: maskSecret(accessToken) });
    }

    if (action === "clear") {
      const next = { ...creds };
      delete next.access_token;
      try {
        await persistCreds(next, "disconnected");
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Update failed" }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
