// Google Reviews integration manager.
// Actions (POST body { action, integration_id, ... }):
//   - "summary"     : returns place_id, place_name, last_sync_at, review_count
//   - "connect"     : { place_id, api_key? } — validates via Places API v1, persists in config
//   - "sync"        : pulls latest 5 reviews via Places API v1 and creates proof_objects
//   - "clear"       : disconnects (clears place_id + per-integration api key)
// Auth: requires owner/editor of the integration's business (or platform admin).
// Uses platform GOOGLE_MAPS_API_KEY by default; per-integration api_key overrides.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PLATFORM_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function maskKey(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.length <= 4 ? "••••" : `••••${v.slice(-4)}`;
}

interface PlaceReviewV1 {
  name?: string;
  rating?: number;
  text?: { text?: string };
  authorAttribution?: { displayName?: string; photoUri?: string; uri?: string };
  publishTime?: string;
  originalText?: { text?: string };
}

async function fetchPlace(placeId: string, apiKey: string) {
  // Places API (New) v1 — places/{placeId}
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* keep raw */ }
  return { ok: res.ok, status: res.status, body, raw: text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Authentication required" }, 401);

  const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Authentication required" }, 401);
  const userId = userData.user.id;

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const action = body?.action as string | undefined;
  const integrationId = body?.integration_id as string | undefined;
  if (!action || !integrationId) return json({ error: "Missing action or integration_id" }, 400);

  const { data: integ } = await admin
    .from("integrations")
    .select("id, business_id, provider, config, last_sync_at, status")
    .eq("id", integrationId)
    .maybeSingle();
  if (!integ) return json({ error: "Integration not found" }, 404);
  if (integ.provider !== "google_reviews") return json({ error: "Not a Google Reviews integration" }, 400);

  const [{ data: profile }, { data: membership }] = await Promise.all([
    admin.from("users").select("is_admin").eq("id", userId).maybeSingle(),
    admin
      .from("business_users")
      .select("role")
      .eq("business_id", integ.business_id)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  const role = membership?.role;
  const allowed = profile?.is_admin || role === "owner" || role === "editor";
  if (!allowed) return json({ error: "Not allowed" }, 403);

  const cfg = (integ.config ?? {}) as Record<string, any>;
  const integKey = (cfg.api_key as string | undefined) ?? "";
  const effectiveKey = integKey || PLATFORM_KEY;

  if (action === "summary") {
    const { count: reviewCount } = await admin
      .from("proof_objects")
      .select("id", { count: "exact", head: true })
      .eq("business_id", integ.business_id)
      .eq("source", "google_reviews");
    return json({
      ok: true,
      place_id: cfg.place_id ?? null,
      place_name: cfg.place_name ?? null,
      has_byok_key: !!integKey,
      masked_byok_key: maskKey(integKey),
      uses_platform_key: !integKey && !!PLATFORM_KEY,
      last_sync_at: integ.last_sync_at,
      review_count: reviewCount ?? 0,
      status: integ.status,
    });
  }

  if (action === "connect") {
    const placeId = (body?.place_id ?? "").toString().trim();
    const userKey = (body?.api_key ?? "").toString().trim();
    if (!placeId) return json({ error: "place_id is required" }, 400);
    const tryKey = userKey || PLATFORM_KEY;
    if (!tryKey) return json({ error: "No Google Maps API key available. Provide one for this integration." }, 400);

    const place = await fetchPlace(placeId, tryKey);
    if (!place.ok) {
      const detail = place.body?.error?.message ?? place.raw?.slice(0, 300) ?? "";
      const isReferer = /referer/i.test(detail);
      return json({
        error: isReferer
          ? "Google API key has HTTP referer restrictions. Use an unrestricted or IP-restricted key for server-side calls (Google Cloud Console → Credentials → Application restrictions)."
          : "Could not fetch place. Check the Place ID and API key permissions.",
        details: detail,
      }, 400);
    }

    const placeName = place.body?.displayName?.text ?? place.body?.displayName ?? null;
    const nextCfg: Record<string, any> = {
      ...cfg,
      place_id: placeId,
      place_name: placeName,
    };
    if (userKey) nextCfg.api_key = userKey;
    else delete nextCfg.api_key;

    const { error: upErr } = await admin
      .from("integrations")
      .update({ config: nextCfg, status: "connected", updated_at: new Date().toISOString() })
      .eq("id", integ.id);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, place_id: placeId, place_name: placeName });
  }

  if (action === "clear") {
    const next = { ...cfg };
    delete next.place_id;
    delete next.place_name;
    delete next.api_key;
    const { error: upErr } = await admin
      .from("integrations")
      .update({ config: next, status: "disconnected", updated_at: new Date().toISOString() })
      .eq("id", integ.id);
    if (upErr) return json({ error: upErr.message }, 500);
    return json({ ok: true });
  }

  if (action === "sync") {
    const placeId = cfg.place_id as string | undefined;
    if (!placeId) return json({ error: "Connect a Place ID first" }, 400);
    if (!effectiveKey) return json({ error: "No Google Maps API key configured" }, 400);

    const place = await fetchPlace(placeId, effectiveKey);
    if (!place.ok) {
      return json({
        error: "Google Places API error",
        details: place.body?.error?.message ?? place.raw?.slice(0, 300),
      }, 502);
    }

    const reviews: PlaceReviewV1[] = Array.isArray(place.body?.reviews) ? place.body.reviews : [];
    let imported = 0;
    let skipped = 0;
    for (const r of reviews) {
      const externalId = r.name ? `google:${r.name}` : null;
      const text = (r.text?.text ?? r.originalText?.text ?? "").toString().trim();
      if (!text) { skipped++; continue; }
      const rating = typeof r.rating === "number" ? Math.max(1, Math.min(5, Math.round(r.rating))) : null;

      const { data: ev, error: evErr } = await admin
        .from("integration_events")
        .insert({
          business_id: integ.business_id,
          integration_id: integ.id,
          event_type: "review.created",
          payload: r as any,
          external_event_id: externalId,
          status: "received",
        })
        .select("id")
        .maybeSingle();

      if (evErr && (evErr as any).code === "23505") { skipped++; continue; }
      if (evErr || !ev) { skipped++; continue; }

      const { data: proof, error: proofErr } = await admin
        .from("proof_objects")
        .insert({
          business_id: integ.business_id,
          type: "review" as any,
          proof_type: "review" as any,
          status: "pending_review",
          author_name: r.authorAttribution?.displayName ?? null,
          author_photo_url: r.authorAttribution?.photoUri ?? null,
          author_avatar_url: r.authorAttribution?.photoUri ?? null,
          author_website_url: r.authorAttribution?.uri ?? null,
          content: text,
          raw_content: text,
          rating,
          source: "google_reviews",
          source_metadata: { event_id: ev.id, external_id: externalId, place_id: placeId } as any,
          proof_event_at: r.publishTime ?? new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (proofErr || !proof) {
        await admin
          .from("integration_events")
          .update({ status: "failed", error_message: proofErr?.message ?? "insert failed" })
          .eq("id", ev.id);
        skipped++;
        continue;
      }

      await admin
        .from("integration_events")
        .update({ status: "processed", processed_at: new Date().toISOString(), proof_object_id: proof.id })
        .eq("id", ev.id);
      imported++;
    }

    await admin
      .from("integrations")
      .update({ last_sync_at: new Date().toISOString(), status: "connected" })
      .eq("id", integ.id);

    return json({ ok: true, imported, skipped, scanned: reviews.length });
  }

  return json({ error: "Unknown action" }, 400);
});
