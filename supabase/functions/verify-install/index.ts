// Fetches a user-supplied URL and looks for the NotiProof widget script tag.
// On success, marks businesses.install_verified = true.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const rl = await rateLimit({ key: `verify:${userData.user.id}`, max: 10, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  let body: { url?: string; business_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }

  const businessId = body.business_id;
  let rawUrl = (body.url ?? "").trim();
  if (!businessId || !uuidSchema.safeParse(businessId).success) {
    return new Response(JSON.stringify({ error: "Missing or invalid business_id" }), { status: 400, headers: corsHeaders });
  }
  if (!rawUrl || rawUrl.length > 2048) {
    return new Response(JSON.stringify({ error: "Missing or invalid url" }), { status: 400, headers: corsHeaders });
  }
  if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;

  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: corsHeaders });
  }

  // Verify caller is a member of the business.
  const { data: membership } = await supabase
    .from("business_users")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  // Fetch the page (with a small timeout) and scan for the script tag.
  let html = "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "NotiProofInstallChecker/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return new Response(JSON.stringify({ verified: false, error: `Site returned HTTP ${res.status}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    html = (await res.text()).slice(0, 1_500_000);
  } catch (e) {
    return new Response(JSON.stringify({ verified: false, error: `Could not reach the site: ${(e as Error).message}` }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const scriptRegex = /<script[^>]+(?:src=["'][^"']*(?:notiproof|widget\.js)[^"']*["']|data-business=["'][^"']+["'])[^>]*>/i;
  const businessRegex = new RegExp(`data-business=["']${businessId.replace(/[-]/g, "[-]")}["']`, "i");
  const verified = scriptRegex.test(html) && businessRegex.test(html);

  if (verified) {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    await admin
      .from("businesses")
      .update({ install_verified: true })
      .eq("id", businessId);
  }

  return new Response(JSON.stringify({ verified, url: parsed.toString() }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
