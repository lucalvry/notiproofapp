// Cron-invoked dispatcher: runs every minute and dispatches due scheduled jobs.
// Currently supports `send_testimonial_email` jobs which call the existing
// `send-testimonial-request` function with the queued request id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "";
const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

let cachedCronSecret: string | null = null;
async function getCronSecret(client: any): Promise<string | null> {
  if (cachedCronSecret) return cachedCronSecret;
  const { data } = await client.from("app_secrets").select("value").eq("name", "dispatch_cron_secret").maybeSingle();
  cachedCronSecret = (data?.value as string) ?? null;
  return cachedCronSecret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Auth: accept either the project service-role key OR the dispatch cron
  // secret stored in app_secrets. Both come in as Bearer Authorization.
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const cronSecret = await getCronSecret(supabase);
  const ok =
    (SERVICE_ROLE && timingSafeEqual(bearer, SERVICE_ROLE)) ||
    (!!cronSecret && timingSafeEqual(bearer, cronSecret));
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Claim a batch of due jobs (best-effort; duplicate runs are safe because
  // each job marks itself processing before doing work).
  const { data: jobs, error } = await supabase
    .from("scheduled_jobs")
    .select("id, job_type, payload, attempts")
    .eq("status", "pending")
    .lte("run_at", new Date().toISOString())
    .order("run_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processed = 0;
  let failed = 0;

  // ── Sweep due scheduled publish events ─────────────────────────────────
  const { data: dueEvents } = await supabase
    .from("content_publish_events")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(BATCH_SIZE);
  for (const ev of dueEvents ?? []) {
    try {
      await supabase.functions.invoke("publish-content-piece", { body: { event_id: ev.id } });
      processed++;
    } catch {
      failed++;
    }
  }

  for (const job of jobs ?? []) {
    // Mark processing to prevent another run from picking the same row.
    const { error: claimErr } = await supabase
      .from("scheduled_jobs")
      .update({ status: "processing", attempts: (job.attempts ?? 0) + 1 })
      .eq("id", job.id)
      .eq("status", "pending");
    if (claimErr) continue;

    try {
      if (job.job_type === "send_testimonial_email") {
        const requestId = (job.payload as any)?.testimonial_request_id;
        if (!requestId) throw new Error("missing testimonial_request_id");

        const { data, error: fnErr } = await supabase.functions.invoke("send-testimonial-request", {
          body: { request_id: requestId, app_origin: APP_URL || undefined },
        });
        if (fnErr || !data?.ok) {
          throw new Error(fnErr?.message ?? data?.error ?? "send failed");
        }

        await supabase
          .from("scheduled_jobs")
          .update({ status: "done", last_error: null })
          .eq("id", job.id);
        processed++;
      } else {
        await supabase
          .from("scheduled_jobs")
          .update({ status: "done", last_error: `unknown job_type ${job.job_type}` })
          .eq("id", job.id);
      }
    } catch (e) {
      const msg = (e as Error).message ?? "unknown error";
      const nextAttempt = (job.attempts ?? 0) + 1;
      await supabase
        .from("scheduled_jobs")
        .update({
          status: nextAttempt >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: msg,
        })
        .eq("id", job.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed, failed, picked: jobs?.length ?? 0 }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
