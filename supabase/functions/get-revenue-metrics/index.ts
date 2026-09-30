// Admin-only: returns MRR, plan distribution, upgrade/downgrade/churn lists,
// and Stripe health. If STRIPE_SECRET_KEY is configured, MRR is computed live
// from active Stripe subscriptions; otherwise it falls back to mapping
// businesses.plan_tier -> hardcoded prices (29/79/199 USD).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY");

const PLAN_PRICES: Record<string, number> = { starter: 29, growth: 79, agency: 199 };

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await admin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  return data?.is_admin ? admin : null;
}

async function stripeFetch(path: string) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}`);
  return res.json();
}

async function computeStripeMrr() {
  if (!STRIPE_SECRET) return null;
  let mrrCents = 0;
  let active = 0;
  let pastDue = 0;
  let canceledLast30 = 0;
  let starting: string | null = null;
  const since30 = Math.floor((Date.now() - 30 * 86400_000) / 1000);
  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ status: "all", limit: "100" });
    if (starting) qs.set("starting_after", starting);
    const data = await stripeFetch(`/subscriptions?${qs}`);
    for (const s of data.data ?? []) {
      if (s.status === "active" || s.status === "trialing") {
        active += 1;
        for (const it of s.items?.data ?? []) {
          const amt = it.price?.unit_amount ?? 0;
          const qty = it.quantity ?? 1;
          const interval = it.price?.recurring?.interval ?? "month";
          const monthly = interval === "year" ? amt / 12 : amt;
          mrrCents += monthly * qty;
        }
      }
      if (s.status === "past_due") pastDue += 1;
      if (s.status === "canceled" && (s.canceled_at ?? 0) >= since30) canceledLast30 += 1;
    }
    if (!data.has_more) break;
    starting = data.data?.[data.data.length - 1]?.id ?? null;
    if (!starting) break;
  }
  return { mrr_usd: Math.round(mrrCents / 100), active, past_due: pastDue, canceled_30d: canceledLast30 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: bizRows } = await admin
      .from("businesses")
      .select("plan_tier, suspended_at, created_at, stripe_subscription_id")
      .limit(10000);
    const dist: Record<string, number> = { free: 0, starter: 0, growth: 0, agency: 0 };
    let payingMrrFallback = 0;
    let paying = 0;
    let withStripe = 0;
    for (const r of bizRows ?? []) {
      const tier = (r.plan_tier as string) ?? "free";
      dist[tier] = (dist[tier] ?? 0) + 1;
      if (!r.suspended_at && tier !== "free") {
        paying += 1;
        payingMrrFallback += PLAN_PRICES[tier] ?? 0;
      }
      if (r.stripe_subscription_id) withStripe += 1;
    }

    const { data: auditRows } = await admin
      .from("admin_audit_log")
      .select("id, business_id, action, details, created_at")
      .in("action", ["plan_upgrade", "plan_downgrade", "plan_cancel", "churn"])
      .order("created_at", { ascending: false })
      .limit(20);

    let stripeStats = null;
    let stripeError: string | null = null;
    try { stripeStats = await computeStripeMrr(); }
    catch (e) { stripeError = String(e); }

    const mrr = stripeStats?.mrr_usd ?? payingMrrFallback;
    const arpu = paying > 0 ? Math.round(mrr / paying) : 0;

    return new Response(
      JSON.stringify({
        mrr_usd: mrr,
        arr_usd: mrr * 12,
        arpu_usd: arpu,
        paying_businesses: paying,
        plan_distribution: dist,
        stripe: stripeStats,
        stripe_error: stripeError,
        stripe_configured: !!STRIPE_SECRET,
        businesses_with_subscription: withStripe,
        recent_changes: auditRows ?? [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-revenue-metrics error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
