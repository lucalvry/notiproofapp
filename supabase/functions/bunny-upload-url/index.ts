// Bunny CDN upload proxy.
//
// SECURITY: This function NEVER returns the Bunny storage-zone write password
// to the client. Instead it accepts the file as multipart/form-data, validates
// the caller (auth user OR public collection token), enforces per-business
// storage quotas, and uploads to Bunny server-side using the secret key.
//
// Two zones supported via the `kind` field:
//   "media"  -> BUNNY_MEDIA_ZONE  / BUNNY_MEDIA_PASSWORD  (testimonial videos, avatars, logos)
//   "assets" -> BUNNY_ASSETS_ZONE / BUNNY_ASSETS_PASSWORD (widget.js, public assets)
//
// Request: multipart/form-data with fields:
//   file               (required) the binary blob
//   kind               "media" | "assets" (default: media)
//   folder             optional folder name (sanitized server-side)
//   filename           optional filename (sanitized server-side)
//   business_id        optional — required for storage-quota enforcement on dashboard uploads
//   collection_token   optional — for unauthenticated testimonial uploads
//
// Response: { ok: true, public_url: string }
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? SUPABASE_ANON;
const BUNNY_CDN_HOSTNAME = Deno.env.get("BUNNY_CDN_HOSTNAME") ?? "";
const BUNNY_MEDIA_ZONE = Deno.env.get("BUNNY_MEDIA_ZONE") ?? "";
const BUNNY_MEDIA_PASSWORD = Deno.env.get("BUNNY_MEDIA_PASSWORD") ?? "";
const BUNNY_ASSETS_ZONE = Deno.env.get("BUNNY_ASSETS_ZONE") ?? "";
const BUNNY_ASSETS_PASSWORD = Deno.env.get("BUNNY_ASSETS_PASSWORD") ?? "";
const BUNNY_STORAGE_ENDPOINT = "https://storage.bunnycdn.com";

