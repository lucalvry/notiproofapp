// EF-04: pg_cron-driven sender for scheduled testimonial requests + reminders via Brevo
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function renderEmail(opts: {
  isReminder: boolean;
  business: any;
  request: any;
  collectionUrl: string;
  campaign?: any;
}): { subject: string; html: string; text: string } {
  const { isReminder, business, request, collectionUrl, campaign } = opts;
  const brand = business?.brand_color || '#0F172A';
  const logo = business?.logo_url ? `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business?.name || '')}" style="max-height:40px;margin-bottom:16px"/>` : '';
  const customSubject = campaign?.request_config?.subject || request.custom_message;
  const subjectBase = customSubject || `${business?.name || 'We'} would love your feedback`;
  const subject = isReminder ? `Reminder: ${subjectBase}` : subjectBase;
  const greeting = request.recipient_name ? `Hi ${escapeHtml(request.recipient_name)},` : 'Hi there,';
  const bodyIntro = isReminder
    ? `Just a friendly nudge — we'd still love to hear from you.`
    : `Thank you for being a customer of ${escapeHtml(business?.name || 'our business')}. Would you take 60 seconds to share your experience?`;
  const promptList = Array.isArray(request.prompt_questions) && request.prompt_questions.length
    ? `<ul>${request.prompt_questions.map((p: string) => `<li>${escapeHtml(p)}</li>`).join('')}</ul>`
    : '';

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0F172A;background:#F8FAFC;margin:0;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0">
      ${logo}
      <p style="font-size:16px">${greeting}</p>
      <p style="font-size:15px;line-height:1.6">${bodyIntro}</p>
      ${promptList}
      <p style="margin:28px 0">
        <a href="${escapeHtml(collectionUrl)}" style="background:${escapeHtml(brand)};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">Share my feedback</a>
      </p>
      <p style="font-size:13px;color:#64748B">Or paste this link into your browser:<br/><a href="${escapeHtml(collectionUrl)}" style="color:${escapeHtml(brand)}">${escapeHtml(collectionUrl)}</a></p>
    </div>
  </body></html>`;
  const text = `${greeting}\n\n${bodyIntro}\n\nShare your feedback: ${collectionUrl}`;
  return { subject, html, text };
}

async function sendBrevo(apiKey: string, fromEmail: string, fromName: string, to: { email: string; name?: string }, subject: string, html: string, text: string) {
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [to],
      subject, htmlContent: html, textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const provided = req.headers.get('x-internal-secret');
    const expected = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = Deno.env.get('BREVO_API_KEY');
    if (!apiKey) throw new Error('BREVO_API_KEY not configured');

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
    const fromEmail = Deno.env.get('FROM_EMAIL') || 'noreply@notiproof.app';
    const fromName = Deno.env.get('FROM_NAME') || 'NotiProof';

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const nowIso = new Date().toISOString();
    let sent = 0, reminded = 0, failed = 0;
    const errors: any[] = [];

    // ----- Pass 1: send scheduled
    const { data: dueRequests } = await admin
      .from('testimonial_requests')
      .select('*')
      .eq('status', 'scheduled')
      .lte('send_at', nowIso)
      .gt('expires_at', nowIso)
      .lt('attempts', 3)
      .limit(100);

    for (const r of dueRequests || []) {
      try {
        const [{ data: biz }, { data: campaign }] = await Promise.all([
          admin.from('businesses').select('name, logo_url, brand_color').eq('id', r.business_id).maybeSingle(),
          r.campaign_id
            ? admin.from('campaigns').select('request_config').eq('id', r.campaign_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);
        const collectionUrl = `${appUrl}/c/${r.token}`;
        const { subject, html, text } = renderEmail({ isReminder: false, business: biz, request: r, collectionUrl, campaign });
        await sendBrevo(apiKey, fromEmail, fromName, { email: r.recipient_email, name: r.recipient_name || undefined }, subject, html, text);
        await admin.from('testimonial_requests').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', r.id);
        sent++;
      } catch (e: any) {
        failed++;
        errors.push({ id: r.id, error: String(e?.message || e) });
        await admin.from('testimonial_requests').update({ attempts: (r.attempts || 0) + 1 }).eq('id', r.id);
      }
    }

    // ----- Pass 2: reminders
    const { data: dueReminders } = await admin
      .from('testimonial_requests')
      .select('*')
      .eq('status', 'sent')
      .eq('reminder_enabled', true)
      .is('responded_at', null)
      .is('reminder_sent_at', null)
      .gt('expires_at', nowIso)
      .limit(100);

    for (const r of dueReminders || []) {
      const sentAt = r.sent_at ? new Date(r.sent_at).getTime() : 0;
      const dueAt = sentAt + (Number(r.reminder_delay_days || 5) * 86400000);
      if (Date.now() < dueAt) continue;
      try {
        const [{ data: biz }, { data: campaign }] = await Promise.all([
          admin.from('businesses').select('name, logo_url, brand_color').eq('id', r.business_id).maybeSingle(),
          r.campaign_id
            ? admin.from('campaigns').select('request_config').eq('id', r.campaign_id).maybeSingle()
            : Promise.resolve({ data: null } as any),
        ]);
        const collectionUrl = `${appUrl}/c/${r.token}`;
        const { subject, html, text } = renderEmail({ isReminder: true, business: biz, request: r, collectionUrl, campaign });
        await sendBrevo(apiKey, fromEmail, fromName, { email: r.recipient_email, name: r.recipient_name || undefined }, subject, html, text);
        await admin.from('testimonial_requests').update({ reminder_sent_at: new Date().toISOString() }).eq('id', r.id);
        reminded++;
      } catch (e: any) {
        failed++;
        errors.push({ id: r.id, kind: 'reminder', error: String(e?.message || e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, reminded, failed, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('scheduled-email-sender error:', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
