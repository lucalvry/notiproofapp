// EF-12: platform-monitor — evaluates alert conditions every 5 minutes and
// upserts/resolves rows in public.system_alerts keyed by alert_key.
// Every query is checked: a failed check reports "Unable to verify", never a healthy zero.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authorizeMonitor, recordInvocation } from "../_shared/monitoring.ts";
import {
  type AlertResult,
  type Checked,
  type InvocationRow,
  emailSenderAlerts,
  shouldApply,
  stripeAlert,
  unavailableAlert,
} from "../_shared/monitor-rules.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SERVICE_URL, SERVICE_KEY);

async function count(table: string, build: (q: any) => any): Promise<Checked<number>> {
  const q = admin.from(table).select("*", { count: "exact", head: true });
  const { count: c, error } = await build(q);
  if (error) return { ok: false, error: error.message };
  return { ok: true, value: c ?? 0 };
}

async function evaluateAlerts(): Promise<AlertResult[]> {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const results: AlertResult[] = [];
  const unavailable: string[] = [];

  // Stripe — evidence from verified webhook deliveries (last 7 days)
  const stripeRows = await admin
    .from("ef_invocation_log")
    .select("status, created_at, error_message")
    .eq("function_name", "webhook-stripe")
    .gte("created_at", since(7 * 86400000))
    .order("created_at", { ascending: false })
    .limit(200);
  const stripeChecked: Checked<InvocationRow[]> = stripeRows.error
    ? { ok: false, error: stripeRows.error.message }
    : { ok: true, value: (stripeRows.data ?? []) as InvocationRow[] };
  if (!stripeChecked.ok) unavailable.push("Stripe deliveries");
  results.push(stripeAlert(stripeChecked));

  // Scheduled email sender heartbeat
  const last = await admin
    .from("ef_invocation_log")
    .select("status, created_at, error_message")
    .eq("function_name", "scheduled-email-sender")
    .order("created_at", { ascending: false })
    .limit(1);
  const lastChecked: Checked<InvocationRow | null> = last.error
    ? { ok: false, error: last.error.message }
    : { ok: true, value: ((last.data ?? [])[0] as InvocationRow) ?? null };
  if (!lastChecked.ok) unavailable.push("scheduled email sender");
  results.push(...emailSenderAlerts(lastChecked, now));

  // WARNING — integration dead-letter queue > 50 (failed events in 7 days)
  const dlq = await count("integration_events", (q) =>
    q.eq("status", "failed").gte("received_at", since(7 * 86400000))
  );
  if (!dlq.ok) unavailable.push("integration queue");
  else results.push({
    key: "integration_dlq_high",
    triggered: dlq.value > 50,
    severity: "warning",
    domain: "integrations",
    link_tab: "integrations",
    message: `Integration dead-letter queue has ${dlq.value} items (> 50)`,
    metadata: { dlq_count: dlq.value },
  });

  // WARNING — Image enrichment failure rate > 15% in 24h
  const enrichWindow = since(24 * 60 * 60 * 1000);
  const enrichTotal = await count("proof_product_items", (q) =>
    q.gte("created_at", enrichWindow).not("product_image_url", "is", null)
  );
  const enrichFailed = await count("proof_product_items", (q) =>
    q.gte("created_at", enrichWindow).eq("image_fetch_status", "failed").gte("retry_count", 3)
  );
  if (!enrichTotal.ok || !enrichFailed.ok) unavailable.push("image enrichment");
  else {
    const rate = enrichTotal.value === 0 ? 0 : enrichFailed.value / enrichTotal.value;
    results.push({
      key: "enrichment_failure_rate_high",
      triggered: enrichTotal.value > 10 && rate > 0.15,
      severity: "warning",
      domain: "enrichment",
      link_tab: "enrichment",
      message: `Product image enrichment failure rate ${(rate * 100).toFixed(1)}% (> 15%) over 24h`,
      metadata: { failed: enrichFailed.value, total: enrichTotal.value, rate },
    });
  }

  // WARNING — Moderation queue > 50
  const moderation = await count("proof_objects", (q) => q.eq("status", "pending_review"));
  if (!moderation.ok) unavailable.push("moderation queue");
  else results.push({
    key: "moderation_queue_high",
    triggered: moderation.value > 50,
    severity: "warning",
    domain: "users",
    link_tab: "users",
    message: `Moderation queue has ${moderation.value} items pending review (> 50)`,
    metadata: { queue: moderation.value },
  });

  // CRITICAL — Any function error rate > 20% in last hour (min 10 calls)
  const efAgg = await admin
    .from("ef_invocation_log")
    .select("function_name, status")
    .gte("created_at", since(60 * 60 * 1000))
    .limit(2000);
  if (efAgg.error) unavailable.push("function error rate");
  else {
    const byFn = new Map<string, { ok: number; err: number }>();
    for (const row of efAgg.data ?? []) {
      const r = byFn.get(row.function_name as string) ?? { ok: 0, err: 0 };
      if (row.status === "error") r.err += 1;
      else r.ok += 1;
      byFn.set(row.function_name as string, r);
    }
    const noisy: { fn: string; rate: number; total: number }[] = [];
    for (const [fn, c] of byFn) {
      const total = c.ok + c.err;
      if (total >= 10 && c.err / total > 0.2) noisy.push({ fn, rate: c.err / total, total });
    }
    results.push({
      key: "ef_error_rate_high",
      triggered: noisy.length > 0,
      severity: "critical",
      domain: "ai",
      link_tab: "ai",
      message: noisy.length > 0
        ? `Function error rate over 20%: ${noisy.map((f) => f.fn).join(", ")}`
        : "Function error rate is healthy",
      metadata: { functions: noisy },
    });
  }

  results.push(unavailableAlert(unavailable));
  return results;
}

async function applyAlert(a: AlertResult) {
  if (!shouldApply(a)) return;
  if (a.triggered) {
    const { data: existing, error } = await admin
      .from("system_alerts")
      .select("id")
      .eq("alert_key", a.key)
      .is("resolved_at", null)
      .maybeSingle();
    if (error) throw new Error(`alert lookup failed: ${error.message}`);
    const res = existing
      ? await admin.from("system_alerts").update({ message: a.message, severity: a.severity, metadata: a.metadata ?? {} }).eq("id", existing.id)
      : await admin.from("system_alerts").insert({
          severity: a.severity, domain: a.domain, alert_key: a.key,
          message: a.message, link_tab: a.link_tab, metadata: a.metadata ?? {},
        });
    if (res.error) throw new Error(`alert write failed: ${res.error.message}`);
  } else {
    const { error } = await admin
      .from("system_alerts")
      .update({ resolved_at: new Date().toISOString() })
      .eq("alert_key", a.key)
      .is("resolved_at", null);
    if (error) throw new Error(`alert resolve failed: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await authorizeMonitor(req, admin))) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const started = Date.now();
  try {
    const results = await evaluateAlerts();
    for (const r of results) await applyAlert(r);
    const triggered = results.filter((r) => r.triggered).map((r) => r.key);
    await recordInvocation(admin, "platform-monitor", started, "ok", { triggered }).catch(() => {});
    return new Response(JSON.stringify({ ok: true, evaluated: results.length, triggered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("platform-monitor error", e);
    await recordInvocation(admin, "platform-monitor", started, "error", {}, String((e as Error)?.message ?? e)).catch(() => {});
    return new Response(JSON.stringify({ error: "Monitoring run failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
