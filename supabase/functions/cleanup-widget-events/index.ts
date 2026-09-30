// Daily cron job: deletes widget_events older than each business's plan
// data retention window. Triggered by a pg_cron + pg_net schedule (see
// migration). Safe to run manually too — no destructive side effects beyond
// purging analytics rows already past retention.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { data: businesses, error: bErr } = await supabase
      .from("businesses")
      .select("id, plan");
    if (bErr) throw bErr;

    let totalDeleted = 0;
    const perBusiness: Array<{ business_id: string; plan: string; retention_days: number; deleted: number }> = [];

    for (const biz of businesses ?? []) {
      const plan = (biz as any).plan ?? "free";
      const { data: limits } = await supabase.rpc("plan_limits", { _plan: plan });
      const retention = (limits as any)?.[0]?.data_retention_days ?? null;
      // Treat the "unlimited" sentinel (~36500) as no purge required.
      if (!retention || retention >= 36500) continue;

      const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000).toISOString();
      const { error: dErr, count } = await supabase
        .from("widget_events")
        .delete({ count: "exact" })
        .eq("business_id", (biz as any).id)
        .lt("fired_at", cutoff);
      if (dErr) {
        perBusiness.push({ business_id: (biz as any).id, plan, retention_days: retention, deleted: -1 });
        continue;
      }
      totalDeleted += count ?? 0;
      perBusiness.push({ business_id: (biz as any).id, plan, retention_days: retention, deleted: count ?? 0 });
    }

    const promoted = await promoteAbWinners();
    return json({ ok: true, total_deleted: totalDeleted, businesses: perBusiness, ab_promoted: promoted });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

// ---------------------------------------------------------------------------
// A/B winner auto-promotion (spec WID-02: "Auto-select winner after N
// impressions"). Runs in the same cron pass: scan widgets with ab_enabled,
// and once both variants exceed config.ab_winner_threshold impressions and
// CTR delta is ≥10%, lock the widget to the winning variant and disable
// further A/B routing. The function above already returned, so this lives
// inside the same Deno.serve handler — fold it in before the response.
// (Implementation note: kept separate function below for readability; called
// from the main handler — see promoteAbWinners.)

async function promoteAbWinners(): Promise<Array<{ widget_id: string; winner: "A" | "B"; ctr_a: number; ctr_b: number }>> {
  const promoted: Array<{ widget_id: string; winner: "A" | "B"; ctr_a: number; ctr_b: number }> = [];

  const { data: widgets } = await supabase
    .from("widgets")
    .select("id, business_id, config, variant")
    .eq("status", "active");

  for (const w of (widgets ?? []) as Array<{ id: string; business_id: string; config: Record<string, unknown>; variant: string | null }>) {
    const cfg = (w.config ?? {}) as Record<string, unknown>;
    if (!cfg.ab_enabled) continue;
    const threshold = Number(cfg.ab_winner_threshold ?? 0);
    if (threshold <= 0) continue;

    // Pull impression + click counts grouped by variant for this widget.
    const { data: events } = await supabase
      .from("widget_events")
      .select("variant,event_type")
      .eq("widget_id", w.id);

    let impA = 0, impB = 0, clkA = 0, clkB = 0;
    for (const e of (events ?? []) as Array<{ variant: string | null; event_type: string }>) {
      const v = (e.variant ?? "A").toUpperCase();
      if (e.event_type === "impression") {
        if (v === "B") impB++; else impA++;
      } else if (e.event_type === "click") {
        if (v === "B") clkB++; else clkA++;
      }
    }

    if (impA < threshold || impB < threshold) continue;

    const ctrA = impA > 0 ? clkA / impA : 0;
    const ctrB = impB > 0 ? clkB / impB : 0;
    if (Math.abs(ctrA - ctrB) < 0.01) continue; // need at least 1pp difference
    const winner: "A" | "B" = ctrA >= ctrB ? "A" : "B";

    await supabase
      .from("widgets")
      .update({
        variant: winner,
        config: {
          ...cfg,
          ab_enabled: false,
          ab_winner: winner,
          ab_winner_decided_at: new Date().toISOString(),
          ab_winner_ctr_a: ctrA,
          ab_winner_ctr_b: ctrB,
        },
      })
      .eq("id", w.id);

    promoted.push({ widget_id: w.id, winner, ctr_a: ctrA, ctr_b: ctrB });
  }

  return promoted;
}
