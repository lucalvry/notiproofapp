import { generateText, AllProvidersFailedError, recordAiFailure, describeFailure } from "../_shared/ai.ts";
// Fetches a business's homepage, extracts a favicon, and asks an AI model to
// summarize the business into a reusable profile (industry, audience, brand
// voice hints, etc). Used right after business creation and from Settings.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { uuidSchema } from "../_shared/validation.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const MODEL = "claude-sonnet-4-5";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BusinessProfile {
  industry: string;
  target_audience: string;
  customers: string;
  problems_solved: string;
  how_customers_search: string;
  brand_tone: string;
  words_to_use: string[];
  words_to_avoid: string[];
}

function resolveUrl(base: URL, maybeRelative: string): string | null {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

function extractFavicon(html: string, pageUrl: URL): string {
  const linkRegex = /<link\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  const candidates: { href: string; rel: string }[] = [];
  while ((match = linkRegex.exec(html))) {
    const tag = match[0];
    const relMatch = /rel=["']([^"']+)["']/i.exec(tag);
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase();
    if (rel.includes("icon")) candidates.push({ href: hrefMatch[1], rel });
  }
  // Prefer apple-touch-icon / larger icons, but any icon rel will do.
  const preferred = candidates.find((c) => c.rel.includes("shortcut")) ?? candidates[0];
  if (preferred) {
    const resolved = resolveUrl(pageUrl, preferred.href);
    if (resolved) return resolved;
  }
  return resolveUrl(pageUrl, "/favicon.ico") ?? `${pageUrl.origin}/favicon.ico`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function parseProfile(raw: string): BusinessProfile {
  // Models sometimes wrap JSON in a fenced code block — strip that first.
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  const slice = jsonStart >= 0 && jsonEnd >= jsonStart ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned;
  const parsed = JSON.parse(slice);
  return {
    industry: String(parsed.industry ?? "").slice(0, 80),
    target_audience: String(parsed.target_audience ?? "").slice(0, 500),
    customers: String(parsed.customers ?? "").slice(0, 500),
    problems_solved: String(parsed.problems_solved ?? "").slice(0, 500),
    how_customers_search: String(parsed.how_customers_search ?? "").slice(0, 500),
    brand_tone: String(parsed.brand_tone ?? "").slice(0, 200),
    words_to_use: Array.isArray(parsed.words_to_use) ? parsed.words_to_use.map((w: unknown) => String(w)).slice(0, 15) : [],
    words_to_avoid: Array.isArray(parsed.words_to_avoid) ? parsed.words_to_avoid.map((w: unknown) => String(w)).slice(0, 15) : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Internal-secret path is used by retry-ai-jobs to re-run pending brand DNA jobs.
    const internalSecret = req.headers.get("x-internal-secret");
    let expectedInternal = Deno.env.get("INTERNAL_TRIGGER_SECRET");
    if (internalSecret && !expectedInternal) {
      const { data: row } = await createClient(SUPABASE_URL, SERVICE_ROLE).from("app_secrets").select("value").eq("name", "INTERNAL_TRIGGER_SECRET").maybeSingle();
      expectedInternal = row?.value;
    }
    const isInternal = !!(internalSecret && expectedInternal && internalSecret === expectedInternal);

    const authHeader = req.headers.get("Authorization");
    if (!isInternal && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = isInternal
      ? createClient(SUPABASE_URL, SERVICE_ROLE)
      : createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader! } } });
    let userData: { user: { id: string } | null } = { user: null };
    if (!isInternal) {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      userData = data;
    }

    let body: { url?: string; business_id?: string; retry_of?: string; user_id?: string };
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const businessId = body.business_id;
    let rawUrl = (body.url ?? "").trim();
    if (!businessId || !uuidSchema.safeParse(businessId).success) {
      return new Response(JSON.stringify({ error: "Missing or invalid business_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!rawUrl || rawUrl.length > 2048) {
      return new Response(JSON.stringify({ error: "Missing or invalid url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;

    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Membership check — only business members may trigger analysis + writes.
    const { data: isMember } = isInternal ? { data: true } : await supabase.rpc("is_business_member", { _business_id: businessId });
    if (!isMember) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the homepage HTML, capped in size and time.
    let html = "";
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const res = await fetch(parsed.toString(), {
        signal: ctrl.signal,
        headers: { "User-Agent": "NotiProofSiteAnalyzer/1.0" },
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.ok) html = (await res.text()).slice(0, 1_500_000);
    } catch (_e) { /* fall through to favicon fallback */ }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Favicon: page icon tags / favicon.ico, else a public favicon service. Saved before AI runs.
    let faviconUrl = html ? extractFavicon(html, parsed) : null;
    if (faviconUrl) {
      try {
        const head = await fetch(faviconUrl, { method: "GET", headers: { "User-Agent": "NotiProofSiteAnalyzer/1.0" } });
        const ct = head.headers.get("content-type") ?? "";
        if (!head.ok || !(ct.startsWith("image") || ct.includes("icon") || ct.includes("octet"))) faviconUrl = null;
      } catch { faviconUrl = null; }
    }
    if (!faviconUrl) faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=128`;
    await admin.from("businesses").update({ favicon_url: faviconUrl }).eq("id", businessId);

    if (!html) {
      return new Response(JSON.stringify({ favicon_url: faviconUrl, error: "Could not read the website to learn the brand voice." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const text = stripHtml(html).slice(0, 8000);


    const system = [
      "You are a research analyst building a one-page business profile from a company's homepage text.",
      "Respond with ONLY a JSON object (no prose, no markdown fences) with exactly these keys:",
      '{"industry": string, "target_audience": string, "customers": string, "problems_solved": string, "how_customers_search": string, "brand_tone": string, "words_to_use": string[], "words_to_avoid": string[]}',
      "industry: a short, common industry label (e.g. 'SaaS & Software', 'E-commerce & Retail').",
      "target_audience: who the business sells to, 1-2 sentences.",
      "customers: the typical customer profile / persona, 1-2 sentences.",
      "problems_solved: the core problems or value the business solves, 1-2 sentences.",
      "how_customers_search: phrases or questions prospective customers might search to find this business.",
      "brand_tone: 2-4 words describing the brand's tone of voice (e.g. 'friendly, confident, playful').",
      "words_to_use: 5-10 words/phrases that fit the brand voice.",
      "words_to_avoid: 3-8 words/phrases that clash with the brand voice.",
    ].join("\n");

    const userPrompt = `Homepage URL: ${parsed.toString()}\n\nHomepage text (extracted):\n${text}`;

    let profile: BusinessProfile;
    try {
      const { text: raw } = await generateText({ system, user: userPrompt, maxTokens: 1200 });
      profile = parseProfile(raw);
    } catch (e) {
      console.error("analyze-business-site AI error:", e);
      let failureId: string | undefined;
      if (e instanceof AllProvidersFailedError && (body as { retry_of?: string }).retry_of) {
        const providerErrors = e.failures.map((f) => ({ provider: f.provider, kind: f.kind, status: f.status ?? null, reason: describeFailure(f) }));
        await admin.from("ai_job_failures").update({ provider_errors: providerErrors, updated_at: new Date().toISOString() }).eq("id", (body as { retry_of: string }).retry_of);
        failureId = (body as { retry_of: string }).retry_of;
      } else if (e instanceof AllProvidersFailedError) {
        failureId = await recordAiFailure(admin, { business_id: businessId, user_id: userData.user?.id ?? (body as { user_id?: string }).user_id ?? null, task: "brand_dna", payload: { url: parsed.toString(), business_id: businessId }, error: e });
      }
      return new Response(JSON.stringify({ favicon_url: faviconUrl, error: "ai_unavailable", failure_id: failureId ?? null }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve/create the industry via the shared RPC, then persist on the business.
    let industryName: string | null = null;
    if (profile.industry) {
      const { data: ensured } = await supabase.rpc("ensure_industry", { _name: profile.industry, _by_ai: true });
      industryName = (ensured as string | null) ?? profile.industry;
    }

    const { error: updateErr } = await admin
      .from("businesses")
      .update({
        favicon_url: faviconUrl,
        industry: industryName,
        business_profile: profile,
      })
      .eq("id", businessId);
    if (updateErr) throw updateErr;

    await admin.from("ai_job_failures").update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("business_id", businessId).eq("task", "brand_dna").eq("status", "pending");

    // Seed brand voice from the extracted profile without overwriting user edits.
    const { data: existingVoice } = await admin.from("business_brand_voice").select("id, use_words, avoid_words, voice_examples").eq("business_id", businessId).maybeSingle();
    const voiceRow = {
      business_id: businessId,
      default_tone: ["professional", "friendly", "playful", "bold", "minimal", "luxury"].find((t) => profile.brand_tone.toLowerCase().includes(t)) ?? "friendly",
      use_words: profile.words_to_use,
      avoid_words: profile.words_to_avoid,
    };
    if (!existingVoice) await admin.from("business_brand_voice").insert(voiceRow);
    else if (!(existingVoice.use_words?.length) && !(existingVoice.avoid_words?.length)) await admin.from("business_brand_voice").update(voiceRow).eq("id", existingVoice.id);

    return new Response(JSON.stringify({ favicon_url: faviconUrl, industry: industryName, profile }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-business-site error:", e);
    captureEdgeError(e, req, { function_name: "analyze-business-site" });
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