// Limit single-upload size to 100 MB to protect the function runtime.
const MAX_BYTES = 100 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function safeName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const reqId = crypto.randomUUID().slice(0, 8);
  const log = (msg: string, extra: Record<string, unknown> = {}) =>
    console.log(JSON.stringify({ reqId, msg, ...extra }));
  const errLog = (msg: string, extra: Record<string, unknown> = {}) =>
    console.error(JSON.stringify({ reqId, msg, ...extra }));

  try {
    // Identify caller. Auth is optional for public testimonial uploads.
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: authHeader } } });
      const { data } = await sb.auth.getUser();
      userId = data?.user?.id ?? null;
    }

    // Rate limit: 30/min per authed user, 20/min per IP for anonymous uploads.
    const ip = callerIp(req);
    const rlKey = userId ? `upload:${userId}` : `upload-ip:${ip}`;
    const rlMax = userId ? 30 : 20;
    const rl = await rateLimit({ key: rlKey, max: rlMax, windowSec: 60 });
    if (!rl.ok) {
      errLog("rate_limited", { ip, userId, retryAfter: rl.retryAfter });
      return tooMany(corsHeaders, rl.retryAfter);
    }

    const ct = req.headers.get("content-type") ?? "";
    if (!ct.includes("multipart/form-data")) {
      errLog("bad_content_type", { ct });
      return json({ error: "Expected multipart/form-data with a 'file' field", code: "bad_content_type" }, 400);
    }

    const form = await req.formData();
    const file: any = form.get("file");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
      errLog("missing_file");
      return json({ error: "Missing 'file' field", code: "missing_file" }, 400);
    }
    const blob = file as Blob;
    if (blob.size <= 0) {
      errLog("empty_file");
      return json({ error: "Empty file", code: "empty_file" }, 400);
    }
    if (blob.size > MAX_BYTES) {
      errLog("file_too_large", { size: blob.size });
      return json({ error: "File too large", code: "file_too_large" }, 413);
    }

    const kindRaw = String(form.get("kind") ?? "media");
    const kind: "media" | "assets" = kindRaw === "assets" ? "assets" : "media";
    const folderInput = form.get("folder");
    const filenameInput = form.get("filename");
    const businessIdInput = form.get("business_id");
    const collectionTokenInput = form.get("collection_token");
    const contentType = (typeof file?.type === "string" && file.type) || String(form.get("content_type") ?? "application/octet-stream");

    log("incoming", {
      kind,
      size: blob.size,
      contentType,
      hasUser: !!userId,
      hasBusinessId: typeof businessIdInput === "string" && !!businessIdInput,
      hasToken: typeof collectionTokenInput === "string" && !!collectionTokenInput,
    });

    const folder = typeof folderInput === "string" && folderInput
      ? safeName(folderInput)
      : (userId ?? "public");
    const filename = typeof filenameInput === "string" && filenameInput
      ? safeName(filenameInput)
      : `${Date.now()}.bin`;

    // Resolve business for quota gate.
    const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    let businessId: string | null = typeof businessIdInput === "string" && businessIdInput ? businessIdInput : null;
    if (!businessId && typeof collectionTokenInput === "string" && collectionTokenInput) {
      const { data, error } = await sbAdmin.rpc("business_id_for_collection_token", { _token: collectionTokenInput });
      if (error) errLog("token_resolve_error", { error: error.message });
      businessId = (data as string) ?? null;
      if (!businessId) errLog("token_resolve_empty");
    }

    // Authorization: dashboard uploads must come from a business member.
    // Public testimonial uploads must include a valid collection_token.
    if (!businessId && !userId) {
      errLog("unauthorized_no_business_no_user");
      return json({ error: "Unauthorized", code: "unauthorized" }, 401);
    }
    if (businessId && userId && typeof businessIdInput === "string" && businessIdInput) {
      const { data: membership } = await sbAdmin
        .from("business_users")
        .select("role")
        .eq("business_id", businessId)
        .eq("user_id", userId)
        .maybeSingle();
      const { data: profile } = await sbAdmin.from("users").select("is_admin").eq("id", userId).maybeSingle();
      if (!membership && !profile?.is_admin) {
        errLog("forbidden_not_member", { userId, businessId });
        return json({ error: "Forbidden", code: "forbidden" }, 403);
      }
    }

    // Storage-limit gate (media only).
    if (kind === "media" && businessId) {
      const { data: allowed } = await sbAdmin.rpc("can_upload_media", { _business_id: businessId, _additional_bytes: blob.size });
      if (allowed === false) {
        errLog("storage_limit", { businessId, size: blob.size });
        return json({ error: "storage_limit_reached", code: "storage_limit_reached", message: "This business has reached its media storage limit." }, 413);
      }
    }

    const zone = kind === "media" ? BUNNY_MEDIA_ZONE : BUNNY_ASSETS_ZONE;
    const password = kind === "media" ? BUNNY_MEDIA_PASSWORD : BUNNY_ASSETS_PASSWORD;
    if (!zone || !password || !BUNNY_CDN_HOSTNAME) {
      const missing: string[] = [];
      if (!BUNNY_CDN_HOSTNAME) missing.push("BUNNY_CDN_HOSTNAME");
      if (!zone) missing.push(kind === "media" ? "BUNNY_MEDIA_ZONE" : "BUNNY_ASSETS_ZONE");
      if (!password) missing.push(kind === "media" ? "BUNNY_MEDIA_PASSWORD" : "BUNNY_ASSETS_PASSWORD");
      errLog("bunny_not_configured", { missing, kind });
      return json({ error: "Bunny CDN is not configured", code: "bunny_not_configured" }, 503);
    }

    const path = `${folder}/${Date.now()}_${filename}`;
    const upload_url = `${BUNNY_STORAGE_ENDPOINT}/${zone}/${path}`;
    const public_url = `https://${BUNNY_CDN_HOSTNAME}/${path}`;

    const startedAt = Date.now();
    const res = await fetch(upload_url, {
      method: "PUT",
      headers: {
        AccessKey: password,
        "Content-Type": contentType,
      },
      body: blob,
    });
    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      errLog("bunny_upload_failed", { status: res.status, elapsedMs, detail: text.slice(0, 200), zone, path });
      return json({ error: `Upload failed: ${res.status}`, code: "bunny_upload_failed", detail: text.slice(0, 200) }, 502);
    }

    log("bunny_upload_ok", { elapsedMs, size: blob.size, public_url });
    return json({ ok: true, public_url });
  } catch (e) {
    errLog("unhandled", { error: e instanceof Error ? e.message : String(e) });
    return json({ error: e instanceof Error ? e.message : "Unexpected error", code: "unhandled" }, 500);
  }
});
