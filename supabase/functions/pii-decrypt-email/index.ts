// On-demand PII decrypt for the UI.
// Pages call this when they need to display or send to a customer email.
// Authorization: caller must be a member of the proof's business (or platform admin).
// Every call is logged to pii_encryption_audit.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";
import { decryptString, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

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

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return "••••";
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!piiEncryptionEnabled) return json({ error: "PII_ENCRYPTION_KEY not configured" }, 500);

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

    const rl = await rateLimit({ key: `piidec:${userId}`, max: 60, windowSec: 60 });
    if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

    const body = await req.json().catch(() => ({}));
    const proofId = body?.proof_id as string | undefined;
    const mode = (body?.mode as string | undefined) ?? "masked"; // "masked" | "full"
    if (!proofId || !uuidSchema.safeParse(proofId).success) return json({ error: "Invalid proof_id" }, 400);

    // Fetch the proof + check membership
    const { data: proof, error: proofErr } = await admin
      .from("proof_objects")
      .select("id, business_id, author_email, author_email_encrypted")
      .eq("id", proofId)
      .maybeSingle();
    if (proofErr) return json({ error: proofErr.message }, 500);
    if (!proof) return json({ error: "Not found" }, 404);

    const [{ data: profile }, { data: membership }] = await Promise.all([
      admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
      admin.from("business_users").select("role").eq("business_id", proof.business_id).eq("user_id", userId).maybeSingle(),
    ]);
    const allowed = profile?.is_admin || membership?.role === "owner" || membership?.role === "editor" || membership?.role === "viewer";
    if (!allowed) return json({ error: "Not allowed" }, 403);

    // Prefer encrypted; fall back to plaintext (for not-yet-backfilled rows)
    let plaintext: string | null = null;
    let source: "encrypted" | "plaintext" | "none" = "none";
    if (proof.author_email_encrypted) {
      plaintext = await decryptString(proof.author_email_encrypted as unknown as string);
      source = "encrypted";
    } else if (proof.author_email) {
      plaintext = proof.author_email as string;
      source = "plaintext";
    }

    // Audit
    await admin.from("pii_encryption_audit").insert({
      actor_user_id: userId,
      business_id: proof.business_id,
      resource_table: "proof_objects",
      resource_id: proof.id,
      action: "decrypt",
      context: { mode, source, has_value: !!plaintext },
    });

    return json({
      ok: true,
      email: mode === "full" ? plaintext : maskEmail(plaintext),
      has_email: !!plaintext,
      source,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
