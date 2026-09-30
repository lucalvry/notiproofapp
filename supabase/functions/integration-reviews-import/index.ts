// Bulk paste import for Trustpilot or G2 reviews.
// Caller must be owner/editor of the integration's business (or platform admin).
// POST body: { integration_id, reviews: [...], format?: "trustpilot" | "g2" }
// Returns { imported, skipped }. Reuses dedupe via integration_events.external_event_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AnyReview {
  id?: string | number;
  // Trustpilot
  stars?: number;
  text?: string;
  title?: string;
  createdAt?: string;
  consumer?: { displayName?: string; imageUrl?: string };
  // G2
  star_rating?: number;
  rating?: number;
  comment?: string;
  comment_answers?: Record<string, { value?: string }>;
  submitted_at?: string;
  user?: { name?: string; picture_url?: string };
}

function normalizeTrustpilot(r: AnyReview) {
  const ratingN = typeof r.stars === "number" ? r.stars : Number(r.stars);
  const rating = Number.isFinite(ratingN) ? Math.max(1, Math.min(5, Math.round(ratingN))) : null;
  const body = (r.text ?? "").toString().trim();
  const title = (r.title ?? "").toString().trim();
  const content = [title, body].filter(Boolean).join(" — ") || body || title || null;
  return {
    external_id: r.id != null ? `trustpilot:${r.id}` : null,
    author_name: r.consumer?.displayName?.toString().trim() || null,
    author_photo_url: r.consumer?.imageUrl?.toString().trim() || null,
    rating,
    content,
    proof_event_at: r.createdAt ?? new Date().toISOString(),
  };
}

function normalizeG2(r: AnyReview) {
  const ratingRaw = r.star_rating ?? r.rating;
  const ratingN = typeof ratingRaw === "number" ? ratingRaw : Number(ratingRaw);
  const rating = Number.isFinite(ratingN) ? Math.max(1, Math.min(5, Math.round(ratingN))) : null;
  let body = (r.comment ?? "").toString().trim();
  if (!body && r.comment_answers) {
    body = Object.values(r.comment_answers).map((a) => a?.value ?? "").filter(Boolean).join(" ").trim();
  }
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
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const integrationId = body?.integration_id as string | undefined;
  const reviews = body?.reviews as AnyReview[] | undefined;
  const format = (body?.format as string | undefined) ?? "auto";
  if (!integrationId) return json({ error: "integration_id is required" }, 400);
  if (!Array.isArray(reviews) || reviews.length === 0) return json({ error: "reviews array is required" }, 400);
  if (reviews.length > 200) return json({ error: "Send at most 200 reviews per import" }, 400);

  const { data: integ } = await admin
    .from("integrations")
    .select("id, business_id, provider")
    .eq("id", integrationId)
    .maybeSingle();
  if (!integ) return json({ error: "Integration not found" }, 404);
  if (integ.provider !== "trustpilot" && integ.provider !== "g2") {
    return json({ error: "Only trustpilot or g2 integrations support bulk import" }, 400);
  }

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

  const useFormat =
    format === "trustpilot" || format === "g2" ? format : (integ.provider as "trustpilot" | "g2");
  const normalize = useFormat === "g2" ? normalizeG2 : normalizeTrustpilot;

  let imported = 0;
  let skipped = 0;

  for (const raw of reviews) {
    const r = normalize(raw);
    if (!r.content) { skipped++; continue; }

    const { data: ev, error: evErr } = await admin
      .from("integration_events")
      .insert({
        business_id: integ.business_id,
        integration_id: integ.id,
        event_type: "review.imported",
        payload: raw as any,
        external_event_id: r.external_id,
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
        author_name: r.author_name,
        author_photo_url: r.author_photo_url,
        author_avatar_url: r.author_photo_url,
        content: r.content,
        raw_content: r.content,
        rating: r.rating,
        source: integ.provider,
        source_metadata: { event_id: ev.id, external_id: r.external_id, imported: true } as any,
        proof_event_at: r.proof_event_at,
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

  return json({ ok: true, imported, skipped });
});
