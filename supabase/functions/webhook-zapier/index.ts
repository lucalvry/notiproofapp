// Generic webhook ingestor used by Zapier and any "send a JSON POST" integration.
// Per-integration shared secret (stored in integrations.config.webhook_secret) gates
// access. Field-mapping config (integrations.config.field_map) describes which
// JSON paths in the body become author_name / content / rating / media_url.
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

interface FieldMap {
  author_name?: string;
  author_email?: string;
  content?: string;
  rating?: string;
  media_url?: string;
  external_id?: string;
  event_type?: string;
}

const DEFAULT_MAP: Required<FieldMap> = {
  author_name: "author_name",
  author_email: "author_email",
  content: "content",
  rating: "rating",
  media_url: "media_url",
  external_id: "id",
  event_type: "event_type",
};

// Resolve a dotted-path expression like "data.author.name" against a JSON value.
function pick(obj: unknown, path: string | undefined): unknown {
  if (!path) return undefined;
  const parts = path.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function asText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.trim() || null;
  return String(v);
}

function asNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `wh-zapier:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  const secretQs = url.searchParams.get("secret");
  const secretHdr = req.headers.get("x-notiproof-secret");
  const supplied = secretQs ?? secretHdr ?? "";

  if (!integrationId || !uuidSchema.safeParse(integrationId).success) {
    return json({ error: "integration_id query param is required" }, 400);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: integ } = await supabase
    .from("integrations")
    .select("id, business_id, provider, config")
    .eq("id", integrationId)
    .maybeSingle();

  if (!integ) return json({ error: "Integration not found" }, 404);
  if (integ.provider !== "zapier" && integ.provider !== "webhook") {
    return json({ error: "Integration is not a Zapier/webhook source" }, 400);
  }

  const cfg = (integ.config ?? {}) as Record<string, any>;
  const expected = String(cfg.webhook_secret ?? "");
  // Constant-time compare
  if (!expected || supplied.length !== expected.length) {
    return json({ error: "Invalid secret" }, 401);
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  if (diff !== 0) return json({ error: "Invalid secret" }, 401);

  const map: FieldMap = (cfg.field_map ?? {}) as FieldMap;
  const merged: Required<FieldMap> = { ...DEFAULT_MAP, ...map };

  const author_name = asText(pick(payload, merged.author_name));
  const author_email = asText(pick(payload, merged.author_email));
  const content = asText(pick(payload, merged.content));
  const ratingRaw = asNumber(pick(payload, merged.rating));
  const rating =
    ratingRaw == null ? null : Math.max(1, Math.min(5, Math.round(ratingRaw)));
  const media_url = asText(pick(payload, merged.media_url));
  const external_id = asText(pick(payload, merged.external_id));
  const event_type = asText(pick(payload, merged.event_type)) ?? "zapier.event";

  // Insert event row first so we always have an audit trail.
  const { data: evRow, error: evErr } = await supabase
    .from("integration_events")
    .insert({
      business_id: integ.business_id,
      integration_id: integ.id,
      event_type,
      payload: payload as any,
      external_event_id: external_id,
      status: "received",
    })
    .select("id")
    .maybeSingle();

  // Unique violation = duplicate replay; treat as success no-op.
  if (evErr && (evErr as any).code === "23505") {
    return json({ ok: true, deduped: true });
  }
  if (evErr) return json({ error: evErr.message }, 500);

  if (!content) {
    // Event recorded, but no proof can be created without content.
    await supabase
      .from("integration_events")
      .update({ status: "failed", error_message: "No content extracted from payload" })
      .eq("id", evRow!.id);
    return json({ ok: true, proof_created: false, reason: "missing_content" });
  }

  const proofType = rating != null ? "testimonial" : "custom";

  const { data: proof, error: proofErr } = await supabase
    .from("proof_objects")
    .insert({
      business_id: integ.business_id,
      type: proofType as any,
      proof_type: proofType as any,
      status: "pending_review",
      author_name,
      author_email,
      content,
      raw_content: content,
      rating,
      media_url,
      video_url: media_url,
      source: integ.provider,
      source_metadata: { event_id: evRow!.id, external_id } as any,
      proof_event_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (proofErr) {
    await supabase
      .from("integration_events")
      .update({ status: "failed", error_message: proofErr.message })
      .eq("id", evRow!.id);
    return json({ error: proofErr.message }, 500);
  }

  await supabase
    .from("integration_events")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
      proof_object_id: proof.id,
    })
    .eq("id", evRow!.id);

  await supabase
    .from("integrations")
    .update({ last_sync_at: new Date().toISOString(), status: "connected" })
    .eq("id", integ.id);

  return json({ ok: true, proof_id: proof.id });
});
