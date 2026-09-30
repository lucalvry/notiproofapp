// Buffer OAuth callback: exchanges code for an access token, fetches the
// Buffer account profile, and writes credentials into publishing_channels.
// Mirrors oauth-shopify-callback.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUFFER_CLIENT_ID = Deno.env.get("BUFFER_CLIENT_ID");
const BUFFER_CLIENT_SECRET = Deno.env.get("BUFFER_CLIENT_SECRET");

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;padding:32px;text-align:center"><h2>${body}</h2><p>You can close this window.</p><script>window.opener&&window.opener.postMessage({type:"buffer-oauth"},"*");setTimeout(()=>window.close(),1500)</script></body></html>`,
    { status, headers: { "Content-Type": "text/html" } },
  );
}

Deno.serve(async (req) => {
  if (!BUFFER_CLIENT_ID || !BUFFER_CLIENT_SECRET) return html("Buffer not configured", 500);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) return html("Missing OAuth parameters", 400);

  let state: { channel_id: string; business_id: string };
  try { state = JSON.parse(atob(stateRaw)); } catch { return html("Invalid state", 400); }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-buffer-callback`;
  const form = new URLSearchParams({
    client_id: BUFFER_CLIENT_ID,
    client_secret: BUFFER_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://api.bufferapp.com/1/oauth2/token.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("Buffer token exchange failed", tokenRes.status, t);
    return html("Token exchange failed", 502);
  }
  const tokenData = await tokenRes.json() as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  // Fetch profile for label / external account id.
  let externalId: string | null = null;
  let label: string | null = null;
  try {
    const userRes = await fetch(`https://api.bufferapp.com/1/user.json?access_token=${tokenData.access_token}`);
    if (userRes.ok) {
      const u = await userRes.json();
      externalId = u?.id ?? u?._id ?? null;
      label = u?.name ?? u?.email ?? "Buffer account";
    } else {
      await userRes.text();
    }
  } catch (e) {
    console.warn("Buffer user lookup failed", e);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const credsObj = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? null,
  };
  const update: Record<string, unknown> = {
    status: "active",
    account_label: label ?? "Buffer",
    external_account_id: externalId,
    token_expires_at: tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null,
    last_used_at: new Date().toISOString(),
    config: { connected_at: new Date().toISOString() },
  };
  if (piiEncryptionEnabled) {
    update.credentials_encrypted = await encryptJson(credsObj);
  } else {
    // Fall back to encrypted-null + stash in config for dev only.
    update.credentials_encrypted = await encryptJson(credsObj).catch(() => null);
  }

  const { error } = await admin
    .from("publishing_channels")
    .update(update)
    .eq("id", state.channel_id)
    .eq("business_id", state.business_id);

  if (error) {
    console.error("Failed to save buffer channel", error);
    return html("Failed to save channel", 500);
  }

  return html("Buffer connected ✓");
});