// EF-03: Evaluate active campaigns against an integration_event and schedule testimonial requests.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const POST_PURCHASE_EVENTS = new Set(['payment.succeeded','order.completed','order.created','charge.succeeded','order.fulfilled']);
const MILESTONE_EVENTS = new Set(['milestone.reached','goal.completed']);
const ANNIVERSARY_EVENTS = new Set(['anniversary']);

function pickEmail(payload: any): string | null {
  if (!payload) return null;
  return payload.email
    || payload.customer?.email
    || payload.customer_email
    || payload.billing_address?.email
    || payload.shipping_address?.email
    || payload.user?.email
    || null;
}
function pickName(payload: any): string | null {
  return payload?.customer?.first_name || payload?.customer?.name || payload?.name || null;
}
function pickOrderId(payload: any): string | null {
  return payload?.order_id || payload?.id || payload?.order?.id || null;
}
function pickOrderValue(payload: any): number {
  return Number(payload?.total_price || payload?.amount_total || payload?.amount || payload?.total || 0) || 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const provided = req.headers.get('x-internal-secret');
    const expected = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const evt = body?.event;
    if (!evt?.business_id || !evt?.event_type) {
      return new Response(JSON.stringify({ error: 'event payload required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: campaigns } = await admin
      .from('campaigns')
      .select('*')
      .eq('business_id', evt.business_id)
      .eq('is_active', true);

    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ ok: true, scheduled: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = evt.payload || {};
    const recipientEmail = pickEmail(payload);
    const recipientName = pickName(payload);
    const orderId = pickOrderId(payload);
    const orderValue = pickOrderValue(payload);

    let scheduled = 0;
    const skipped: any[] = [];

    for (const c of campaigns) {
      const tCfg = c.trigger_config || {};
      const rCfg = c.request_config || {};

      // Type → event match
      let matches = false;
      if (c.type === 'post_purchase') matches = POST_PURCHASE_EVENTS.has(evt.event_type);
      else if (c.type === 'milestone') matches = MILESTONE_EVENTS.has(evt.event_type) && (!tCfg.milestone_event || tCfg.milestone_event === evt.event_type);
      else if (c.type === 'anniversary') matches = ANNIVERSARY_EVENTS.has(evt.event_type);
      else if (c.type === 'manual') matches = false;

      if (!matches) { skipped.push({ campaign: c.id, reason: 'type_mismatch' }); continue; }

      // Optional integration scope
      if (tCfg.integration_id && tCfg.integration_id !== evt.integration_id) { skipped.push({ campaign: c.id, reason: 'integration_mismatch' }); continue; }

      if (typeof tCfg.min_order_value === 'number' && orderValue < tCfg.min_order_value) {
        skipped.push({ campaign: c.id, reason: 'below_min_order_value' }); continue;
      }

      if (!recipientEmail) { skipped.push({ campaign: c.id, reason: 'no_email' }); continue; }

      // Dedup: same campaign + same external order id
      if (orderId) {
        const { data: existing } = await admin
          .from('testimonial_requests')
          .select('id')
          .eq('campaign_id', c.id)
          .contains('prompt_questions', []) // noop; cannot filter on jsonb path easily, use source_metadata-like check
          .limit(1);
        // Stronger dedup using recipient + campaign:
        const { data: dup } = await admin
          .from('testimonial_requests')
          .select('id')
          .eq('campaign_id', c.id)
          .eq('recipient_email', recipientEmail)
          .gte('created_at', new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString())
          .limit(1);
        if (dup && dup.length > 0) { skipped.push({ campaign: c.id, reason: 'duplicate' }); continue; }
        void existing;
      }

      const delayDays = Number(tCfg.delay_days ?? 0) || 0;
      const sendAt = new Date(Date.now() + delayDays * 86400000).toISOString();

      // Placeholder proof
      const { data: placeholderId, error: phErr } = await admin.rpc('create_placeholder_proof_for_request', { _business_id: evt.business_id });
      if (phErr || !placeholderId) { skipped.push({ campaign: c.id, reason: 'placeholder_failed', err: phErr?.message }); continue; }

      const { error: insErr } = await admin.from('testimonial_requests').insert({
        business_id: evt.business_id,
        proof_object_id: placeholderId,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        campaign_id: c.id,
        send_at: sendAt,
        status: 'scheduled',
        requested_type: rCfg.proof_type || 'testimonial',
        prompt_questions: Array.isArray(rCfg.prompts) ? rCfg.prompts : [],
        custom_message: rCfg.subject || null,
        reminder_enabled: rCfg.reminder_enabled !== false,
        reminder_delay_days: Number(rCfg.reminder_delay_days ?? 5),
      });
      if (insErr) { skipped.push({ campaign: c.id, reason: 'insert_failed', err: insErr.message }); continue; }

      await admin.from('campaigns').update({ requests_sent_count: (c.requests_sent_count || 0) + 1 }).eq('id', c.id);
      scheduled++;
    }

    return new Response(JSON.stringify({ ok: true, scheduled, skipped }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('campaign-trigger-evaluator error:', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
