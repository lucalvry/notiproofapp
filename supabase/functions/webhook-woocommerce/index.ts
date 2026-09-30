// WooCommerce webhook receiver: verifies HMAC, stores events, creates a
// purchase proof_object, and (if the integration has auto_request_enabled)
// queues a scheduled testimonial request.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { decryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-wc-webhook-signature, x-wc-webhook-topic, x-wc-webhook-source, x-wc-webhook-event, x-wc-webhook-resource, x-wc-webhook-id, x-wc-webhook-delivery-id",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Sprint 6: WC product enrichment ---------------------------------------

async function fetchWcProduct(
  storeUrl: string,
  ck: string,
  cs: string,
  productId: string,
): Promise<Record<string, any> | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    const res = await fetch(`${storeUrl}/wp-json/wc/v3/products/${productId}`, {
      signal: ctrl.signal,
      headers: {
        Authorization: "Basic " + btoa(`${ck}:${cs}`),
        Accept: "application/json",
      },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("fetchWcProduct failed", productId, (e as Error).message);
    return null;
  }
}

async function enrichWithWcProducts(
  supabase: any,
  integrationId: string,
  businessId: string,
  proofObjectId: string,
  orderPayload: any,
): Promise<void> {
  const lineItems: any[] = Array.isArray(orderPayload?.line_items)
    ? orderPayload.line_items
    : [];
  if (lineItems.length === 0) return;

  let storeUrl: string | null = null;
  let ck: string | null = null;
  let cs: string | null = null;
  try {
    const { data: integRow } = await supabase
      .from("integrations")
      .select("config, credentials, credentials_encrypted")
      .eq("id", integrationId)
      .maybeSingle();
    storeUrl =
      (integRow?.config?.store_url as string | undefined) ??
      (integRow?.config?.storeUrl as string | undefined) ??
      null;
    let creds: Record<string, string | undefined> = {};
    if (piiEncryptionEnabled && integRow?.credentials_encrypted) {
      creds = (await decryptJson<Record<string, string | undefined>>(
        integRow.credentials_encrypted as unknown as string,
      )) ?? {};
    } else {
      creds = (integRow?.credentials ?? {}) as Record<string, string | undefined>;
    }
    ck = (creds.consumer_key as string | undefined) ?? null;
    cs = (creds.consumer_secret as string | undefined) ?? null;
  } catch (e) {
    console.warn("could not load wc integration credentials", e);
  }

  const currency: string | null = orderPayload?.currency ?? null;
  const currencyTrim = currency ? currency.slice(0, 8) : null;

  const rows: any[] = [];
  for (let i = 0; i < lineItems.length; i++) {
    const li = lineItems[i];
    const productIdExternal =
      li.product_id != null ? String(li.product_id) : `unknown:${i}`;
    const variantIdExternal =
      li.variation_id != null && li.variation_id !== 0 ? String(li.variation_id) : null;
    const productName = (li.name && String(li.name).trim()) || "Untitled product";
    const variantLabel = Array.isArray(li.meta_data) && li.meta_data.length > 0
      ? li.meta_data
          .map((m: any) => (m?.display_key && m?.display_value
            ? `${m.display_key}: ${m.display_value}`
            : null))
          .filter(Boolean)
          .join(" / ")
          .slice(0, 200) || null
      : null;
    const quantity = Math.max(1, Math.min(10_000, Number(li.quantity ?? 1) | 0));
    const priceNum = li.price != null && li.price !== "" ? Number(li.price)
      : (li.total != null && li.total !== "" && li.quantity
          ? Number(li.total) / Number(li.quantity)
          : null);

    let productUrl: string | null = null;
    let productImageUrl: string | null = (li?.image?.src as string | undefined) ?? null;
    let productCategory: string | null = null;
    const allImages: string[] = [];

    if (storeUrl && ck && cs && li.product_id != null) {
      const product = await fetchWcProduct(storeUrl, ck, cs, String(li.product_id));
      if (product) {
        if (product.permalink) productUrl = String(product.permalink);
        if (Array.isArray(product.images)) {
          for (const img of product.images) {
            if (img?.src && typeof img.src === "string") allImages.push(img.src);
          }
          if (!productImageUrl && allImages.length > 0) productImageUrl = allImages[0];
        }
        if (Array.isArray(product.categories) && product.categories.length > 0) {
          productCategory = String(product.categories[0]?.name ?? "").slice(0, 200) || null;
        }
      }
    }

    rows.push({
      proof_object_id: proofObjectId,
      business_id: businessId,
      is_primary: i === 0,
      product_id_external: productIdExternal,
      variant_id_external: variantIdExternal,
      product_name: productName.slice(0, 500),
      variant_label: variantLabel,
      product_url: productUrl,
      product_image_url: productImageUrl,
      product_images_all: allImages,
      product_category: productCategory,
      product_price: Number.isFinite(priceNum as number) ? priceNum : null,
      currency: currencyTrim,
      quantity,
      source_platform: "woocommerce",
      raw_product_payload: { line_item: li },
    });
  }

  if (rows.length === 0) return;
  const { error: insErr } = await supabase.from("proof_product_items").insert(rows);
  if (insErr) console.error("proof_product_items insert failed", insErr);
}

