// Sends a one-off test email so a business owner can preview their template
// in their inbox. Uses the saved business templates (initial or reminder)
// and renders with sample data, then sends via Brevo to the caller's
// authenticated email address only.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@notiproof.com";
const SENDER_NAME_FALLBACK = Deno.env.get("BREVO_SENDER_NAME") ?? "NotiProof";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderTpl(t: string, vars: Record<string, string>) {
  return t.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!BREVO_API_KEY) return json({ error: "BREVO_API_KEY not set" }, 500);

  // Authenticate caller
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user?.email) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const business_id = String(body?.business_id ?? "");
  const template = body?.template === "reminder" ? "reminder" : "initial";
  if (!business_id) return json({ error: "business_id required" }, 400);

  // Verify caller is a member of the business
  const { data: membership } = await userClient
    .from("business_users").select("role").eq("business_id", business_id).maybeSingle();
  if (!membership) return json({ error: "Forbidden" }, 403);

  const { data: biz } = await admin
    .from("businesses").select("name, settings").eq("id", business_id).maybeSingle();
  if (!biz) return json({ error: "Business not found" }, 404);

  const settings = (biz.settings as Record<string, any>) ?? {};
  const tplBlock = (settings.email_templates ?? {}) as Record<string, { subject: string; body: string }>;
  const tpl = tplBlock[template] ?? (template === "initial"
    ? { subject: "We'd love to hear about your experience, {{customer_name}}",
        body: "Hi {{customer_name}},\n\nThanks for choosing {{business_name}}!\n\n{{link}}\n\nThank you,\nThe {{business_name}} team" }
    : { subject: "Quick reminder — your testimonial for {{business_name}}",
        body: "Hi {{customer_name}},\n\nJust a friendly nudge.\n\n{{link}}\n\nThank you" });

  const vars = {
    customer_name: userData.user.user_metadata?.full_name?.split(" ")[0] ?? "there",
    business_name: biz.name,
    product_name: "your purchase",
    link: "https://app.notiproof.com/collect/sample-token",
  };
  const subject = `[TEST] ${renderTpl(tpl.subject, vars)}`;
  const rendered = renderTpl(tpl.body, vars);
  const htmlBody = escapeHtml(rendered)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#FF6B4A">$1</a>')
    .replace(/\n/g, "<br>");

  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: biz.name?.trim() || SENDER_NAME_FALLBACK },
        to: [{ email: userData.user.email }],
        subject,
        htmlContent:
          `<div style="font-family:system-ui,sans-serif;color:#1a1a1a;font-size:15px;line-height:1.6">` +
          `<div style="background:#FFF7ED;border-left:3px solid #FF6B4A;padding:8px 12px;margin-bottom:16px;font-size:13px;color:#9A3412">` +
          `This is a TEST preview of your <b>${template}</b> template. Sample data was used.` +
          `</div>${htmlBody}</div>`,
        textContent: `[TEST PREVIEW]\n\n${rendered}`,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      return json({ error: `Brevo error: ${resp.status} ${txt}` }, 502);
    }
    return json({ ok: true, sent_to: userData.user.email });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
