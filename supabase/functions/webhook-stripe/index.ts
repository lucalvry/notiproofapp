// Stripe webhook receiver:
//   1. Verifies signature.
//   2. For BILLING events (subscription/checkout/invoice) → updates the
//      business plan tier, limits, and subscription identifiers based on the
//      Stripe customer ID. Does NOT require an integration_id query param.
//   3. For INTEGRATION events (purchases, refunds, etc.) routed with an
//      ?integration_id=... param, stores integration_events and creates
//      proof_objects for qualifying events (legacy behavior, preserved).
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

// Plan limits — keep in sync with src/lib/plans.ts
const PLAN_LIMITS: Record<string, { proof: number; events: number }> = {
  free:    { proof: 100,     events: 10_000 },
  starter: { proof: 1_000,   events: 100_000 },
  growth:  { proof: 10_000,  events: 1_000_000 },
  agency:  { proof: 100_000, events: 10_000_000 },
};

// Optional secret pointing at the Stripe price ID used for extra-seat add-ons.
// When present, the webhook reconciles `extra_seats_purchased` from the
// quantity of any subscription line item matching this price.
const EXTRA_SEAT_PRICE_ID = Deno.env.get("STRIPE_PRICE_EXTRA_SEAT") ?? null;

// Map Stripe price IDs (read from secrets) to plan keys. Supports both
// monthly and yearly price IDs per plan.
function priceIdToPlan(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string> = {};
  const entries: Array<[string | undefined, string]> = [
    [Deno.env.get("STRIPE_PRICE_STARTER_MONTHLY"), "starter"],
    [Deno.env.get("STRIPE_PRICE_STARTER_YEARLY"), "starter"],
    [Deno.env.get("STRIPE_PRICE_GROWTH_MONTHLY"), "growth"],
    [Deno.env.get("STRIPE_PRICE_GROWTH_YEARLY"), "growth"],
    [Deno.env.get("STRIPE_PRICE_AGENCY_MONTHLY"), "agency"],
    [Deno.env.get("STRIPE_PRICE_AGENCY_YEARLY"), "agency"],
    // Backwards-compat with single-interval secrets if still set.
    [Deno.env.get("STRIPE_PRICE_STARTER"), "starter"],
    [Deno.env.get("STRIPE_PRICE_GROWTH"), "growth"],
    [Deno.env.get("STRIPE_PRICE_AGENCY"), "agency"],
    // Legacy SCALE secrets (pre-rename) — keep mapping to 'agency' until rotated out.
    [Deno.env.get("STRIPE_PRICE_SCALE_MONTHLY"), "agency"],
    [Deno.env.get("STRIPE_PRICE_SCALE_YEARLY"), "agency"],
    [Deno.env.get("STRIPE_PRICE_SCALE"), "agency"],
  ];
  for (const [id, plan] of entries) {
    if (id) map[id] = plan;
  }
  return map[priceId] ?? null;
}

// Verify Stripe webhook signature (HMAC-SHA256) without the SDK.
async function verify(payload: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;
  const signed = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

// --- Sprint 6: Stripe product enrichment ----------------------------------
// Best-effort: reads embedded line_items from the event payload (only present
// when the merchant has configured expanded webhooks or when the event itself
// carries lines, e.g. invoice.payment_succeeded). Does not call the Stripe API.

async function enrichWithStripeProducts(
  supabase: any,
  businessId: string,
  proofObjectId: string,
  obj: Record<string, unknown>,
): Promise<void> {
  const lines: any[] = ((obj as any)?.line_items?.data as any[] | undefined)
    ?? ((obj as any)?.lines?.data as any[] | undefined)
    ?? [];
  if (!Array.isArray(lines) || lines.length === 0) return;

  const currency = ((obj as any)?.currency as string | undefined)?.toUpperCase()?.slice(0, 8) ?? null;

  const rows: any[] = [];
  for (let i = 0; i < lines.length; i++) {
    const li = lines[i] ?? {};
    const price = li.price ?? {};
    const product = (typeof price.product === "object" && price.product) ? price.product : {};
    const productIdExternal =
      (typeof price.product === "string" && price.product)
        || product?.id
        || price?.id
        || `stripe:${i}`;
    const productName: string =
      (product?.name as string | undefined)
      || (li.description as string | undefined)
      || "Purchased item";
    const productImageUrl: string | null = Array.isArray(product?.images) && product.images.length > 0
      ? String(product.images[0])
      : null;
    const productUrl: string | null = (product?.url as string | undefined) ?? null;
    const amount = (li.amount_total as number | undefined)
      ?? (li.amount as number | undefined)
      ?? (price.unit_amount as number | undefined)
      ?? null;
    const quantity = Math.max(1, Math.min(10_000, Number(li.quantity ?? 1) | 0));
    const priceNum = amount != null ? Number(amount) / 100 / quantity : null;

    rows.push({
      proof_object_id: proofObjectId,
      business_id: businessId,
      is_primary: i === 0,
      product_id_external: String(productIdExternal).slice(0, 200),
      variant_id_external: null,
      product_name: productName.slice(0, 500),
      variant_label: null,
      product_url: productUrl,
      product_image_url: productImageUrl,
      product_images_all: productImageUrl ? [productImageUrl] : [],
      product_category: null,
      product_price: Number.isFinite(priceNum as number) ? priceNum : null,
      currency,
      quantity,
      source_platform: "stripe",
      raw_product_payload: { line_item: li },
    });
  }

  if (rows.length === 0) return;
  const { error } = await supabase.from("proof_product_items").insert(rows);
  if (error) console.error("stripe proof_product_items insert failed", error);
}

const BILLING_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.payment_succeeded",
]);

