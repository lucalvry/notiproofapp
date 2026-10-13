// Cron-driven reminder sender for un-responded testimonial requests.
//
// Selects testimonial_requests where:
//   - status in ('scheduled','sent','opened')
//   - reminder_sent_at IS NULL
//   - sent_at < now() - 3 days
//   - expires_at > now() + 2 days
// Sends the per-business `reminder` email template via Resend and marks
// reminder_sent_at = now(). Limit 200 per run.
import { createClient } from "npm:@supabase/supabase-js@2";
import { emailConfigured, sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = (Deno.env.get("APP_URL") ?? "https://app.notiproof.xyz").replace(/\/+$/, "");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

const DEFAULT_REMINDER = {
  subject: "Quick reminder — your testimonial for {{business_name}}",
  body:
    "Hi {{customer_name}},\n\nJust a friendly nudge — we'd still love to hear about your experience with {{business_name}}. It only takes a minute:\n\n{{link}}\n\nThank you,\nThe {{business_name}} team",
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!emailConfigured()) return json({ error: "RESEND_API_KEY not set" }, 500);

  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await admin
    .from("testimonial_requests")
    .select("id, business_id, recipient_email, recipient_name, token, status, sent_at")
    .in("status", ["scheduled", "sent", "opened"])
    .is("reminder_sent_at", null)
    .lt("sent_at", threeDaysAgo)
    .gt("expires_at", twoDaysAhead)
    .limit(200);

  if (error) return json({ error: error.message }, 500);
  if (!rows || rows.length === 0) return json({ ok: true, sent: 0 });

  // Pre-load businesses for templating (in one query).
  const businessIds = Array.from(new Set(rows.map((r) => r.business_id)));
  const { data: bizRows } = await admin
    .from("businesses")
    .select("id, name, settings")
    .in("id", businessIds);
  const bizMap = new Map<string, { name: string; settings: Record<string, any> }>();
  for (const b of bizRows ?? []) {
    bizMap.set(b.id, { name: b.name, settings: (b.settings as any) ?? {} });
  }

  let sent = 0;
  let failed = 0;
  for (const r of rows) {
    const biz = bizMap.get(r.business_id);
    const tpl =
      biz?.settings?.email_templates?.reminder ?? DEFAULT_REMINDER;
    const subject = (tpl.subject as string) || DEFAULT_REMINDER.subject;
    const bodyTpl = (tpl.body as string) || DEFAULT_REMINDER.body;
    const link = `${APP_URL}/collect/${r.token}`;
    const vars = {
      customer_name: r.recipient_name ?? "there",
      business_name: biz?.name ?? "",
      product_name: "",
      link,
    };
    const renderedSubject = renderTemplate(subject, vars);
    const renderedBody = renderTemplate(bodyTpl, vars);
    const htmlBody = escapeHtml(renderedBody)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#FF6B4A">$1</a>')
      .replace(/\n/g, "<br>");

    try {
      const resp = await sendEmail({
        to: { email: r.recipient_email, name: r.recipient_name },
        subject: renderedSubject,
        fromName: biz?.name,
        html: `<div style="font-family:system-ui,sans-serif;color:#1a1a1a;font-size:15px;line-height:1.6">${htmlBody}<div style="margin-top:24px;padding-top:16px;border-top:1px solid #eaeaea;font-size:13px;color:#666"><a href="https://app.notiproof.xyz/watch/customer" style="color:#FF6B4A;text-decoration:none">▶ Not sure what to say? Watch this 60-second guide</a></div></div>`,
        text: renderedBody,
      });
      if (!resp.ok) {
        failed++;
        console.error("reminder failed", r.id, resp.error);
        continue;
      }
      await admin
        .from("testimonial_requests")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      sent++;
    } catch (e) {
      failed++;
      console.error("reminder exception", r.id, e);
    }
  }

  return json({ ok: true, sent, failed, considered: rows.length });
});