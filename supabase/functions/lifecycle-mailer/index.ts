// EF: pg_cron-driven lifecycle + win-back emails (welcome, setup nudges,
// first-proof-live celebration, win-back at 14/30/60 days of inactivity).
// Mirrors scheduled-email-sender's shape: service-role client, invoked by
// pg_cron via net.http_post with x-internal-secret.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { emailConfigured, sendEmail } from '../_shared/email.ts';
import { trialEmailDue } from '../_shared/trial.ts';
import { signUnsubscribeToken, unsubscribeUrl } from '../_shared/unsubscribe.ts';

const NOTIPROOF_LOGO_URL = 'https://notiproof.xyz/logo.png';

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

type Template =
  | 'welcome'
  | 'setup_nudge_no_proof'
  | 'setup_nudge_no_widget'
  | 'setup_nudge_not_installed'
  | 'first_proof_live'
  | 'winback_14'
  | 'winback_30'
  | 'winback_60'
  | 'trial_live'
  | 'trial_day2'
  | 'trial_day3'
  | 'trial_paused'
  | 'reactivation_manual';

function renderEmail(template: Template, opts: { business?: any; appUrl: string; unsubUrl: string }) {
  const { business, appUrl, unsubUrl } = opts;
  const brand = business?.brand_color || '#0F172A';
  const bizLogo = business?.logo_url
    ? `<img src="${escapeHtml(business.logo_url)}" alt="${escapeHtml(business?.name || '')}" style="max-height:36px;margin-bottom:16px"/>`
    : `<img src="${NOTIPROOF_LOGO_URL}" alt="NotiProof" style="max-height:28px;margin-bottom:16px"/>`;

  const copy: Record<Template, { subject: string; lead: string; cta: string; href: string }> = {
    welcome: {
      subject: 'Welcome to NotiProof 👋',
      lead: "Thanks for signing up! Add your first widget and we'll have social proof live on your site in minutes.",
      cta: 'Create a widget',
      href: `${appUrl}/widgets/new`,
    },
    setup_nudge_no_proof: {
      subject: "You haven't added any proof yet",
      lead: 'A couple of real testimonials or reviews can make your widgets a lot more convincing. Add your first one now.',
      cta: 'Add proof',
      href: `${appUrl}/proof`,
    },
    setup_nudge_no_widget: {
      subject: "Your proof isn't showing anywhere yet",
      lead: "You're set up, but you don't have a widget yet, so nothing is showing on your site. It only takes a minute.",
      cta: 'Create a widget',
      href: `${appUrl}/widgets/new`,
    },
    setup_nudge_not_installed: {
      subject: "Your widget isn't installed yet",
      lead: "It's been a week and we still can't see your NotiProof script live. Let's get it installed.",
      cta: 'View install instructions',
      href: `${appUrl}/widgets`,
    },
    first_proof_live: {
      subject: 'Your first proof just went live 🎉',
      lead: 'Nice! Your first approved proof is now showing to visitors. Keep adding more to build momentum.',
      cta: 'View your proof',
      href: `${appUrl}/proof`,
    },
    winback_14: {
      subject: "We've missed you",
      lead: "It's been two weeks since you last checked in on NotiProof. Your widgets are still running — come see how they're doing.",
      cta: 'Open dashboard',
      href: `${appUrl}/dashboard`,
    },
    winback_30: {
      subject: 'Still there?',
      lead: "It's been a month since your last visit. Take a look at how your social proof is performing.",
      cta: 'Open dashboard',
      href: `${appUrl}/dashboard`,
    },
    winback_60: {
      subject: 'Is NotiProof still useful to you?',
      lead: "We haven't seen you in two months. If NotiProof isn't a fit anymore that's okay — but if you got busy, your account and data are still here.",
      cta: 'Open dashboard',
      href: `${appUrl}/dashboard`,
    },
    reactivation_manual: {
      subject: 'Your NotiProof account is waiting for you',
      lead: "It's been a while since you logged in. Your proof, widgets and stats are all still here — log back in to see what's new and get your social proof working again.",
      cta: 'Log back in',
      href: `${appUrl}/dashboard`,
    },
    trial_live: {
      subject: 'Congratulations, your proof is live on your site! 🎉',
      lead: "Your NotiProof popup is now showing to real visitors, and your stats have started counting. This is a free trial, so it will only stay live for a short time. Upgrade to keep your proof showing without interruption.",
      cta: 'Keep it running',
      href: `${appUrl}/settings/billing`,
    },
    trial_day2: {
      subject: 'Your free trial is running out',
      lead: "Your proof has been working on your site. Check your dashboard to see how visitors are responding, then upgrade so it keeps running when your trial ends.",
      cta: 'See plans',
      href: `${appUrl}/settings/billing`,
    },
    trial_day3: {
      subject: 'Last day of your free trial',
      lead: "Today is the last day your proof will show on your site for free. Upgrade now so your popup keeps converting visitors without a break.",
      cta: 'Upgrade now',
      href: `${appUrl}/settings/billing`,
    },
    trial_paused: {
      subject: 'Your proof is paused',
      lead: "Your free trial has ended, so your popup is no longer showing on your site. Your proof, widgets and stats are all saved. Upgrade to switch everything back on instantly.",
      cta: 'Upgrade to resume',
      href: `${appUrl}/settings/billing`,
    },
  };

  const c = copy[template];
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#0F172A;background:#F8FAFC;margin:0;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E2E8F0">
      ${bizLogo}
      <p style="font-size:16px">Hi there,</p>
      <p style="font-size:15px;line-height:1.6">${c.lead}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(c.href)}" style="background:${escapeHtml(brand)};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;font-weight:600">${escapeHtml(c.cta)}</a>
      </p>
      <p style="font-size:13px;color:#64748B;margin-top:32px">
        <a href="${escapeHtml(unsubUrl)}" style="color:#94A3B8">Unsubscribe from these emails</a>
      </p>
    </div>
  </body></html>`;
  const text = `${c.lead}\n\n${c.cta}: ${c.href}\n\nUnsubscribe: ${unsubUrl}`;
  return { subject: c.subject, html, text };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const provided = req.headers.get('x-internal-secret');
    const expected = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    let manual: { user_ids: string[]; preview?: boolean } | null = null;
    if (!expected || provided !== expected) {
      // Admin manual reactivation: verify the caller is a platform admin server-side.
      const authHeader = req.headers.get('Authorization') || '';
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
      const { data: isAdmin } = authHeader ? await userClient.rpc('is_platform_admin') : { data: false };
      const body = await req.json().catch(() => ({}));
      if (isAdmin === true && body?.mode === 'reactivation' && Array.isArray(body.user_ids)) {
        manual = { user_ids: body.user_ids.filter((x: unknown) => typeof x === 'string').slice(0, 500), preview: !!body.preview };
      }
    }
    if (!manual && (!expected || provided !== expected)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!emailConfigured()) throw new Error('RESEND_API_KEY not configured');

    const appUrl = (Deno.env.get('APP_URL') || 'https://app.notiproof.xyz').replace(/\/$/, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const sentCounts: Record<string, number> = {};
    let failed = 0;
    const errors: any[] = [];

    const unsubscribed = new Set<string>(
      ((await admin.from('email_unsubscribes').select('email')).data || []).map((r: any) => r.email),
    );

    async function alreadySent(businessId: string | null, userId: string | null, template: string): Promise<boolean> {
      let q = admin.from('email_sends').select('id').eq('template', template).limit(1);
      if (businessId) q = q.eq('business_id', businessId);
      if (userId) q = q.eq('user_id', userId);
      const { data } = await q.maybeSingle();
      return !!data;
    }

    async function getOwners(businessId: string) {
      const { data } = await admin
        .from('business_users')
        .select('user_id, users(email, full_name)')
        .eq('business_id', businessId)
        .eq('role', 'owner');
      return (data || []).filter((o: any) => o.users?.email);
    }

    async function send(
      template: Template,
      businessId: string | null,
      userId: string,
      email: string,
      name: string | null,
      business: any,
    ) {
      if (unsubscribed.has(email)) return;
      const token = await signUnsubscribeToken(email);
      const unsubUrl = unsubscribeUrl(appUrl, supabaseUrl, email, token);
      const { subject, html, text } = renderEmail(template, { business, appUrl, unsubUrl });
      try {
        const r = await sendEmail({ to: { email, name: name || undefined }, subject, html, text, fromName: business?.name || 'NotiProof' });
        if (!r.ok) throw new Error(r.error);
        await admin.from('email_sends').insert({ business_id: businessId, user_id: userId, email, template, meta: {} });
        sentCounts[template] = (sentCounts[template] || 0) + 1;
      } catch (e: any) {
        failed++;
        errors.push({ template, email, error: String(e?.message || e) });
      }
    }

    if (manual) {
      if (manual.preview) {
        const { subject, html } = renderEmail('reactivation_manual', { appUrl, unsubUrl: `${appUrl}/unsubscribe` });
        return new Response(JSON.stringify({ subject, html }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: us } = await admin.from('users').select('id, email, full_name').in('id', manual.user_ids);
      let skipped = 0;
      for (const u of us || []) {
        if (!u.email || unsubscribed.has(u.email)) { skipped++; continue; }
        await send('reactivation_manual', null, u.id, u.email, u.full_name, null);
      }
      return new Response(JSON.stringify({ ok: true, sent: sentCounts.reactivation_manual || 0, skipped, failed, errors }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = Date.now();
    const daysAgoIso = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

    // ---- welcome: new users (24-48h old), not yet sent ----
    {
      const { data: users } = await admin
        .from('users')
        .select('id, email, full_name, created_at')
        .lte('created_at', daysAgoIso(1))
        .gte('created_at', daysAgoIso(2));
      for (const u of users || []) {
        if (!u.email || unsubscribed.has(u.email)) continue;
        if (await alreadySent(null, u.id, 'welcome')) continue;
        await send('welcome', null, u.id, u.email, u.full_name, null);
      }
    }

    // ---- setup_nudge_no_proof: business > 2d old, 0 proof_objects ----
    {
      const { data: businesses } = await admin
        .from('businesses')
        .select('id, name, logo_url, brand_color, created_at')
        .lte('created_at', daysAgoIso(2));
      for (const biz of businesses || []) {
        if (await alreadySent(biz.id, null, 'setup_nudge_no_proof')) continue;
        const { count } = await admin.from('proof_objects').select('id', { count: 'exact', head: true }).eq('business_id', biz.id);
        if ((count ?? 0) > 0) continue;
        for (const o of await getOwners(biz.id)) {
          await send('setup_nudge_no_proof', biz.id, o.user_id, (o.users as any)?.email, (o.users as any)?.full_name, biz);
        }
      }
    }

    // ---- setup_nudge_no_widget: business > 4d old, 0 widgets ----
    {
      const { data: businesses } = await admin
        .from('businesses')
        .select('id, name, logo_url, brand_color, created_at')
        .lte('created_at', daysAgoIso(4));
      for (const biz of businesses || []) {
        if (await alreadySent(biz.id, null, 'setup_nudge_no_widget')) continue;
        const { count } = await admin.from('widgets').select('id', { count: 'exact', head: true }).eq('business_id', biz.id);
        if ((count ?? 0) > 0) continue;
        for (const o of await getOwners(biz.id)) {
          await send('setup_nudge_no_widget', biz.id, o.user_id, (o.users as any)?.email, (o.users as any)?.full_name, biz);
        }
      }
    }

    // ---- setup_nudge_not_installed: business > 7d old, install_verified = false ----
    {
      const { data: businesses } = await admin
        .from('businesses')
        .select('id, name, logo_url, brand_color, created_at, install_verified')
        .lte('created_at', daysAgoIso(7))
        .eq('install_verified', false);
      for (const biz of businesses || []) {
        if (await alreadySent(biz.id, null, 'setup_nudge_not_installed')) continue;
        for (const o of await getOwners(biz.id)) {
          await send('setup_nudge_not_installed', biz.id, o.user_id, (o.users as any)?.email, (o.users as any)?.full_name, biz);
        }
      }
    }

    // ---- first_proof_live: first approved proof in the last 24h ----
    {
      const { data: recentApproved } = await admin
        .from('proof_objects')
        .select('id, business_id, created_at')
        .eq('status', 'approved')
        .gte('created_at', daysAgoIso(1));
      const byBusiness = new Map<string, boolean>();
      for (const p of recentApproved || []) byBusiness.set(p.business_id, true);
      for (const businessId of byBusiness.keys()) {
        if (await alreadySent(businessId, null, 'first_proof_live')) continue;
        const { count } = await admin
          .from('proof_objects')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'approved');
        if ((count ?? 0) !== 1) continue; // only the very first approved proof
        const { data: biz } = await admin.from('businesses').select('id, name, logo_url, brand_color').eq('id', businessId).maybeSingle();
        for (const o of await getOwners(businessId)) {
          await send('first_proof_live', businessId, o.user_id, (o.users as any)?.email, (o.users as any)?.full_name, biz);
        }
      }
    }

    // ---- free trial countdown: one email per stage, stops once upgraded ----
    {
      const { data: trials } = await admin
        .from('businesses')
        .select('id, name, logo_url, brand_color, plan, trial_ends_at')
        .eq('plan', 'free')
        .not('trial_ends_at', 'is', null);
      for (const biz of trials || []) {
        const due = trialEmailDue({ plan: biz.plan, trial_ends_at: biz.trial_ends_at });
        if (!due) continue;
        if (await alreadySent(biz.id, null, due)) continue;
        const { data: unlimited } = await admin.rpc('business_is_unlimited', { _business_id: biz.id });
        if (unlimited === true) continue;
        for (const o of await getOwners(biz.id)) {
          await send(due, biz.id, o.user_id, (o.users as any)?.email, (o.users as any)?.full_name, biz);
        }
      }
    }

    // ---- winback_14 / 30 / 60: no login for N days (auth last_sign_in_at) ----
    for (const [template, days] of [['winback_14', 14], ['winback_30', 30], ['winback_60', 60]] as const) {
      // Real inactivity: last login, never profile edits. Never-logged-in users are excluded.
      const { data: inactiveUsers } = await admin.rpc('internal_dormant_users', { _min_days: days });
      for (const u of inactiveUsers || []) {
        if (!u.email) continue;
        if (await alreadySent(null, u.id, template)) continue;
        await send(template, null, u.id, u.email, u.full_name, null);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCounts, failed, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('lifecycle-mailer error:', e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
