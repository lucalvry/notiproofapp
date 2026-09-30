// Creates a Stripe Checkout session for the requested plan and returns the
// URL. Caller must be an owner/editor of the business. Plan key maps to a
// Stripe price ID stored in a secret (STRIPE_PRICE_<KEY>).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

type Interval = "monthly" | "yearly";

const PLAN_PRICE_SECRETS: Record<string, Record<Interval, string>> = {
  starter: {
    monthly: "STRIPE_PRICE_STARTER_MONTHLY",
    yearly: "STRIPE_PRICE_STARTER_YEARLY",
  },
  growth: {
    monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
    yearly: "STRIPE_PRICE_GROWTH_YEARLY",
  },
  agency: {
    monthly: "STRIPE_PRICE_AGENCY_MONTHLY",
    yearly: "STRIPE_PRICE_AGENCY_YEARLY",
  },
  // Agency OS tiers (Phase 3 Sprint 5). Create matching prices in Stripe.
  starter_agency: {
    monthly: "STRIPE_AGENCY_STARTER_MONTHLY",
    yearly: "STRIPE_AGENCY_STARTER_YEARLY",
  },
  growth_agency: {
    monthly: "STRIPE_AGENCY_GROWTH_MONTHLY",
    yearly: "STRIPE_AGENCY_GROWTH_YEARLY",
  },
  scale_agency: {
    monthly: "STRIPE_AGENCY_SCALE_MONTHLY",
    yearly: "STRIPE_AGENCY_SCALE_YEARLY",
  },
};
const AGENCY_PLANS = new Set(["starter_agency", "growth_agency", "scale_agency"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authentication required" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Authentication required" }, 401);

    const { business_id, agency_id, plan_key, interval, success_url, cancel_url } = await req.json().catch(() => ({}));
    const isAgencyCheckout = AGENCY_PLANS.has(plan_key);
    if (isAgencyCheckout) {
      if (!agency_id || typeof agency_id !== "string") return json({ error: "Missing agency_id" }, 400);
    } else {
      if (!business_id || typeof business_id !== "string") return json({ error: "Missing business_id" }, 400);
    }
    if (!plan_key || typeof plan_key !== "string" || !PLAN_PRICE_SECRETS[plan_key]) {
      return json({ error: "Unknown plan" }, 400);
    }
    const billingInterval: Interval = interval === "yearly" ? "yearly" : "monthly";
    const secretName = PLAN_PRICE_SECRETS[plan_key][billingInterval];
    const priceId = Deno.env.get(secretName);
    if (!priceId) {
      return json({
        error: `Plan ${plan_key} (${billingInterval}) is not configured. Add the ${secretName} secret with a Stripe price ID.`,
      }, 503);
    }

    const { data: profile } = await admin
      .from("users")
      .select("is_admin, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    // Resolve customer + ownership: agency vs business path.
    let customerId: string | null = null;
    let customerName = "";
    let metadataId = "";
    let metadataKey = "";

    if (isAgencyCheckout) {
      const { data: tm } = await admin
        .from("agency_team_members")
        .select("role")
        .eq("agency_id", agency_id)
        .eq("user_id", userData.user.id)
        .not("invitation_accepted_at", "is", null)
        .maybeSingle();
      if (!profile?.is_admin && tm?.role !== "admin") {
        return json({ error: "Only agency admins can manage billing" }, 403);
      }
      const { data: agency } = await admin
        .from("agencies")
        .select("id, name, stripe_customer_id")
        .eq("id", agency_id)
        .maybeSingle();
      if (!agency) return json({ error: "Agency not found" }, 404);
      customerId = agency.stripe_customer_id as string | null;
      customerName = agency.name;
      metadataId = agency.id;
      metadataKey = "agency_id";
      if (!customerId) {
        const r = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            name: customerName,
            email: profile?.email ?? userData.user.email ?? "",
            "metadata[agency_id]": agency.id,
          }),
        });
        const customer = await r.json();
        if (!r.ok) return json({ error: customer?.error?.message ?? "Unable to create customer" }, 502);
        customerId = customer.id;
        await admin.from("agencies").update({ stripe_customer_id: customerId }).eq("id", agency.id);
      }
    } else {
      const { data: membership } = await admin
        .from("business_users")
        .select("role")
        .eq("business_id", business_id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      const role = membership?.role;
      if (!profile?.is_admin && role !== "owner" && role !== "editor") {
        return json({ error: "Only owners or editors can change billing" }, 403);
      }
      const { data: business } = await admin
        .from("businesses")
        .select("id, name, stripe_customer_id")
        .eq("id", business_id)
        .maybeSingle();
      if (!business) return json({ error: "Business not found" }, 404);
      customerId = business.stripe_customer_id as string | null;
      customerName = business.name;
      metadataId = business.id;
      metadataKey = "business_id";
      if (!customerId) {
        const r = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            name: customerName,
            email: profile?.email ?? userData.user.email ?? "",
            "metadata[business_id]": business.id,
          }),
        });
        const customer = await r.json();
        if (!r.ok) return json({ error: customer?.error?.message ?? "Unable to create customer" }, 502);
        customerId = customer.id;
        await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business_id);
      }
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const defaultReturnPath = isAgencyCheckout ? "/agency/billing" : "/settings/billing";
    const successUrl = (typeof success_url === "string" && success_url.startsWith("http"))
      ? success_url
      : `${origin}${defaultReturnPath}?status=success`;
    const cancelUrl = (typeof cancel_url === "string" && cancel_url.startsWith("http"))
      ? cancel_url
      : `${origin}${defaultReturnPath}?status=cancelled`;

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("customer", customerId as string);
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.set("allow_promotion_codes", "true");
    params.set("billing_address_collection", "auto");
    params.set(`metadata[${metadataKey}]`, metadataId);
    params.set("metadata[plan_key]", plan_key);
    params.set("metadata[billing_interval]", billingInterval);
    params.set(`subscription_data[metadata][${metadataKey}]`, metadataId);
    params.set("subscription_data[metadata][plan_key]", plan_key);
    params.set("subscription_data[metadata][billing_interval]", billingInterval);

    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const session = await r.json();
    if (!r.ok) return json({ error: session?.error?.message ?? "Unable to create checkout session" }, 502);

    return json({ url: session.url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
