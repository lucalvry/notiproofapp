// Re-runs pending AI jobs (currently brand DNA) after AI credit is topped up.
// Callable by platform admins (button in admin panel) or by the hourly cron via x-internal-secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  let secret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
  if (!secret) {
    const { data } = await admin.from("app_secrets").select("value").eq("name", "INTERNAL_TRIGGER_SECRET").maybeSingle();
    secret = data?.value;
  }
  const isInternal = !!secret && req.headers.get("x-internal-secret") === secret;

  if (!isInternal) {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data: isAdmin } = await userClient.rpc("is_platform_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);
  }
  if (!secret) return json({ error: "Internal secret not configured" }, 500);

  const { data: jobs } = await admin
    .from("ai_job_failures")
    .select("id, task, payload, user_id, attempts")
    .eq("status", "pending")
    .order("created_at")
    .limit(25);

  let resolved = 0, stillFailing = 0;
  for (const job of jobs ?? []) {
    if (job.task !== "brand_dna") continue;
    const p = job.payload as { url?: string; business_id?: string };
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-business-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": secret, Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({ url: p.url, business_id: p.business_id, retry_of: job.id, user_id: job.user_id }),
    });
    const out = await res.json().catch(() => ({}));
    const ok = res.ok && !out.error;
    await admin.from("ai_job_failures").update(
      ok
        ? { status: "resolved", resolved_at: new Date().toISOString(), attempts: job.attempts + 1, updated_at: new Date().toISOString() }
        : { attempts: job.attempts + 1, updated_at: new Date().toISOString() },
    ).eq("id", job.id);
    ok ? resolved++ : stillFailing++;
  }
  return json({ processed: (jobs ?? []).length, resolved, still_failing: stillFailing });
});