// --------------------------------------------------------------------------

async function verifyHmac(raw: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  if (expected.length !== header.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ header.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function maybeCreateTestimonialRequest(
  supabase: any,
  integ: { auto_request_enabled?: boolean | null; auto_request_delay_days?: number | null },
  businessId: string,
  proofId: string,
  customerEmail: string | null,
  customerName: string | null,
) {
  if (!integ.auto_request_enabled || !customerEmail) return;
  const delayDays = Math.max(0, Math.min(60, integ.auto_request_delay_days ?? 14));
  const now = Date.now();
  const sendAt = new Date(now + delayDays * 86400_000).toISOString();
  const expires = new Date(now + (delayDays + 14) * 86400_000).toISOString();

  const { data: req, error: reqErr } = await supabase
    .from("testimonial_requests")
    .insert({
      business_id: businessId,
      proof_object_id: proofId,
      recipient_email: customerEmail,
      recipient_name: customerName,
      requested_type: "testimonial",
      prompt_questions: [],
      status: "scheduled",
      expires_at: expires,
    })
    .select("id")
    .single();
  if (reqErr || !req) {
    console.error("testimonial_requests insert failed", reqErr);
    return;
  }

  await supabase.from("scheduled_jobs").insert({
    business_id: businessId,
    job_type: "send_testimonial_email",
    payload: { testimonial_request_id: req.id },
    run_at: sendAt,
    status: "pending",
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `webhook-woocommerce:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");
  if (!integrationId) return json({ error: "Missing integration_id" }, 400);

  const raw = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");
  const topic = req.headers.get("x-wc-webhook-topic") ?? "unknown";
  const wcDeliveryId = req.headers.get("x-wc-webhook-delivery-id") ?? req.headers.get("x-wc-webhook-id");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: integ } = await supabase
    .from("integrations")
    .select("id, business_id, platform, auto_request_enabled, auto_request_delay_days, config")
    .eq("id", integrationId)
    .maybeSingle();

  if (!integ || integ.platform !== "woocommerce") return json({ error: "Integration not found" }, 404);

  const webhookSecret = (integ.config as any)?.webhook_secret as string | undefined;

  if (!raw || raw === "{}") return json({ received: true, ping: true });

  if (webhookSecret) {
    const ok = await verifyHmac(raw, signature, webhookSecret);
    if (!ok) return json({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const externalEventId = wcDeliveryId ?? (payload?.id ? `${topic}:${payload.id}` : null);

  // Step 1: store the raw event.
  const { data: evRow, error: insertError } = await supabase
    .from("integration_events")
    .insert({
      business_id: integ.business_id,
      integration_id: integ.id,
      event_type: topic,
      payload,
      external_event_id: externalEventId,
      status: "received",
    })
    .select("id")
    .single();

  // Step 2: dedupe.
  if (insertError && (insertError.code === "23505" || /duplicate key/i.test(insertError.message))) {
    await supabase.from("integration_events").insert({
      business_id: integ.business_id,
      integration_id: integ.id,
      event_type: topic,
      payload: { duplicate_of: externalEventId },
      status: "duplicate",
    });
    return json({ received: true, duplicate: true });
  }

  let proofId: string | null = null;
  let handlerError: string | null = null;
  let customerEmail: string | null = null;
  let customerName: string | null = null;

  try {
    // Only auto-create proof for completed/processing orders.
    const isOrderEvent = topic.startsWith("order.");
    const status = (payload?.status ?? "") as string;
    const isCompleted = topic === "order.completed" || status === "completed" || status === "processing";

    if (isOrderEvent && isCompleted) {
      const orderId = String(payload.id ?? "");
      const sourceRef = orderId ? `wc:${orderId}` : null;

      const billing = payload.billing ?? {};
      customerEmail = (billing.email ?? payload.email ?? null) || null;
      customerName = [billing.first_name, billing.last_name].filter(Boolean).join(" ") || null;
      const productReference: string | null =
        Array.isArray(payload.line_items) && payload.line_items.length > 0
          ? payload.line_items.map((li: any) => li?.name).filter(Boolean).join(", ") || null
          : null;

      // Idempotency: skip if a proof_object already exists for this order.
      let existing: { id: string } | null = null;
      if (orderId) {
        const { data } = await supabase
          .from("proof_objects")
          .select("id")
          .eq("business_id", integ.business_id)
          .eq("source", "woocommerce")
          .eq("external_ref_id", orderId)
          .maybeSingle();
        existing = data ?? null;
      }

      if (!existing) {
        const total = payload.total ? `${payload.total} ${payload.currency ?? "USD"}` : "an order";
        const location = [billing.city, billing.country].filter(Boolean).join(", ") || null;

        const { data: po, error: poErr } = await supabase
          .from("proof_objects")
          .insert({
            business_id: integ.business_id,
            type: "purchase",
            proof_type: "purchase",
            status: "approved",
            verified: true,
            verification_tier_int: 1,
            verification_tier: "verified",
            verification_method: "purchase_matched",
            source: "woocommerce",
            source_metadata: { topic, order_id: payload.id, source_ref: sourceRef, location },
            external_ref_id: orderId || null,
            product_reference: productReference,
            author_name: customerName,
            author_email: customerEmail, // hashed by trigger
            content: `Ordered ${total}`,
            published_at: new Date().toISOString(),
            proof_event_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (poErr) throw poErr;
        proofId = po?.id ?? null;
      } else {
        proofId = existing.id;
      }

      if (proofId) {
        // Sprint 6: enrich with product items (best-effort, never blocks).
        try {
          await enrichWithWcProducts(
            supabase,
            integ.id,
            integ.business_id,
            proofId,
            payload,
          );
        } catch (e) {
          console.warn("wc product enrichment failed", (e as Error).message);
        }

        await maybeCreateTestimonialRequest(
          supabase,
          integ,
          integ.business_id,
          proofId,
          customerEmail,
          customerName,
        );
      }
    }
  } catch (e) {
    handlerError = (e as Error).message;
    console.error("woocommerce handler error", e);
  }

  if (evRow?.id) {
    await supabase.from("integration_events").update({
      processed_at: handlerError ? null : new Date().toISOString(),
      proof_object_id: proofId,
      status: handlerError ? "failed" : "processed",
      error_message: handlerError,
    }).eq("id", evRow.id);
  }

  await supabase.from("integrations").update({
    status: "connected",
    last_sync_at: new Date().toISOString(),
  }).eq("id", integ.id);

  return json({ received: true, proof_object_id: proofId });
});
