// Encrypt + store API credentials for a publishing_channels row.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptJson, decryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Authentication required" }, 401);
  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: auth } } });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: u, error: uErr } = await authed.auth.getUser();
  if (uErr || !u.user) return json({ error: "Authentication required" }, 401);
  const userId = u.user.id;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as string | undefined;
  const channelId = body?.channel_id as string | undefined;
  if (!action || !channelId) return json({ error: "Missing action or channel_id" }, 400);

  const { data: ch } = await admin
    .from("publishing_channels")
    .select("id, business_id, credentials_encrypted")
    .eq("id", channelId)
    .maybeSingle();
  if (!ch) return json({ error: "Channel not found" }, 404);

  // Membership: owner/editor or admin
  const [{ data: profile }, { data: mem }] = await Promise.all([
    admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
    admin.from("business_users").select("role").eq("business_id", ch.business_id).eq("user_id", userId).maybeSingle(),
  ]);
  const role = mem?.role;
  if (!profile?.is_admin && role !== "owner" && role !== "editor") return json({ error: "Not allowed" }, 403);

  if (!piiEncryptionEnabled) return json({ error: "Encryption not configured" }, 500);

  if (action === "set") {
    const next = {
      api_key: body?.api_key,
      api_secret: body?.api_secret,
      access_token: body?.access_token,
      from_email: body?.from_email,
      author_urn: body?.author_urn,
    };
    const enc = await encryptJson(next);
    const { error } = await admin
      .from("publishing_channels")
      .update({ credentials_encrypted: enc, status: "active", updated_at: new Date().toISOString() })
      .eq("id", channelId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "clear") {
    const { error } = await admin
      .from("publishing_channels")
      .update({ credentials_encrypted: null, status: "disconnected" })
      .eq("id", channelId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "test") {
    const { data: full } = await admin
      .from("publishing_channels")
      .select("provider, config, credentials_encrypted")
      .eq("id", channelId)
      .maybeSingle();
    if (!full?.credentials_encrypted) return json({ ok: false, error: "No credentials stored" }, 400);
    let creds: Record<string, string | undefined> = {};
    try { creds = await decryptJson(full.credentials_encrypted as any); } catch {
      return json({ ok: false, error: "Could not decrypt credentials" }, 500);
    }
    try {
      const result = await testProvider(full.provider as string, creds, (full.config as any) ?? {});
      await admin.from("publishing_channels").update({ status: "active", updated_at: new Date().toISOString() }).eq("id", channelId);
      return json({ ok: true, ...result });
    } catch (e) {
      await admin.from("publishing_channels").update({ status: "error" }).eq("id", channelId);
      return json({ ok: false, error: (e as Error).message }, 200);
    }
  }

  return json({ error: "Unknown action" }, 400);
});

async function testProvider(provider: string, creds: Record<string, string | undefined>, _cfg: Record<string, unknown>) {
  switch (provider) {
    case "mailchimp": {
      const apiKey = creds.api_key;
      if (!apiKey) throw new Error("API key missing");
      const dc = apiKey.split("-")[1];
      if (!dc) throw new Error("Invalid Mailchimp key (no datacenter)");
      const r = await fetch(`https://${dc}.api.mailchimp.com/3.0/ping`, {
        headers: { Authorization: "Basic " + btoa(`anystring:${apiKey}`) },
      });
      if (!r.ok) throw new Error(`Mailchimp ${r.status}`);
      return { detail: "Ping OK" };
    }
    case "klaviyo": {
      if (!creds.api_key) throw new Error("API key missing");
      const r = await fetch("https://a.klaviyo.com/api/accounts/", {
        headers: { Authorization: `Klaviyo-API-Key ${creds.api_key}`, revision: "2024-10-15" },
      });
      if (!r.ok) throw new Error(`Klaviyo ${r.status}`);
      return { detail: "Account reachable" };
    }
    case "convertkit": {
      const secret = creds.api_secret ?? creds.api_key;
      if (!secret) throw new Error("API secret missing");
      const r = await fetch(`https://api.convertkit.com/v3/account?api_secret=${encodeURIComponent(secret)}`);
      if (!r.ok) throw new Error(`ConvertKit ${r.status}`);
      return { detail: "Account reachable" };
    }
    case "buffer": {
      if (!creds.access_token) throw new Error("Access token missing");
      const r = await fetch(`https://api.bufferapp.com/1/user.json?access_token=${encodeURIComponent(creds.access_token)}`);
      if (!r.ok) throw new Error(`Buffer ${r.status}`);
      return { detail: "Token valid" };
    }
    default:
      return { detail: "No automated test for this provider" };
  }
}
