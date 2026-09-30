// EF-10: fetch-product-from-url
// Pure utility. Fetches a product page and extracts structured metadata
// using Open Graph → JSON-LD → Twitter Card → <title> fallbacks.
// Results are cached in public.url_fetch_cache for 24h.
//
// Called from the authenticated app's manual "Add product" flow.
// Requires a valid Supabase user JWT (Authorization: Bearer ...).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB cap on HTML
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface ProductPayload {
  url: string;
  canonical_url?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  price?: string | null;
  currency?: string | null;
  brand?: string | null;
  site_name?: string | null;
  fetched_at: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    // Block obvious SSRF targets.
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host)
    ) {
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NotiProofBot/1.0; +https://notiproof.xyz/bot)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    const decoder = new TextDecoder("utf-8");
    let total = 0;
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          try { await reader.cancel(); } catch { /* noop */ }
          break;
        }
        html += decoder.decode(value, { stream: true });
      }
    }
    html += decoder.decode();
    return html;
  } catch (_e) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function getMeta(html: string, attr: "property" | "name", key: string): string | null {
  const re = new RegExp(
    `<meta[^>]+${attr}=["']${key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}["'][^>]*>`,
    "i",
  );
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() : null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).trim() : null;
}

function getCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
  if (!m) return null;
  const href = m.match(/href=["']([^"']+)["']/i)?.[1];
  return href ? decodeEntities(href).trim() : null;
}

interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string };
  brand?: string | { name?: string };
  offers?:
    | { price?: string | number; priceCurrency?: string }
    | Array<{ price?: string | number; priceCurrency?: string }>;
}

function findJsonLdProduct(html: string): JsonLdProduct | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const candidates: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    // Also unwrap @graph arrays.
    const expanded: unknown[] = [];
    for (const c of candidates) {
      if (c && typeof c === "object" && Array.isArray((c as Record<string, unknown>)["@graph"])) {
        expanded.push(...((c as Record<string, unknown>)["@graph"] as unknown[]));
      } else {
        expanded.push(c);
      }
    }
    for (const c of expanded) {
      if (!c || typeof c !== "object") continue;
      const t = (c as Record<string, unknown>)["@type"];
      const isProduct = Array.isArray(t)
        ? t.some((x) => typeof x === "string" && x.toLowerCase() === "product")
        : typeof t === "string" && t.toLowerCase() === "product";
      if (isProduct) return c as JsonLdProduct;
    }
  }
  return null;
}

function pickJsonLdImage(image: JsonLdProduct["image"]): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return typeof image[0] === "string" ? image[0] : null;
  if (typeof image === "object" && typeof image.url === "string") return image.url;
  return null;
}

function pickJsonLdOffer(
  offers: JsonLdProduct["offers"],
): { price: string | null; currency: string | null } {
  if (!offers) return { price: null, currency: null };
  const first = Array.isArray(offers) ? offers[0] : offers;
  if (!first || typeof first !== "object") return { price: null, currency: null };
  const price = first.price != null ? String(first.price) : null;
  const currency = typeof first.priceCurrency === "string" ? first.priceCurrency : null;
  return { price, currency };
}

function absolutize(maybeUrl: string | null | undefined, base: URL): string | null {
  if (!maybeUrl) return null;
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return null;
  }
}

function extractProduct(html: string, requestedUrl: URL): ProductPayload {
  // 1. JSON-LD (highest fidelity)
  const ld = findJsonLdProduct(html);
  const ldImage = ld ? pickJsonLdImage(ld.image) : null;
  const ldOffer = pickJsonLdOffer(ld?.offers);
  const ldBrand = ld?.brand
    ? typeof ld.brand === "string"
      ? ld.brand
      : ld.brand.name ?? null
    : null;

  // 2. Open Graph
  const ogTitle = getMeta(html, "property", "og:title");
  const ogDesc = getMeta(html, "property", "og:description");
  const ogImage = getMeta(html, "property", "og:image:secure_url") ||
    getMeta(html, "property", "og:image");
  const ogSite = getMeta(html, "property", "og:site_name");
  const ogPrice = getMeta(html, "property", "product:price:amount") ||
    getMeta(html, "property", "og:price:amount");
  const ogCurrency = getMeta(html, "property", "product:price:currency") ||
    getMeta(html, "property", "og:price:currency");

  // 3. Twitter Card
  const twTitle = getMeta(html, "name", "twitter:title");
  const twDesc = getMeta(html, "name", "twitter:description");
  const twImage = getMeta(html, "name", "twitter:image");

  // 4. Generic meta description / <title>
  const metaDesc = getMeta(html, "name", "description");
  const docTitle = getTitle(html);

  const canonical = getCanonical(html);
  const base = canonical ? (() => { try { return new URL(canonical, requestedUrl); } catch { return requestedUrl; } })() : requestedUrl;

  const name = ld?.name ?? ogTitle ?? twTitle ?? docTitle ?? null;
  const description = ld?.description ?? ogDesc ?? twDesc ?? metaDesc ?? null;
  const image_url = absolutize(ldImage ?? ogImage ?? twImage, base);
  const price = ldOffer.price ?? ogPrice ?? null;
  const currency = ldOffer.currency ?? ogCurrency ?? null;

  return {
    url: requestedUrl.toString(),
    canonical_url: absolutize(canonical, requestedUrl),
    name: name ? name.slice(0, 500) : null,
    description: description ? description.slice(0, 2000) : null,
    image_url,
    price: price ? String(price).slice(0, 32) : null,
    currency: currency ? currency.slice(0, 8) : null,
    brand: ldBrand ? String(ldBrand).slice(0, 200) : null,
    site_name: ogSite ? ogSite.slice(0, 200) : null,
    fetched_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
    return jsonResponse({ error: "Server not configured" }, 500);
  }

  // Require a signed-in user. This function is meant to be invoked from the
  // authenticated app; never expose it as an open scraping proxy.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { url?: unknown; force?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (typeof body.url !== "string" || body.url.length === 0 || body.url.length > 2048) {
    return jsonResponse({ error: "Missing or invalid `url`" }, 400);
  }

  const normalized = normalizeUrl(body.url);
  if (!normalized) {
    return jsonResponse({ error: "URL must be a public http(s) address" }, 400);
  }
  const cacheKey = normalized.toString();
  const force = body.force === true;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Try cache first.
  if (!force) {
    const { data: cached } = await admin
      .from("url_fetch_cache")
      .select("payload, fetched_at")
      .eq("url", cacheKey)
      .maybeSingle();
    if (cached) {
      const age = Date.now() - new Date(cached.fetched_at as string).getTime();
      if (age < CACHE_TTL_MS) {
        return jsonResponse({ cached: true, age_ms: age, product: cached.payload });
      }
    }
  }

  const html = await fetchHtml(cacheKey);
  if (!html) {
    return jsonResponse({ error: "Could not fetch the page" }, 502);
  }

  const payload = extractProduct(html, normalized);

  // Treat as a hit only when we extracted at least a name or image.
  if (!payload.name && !payload.image_url) {
    return jsonResponse(
      { error: "No product metadata found on the page", product: payload },
      422,
    );
  }

  // Upsert cache (best effort).
  const { error: upsertErr } = await admin
    .from("url_fetch_cache")
    .upsert({ url: cacheKey, payload: payload, fetched_at: new Date().toISOString() });
  if (upsertErr) {
    console.error("url_fetch_cache upsert failed", upsertErr);
  }

  return jsonResponse({ cached: false, product: payload });
});
