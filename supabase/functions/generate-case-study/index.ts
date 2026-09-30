// EF-02: Generate a long-form case study, streaming tokens via Realtime
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

function slugify(s: string): string {
  return (s || 'case-study').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

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
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { business_id, customer_handle, proof_object_ids, tone, length_target, include_sections } = body || {};
    if (!business_id || !Array.isArray(proof_object_ids) || proof_object_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'business_id and proof_object_ids[] required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(supabaseUrl, service);
    const { data: membership } = await admin.from('business_users').select('role').eq('business_id', business_id).eq('user_id', userId).maybeSingle();
    const { data: userRow } = await admin.from('users').select('is_admin').eq('id', userId).maybeSingle();
    if (!membership && !userRow?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [{ data: proofs }, { data: voice }, { data: biz }] = await Promise.all([
      admin.from('proof_objects').select('*').in('id', proof_object_ids).eq('business_id', business_id),
      admin.from('business_brand_voice').select('*').eq('business_id', business_id).maybeSingle(),
      admin.from('businesses').select('name').eq('id', business_id).single(),
    ]);
    if (!proofs || proofs.length === 0) {
      return new Response(JSON.stringify({ error: 'No proofs found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sections = (Array.isArray(include_sections) && include_sections.length)
      ? include_sections
      : ['Challenge', 'Solution', 'Results', 'Quote', 'Conclusion'];
    const targetWords = length_target === 'short' ? 400 : length_target === 'long' ? 1500 : 800;
    const effectiveTone = tone || voice?.default_tone || 'professional';

    const system = [
      `You are a senior B2B content writer for "${biz?.name || 'the business'}".`,
      `Tone: ${effectiveTone}. Target length: ~${targetWords} words.`,
      'Write in clear markdown. Use the provided sections as H2 headings.',
      voice?.avoid_words?.length ? `Avoid: ${voice.avoid_words.join(', ')}` : '',
      voice?.use_words?.length ? `Prefer: ${voice.use_words.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const proofText = proofs.map((p: any, i: number) => {
      const lines = [
        `Proof ${i + 1} — ${p.author_name || 'Customer'}${p.author_company ? ' @ ' + p.author_company : ''} (${p.rating || '?'}/5):`,
        p.content || p.raw_content || '',
      ];
      // Sprint 7: include product context when available
      if (p.primary_product_name) lines.push(`Product: ${p.primary_product_name}`);
      if (p.primary_product_url) lines.push(`Product URL: ${p.primary_product_url}`);
      if (p.product_item_count && p.product_item_count > 1) {
        lines.push(`Order had ${p.product_item_count} items total.`);
      }
      return lines.join('\n');
    }).join('\n\n');

    const userPrompt = `Write a customer case study using these proofs:\n\n${proofText}\n\nSections to include (as H2): ${sections.join(', ')}\n\nReturn the full case study in markdown, no preface.`;

    // Stream from Anthropic
    const anthropicRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
        stream: true,
      }),
    });
    if (!anthropicRes.ok || !anthropicRes.body) {
      throw new Error(`Anthropic ${anthropicRes.status}: ${await anthropicRes.text()}`);
    }

    const channelName = `casestudy-${business_id}`;
    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';

    // Open one realtime channel for the whole stream
    const channel = admin.channel(channelName);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data || data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const delta = parsed.delta.text || '';
            full += delta;
            try {
              await channel.send({ type: 'broadcast', event: 'token', payload: { delta } });
            } catch (_e) { /* best effort */ }
          }
        } catch (_e) { /* skip malformed */ }
      }
    }
    try { await admin.removeChannel(channel); } catch (_e) {}

    // Parse out title (first H1 or first non-empty line)
    const firstHeading = full.match(/^#\s+(.+)$/m)?.[1] || `Case study — ${customer_handle || proofs[0].author_name || 'Customer'}`;
    const slug = slugify(firstHeading);

    const sectionsParsed = full.split(/^##\s+/m).slice(1).map((blk) => {
      const [h, ...rest] = blk.split('\n');
      return { heading: h.trim(), body: rest.join('\n').trim() };
    });

    const { data: cs, error: csErr } = await admin.from('case_studies').insert({
      business_id,
      customer_handle: customer_handle || null,
      title: firstHeading.replace(/^#\s+/, '').trim(),
      slug,
      content: full,
      meta_title: firstHeading.slice(0, 60),
      meta_description: full.replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 158),
      status: 'draft',
      length_target: length_target || 'medium',
      tone: effectiveTone,
      sections: sectionsParsed,
    }).select('*').single();
    if (csErr) throw csErr;

    // Pick primary proof: highest sentiment_score, fallback to first
    const sorted = [...proofs].sort((a: any, b: any) => (b.sentiment_score ?? 0) - (a.sentiment_score ?? 0));
    const primaryId = sorted[0].id;
    const linkRows = proofs.map((p: any, idx: number) => ({
      case_study_id: cs.id,
      proof_object_id: p.id,
      is_primary: p.id === primaryId,
      position: idx,
    }));
    await admin.from('case_study_proof_links').insert(linkRows);

    // Final broadcast
    try {
      const ch2 = admin.channel(channelName);
      await ch2.send({ type: 'broadcast', event: 'complete', payload: { case_study_id: cs.id } });
      await admin.removeChannel(ch2);
    } catch (_e) {}

    return new Response(JSON.stringify({ case_study_id: cs.id, slug, title: cs.title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-case-study error:', e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
