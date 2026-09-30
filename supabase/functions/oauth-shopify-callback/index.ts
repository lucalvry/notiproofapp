// Shopify OAuth callback: exchanges code for access token and saves credentials.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHOPIFY_CLIENT_ID = Deno.env.get("SHOPIFY_CLIENT_ID");
const SHOPIFY_CLIENT_SECRET = Deno.env.get("SHOPIFY_CLIENT_SECRET");

function html(body: string, status = 200) {
  return new Response(`<!doctype html><html><body style="font-family:system-ui;padding:32px;text-align:center"><h2>${body}</h2><p>You can close this window.</p><script>window.opener&&window.opener.postMessage({type:"shopify-oauth"},"*");setTimeout(()=>window.close(),1500)</script></body></html>`, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

Deno.serve(async (req) => {
  if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) return html("Shopify not configured", 500);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");
  if (!code || !stateRaw || !shop) return html("Missing OAuth parameters", 400);

  let state: { integration_id: string; shop: string };
  try { state = JSON.parse(atob(stateRaw)); } catch { return html("Invalid state", 400); }
  if (state.shop !== shop) return html("Shop mismatch", 400);

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    }),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text();
    console.error("Shopify token exchange failed", tokenRes.status, t);
    return html("Token exchange failed", 502);
  }
  const tokenData = await tokenRes.json();

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const credsObj = { access_token: tokenData.access_token, scope: tokenData.scope };
  const update: Record<string, unknown> = {
    status: "connected",
    config: { shop, display_name: shop.replace(".myshopify.com", "") },
    last_sync_at: new Date().toISOString(),
  };
  if (piiEncryptionEnabled) {
    update.credentials_encrypted = await encryptJson(credsObj);
    update.credentials = {};
  } else {
    update.credentials = credsObj;
  }
  const { error } = await supabase.from("integrations").update(update).eq("id", state.integration_id);

  if (error) {
    console.error("Failed to save integration", error);
    return html("Failed to save integration", 500);
  }

  return html("Shopify connected ✓");
});
