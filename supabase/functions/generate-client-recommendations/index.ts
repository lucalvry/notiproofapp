// EF-06: Generates 3 actionable recommendations for a client based on metrics vs. industry benchmarks.
// Uses Anthropic Claude. Falls back to deterministic templates on any failure.
// Auth: caller must have agency access to the client business.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallback(metrics: Record<string, number>, benchmarks: Record<string, number>): string[] {
  const recs: string[] = [];
  if ((metrics.proofs_per_month ?? 0) < (benchmarks.proofs_per_month ?? 0) * 0.7) {
    recs.push(
      `Lift monthly proof volume from ${Math.round(metrics.proofs_per_month ?? 0)} to ${Math.round(benchmarks.proofs_per_month ?? 0)} by automating post-purchase testimonial requests.`,
    );
  }
  if ((metrics.response_rate ?? 0) < (benchmarks.response_rate ?? 0) * 0.8) {
    recs.push(
      `Improve testimonial response rate to ${(Math.round((benchmarks.response_rate ?? 0) * 100))}% by adding a one-click 5-star path and a 48-hour reminder.`,
    );
  }
  if ((metrics.content_per_proof ?? 0) < (benchmarks.content_per_proof ?? 0) * 0.8) {
    recs.push(
      `Turn each approved proof into ${Math.round(benchmarks.content_per_proof ?? 3)} content pieces by enabling auto-generation for LinkedIn, X, and case studies.`,
    );
  }
  while (recs.length < 3) {
    recs.push(
      [
        "Add a verified-customer badge to the homepage to surface social proof earlier in the funnel.",
        "Run a 14-day re-engagement campaign to customers who never received a testimonial request.",
        "Schedule weekly content drops from your top 3 highest-rated testimonials.",
      ][recs.length],
    );
  }
  return recs.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SERVICE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      client_business_id,
      industry,
      metrics = {},
      date_range_start,
      date_range_end,
    } = body as {
      client_business_id?: string;
      industry?: string;
      metrics?: Record<string, number>;
      date_range_start?: string;
      date_range_end?: string;
    };

    if (!client_business_id) return json({ error: "client_business_id required" }, 400);

    // Authorize via RLS-aware function
    const { data: hasAccess, error: accessErr } = await userClient.rpc("has_agency_access_to_business", {
      _business_id: client_business_id,
    });
    if (accessErr || !hasAccess) return json({ error: "forbidden" }, 403);

    // Fetch benchmarks
    const metricsKeys = ["proofs_per_month", "response_rate", "content_per_proof"];
    const benchmarks: Record<string, number> = {};
    for (const m of metricsKeys) {
      const { data } = await admin.rpc("get_category_benchmark", {
        _industry: industry ?? "default",
        _metric: m,
      });
      benchmarks[m] = Number(data ?? 0);
    }

    if (!ANTHROPIC_API_KEY) {
      return json({ recommendations: fallback(metrics, benchmarks), benchmarks, source: "fallback" });
    }

    const prompt = `You are an expert marketing consultant. Based on these client metrics ${JSON.stringify(metrics)} compared to industry benchmarks ${JSON.stringify(benchmarks)} for industry "${industry ?? "default"}" over the period ${date_range_start ?? "n/a"} to ${date_range_end ?? "n/a"}, write exactly 3 actionable recommendations. Each recommendation must be 1 sentence and reference specific numbers. Output ONLY a JSON array of 3 strings, nothing else.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("claude_failed", claudeRes.status, errText);
      return json({ recommendations: fallback(metrics, benchmarks), benchmarks, source: "fallback_after_error" });
    }

    const claudeJson = await claudeRes.json();
    const text: string = claudeJson?.content?.[0]?.text ?? "";
    let recs: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) recs = JSON.parse(match[0]);
    } catch {
      recs = [];
    }
    if (!Array.isArray(recs) || recs.length < 3) {
      recs = fallback(metrics, benchmarks);
    }
    return json({ recommendations: recs.slice(0, 3), benchmarks, source: "claude" });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});