async function handleBillingEvent(
  supabase: any,
  event: { type: string; data: { object: Record<string, unknown> } },
) {
  const obj = event.data.object as Record<string, unknown>;
  const customerId = (obj.customer as string) ?? null;
  if (!customerId) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, plan, plan_tier")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!business) return;

  const updates: Record<string, unknown> = {};

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const items = (obj.items as { data?: Array<{ price?: { id?: string }; quantity?: number }> } | undefined)?.data ?? [];
    // Find the plan-tier line item (first non-seat line). If EXTRA_SEAT_PRICE_ID
    // is configured, treat that line as a seat add-on instead of the plan.
    const planItem = items.find((it) => !EXTRA_SEAT_PRICE_ID || it.price?.id !== EXTRA_SEAT_PRICE_ID) ?? items[0];
    const priceId = planItem?.price?.id ?? null;
    const planKey = priceIdToPlan(priceId) ?? ((obj.metadata as Record<string, string> | undefined)?.plan_key ?? null);
    const status = obj.status as string;

    updates.stripe_subscription_id = obj.id as string;

    // Reconcile extra seat quantity from the seat add-on line, if configured.
    if (EXTRA_SEAT_PRICE_ID) {
      const seatLine = items.find((it) => it.price?.id === EXTRA_SEAT_PRICE_ID);
      updates.extra_seats_purchased = Math.max(0, seatLine?.quantity ?? 0);
    }

    if (status === "active" || status === "trialing") {
      const key = planKey ?? "free";
      updates.plan = key;
      updates.plan_tier = key;
      const limits = PLAN_LIMITS[key];
      if (limits) {
        updates.monthly_proof_limit = limits.proof;
        updates.monthly_event_limit = limits.events;
      }
      const periodEnd = obj.current_period_end as number | undefined;
      if (periodEnd) updates.plan_expires_at = new Date(periodEnd * 1000).toISOString();
    } else if (status === "canceled" || status === "incomplete_expired" || status === "unpaid") {
      updates.plan = "free";
      updates.plan_tier = "free";
      const limits = PLAN_LIMITS.free;
      updates.monthly_proof_limit = limits.proof;
      updates.monthly_event_limit = limits.events;
      updates.plan_expires_at = null;
      updates.extra_seats_purchased = 0;
    }
  } else if (event.type === "customer.subscription.deleted") {
    updates.plan = "free";
    updates.plan_tier = "free";
    updates.stripe_subscription_id = null;
    updates.plan_expires_at = null;
    updates.extra_seats_purchased = 0;
    const limits = PLAN_LIMITS.free;
    updates.monthly_proof_limit = limits.proof;
    updates.monthly_event_limit = limits.events;
  } else if (event.type === "checkout.session.completed") {
    // Persist the subscription id immediately so the UI can reflect changes
    // before the subscription.updated event arrives.
    const subId = (obj.subscription as string) ?? null;
    if (subId) updates.stripe_subscription_id = subId;
    const planKey = (obj.metadata as Record<string, string> | undefined)?.plan_key;
    if (planKey && PLAN_LIMITS[planKey]) {
      updates.plan = planKey;
      updates.plan_tier = planKey;
      updates.monthly_proof_limit = PLAN_LIMITS[planKey].proof;
      updates.monthly_event_limit = PLAN_LIMITS[planKey].events;
    }
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("businesses").update(updates).eq("id", business.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `webhook-stripe:${ip}`, max: 600, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  const url = new URL(req.url);
  const integrationId = url.searchParams.get("integration_id");

  const raw = await req.text();
  const sigHeader = req.headers.get("stripe-signature");

  if (STRIPE_WEBHOOK_SECRET) {
    const ok = await verify(raw, sigHeader, STRIPE_WEBHOOK_SECRET);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers: corsHeaders });
    }
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> }; id?: string };
  try { event = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) Billing lifecycle: handle independently of integration_id.
  if (event.type && BILLING_EVENT_TYPES.has(event.type)) {
    try {
      await handleBillingEvent(supabase, event as { type: string; data: { object: Record<string, unknown> } });
    } catch (e) {
      console.error("billing event error", e);
      captureEdgeError(e, req, { function_name: "webhook-stripe", extra: { phase: "billing", event_type: event.type } });
    }
  }

  // 2) Integration-routed events (legacy path) — purchases as proof objects.
  if (integrationId) {
    const { data: integ } = await supabase
      .from("integrations")
      .select("id, business_id, provider, auto_request_enabled, auto_request_delay_days")
      .eq("id", integrationId)
      .maybeSingle();

    if (integ && integ.provider === "stripe") {
      const externalEventId = event.id ?? null;

      // Dedup: try to insert; conflict on (integration_id, external_event_id)
      // means we've already processed (or are processing) this delivery.
      const { data: evRow, error: insertError } = await supabase
        .from("integration_events")
        .insert({
          business_id: integ.business_id,
          integration_id: integ.id,
          event_type: event.type ?? "unknown",
          payload: event,
          external_event_id: externalEventId,
          status: "received",
        })
        .select("id")
        .single();

      if (insertError && (insertError.code === "23505" || /duplicate key/i.test(insertError.message))) {
        // Mark a duplicate-tracking row for visibility, but skip processing.
        await supabase.from("integration_events").insert({
          business_id: integ.business_id,
          integration_id: integ.id,
          event_type: event.type ?? "unknown",
          payload: { duplicate_of: externalEventId },
          status: "duplicate",
        });
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let proofId: string | null = null;
      const obj = (event?.data?.object ?? {}) as Record<string, unknown>;
      let handlerError: string | null = null;
      let customerEmail: string | null = null;
      let customerName: string | null = null;
      try {
      if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
        const amount = (obj.amount_total as number) ?? (obj.amount as number) ?? 0;
        const currency = ((obj.currency as string) ?? "usd").toUpperCase();
        const customerDetails = (obj.customer_details as Record<string, unknown> | undefined) ?? {};
        const billingDetails = (obj.billing_details as Record<string, unknown> | undefined) ?? {};
        customerName = (customerDetails.name as string) ?? (billingDetails.name as string) ?? null;
        customerEmail = (customerDetails.email as string) ?? (billingDetails.email as string) ?? (obj.receipt_email as string) ?? null;
        const display = amount ? `${(amount / 100).toFixed(2)} ${currency}` : "a purchase";
        const orderId = (obj.id as string) ?? null;

        // Idempotency: skip if a proof_object already exists for this order.
        let existing: { id: string } | null = null;
        if (orderId) {
          const { data } = await supabase
            .from("proof_objects")
            .select("id")
            .eq("business_id", integ.business_id)
            .eq("source", "stripe")
            .eq("external_ref_id", orderId)
            .maybeSingle();
          existing = data ?? null;
        }

        if (!existing) {
          const { data: po, error: poErr } = await supabase.from("proof_objects").insert({
            business_id: integ.business_id,
            type: "purchase",
            proof_type: "purchase",
            status: "approved",
            verified: true,
            verification_tier_int: 1,
            verification_tier: "verified",
            verification_method: "purchase_matched",
            author_name: customerName,
            author_email: customerEmail,
            content: `Purchased ${display}`,
            source: "stripe",
            source_metadata: { event_id: event.id, event_type: event.type },
            external_ref_id: orderId,
            published_at: new Date().toISOString(),
            proof_event_at: new Date().toISOString(),
          }).select("id").single();
          if (poErr) throw poErr;
          proofId = po?.id ?? null;
        } else {
          proofId = existing.id;
        }

        if (proofId) {
          try {
            await enrichWithStripeProducts(supabase, integ.business_id, proofId, obj);
          } catch (e) {
            console.warn("stripe product enrichment failed", (e as Error).message);
          }
        }



        if (proofId && customerEmail && (integ as any).auto_request_enabled) {
          const delayDays = Math.max(0, Math.min(60, (integ as any).auto_request_delay_days ?? 14));
          const now = Date.now();
          const sendAt = new Date(now + delayDays * 86400_000).toISOString();
          const expires = new Date(now + (delayDays + 14) * 86400_000).toISOString();
          const firstName = customerName ? customerName.split(" ")[0] : null;

          const { data: req, error: reqErr } = await supabase
            .from("testimonial_requests")
            .insert({
              business_id: integ.business_id,
              proof_object_id: proofId,
              recipient_email: customerEmail,
              recipient_name: firstName,
              requested_type: "testimonial",
              prompt_questions: [],
              status: "scheduled",
              expires_at: expires,
            })
            .select("id")
            .single();
          if (!reqErr && req) {
            await supabase.from("scheduled_jobs").insert({
              business_id: integ.business_id,
              job_type: "send_testimonial_email",
              payload: { testimonial_request_id: req.id },
              run_at: sendAt,
              status: "pending",
            });
          } else if (reqErr) {
            console.error("stripe testimonial_requests insert failed", reqErr);
          }
        }
      }
      } catch (e) {
        handlerError = (e as Error).message;
        console.error("stripe integration handler error", e);
        captureEdgeError(e, req, { function_name: "webhook-stripe", extra: { phase: "integration", event_type: event.type } });
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
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
