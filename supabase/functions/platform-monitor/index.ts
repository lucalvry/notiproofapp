// EF-12: platform-monitor — evaluates alert conditions every 5 minutes and
// upserts/resolves rows in public.system_alerts keyed by alert_key.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

type AlertSeverity = "critical" | "warning" | "info";
interface AlertResult {
  key: string;
  triggered: boolean;
  severity: AlertSeverity;
  domain: string;
  link_tab?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

async function count(table: string, build: (q: any) => any): Promise<number> {
  const q = admin.from(table).select("*", { count: "exact", head: true });
  const { count: c } = await build(q);
  return c ?? 0;
}

async function evaluateAlerts(): Promise<AlertResult[]> {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const results: AlertResult[] = [];

  // CRITICAL — Stripe webhook silence (proxy: no integration_events with provider=stripe in 2h)
  const stripeEvents = await count("integration_events", (q) =>
    q.eq("provider", "stripe").gte("received_at", since(2 * 60 * 60 * 1000))
  );
  results.push({
    key: "stripe_webhook_silent",
    triggered: stripeEvents === 0,
    severity: "critical",
    domain: "revenue",
    link_tab: "revenue",
    message: "No Stripe webhook events received in the last 2 hours",
    metadata: { stripe_events_2h: stripeEvents },
  });

  // CRITICAL — EF-04 hasn't run in 20 min (check ef_invocation_log)
  const { data: lastEf04 } = await admin
    .from("ef_invocation_log")
    .select("created_at")
    .eq("function_name", "scheduled-email-sender")
    .order("created_at", { ascending: false })
    .limit(1);
  const lastEf04At = lastEf04?.[0]?.created_at;
  const ef04Stale = !lastEf04At || new Date(lastEf04At).getTime() < now - 20 * 60 * 1000;
  results.push({
    key: "ef04_cron_stale",
    triggered: ef04Stale,
    severity: "critical",
    domain: "ai",
    link_tab: "ai",
    message: "scheduled-email-sender has not run in the last 20 minutes",
    metadata: { last_run_at: lastEf04At ?? null },
  });

  // WARNING — DLQ > 50
  const dlq = await count("integration_events", (q) =>
    q.eq("status", "failed").gte("retry_count", 3)
  );
  results.push({
    key: "integration_dlq_high",
    triggered: dlq > 50,
    severity: "warning",
    domain: "integrations",
    link_tab: "integrations",
    message: `Integration dead-letter queue has ${dlq} items (> 50)`,
    metadata: { dlq_count: dlq },
  });

  // WARNING — Image enrichment failure rate > 15% in 24h
  const enrichWindow = since(24 * 60 * 60 * 1000);
  const enrichTotal = await count("proof_product_items", (q) =>
    q.gte("created_at", enrichWindow).not("product_image_url", "is", null)
  );
  const enrichFailed = await count("proof_product_items", (q) =>
    q
      .gte("created_at", enrichWindow)
      .eq("image_fetch_status", "failed")
      .gte("retry_count", 3)
  );
  const enrichRate = enrichTotal === 0 ? 0 : enrichFailed / enrichTotal;
  results.push({
    key: "enrichment_failure_rate_high",
    triggered: enrichTotal > 10 && enrichRate > 0.15,
    severity: "warning",
    domain: "enrichment",
    link_tab: "enrichment",
    message: `Product image enrichment failure rate ${(enrichRate * 100).toFixed(1)}% (> 15%) over 24h`,
    metadata: { failed: enrichFailed, total: enrichTotal, rate: enrichRate },
  });

  // WARNING — Moderation queue > 50
  const moderation = await count("proof_objects", (q) => q.eq("status", "pending_review"));
  results.push({
    key: "moderation_queue_high",
    triggered: moderation > 50,
    severity: "warning",
    domain: "users",
    link_tab: "users",
    message: `Moderation queue has ${moderation} items pending review (> 50)`,
    metadata: { queue: moderation },
  });

  // WARNING — Any EF error rate > 20% in last hour (min 10 calls)
  const { data: efAgg } = await admin
    .from("ef_invocation_log")
    .select("function_name, status, created_at")
    .gte("created_at", since(60 * 60 * 1000))
    .limit(2000);
  const byFn = new Map<string, { ok: number; err: number }>();
  for (const row of efAgg ?? []) {
    const r = byFn.get(row.function_name as string) ?? { ok: 0, err: 0 };
    if (row.status === "error") r.err += 1;
    else r.ok += 1;
    byFn.set(row.function_name as string, r);
  }
  const noisyFns: { fn: string; rate: number; total: number }[] = [];
  for (const [fn, c] of byFn) {
    const total = c.ok + c.err;
    if (total >= 10 && c.err / total > 0.2) {
      noisyFns.push({ fn, rate: c.err / total, total });
    }
  }
  results.push({
    key: "ef_error_rate_high",
    triggered: noisyFns.length > 0,
    severity: "critical",
    domain: "ai",
    link_tab: "ai",
    message:
      noisyFns.length > 0
        ? `Edge Function error rate over 20%: ${noisyFns.map((f) => f.fn).join(", ")}`
        : "Edge Function error rate is healthy",
    metadata: { functions: noisyFns },
  });

  return results;
}

async function applyAlert(a: AlertResult) {
  if (a.triggered) {
    // upsert by alert_key (unique partial index on active alerts)
    const { data: existing } = await admin
      .from("system_alerts")
      .select("id")
      .eq("alert_key", a.key)
      .is("resolved_at", null)
      .maybeSingle();
    if (!existing) {
      await admin.from("system_alerts").insert({
        severity: a.severity,
        domain: a.domain,
        alert_key: a.key,
        message: a.message,
        link_tab: a.link_tab,
        metadata: a.metadata ?? {},
      });
    } else {
      await admin
        .from("system_alerts")
        .update({ message: a.message, metadata: a.metadata ?? {} })
        .eq("id", existing.id);
    }
  } else {
    // auto-resolve any active alert with this key
    await admin
      .from("system_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("alert_key", a.key)
      .is("resolved_at", null);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const internal = req.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || internal !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const results = await evaluateAlerts();
    for (const r of results) await applyAlert(r);
    return new Response(
      JSON.stringify({
        ok: true,
        evaluated: results.length,
        triggered: results.filter((r) => r.triggered).map((r) => r.key),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("platform-monitor error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});