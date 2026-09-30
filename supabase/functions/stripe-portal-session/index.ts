import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

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

    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData.user) return json({ error: "Authentication required" }, 401);

    const { business_id, agency_id, return_url } = await req.json().catch(() => ({}));
    const isAgency = !!agency_id;
    if (!isAgency && (!business_id || typeof business_id !== "string")) {
      return json({ error: "Missing business_id or agency_id" }, 400);
    }

    const { data: profile } = await admin
      .from("users")
      .select("is_admin, email")
      .eq("id", userData.user.id)
      .maybeSingle();

    let customerId: string | null = null;
    let displayName = "";
    let defaultReturnPath = "/settings/billing";

    if (isAgency) {
      const { data: tm } = await admin
        .from("agency_team_members")
        .select("role")
        .eq("agency_id", agency_id)
        .eq("user_id", userData.user.id)
        .not("invitation_accepted_at", "is", null)
        .maybeSingle();
      if (!profile?.is_admin && tm?.role !== "admin") {
        return json({ error: "Only agency admins can open the billing portal" }, 403);
      }
      const { data: agency, error: aErr } = await admin
        .from("agencies")
        .select("id, name, stripe_customer_id")
        .eq("id", agency_id)
        .maybeSingle();
      if (aErr || !agency) return json({ error: "Agency not found" }, 404);
      customerId = agency.stripe_customer_id as string | null;
      displayName = agency.name;
      defaultReturnPath = "/agency/billing";
      if (!customerId) {
        const createCustomer = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            name: displayName,
            email: profile?.email ?? userData.user.email ?? "",
            "metadata[agency_id]": agency.id,
          }),
        });
        const customer = await createCustomer.json();
        if (!createCustomer.ok) return json({ error: customer?.error?.message ?? "Unable to create billing customer" }, 502);
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
      if (!membership && !profile?.is_admin) return json({ error: "Not allowed" }, 403);

      const { data: business, error: businessError } = await admin
        .from("businesses")
        .select("id, name, stripe_customer_id")
        .eq("id", business_id)
        .maybeSingle();
      if (businessError || !business) return json({ error: "Business not found" }, 404);
      customerId = business.stripe_customer_id as string | null;
      displayName = business.name;
      if (!customerId) {
        const createCustomer = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            name: displayName,
            email: profile?.email ?? userData.user.email ?? "",
            "metadata[business_id]": business.id,
          }),
        });
        const customer = await createCustomer.json();
        if (!createCustomer.ok) return json({ error: customer?.error?.message ?? "Unable to create billing customer" }, 502);
        customerId = customer.id;
        await admin.from("businesses").update({ stripe_customer_id: customerId }).eq("id", business_id);
      }
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const portalReturnUrl = typeof return_url === "string" && return_url.startsWith("http") ? return_url : `${origin}${defaultReturnPath}`;
    const createSession = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ customer: customerId as string, return_url: portalReturnUrl }),
    });
    const session = await createSession.json();
    if (!createSession.ok) return json({ error: session?.error?.message ?? "Unable to open billing portal" }, 502);

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
