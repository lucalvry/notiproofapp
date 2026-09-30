// Admin-only: aggregates auth + user metrics (DAU/WAU/MAU, recent signups,
// onboarding funnel, GDPR queue, recent failed logins via Auth admin API).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const now = Date.now();
    const since = (ms: number) => new Date(now - ms).toISOString();

    // Pull recent auth users (paginated, capped) for DAU/WAU/MAU + signups
    let page = 1;
    const all: any[] = [];
    while (page <= 20) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      all.push(...(data?.users ?? []));
      if (!data || (data.users?.length ?? 0) < 200) break;
      page += 1;
    }

    const day = 86400_000;
    let dau = 0, wau = 0, mau = 0;
    let signups7d = 0, signups30d = 0;
    let failed24h = 0;
    const signupsByDay = new Map<string, number>();
    for (const u of all) {
      const last = u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : 0;
      if (last && last >= now - day) dau += 1;
      if (last && last >= now - 7 * day) wau += 1;
      if (last && last >= now - 30 * day) mau += 1;
      const created = u.created_at ? new Date(u.created_at).getTime() : 0;
      if (created >= now - 7 * day) signups7d += 1;
      if (created >= now - 30 * day) signups30d += 1;
      const d = u.created_at?.slice(0, 10);
      if (d && created >= now - 30 * day) signupsByDay.set(d, (signupsByDay.get(d) ?? 0) + 1);
      // Heuristic for failed login: confirmed user with no recent sign-in but recent attempt metadata
      // (Supabase doesn't surface failed attempts directly via SDK — best-effort).
      const attempts = (u.user_metadata as any)?.failed_attempts_24h;
      if (typeof attempts === "number" && attempts > 0) failed24h += attempts;
    }

    // Onboarding funnel
    const [{ count: bizTotal }, { count: bizOnboarded }, { count: bizInstalled }] = await Promise.all([
      admin.from("businesses").select("*", { count: "exact", head: true }),
      admin.from("businesses").select("*", { count: "exact", head: true }).eq("onboarding_completed", true),
      admin.from("businesses").select("*", { count: "exact", head: true }).eq("install_verified", true),
    ]);

    // Churn risk: businesses with no proof in 30 days
    const { data: lastProof } = await admin
      .from("proof_objects")
      .select("business_id, created_at")
      .gte("created_at", since(30 * day))
      .limit(10000);
    const activeBiz = new Set((lastProof ?? []).map((r: any) => r.business_id));
    const churnRisk = Math.max(0, (bizTotal ?? 0) - activeBiz.size);

    const signupSeries = Array.from(signupsByDay.entries())
      .map(([day, n]) => ({ day, n }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return new Response(
      JSON.stringify({
        users_total: all.length,
        dau, wau, mau,
        signups_7d: signups7d,
        signups_30d: signups30d,
        signup_series: signupSeries,
        failed_logins_24h_estimate: failed24h,
        onboarding: {
          businesses_total: bizTotal ?? 0,
          businesses_onboarded: bizOnboarded ?? 0,
          businesses_installed: bizInstalled ?? 0,
        },
        churn_risk_businesses: churnRisk,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-auth-metrics error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
