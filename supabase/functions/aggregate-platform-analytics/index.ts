// Aggregates admin overview metrics into public.analytics_snapshots once per day.
// Tab 1 reads from the latest snapshot for sub-second load.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET");
const admin = createClient(SERVICE_URL, SERVICE_KEY);

async function buildPayload() {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();

  const [overviewStats, dailySeries] = await Promise.all([
    admin.rpc("admin_overview_stats"),
    admin.rpc("admin_daily_series", { _days: 30 }),
  ]);

  const [{ count: alertsActive }] = await Promise.all([
    admin.from("system_alerts").select("*", { count: "exact", head: true }).is("resolved_at", null),
  ]);

  // AI pipeline last 24h throughput
  const { count: efCalls24h } = await admin
    .from("ef_invocation_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since(24 * 60 * 60 * 1000));

  // Integration health (last hour success rate)
  const { data: ie } = await admin
    .from("integration_events")
    .select("status, provider")
    .gte("received_at", since(60 * 60 * 1000))
    .limit(5000);
  const byPlat = new Map<string, { ok: number; err: number }>();
  for (const r of ie ?? []) {
    const cur = byPlat.get(r.provider as string) ?? { ok: 0, err: 0 };
    if (r.status === "failed") cur.err += 1;
    else cur.ok += 1;
    byPlat.set(r.provider as string, cur);
  }
  const integrationHealth = Array.from(byPlat.entries()).map(([provider, c]) => ({
    provider,
    total: c.ok + c.err,
    success_rate: c.ok + c.err === 0 ? 1 : c.ok / (c.ok + c.err),
  }));

  // AI queue depth (pending testimonial_requests scheduled in past)
  const { count: pendingSends } = await admin
    .from("testimonial_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "scheduled")
    .lt("send_at", new Date().toISOString());

  const { count: pendingEnrichment } = await admin
    .from("proof_product_items")
    .select("*", { count: "exact", head: true })
    .eq("image_fetch_status", "pending");

  // Businesses active today (proof or content in last 24h)
  const { data: activeProof } = await admin
    .from("proof_objects")
    .select("business_id")
    .gte("created_at", since(24 * 60 * 60 * 1000))
    .limit(5000);
  const activeBizSet = new Set((activeProof ?? []).map((r: any) => r.business_id));

  return {
    generated_at: new Date().toISOString(),
    overview_stats: overviewStats.data ?? null,
    daily_series: dailySeries.data ?? [],
    alerts_active: alertsActive ?? 0,
    ef_calls_24h: efCalls24h ?? 0,
    integration_health: integrationHealth,
    queue_depth: {
      pending_email_sends: pendingSends ?? 0,
      pending_enrichment: pendingEnrichment ?? 0,
    },
    businesses_active_24h: activeBizSet.size,
  };
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
    const payload = await buildPayload();
    const today = new Date().toISOString().slice(0, 10);
    await admin.from("analytics_snapshots").insert({
      scope: "admin_overview",
      snapshot_date: today,
      payload,
    });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("aggregate-platform-analytics error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});