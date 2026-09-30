// G2 review ingestor. Same pattern as Trustpilot — accepts a JSON review payload
// either as a single review or a { reviews: [...] } batch. Auth via per-integration
// shared secret stored in integrations.config.webhook_secret.
// Expected fields per review:
//   { id, star_rating | rating, comment_answers?: { ... } | comment, title?, submitted_at, user?: { name, picture_url? } }
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-notiproof-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface G2Review {
  id?: string | number;
  star_rating?: number;
  rating?: number;
  title?: string;
  comment?: string;
  comment_answers?: Record<string, { value?: string }>;
  submitted_at?: string;
  user?: { name?: string; picture_url?: string };
}

function flattenG2Comment(r: G2Review): string {
  if (r.comment) return r.comment.toString().trim();
  if (r.comment_answers) {
    return Object.values(r.comment_answers)
      .map((a) => a?.value ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  return "";
}

function normalize(r: G2Review) {
  const ratingRaw = r.star_rating ?? r.rating;
  const ratingN = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  const rating = Number.isFinite(ratingN) ? Math.max(1, Math.min(5, Math.round(ratingN))) : null;
  const body = flattenG2Comment(r);
  const title = (r.title ?? "").toString().trim();
  const content = [title, body].filter(Boolean).join(" — ") || body || title || null;
  return {
    external_id: r.id != null ? `g2:${r.id}` : null,
    author_name: r.user?.name?.toString().trim() || null,
    author_photo_url: r.user?.picture_url?.toString().trim() || null,
    rating,
    content,
    proof_event_at: r.submitted_at ?? new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `wh-g2:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  const supplied = url.searchParams.get("secret") ?? req.headers.get("x-notiproof-secret") ?? "";
  if (!integrationId || !uuidSchema.safeParse(integrationId).success) return json({ error: "integration_id is required" }, 400);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const reviews: G2Review[] = Array.isArray(body) ? body : Array.isArray(body?.reviews) ? body.reviews : [body];
  if (reviews.length === 0) return json({ error: "No reviews in payload" }, 400);
  if (reviews.length > 50) return json({ error: "Send at most 50 reviews per request" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: integ } = await supabase
    .from("integrations")
    .select("id, business_id, provider, config")
    .eq("id", integrationId)
    .maybeSingle();
  if (!integ) return json({ error: "Integration not found" }, 404);
  if (integ.provider !== "g2") return json({ error: "Not a G2 integration" }, 400);

  const expected = String((integ.config as any)?.webhook_secret ?? "");
  if (!expected || supplied.length !== expected.length) return json({ error: "Invalid secret" }, 401);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return json({ error: "Invalid secret" }, 401);

  let imported = 0;
  let skipped = 0;
  for (const raw of reviews) {
    const r = normalize(raw);
    if (!r.content) { skipped++; continue; }

    const { data: ev, error: evErr } = await supabase
      .from("integration_events")
      .insert({
        business_id: integ.business_id,
        integration_id: integ.id,
        event_type: "review.created",
        payload: raw as any,
        external_event_id: r.external_id,
        status: "received",
      })
      .select("id")
      .maybeSingle();
    if (evErr && (evErr as any).code === "23505") { skipped++; continue; }
    if (evErr || !ev) { skipped++; continue; }

    const { data: proof, error: proofErr } = await supabase
      .from("proof_objects")
      .insert({
        business_id: integ.business_id,
        type: "review" as any,
        proof_type: "review" as any,
        status: "pending_review",
        author_name: r.author_name,
        author_photo_url: r.author_photo_url,
        author_avatar_url: r.author_photo_url,
        content: r.content,
        raw_content: r.content,
        rating: r.rating,
        source: "g2",
        source_metadata: { event_id: ev.id, external_id: r.external_id } as any,
        proof_event_at: r.proof_event_at,
      })
      .select("id")
      .maybeSingle();

    if (proofErr || !proof) {
      await supabase
        .from("integration_events")
        .update({ status: "failed", error_message: proofErr?.message ?? "insert failed" })
        .eq("id", ev.id);
      skipped++;
      continue;
    }

    await supabase
      .from("integration_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), proof_object_id: proof.id })
      .eq("id", ev.id);
    imported++;
  }

  await supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString(), status: "connected" })
    .eq("id", integ.id);

  return json({ ok: true, imported, skipped });
});
