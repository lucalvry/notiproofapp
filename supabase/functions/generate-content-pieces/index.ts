// EF-01: Generate content pieces from a proof using Anthropic Claude
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { captureEdgeError } from '../_shared/sentry.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const ALL_OUTPUT_TYPES = [
  'twitter_post','linkedin_post','email_block','ad_copy_headline',
  'ad_copy_body','website_quote','short_caption','meta_description'
] as const;

type OutputType = typeof ALL_OUTPUT_TYPES[number];

const PROMPTS: Record<OutputType, { instr: string; max: number }> = {
  twitter_post:      { instr: 'Write a punchy Twitter/X post (under 280 chars) capturing the key win. Include 1-2 relevant hashtags. No quotes around the post.', max: 280 },
  linkedin_post:     { instr: 'Write a LinkedIn post (3-5 short paragraphs, ~800-1200 chars) telling the customer story with a clear takeaway. Professional but human tone.', max: 1300 },
  email_block:       { instr: 'Write a short email body section (2-3 paragraphs, ~400-600 chars) showcasing this proof in a marketing email. End with a soft CTA hint.', max: 700 },
  ad_copy_headline:  { instr: 'Write a single Facebook/Google ad headline (max 40 chars). Bold, benefit-driven. No quotes.', max: 40 },
  ad_copy_body:      { instr: 'Write Facebook/Google ad body copy (max 125 chars). Conversational, results-focused.', max: 125 },
  website_quote:     { instr: 'Extract a polished pull-quote suitable for a website testimonial section (max 200 chars). Keep the customer voice.', max: 200 },
  short_caption:     { instr: 'Write a short Instagram caption (max 150 chars) with a single emoji.', max: 150 },
  meta_description:  { instr: 'Write an SEO meta description (max 160 chars) for a case study page about this proof.', max: 160 },
};

async function callAnthropic(apiKey: string, system: string, user: string, maxTokens = 1000) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content?.[0]?.text?.trim() ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // Internal-secret bypass for admin smoke tests / server-to-server invocation.
    const internalSecret = req.headers.get('x-internal-secret');
    let expectedInternal = Deno.env.get('INTERNAL_TRIGGER_SECRET');
    if (!expectedInternal) {
      const adminTmp = createClient(supabaseUrl, service);
      const { data: row } = await adminTmp.from('app_secrets').select('value').eq('name','INTERNAL_TRIGGER_SECRET').maybeSingle();
      expectedInternal = row?.value;
    }
    const isInternal = !!(internalSecret && expectedInternal && internalSecret === expectedInternal);

    let userId: string | null = null;
    if (!isInternal) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized', detail: userErr?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = userData.user.id;
    }

    const body = await req.json();
    const { proof_object_id, business_id, tone, output_types } = body || {};
    if (!proof_object_id || !business_id) {
      return new Response(JSON.stringify({ error: 'proof_object_id and business_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, service);

    // Membership check (skipped for internal-secret invocations)
    if (!isInternal && userId) {
      const { data: membership } = await admin
        .from('business_users')
        .select('role')
        .eq('business_id', business_id)
        .eq('user_id', userId)
        .maybeSingle();
      const { data: userRow } = await admin.from('users').select('is_admin').eq('id', userId).maybeSingle();
      if (!membership && !userRow?.is_admin) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const [{ data: proof }, { data: voice }, { data: biz }] = await Promise.all([
      admin.from('proof_objects').select('*').eq('id', proof_object_id).eq('business_id', business_id).maybeSingle(),
      admin.from('business_brand_voice').select('*').eq('business_id', business_id).maybeSingle(),
      admin.from('businesses').select('name, plan').eq('id', business_id).single(),
    ]);
    if (!proof) {
      return new Response(JSON.stringify({ error: 'Proof not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let selected: OutputType[] = (Array.isArray(output_types) && output_types.length
      ? output_types.filter((t: string) => (ALL_OUTPUT_TYPES as readonly string[]).includes(t))
      : [...ALL_OUTPUT_TYPES]) as OutputType[];

    if (biz?.plan === 'free') selected = selected.slice(0, 3);

    const effectiveTone = tone || voice?.default_tone || 'professional';
    const avoidWords = (voice?.avoid_words || []).join(', ');
    const useWords = (voice?.use_words || []).join(', ');
    const examples = voice?.voice_examples || '';

    const system = [
      `You are a senior marketing copywriter for "${biz?.name || 'the business'}".`,
      `Brand tone: ${effectiveTone}.`,
      avoidWords ? `Avoid these words: ${avoidWords}.` : '',
      useWords ? `Prefer using: ${useWords}.` : '',
      examples ? `Brand voice examples:\n${examples}` : '',
      'Return only the copy. No preface, no explanation, no quotes around the result.',
    ].filter(Boolean).join('\n');

    const proofContext = [
      `Customer name: ${proof.author_name || 'Anonymous'}`,
      proof.author_role ? `Role: ${proof.author_role}` : '',
      proof.author_company ? `Company: ${proof.author_company}` : '',
      proof.rating ? `Rating: ${proof.rating}/5` : '',
      `Testimonial: ${proof.content || proof.raw_content || ''}`,
      proof.outcome_claim ? `Outcome: ${proof.outcome_claim}` : '',
      // Sprint 7: product context (only present when enrichment exists)
      proof.primary_product_name ? `Product purchased: ${proof.primary_product_name}` : '',
      proof.primary_product_url ? `Product URL: ${proof.primary_product_url}` : '',
      (proof.product_item_count && proof.product_item_count > 1)
        ? `Order contained ${proof.product_item_count} items in total.`
        : '',
    ].filter(Boolean).join('\n');


    const created: any[] = [];
    const errors: any[] = [];

    const results = await Promise.allSettled(selected.map(async (ot) => {
      const spec = PROMPTS[ot];
      const userPrompt = `Source proof:\n${proofContext}\n\nTask: ${spec.instr}`;
      const text = await callAnthropic(apiKey, system, userPrompt, Math.min(1000, Math.ceil(spec.max / 2) + 200));
      const trimmed = (text || '').slice(0, spec.max);
      const { data: row, error: insErr } = await admin.from('content_pieces').insert({
        business_id,
        proof_object_id,
        output_type: ot,
        content: trimmed,
        original_content: trimmed,
        tone_used: effectiveTone,
        status: 'draft',
        char_count: trimmed.length,
        ai_model: MODEL,
        generation_prompt: userPrompt.slice(0, 2000),
      }).select('*').single();
      if (insErr) throw insErr;
      // Realtime broadcast
      try {
        const ch = admin.channel(`content-${business_id}`);
        await ch.send({ type: 'broadcast', event: 'piece_generated', payload: row });
        await admin.removeChannel(ch);
      } catch (_e) { /* realtime best-effort */ }
      return row;
    }));

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') created.push(r.value);
      else errors.push({ output_type: selected[i], error: String(r.reason?.message || r.reason) });
    });

    return new Response(JSON.stringify({ created: created.map((c) => c.id), pieces: created, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-content-pieces error:', e);
    captureEdgeError(e, req, { function_name: 'generate-content-pieces' });
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
