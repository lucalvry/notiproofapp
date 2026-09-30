// Lists recent Stripe invoices for the caller's business. Returns a slim
// projection — id, number, status, total, currency, created, hosted URL, PDF.
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface StripeInvoice {
  id: string;
  number: string | null;
  status: string | null;
  total: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
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

    const { business_id } = await req.json().catch(() => ({}));
    if (!business_id || typeof business_id !== "string") return json({ error: "Missing business_id" }, 400);

    const { data: membership } = await admin
      .from("business_users")
      .select("role")
      .eq("business_id", business_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const { data: profile } = await admin
      .from("users")
      .select("is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!membership && !profile?.is_admin) return json({ error: "Not allowed" }, 403);

    const { data: business } = await admin
      .from("businesses")
      .select("stripe_customer_id")
      .eq("id", business_id)
      .maybeSingle();

    if (!business?.stripe_customer_id) return json({ invoices: [] });

    const r = await fetch(
      `https://api.stripe.com/v1/invoices?customer=${encodeURIComponent(business.stripe_customer_id)}&limit=12`,
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}` } },
    );
    const data = await r.json();
    if (!r.ok) return json({ error: data?.error?.message ?? "Unable to load invoices" }, 502);

    const invoices: StripeInvoice[] = (data.data ?? []).map((inv: Record<string, unknown>) => ({
      id: inv.id as string,
      number: (inv.number as string) ?? null,
      status: (inv.status as string) ?? null,
      total: (inv.total as number) ?? 0,
      currency: (inv.currency as string) ?? "usd",
      created: (inv.created as number) ?? 0,
      hosted_invoice_url: (inv.hosted_invoice_url as string) ?? null,
      invoice_pdf: (inv.invoice_pdf as string) ?? null,
    }));

    return json({ invoices });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
