// EF: pg_cron-driven daily recheck of widget installs. Flips
// businesses.install_verified back to false when no widget_events have
// been seen recently, and emails the business owner(s) to let them know.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { emailConfigured, sendEmail } from '../_shared/email.ts';

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function renderEmail(opts: { business: any; widgetsUrl: string }) {
  const { business, widgetsUrl } = opts;
  const brand = business?.brand_color || '#0F172A';
  const logo = business?.logo_url
    ? `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business?.name || '')}" style="max-height:40px;margin-bottom:16px"/>`
    : '';
  const subject = "We can't detect the NotiProof script on your site";
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0F172A;background:#F8FAFC;margin:0;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0">
      ${logo}
      <p style="font-size:16px">Hi there,</p>
      <p style="font-size:15px;line-height:1.6">We haven't seen your NotiProof widget fire on <strong>${escapeHtml(business?.name || 'your site')}</strong> in a couple of days, so we've marked it as not installed.</p>
      <p style="font-size:15px;line-height:1.6">If you removed the script on purpose, you can ignore this. Otherwise, check that the embed snippet is still on your site.</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(widgetsUrl)}" style="background:${escapeHtml(brand)};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">Check my widgets</a>
      </p>
      <p style="font-size:13px;color:#64748B">Or paste this link into your browser:<br/><a href="${escapeHtml(widgetsUrl)}" style="color:${escapeHtml(brand)}">${escapeHtml(widgetsUrl)}</a></p>
    </div>
  </body></html>`;
  const text = `We haven't seen your NotiProof widget fire on ${business?.name || 'your site'} recently, so we've marked it as not installed.\n\nCheck your widgets: ${widgetsUrl}`;
  return { subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const provided = req.headers.get('x-internal-secret');
    const expected = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://app.notiproof.xyz').replace(/\/$/, '');
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // Businesses with at least one active widget whose install looks stale.
    const { data: activeWidgets } = await admin
      .from('widgets')
      .select('business_id')
      .eq('status', 'active');
    const candidateBusinessIds = Array.from(new Set((activeWidgets || []).map((w: any) => w.business_id)));
    if (candidateBusinessIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, flagged: 0, emailed: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: staleBusinesses } = await admin
      .from('businesses')
      .select('id, name, logo_url, brand_color, widget_last_seen_at, install_verified')
      .in('id', candidateBusinessIds)
      .or(`widget_last_seen_at.is.null,widget_last_seen_at.lt.${cutoff}`);

    let flagged = 0, emailed = 0, failed = 0;
    const errors: any[] = [];
    const canEmail = emailConfigured();

    for (const biz of staleBusinesses || []) {
      if (biz.install_verified) {
        await admin.from('businesses').update({ install_verified: false }).eq('id', biz.id);
      }
      flagged++;

      if (!canEmail) continue;

      try {
        const { data: owners } = await admin
          .from('business_users')
          .select('user_id, users(email, full_name)')
          .eq('business_id', biz.id)
          .eq('role', 'owner');

        const widgetsUrl = `${appUrl}/widgets`;
        const { subject, html, text } = renderEmail({ business: biz, widgetsUrl });

        for (const owner of owners || []) {
          const user = (owner as any).users;
          const email = user?.email;
          if (!email) continue;

          const { data: unsub } = await admin.from('email_unsubscribes').select('email').eq('email', email).maybeSingle();
          if (unsub) continue;

          const r = await sendEmail({ to: { email, name: user?.full_name }, subject, html, text, fromName: biz.name });
          if (!r.ok) throw new Error(r.error);

          await admin.from('email_sends').insert({
            business_id: biz.id,
            user_id: owner.user_id,
            email,
            template: 'install_not_detected',
            meta: { widgets_url: widgetsUrl },
          });
          emailed++;
        }
      } catch (e: any) {
        failed++;
        errors.push({ business_id: biz.id, error: String(e?.message || e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, flagged, emailed, failed, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('install-recheck error:', e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
