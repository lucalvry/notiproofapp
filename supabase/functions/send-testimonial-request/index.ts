// Authenticated endpoint: sends the testimonial-request email for an existing
// testimonial_requests row, using the business's saved Email Settings template.
// Email delivery: Brevo Transactional Email API (https://api.brevo.com/v3/smtp/email).
// Requires BREVO_API_KEY secret. Sender address must be verified in Brevo.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@notiproof.com";
const SENDER_NAME_FALLBACK = Deno.env.get("BREVO_SENDER_NAME") ?? "NotiProof";
const APP_URL = Deno.env.get("APP_URL");
const FALLBACK_APP_URL = "https://notiproof.com";
const PREVIEW_HOST_SUFFIXES = ["lovableproject.com", "lovable.app", "lovable.dev"];

function isPreviewOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return PREVIEW_HOST_SUFFIXES.some((s) => host === s || host.endsWith("." + s));
  } catch {
    return true;
  }
}

function resolveAppOrigin(requestOrigin: unknown): string {
  if (APP_URL && /^https?:\/\//.test(APP_URL)) {
    return APP_URL.replace(/\/+$/, "");
  }
  if (typeof requestOrigin === "string" && /^https?:\/\//.test(requestOrigin) && !isPreviewOrigin(requestOrigin)) {
    return requestOrigin.replace(/\/+$/, "");
  }
  return FALLBACK_APP_URL;
}

const admin = createClient(SERVICE_URL, SERVICE_KEY);

const DEFAULT_SUBJECT = "We'd love to hear about your experience";
const DEFAULT_BODY =
  "Hi {{name}},\n\nThanks for choosing us! Could you take 60 seconds to share a quick testimonial?\n\n{{link}}\n\nThank you,\nThe team";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(SERVICE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const { request_id, app_origin } = await req.json().catch(() => ({}));
    if (!request_id || !uuidSchema.safeParse(request_id).success) {
      return json({ error: "request_id required" }, 400);
    }

    // Load the request and verify the caller belongs to that business
    const { data: tr, error: trErr } = await admin
      .from("testimonial_requests")
      .select("id, business_id, recipient_email, recipient_name, token, status")
      .eq("id", request_id)
      .maybeSingle();
    if (trErr || !tr) return json({ error: "request not found" }, 404);

    const rl = await rateLimit({ key: `send:${tr.business_id}`, max: 100, windowSec: 3600 });
    if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

    const { data: membership } = await admin
      .from("business_users")
      .select("role")
      .eq("business_id", tr.business_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) return json({ error: "forbidden" }, 403);

    // Load business + email template
    const { data: biz } = await admin
      .from("businesses")
      .select("name, settings")
      .eq("id", tr.business_id)
      .maybeSingle();
    const settings = (biz?.settings as Record<string, any> | null) ?? {};
    const tpl = settings.email_template ?? {};
    const subject = (tpl.subject as string) || DEFAULT_SUBJECT;
    const bodyTpl = (tpl.body as string) || DEFAULT_BODY;

    const origin = resolveAppOrigin(app_origin);
    const link = `${origin}/collect/${tr.token}`;
    const vars = {
      name: tr.recipient_name ?? "there",
      link,
      business_name: biz?.name ?? "",
    };
    const renderedSubject = renderTemplate(subject, vars);
    const renderedBody = renderTemplate(bodyTpl, vars);
    const htmlBody = escapeHtml(renderedBody)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#FF6B4A">$1</a>')
      .replace(/\n/g, "<br>");

    if (!BREVO_API_KEY) {
      return json({ error: "BREVO_API_KEY is not configured" }, 500);
    }

    const senderName = biz?.name?.trim() || SENDER_NAME_FALLBACK;

    const brevoResp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        "accept": "application/json",
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: senderName },
        to: [{ email: tr.recipient_email, name: tr.recipient_name ?? undefined }],
        subject: renderedSubject,
        htmlContent: `<div style="font-family:system-ui,sans-serif;color:#1a1a1a;font-size:15px;line-height:1.6">${htmlBody}<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eaeaea;font-size:13px;color:#666"><a href="https://notiproof.com/watch/customer" style="color:#FF6B4A;text-decoration:none">▶ Not sure what to say? Watch this 60-second guide</a></div></div>`,
        textContent: renderedBody,
      }),
    });

    if (!brevoResp.ok) {
      const errText = await brevoResp.text();
      console.error("Brevo error", brevoResp.status, errText);
      let parsed: any = null;
      try { parsed = JSON.parse(errText); } catch { /* keep raw */ }
      const message = parsed?.message || parsed?.code || errText || `HTTP ${brevoResp.status}`;
      return json({ error: `Brevo: ${message}`, status: brevoResp.status }, 502);
    }

    await admin
      .from("testimonial_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", tr.id);

    return json({ ok: true });
  } catch (e) {
    console.error("send-testimonial-request error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
