// Public endpoint: one-click unsubscribe link used in lifecycle/win-back
// emails. Idempotent insert into email_unsubscribes + a friendly HTML page.
// verify_jwt = false (see supabase/config.toml) — anyone with the link (and
// a valid token) can unsubscribe their own address, no auth required.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verifyUnsubscribeToken } from '../_shared/unsubscribe.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/></head>
  <body style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;margin:0;padding:48px 24px;color:#0F172A">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0;text-align:center">
      <h1 style="font-size:20px;margin-top:0">${escapeHtml(title)}</h1>
      <p style="font-size:15px;color:#475569;line-height:1.6">${body}</p>
    </div>
  </body></html>`;
  return new Response(html, { status, headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const token = url.searchParams.get('t');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return page('Invalid link', 'This unsubscribe link is missing a valid email address.', 400);
  }

  const ok = await verifyUnsubscribeToken(email, token);
  if (!ok) {
    return page('Invalid link', 'This unsubscribe link could not be verified.', 400);
  }

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await admin.from('email_unsubscribes').upsert({ email }, { onConflict: 'email' });
    return page("You're unsubscribed", `${escapeHtml(email)} will no longer receive lifecycle emails from NotiProof. You'll still get essential account and billing emails.`);
  } catch (e) {
    console.error('unsubscribe error:', e);
    return page('Something went wrong', 'Please try again later or contact support.', 500);
  }
});
