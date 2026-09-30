import { supabase } from "@/integrations/supabase/client";

export interface BunnyUploadOptions {
  kind?: "media" | "assets";
  folder?: string;
  filename: string;
  contentType: string;
  blob: Blob;
  /** Owning business — enables server-side storage limit check on dashboard uploads. */
  businessId?: string;
  /** Public testimonial token — enables storage check for unauthenticated uploads. */
  collectionToken?: string;
}

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Uploads a file via the bunny-upload-url edge function. The function proxies
 * the upload to Bunny CDN server-side so the storage-zone write key never
 * reaches the browser. Returns the public CDN URL on success.
 *
 * Falls back to Supabase Storage (`proof-media`) only if Bunny isn't configured.
 */
export async function uploadToBunny({ kind = "media", folder, filename, contentType, blob, businessId, collectionToken }: BunnyUploadOptions): Promise<string> {
  if (!SUPABASE_URL) throw new Error("Supabase URL is not configured");

  const form = new FormData();
  form.append("file", blob, filename);
  form.append("kind", kind);
  if (folder) form.append("folder", folder);
  form.append("filename", filename);
  form.append("content_type", contentType);
  if (businessId) form.append("business_id", businessId);
  if (collectionToken) form.append("collection_token", collectionToken);

  const headers: Record<string, string> = {};
  // Auth header: pass the user session if available, otherwise the anon/publishable key.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (SUPABASE_PUBLISHABLE_KEY) {
    headers["Authorization"] = `Bearer ${SUPABASE_PUBLISHABLE_KEY}`;
    headers["apikey"] = SUPABASE_PUBLISHABLE_KEY;
  }

  const url = `${SUPABASE_URL}/functions/v1/bunny-upload-url`;
  const controller = new AbortController();
  // Generous timeout: photos are small but mobile connections can be slow,
  // and Bunny upload from the edge function can occasionally take 30s+.
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const name = (err as Error)?.name ?? "";
    console.error("[uploadToBunny] network/fetch error", { url, err });
    if (name === "AbortError") {
      throw new Error("Upload timed out. Please try again on a stronger connection.");
    }
    throw new Error("Could not reach the upload service. Check your connection and try again.");
  }
  clearTimeout(timeoutId);

  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }

  // Hard-stop errors: do NOT fall back. Surface clearly.
  if ((data?.error ?? "") === "storage_limit_reached" || (data?.code ?? "") === "storage_limit_reached") {
    throw new Error("This business has reached its media storage limit. Please upgrade or free space.");
  }

  // Success path.
  if (res.ok && data?.ok && typeof data.public_url === "string") {
    return data.public_url as string;
  }

  // Failure path. For PUBLIC testimonial uploads (collectionToken present),
  // always fall back to the public `testimonials` Supabase Storage bucket so
  // a flaky Bunny/proxy never destroys the submitter's photo. The bucket has
  // a public INSERT policy and is safe for unauthenticated callers.
  console.error("[uploadToBunny] bunny upload failed", {
    status: res.status,
    code: data?.code,
    error: data?.error,
    detail: typeof data?.detail === "string" ? data.detail.slice(0, 200) : undefined,
  });

  const isPublic = !!collectionToken;
  if (isPublic || (res.status === 503 && (data?.error ?? "").includes("not configured"))) {
    const bucket = isPublic ? "testimonials" : "proof-media";
    const folderPart = isPublic
      ? `public/${(collectionToken ?? "anon").slice(0, 64)}`
      : (folder ?? "public");
    const path = `${folderPart}/${Date.now()}_${filename}`;
    console.warn("[uploadToBunny] falling back to Supabase Storage", { bucket, path });
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: false });
    if (upErr) {
      console.error("[uploadToBunny] storage fallback failed", { bucket, path, error: upErr });
      throw new Error(
        `Photo upload failed. Bunny: ${data?.error ?? `HTTP ${res.status}`}. Fallback: ${upErr.message}`,
      );
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return pub.publicUrl;
  }

  const detail = data?.detail ? ` (${String(data.detail).slice(0, 120)})` : "";
  throw new Error(`${data?.error ?? `Upload failed (${res.status})`}${detail}`);
}

export interface GeneratePosterOptions {
  businessId: string;
  mediaUrl: string;
  proofId?: string;
  authorName?: string | null;
  brandColor?: string | null;
  /** Optional public collection token for unauthenticated callers (testimonial submission flow). */
  collectionToken?: string;
}

/**
 * Asks the generate-video-poster edge function to produce a poster image
 * for a video proof. Best-effort: never throws. Returns the poster URL or null.
 */
export async function generateVideoPoster(opts: GeneratePosterOptions): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (opts.collectionToken) headers["x-collection-token"] = opts.collectionToken;
    const { data, error } = await supabase.functions.invoke("generate-video-poster", {
      body: {
        business_id: opts.businessId,
        media_url: opts.mediaUrl,
        proof_id: opts.proofId,
        author_name: opts.authorName ?? undefined,
        brand_color: opts.brandColor ?? undefined,
      },
      headers,
    });
    if (error || !data?.ok) return null;
    return (data.poster_url as string) ?? null;
  } catch {
    return null;
  }
}
