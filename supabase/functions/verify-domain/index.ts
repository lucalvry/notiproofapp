// Verifies that the NotiProof script is installed on a given URL,
// and records the result in business_domains.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function normalizeHost(raw: string): string {
  let v = raw.trim().toLowerCase();
  v = v.replace(/^[a-z]+:\/\//, "");
  v = v.replace(/\/.*$/, "");
  v = v.replace(/:\d+$/, "");
  v = v.replace(/^www\./, "");
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const rl = await rateLimit({ key: `domain:${userData.user.id}`, max: 20, windowSec: 3600 });
  if (!rl.ok) return json({ error: "rate_limited", retry_after: rl.retryAfter }, 429);

  let body: { url?: string; business_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const businessId = body.business_id;
  let rawUrl = (body.url ?? "").trim();
  if (!businessId || !uuidSchema.safeParse(businessId).success) return json({ error: "Missing or invalid business_id" }, 400);
  if (!rawUrl || rawUrl.length > 2048) return json({ error: "Missing or invalid url" }, 400);
  if (!/^https?:\/\//i.test(rawUrl)) rawUrl = `https://${rawUrl}`;

  let parsed: URL;
  try { parsed = new URL(rawUrl); } catch { return json({ error: "Invalid URL" }, 400); }

  const hostname = normalizeHost(parsed.hostname);
  if (!hostname) return json({ error: "Invalid hostname" }, 400);

  // Membership check
  const { data: membership } = await supabase
    .from("business_users").select("role")
    .eq("business_id", businessId).eq("user_id", userData.user.id)
    .maybeSingle();
  if (!membership) return json({ error: "Forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Make sure a row exists for this (business, hostname).
  const { data: existing } = await admin
    .from("business_domains")
    .select("id, is_primary, is_verified")
    .eq("business_id", businessId)
    .eq("domain", hostname)
    .maybeSingle();

  let rowId = existing?.id as string | undefined;
  if (!rowId) {
    // First domain on the business becomes primary automatically.
    const { count } = await admin
      .from("business_domains")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);
    const isFirst = (count ?? 0) === 0;
    const { data: ins, error: insErr } = await admin
      .from("business_domains")
      .insert({
        business_id: businessId,
        domain: hostname,
        is_primary: isFirst,
        is_verified: false,
      })
      .select("id")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);
    rowId = ins.id;
  }

  // Fetch the page and look for the script tag.
  let html = "";
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: { "User-Agent": "NotiProofDomainChecker/1.0" },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) {
      return json({ verified: false, domain: hostname, error: `Site returned HTTP ${res.status}` });
    }
    html = (await res.text()).slice(0, 1_500_000);
  } catch (e) {
    return json({ verified: false, domain: hostname, error: `Could not reach the site: ${(e as Error).message}` });
  }

  const scriptRegex = /<script[^>]+(?:src=["'][^"']*(?:notiproof|widget\.js)[^"']*["']|data-business=["'][^"']+["'])[^>]*>/i;
  const businessRegex = new RegExp(`data-business=["']${businessId.replace(/[-]/g, "[-]")}["']`, "i");
  const verified = scriptRegex.test(html) && businessRegex.test(html);

  if (verified) {
    await admin.from("business_domains").update({
      is_verified: true,
      verified_at: new Date().toISOString(),
    }).eq("id", rowId);
    await admin.from("businesses").update({ install_verified: true }).eq("id", businessId);
  }

  return json({ verified, domain: hostname });

  function json(b: unknown, status = 200) {
    return new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});