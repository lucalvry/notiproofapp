// Public endpoint: validates the collection token, then UPDATES the existing
// linked proof_object (created when the request was created — either via a
// webhook or as a manual placeholder). Never inserts a new proof_object.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseBody, submitTestimonialBody } from "../_shared/validation.ts";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { encryptString, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

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

const optStr = (v: unknown, max = 200) =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max ? v.trim() : null;
const optUrl = (v: unknown) => {
  if (typeof v !== "string" || v.length === 0 || v.length > 2000) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  return v;
};

function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v|ogv)(\?|#|$)/i.test(url);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = parseBody(submitTestimonialBody, raw, corsHeaders);
    if (!parsed.ok) return parsed.res;
    const {
      token, author_name, author_email, content, rating, media_url,
      author_role, author_company, author_photo_url, author_website_url,
      media_size_bytes, media_duration_seconds,
      outcome_claim, highlight_phrase,
    } = parsed.data;
    const ratingNum = rating ?? null;

    // Rate limit: 5/hr per token, 30/hr per IP.
    const ip = callerIp(req);
    const tokenLimit = await rateLimit({ key: `submit:${token}`, max: 5, windowSec: 3600 });
    if (!tokenLimit.ok) return tooMany(corsHeaders, tokenLimit.retryAfter);
    const ipLimit = await rateLimit({ key: `submit-ip:${ip}`, max: 30, windowSec: 3600 });
    if (!ipLimit.ok) return tooMany(corsHeaders, ipLimit.retryAfter);

    // Resolve request → linked proof.
    const { data: reqRow, error: reqErr } = await supabase
      .from("testimonial_requests")
      .select("id, business_id, proof_object_id, expires_at, status")
      .eq("token", token)
      .maybeSingle();
    if (reqErr) throw reqErr;
    if (!reqRow) return json({ error: "This testimonial link is invalid" }, 400);
    if (!reqRow.proof_object_id) return json({ error: "Request is not linked to a proof object" }, 500);
    if (new Date(reqRow.expires_at).getTime() < Date.now()) {
      return json({ error: "This testimonial link has expired" }, 400);
    }
    if (reqRow.status === "responded" || reqRow.status === "completed") {
      return json({ error: "This testimonial has already been submitted" }, 400);
    }

    // Plan-limit check is unnecessary here (no new proof row created) —
    // the proof was counted at creation time.

    // Per-plan max video duration for the linked business.
    if (media_url && typeof media_duration_seconds === "number" && media_duration_seconds > 0) {
      const { data: biz } = await supabase.from("businesses").select("plan").eq("id", reqRow.business_id).maybeSingle();
      if (biz?.plan) {
        const { data: limits } = await supabase.rpc("plan_limits", { _plan: biz.plan });
        const maxSec = (limits as any)?.[0]?.max_video_seconds ?? 30;
        if (media_duration_seconds > maxSec + 1) {
          return json({ error: `Video too long. Maximum ${maxSec} seconds on this plan.` }, 400);
        }
      }
    }

    const isVideo = !!media_url && isVideoUrl(media_url);
    // proof_type enum currently has no `video_testimonial` value — videos are
    // distinguished by media_type='video' + video_url being set.
    const proofType = "testimonial";

    const updateRow: Record<string, unknown> = {
      proof_type: proofType,
      type: proofType,
      author_name,
      author_email, // hashed by DB trigger; raw value nullified after update for testimonials
      content: content.trim(),
      raw_content: content.trim(),
      rating: ratingNum,
      customer_handle: author_name,
      proof_event_at: new Date().toISOString(),
      status: "pending_review",
      updated_at: new Date().toISOString(),
    };
    // Also store the AES-GCM-encrypted email so we can recover it if needed
    // (e.g. to send a follow-up). The DB trigger nulls the plaintext column
    // for testimonial proofs.
    if (piiEncryptionEnabled && author_email && author_email.trim().length > 0) {
      try {
        updateRow.author_email_encrypted = await encryptString(author_email.trim());
      } catch (e) {
        console.error("[submit-testimonial] Failed to encrypt email:", e);
      }
    }
    if (media_url) {
      if (isVideo) {
        updateRow.video_url = media_url;
        updateRow.media_url = media_url;
        updateRow.media_type = "video";
      } else {
        updateRow.media_url = media_url;
        updateRow.media_type = "image";
      }
    }
    const role = optStr(author_role);
    const company = optStr(author_company);
    const photo = optUrl(author_photo_url);
    const website = optUrl(author_website_url);
    if (role) updateRow.author_role = role;
    if (company) updateRow.author_company = company;
    if (photo) {
      updateRow.author_photo_url = photo;
      updateRow.author_avatar_url = photo;
    }
    if (website) updateRow.author_website_url = website;
    const oc = optStr(outcome_claim);
    const hp = optStr(highlight_phrase);
    if (oc) updateRow.outcome_claim = oc;
    if (hp) updateRow.highlight_phrase = hp;

    const { error: updErr } = await supabase
      .from("proof_objects")
      .update(updateRow)
      .eq("id", reqRow.proof_object_id);
    if (updErr) throw updErr;

    // Persist media metadata for storage accounting + retention.
    if (media_url && (typeof media_size_bytes === "number" || typeof media_duration_seconds === "number")) {
      await supabase.rpc("update_proof_media_metadata", {
        _proof_id: reqRow.proof_object_id,
        _bytes: typeof media_size_bytes === "number" ? Math.floor(media_size_bytes) : null,
        _duration_seconds: typeof media_duration_seconds === "number" ? media_duration_seconds : null,
      });
    }

    await supabase
      .from("testimonial_requests")
      .update({
        status: "responded",
        responded_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("token", token);

    return json({
      ok: true,
      proof_object_id: reqRow.proof_object_id,
      business_id: reqRow.business_id,
    });
  } catch (e) {
    const msg = (e as Error).message ?? "unknown error";
    const status = /invalid|expired|at least|between/i.test(msg) ? 400 : 500;
    if (status >= 500) captureEdgeError(e, req, { function_name: "submit-testimonial" });
    return json({ error: msg }, status);
  }
});
