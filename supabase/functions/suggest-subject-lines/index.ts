// EF: Suggest 3 email subject lines for a campaign using Lovable AI Gateway.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { business_id, campaign_type, tone } = await req.json().catch(() => ({}));
    if (!business_id || typeof business_id !== 'string') {
      return json({ error: 'business_id required' }, 400);
    }

    // Membership check
    const { data: membership } = await supabase
      .from('business_users')
      .select('id')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return json({ error: 'Forbidden' }, 403);

    // Rate limit per user
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: rl } = await admin.rpc('check_rate_limit', {
      _key: `suggest-subjects:${user.id}`,
      _max: 30,
      _window_seconds: 3600,
    });
    if (rl === false) return json({ error: 'Rate limit exceeded' }, 429);

    // Load business + brand voice
    const [{ data: biz }, { data: voice }] = await Promise.all([
      admin.from('businesses').select('name, industry').eq('id', business_id).maybeSingle(),
      admin.from('business_brand_voice').select('default_tone, use_words, avoid_words, voice_examples').eq('business_id', business_id).maybeSingle(),
    ]);

    const businessName = biz?.name || 'our company';
    const industry = biz?.industry ? ` in the ${biz.industry} industry` : '';
    const useTone = (tone || voice?.default_tone || 'professional') as string;
    const useWords = Array.isArray(voice?.use_words) && voice.use_words.length ? `Prefer these words: ${voice.use_words.join(', ')}.` : '';
    const avoidWords = Array.isArray(voice?.avoid_words) && voice.avoid_words.length ? `Avoid these words: ${voice.avoid_words.join(', ')}.` : '';

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI Gateway not configured' }, 500);

    const prompt = `You write short, high-converting email subject lines for testimonial-request emails.
Business: ${businessName}${industry}.
Campaign type: ${campaign_type || 'general'}.
Desired tone: ${useTone}.
${useWords} ${avoidWords}
Return exactly 3 subject lines, each under 60 characters, no quotes, no numbering. Output ONLY a JSON object: {"suggestions": ["...", "...", "..."]}.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You return strict JSON. No prose.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: 'AI gateway error', detail: t }, 502);
    }
    const aiBody = await aiRes.json();
    const raw = aiBody?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const suggestions: string[] = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s: any) => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
      : [];

    if (suggestions.length === 0) {
      return json({ suggestions: [
        `A quick favor from ${businessName}`,
        `Mind sharing your experience?`,
        `30 seconds to leave a review?`,
      ] });
    }

    return json({ suggestions });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
