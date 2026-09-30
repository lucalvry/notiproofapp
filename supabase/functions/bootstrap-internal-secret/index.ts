// Platform admin one-shot: copies INTERNAL_TRIGGER_SECRET + edge function URLs
// from env into the app_secrets table so DB triggers and pg_cron can read them.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: userRow } = await admin.from('users').select('is_admin').eq('id', userData.user.id).single();
    if (!userRow?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden — platform admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const internalSecret = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    if (!internalSecret) {
      return new Response(JSON.stringify({ error: 'INTERNAL_TRIGGER_SECRET not set in env' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const base = `${supabaseUrl}/functions/v1`;
    const rows = [
      { name: 'INTERNAL_TRIGGER_SECRET', value: internalSecret },
      { name: 'EF_CAMPAIGN_EVALUATOR_URL', value: `${base}/campaign-trigger-evaluator` },
      { name: 'EF_SCHEDULED_EMAIL_SENDER_URL', value: `${base}/scheduled-email-sender` },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', value: service },
    ];
    const { error } = await admin.from('app_secrets').upsert(rows, { onConflict: 'name' });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, set: rows.map(r => r.name) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
