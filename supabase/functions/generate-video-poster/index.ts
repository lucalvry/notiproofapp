// Generates an SVG poster image for a video proof and uploads it to Bunny CDN.
// Optionally updates proof_objects.poster_url when proof_id is supplied.
//
// Auth: caller must either send a valid Supabase JWT for a member of the
// target business, OR forward a public collection token (x-collection-token)
// that resolves to the same business via testimonial_requests.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-collection-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUNNY_CDN_HOSTNAME = Deno.env.get("BUNNY_CDN_HOSTNAME") ?? "";
const BUNNY_MEDIA_ZONE = Deno.env.get("BUNNY_MEDIA_ZONE") ?? "";
const BUNNY_MEDIA_PASSWORD = Deno.env.get("BUNNY_MEDIA_PASSWORD") ?? "";
const BUNNY_STORAGE_ENDPOINT = "https://storage.bunnycdn.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== "string") return false;
  try { const u = new URL(v); return u.protocol === "https:" || u.protocol === "http:"; } catch { return false; }
}

function escapeXml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]!));
}

function makePosterSvg({ initial, brand }: { initial: string; brand: string }) {
  const safeBrand = /^#?[0-9a-fA-F]{3,8}$/.test(brand) ? (brand.startsWith("#") ? brand : `#${brand}`) : "#6366f1";
  const i = escapeXml((initial || "?").charAt(0).toUpperCase());
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${safeBrand}" stop-opacity="1"/>
      <stop offset="1" stop-color="${safeBrand}" stop-opacity="0.78"/>
    </linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.5" r="0.7">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="320" height="320" fill="url(#g)"/>
  <text x="160" y="186" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif"
        font-size="148" font-weight="700" fill="#ffffff" fill-opacity="0.92"
        text-anchor="middle">${i}</text>
  <rect width="320" height="320" fill="url(#v)"/>
</svg>`;
}

async function uploadToBunny(path: string, body: string, contentType: string) {
  if (!BUNNY_MEDIA_ZONE || !BUNNY_MEDIA_PASSWORD || !BUNNY_CDN_HOSTNAME) {
    throw new Error("Bunny CDN is not configured");
  }
  const upload_url = `${BUNNY_STORAGE_ENDPOINT}/${BUNNY_MEDIA_ZONE}/${path}`;
  const res = await fetch(upload_url, {
    method: "PUT",
    headers: { AccessKey: BUNNY_MEDIA_PASSWORD, "Content-Type": contentType },
    body,
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status} ${res.statusText}`);
  return `https://${BUNNY_CDN_HOSTNAME}/${path}`;
}

async function authorize(req: Request, businessId: string): Promise<{ ok: boolean; reason?: string }> {
  const auth = req.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } });
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) return { ok: false, reason: "invalid jwt" };
    const { data: member } = await sb.rpc("is_business_member", { _business_id: businessId });
    const { data: admin } = await sb.rpc("is_platform_admin");
    if (member || admin) return { ok: true };
    return { ok: false, reason: "not a member" };
  }
  const token = req.headers.get("x-collection-token");
  if (token && /^[a-f0-9]{16,128}$/i.test(token)) {
    const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data } = await svc
      .from("testimonial_requests")
      .select("business_id, expires_at")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data?.business_id === businessId) return { ok: true };
    return { ok: false, reason: "invalid token" };
  }
  return { ok: false, reason: "missing auth" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { proof_id, business_id, media_url, author_name, brand_color } = body ?? {};

    if (!isUuid(business_id)) return json({ error: "invalid business_id" }, 400);
    if (!isHttpUrl(media_url) || (media_url as string).length > 2000) return json({ error: "invalid media_url" }, 400);
    if (proof_id != null && !isUuid(proof_id)) return json({ error: "invalid proof_id" }, 400);
    if (author_name != null && (typeof author_name !== "string" || author_name.length > 200)) {
      return json({ error: "invalid author_name" }, 400);
    }
    if (brand_color != null && (typeof brand_color !== "string" || brand_color.length > 16)) {
      return json({ error: "invalid brand_color" }, 400);
    }

    const auth = await authorize(req, business_id);
    if (!auth.ok) return json({ error: auth.reason ?? "unauthorized" }, 401);

    // Tier-1 SVG poster (always works, zero cost). Future: tier-2 real frame extraction.
    const svg = makePosterSvg({
      initial: typeof author_name === "string" ? author_name : "P",
      brand: typeof brand_color === "string" ? brand_color : "#6366f1",
    });

    const stamp = Date.now();
    const stem = proof_id ?? `${stamp}_${Math.random().toString(36).slice(2, 8)}`;
    const path = `posters/${business_id}/${stem}.svg`;
    const poster_url = await uploadToBunny(path, svg, "image/svg+xml");

    if (proof_id) {
      const svc = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { error: updErr } = await svc
        .from("proof_objects")
        .update({ poster_url })
        .eq("id", proof_id)
        .eq("business_id", business_id);
      if (updErr) return json({ error: `db update failed: ${updErr.message}`, poster_url }, 500);
    }

    return json({ ok: true, poster_url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
