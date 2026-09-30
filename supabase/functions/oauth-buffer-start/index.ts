// Initiates Buffer OAuth: creates a publishing_channels placeholder row (if needed)
// and returns the install URL. Mirrors the Shopify start function pattern.
import { createClient } from "npm:@supabase/supabase-js@2";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { uuidSchema } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUFFER_CLIENT_ID = Deno.env.get("BUFFER_CLIENT_ID");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }
  if (!BUFFER_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "Buffer not configured" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const ip = callerIp(req);
  const rl = await rateLimit({ key: `oauth-buffer:${ip}`, max: 10, windowSec: 60 });
  if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

  let body: { business_id?: string; channel_id?: string };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: corsHeaders });
  }
  if (!body.business_id || !uuidSchema.safeParse(body.business_id).success) {
    return new Response(JSON.stringify({ error: "Missing or invalid business_id" }), { status: 400, headers: corsHeaders });
  }

  // Verify the caller belongs to the business via RLS-aware client.
  const { data: member, error: memErr } = await supabase
    .from("business_users")
    .select("business_id")
    .eq("business_id", body.business_id)
    .maybeSingle();
  if (memErr || !member) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  // Create or reuse a placeholder publishing_channels row in 'pending' status.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  let channelId = body.channel_id;
  if (!channelId) {
    const { data: ch, error: insErr } = await admin
      .from("publishing_channels")
      .insert({
        business_id: body.business_id,
        provider: "buffer",
        account_label: "Buffer",
        status: "pending",
        config: {},
      })
      .select("id")
      .single();
    if (insErr || !ch) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "Failed to create channel" }), { status: 500, headers: corsHeaders });
    }
    channelId = ch.id;
  }

  const redirectUri = `${SUPABASE_URL}/functions/v1/oauth-buffer-callback`;
  const state = btoa(JSON.stringify({ channel_id: channelId, business_id: body.business_id }));
  const installUrl =
    `https://bufferapp.com/oauth2/authorize?client_id=${BUFFER_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(state)}`;

  return new Response(JSON.stringify({ install_url: installUrl, channel_id: channelId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});