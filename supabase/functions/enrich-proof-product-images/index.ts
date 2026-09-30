// EF-09: enrich-proof-product-images
// Downloads a product image referenced by a proof_product_items row, uploads
// it to the `proof-media` bucket, and updates the row + parent proof object.
//
// Invoked via pg_net from the AFTER INSERT/UPDATE trigger on
// proof_product_items, OR manually with { proof_product_item_id }.
//
// Auth: requires header x-internal-secret == INTERNAL_TRIGGER_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 10_000;
const BUCKET = "proof-media";

interface Payload {
  proof_product_item_id?: string;
}

function extFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  const c = ct.toLowerCase();
  if (c.includes("png")) return "png";
  if (c.includes("webp")) return "webp";
  if (c.includes("gif")) return "gif";
  if (c.includes("svg")) return "svg";
  return "jpg";
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "NotiProof/1.0 (+https://notiproof.com/bot)" },
    });
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const internalSecret = Deno.env.get("INTERNAL_TRIGGER_SECRET");
  if (!internalSecret || req.headers.get("x-internal-secret") !== internalSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const itemId = body.proof_product_item_id;
  if (!itemId) {
    return new Response(JSON.stringify({ error: "missing proof_product_item_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: item, error: loadErr } = await supabase
    .from("proof_product_items")
    .select("id, business_id, proof_object_id, product_id_external, product_image_url, image_fetch_status, retry_count")
    .eq("id", itemId)
    .maybeSingle();

  if (loadErr || !item) {
    return new Response(JSON.stringify({ error: "item not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!item.product_image_url) {
    await supabase
      .from("proof_product_items")
      .update({ image_fetch_status: "failed", image_fetch_error: "no source image url" })
      .eq("id", itemId);
    return new Response(JSON.stringify({ ok: false, reason: "no image url" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Skip if already cached, unless the caller asks us to re-run.
  if (item.image_fetch_status === "cached") {
    return new Response(JSON.stringify({ ok: true, skipped: "already cached" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recordFailure = async (msg: string) => {
    await supabase
      .from("proof_product_items")
      .update({
        image_fetch_status: "failed",
        image_fetch_error: msg.slice(0, 500),
        retry_count: (item.retry_count ?? 0) + 1,
      })
      .eq("id", itemId);
  };

  let resp: Response;
  try {
    resp = await fetchWithTimeout(item.product_image_url, FETCH_TIMEOUT_MS);
  } catch (e) {
    await recordFailure(`fetch failed: ${(e as Error).message}`);
    return new Response(JSON.stringify({ ok: false, error: "fetch failed" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!resp.ok) {
    await recordFailure(`http ${resp.status}`);
    return new Response(JSON.stringify({ ok: false, error: `http ${resp.status}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ct = resp.headers.get("content-type");
  if (!ct || !ct.toLowerCase().startsWith("image/")) {
    await recordFailure(`not an image (content-type=${ct ?? "null"})`);
    return new Response(JSON.stringify({ ok: false, error: "not an image" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const buf = new Uint8Array(await resp.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) {
    await recordFailure(`too large (${buf.byteLength} bytes)`);
    return new Response(JSON.stringify({ ok: false, error: "too large" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ext = extFromContentType(ct);
  const path = `product-images/${item.business_id}/${item.proof_object_id}/${item.product_id_external}/original.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: ct,
    upsert: true,
  });
  if (upErr) {
    await recordFailure(`upload failed: ${upErr.message}`);
    return new Response(JSON.stringify({ ok: false, error: upErr.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const cachedUrl = pub.publicUrl;

  const { error: updErr } = await supabase
    .from("proof_product_items")
    .update({
      product_image_cached: cachedUrl,
      image_fetch_status: "cached",
      image_fetch_error: null,
    })
    .eq("id", itemId);

  if (updErr) {
    return new Response(JSON.stringify({ ok: false, error: updErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Trigger sync_proof_product_denorm already updates proof_objects.
  return new Response(JSON.stringify({ ok: true, cached_url: cachedUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
