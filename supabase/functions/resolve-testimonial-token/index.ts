// Public endpoint: returns the business name + branding for a testimonial
// collection token, so the /collect/:token page can render properly.
import { createClient } from "npm:@supabase/supabase-js@2";
import { tokenSchema } from "../_shared/validation.ts";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ip = callerIp(req);
    const rl = await rateLimit({ key: `resolve:${ip}`, max: 60, windowSec: 60 });
    if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    const tokenParsed = tokenSchema.safeParse(token);
    if (!tokenParsed.success) {
      return json({ error: "invalid token" }, 400);
    }
    token = tokenParsed.data;

    const { data, error } = await supabase.rpc("get_collection_context", { _token: token });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return json({ error: "not_found" }, 404);

    // Resolve plan + max video seconds for this token's business so the public
    // collect page can enforce per-plan recording duration on the client.
    let max_video_seconds = 30;
    const { data: bizId } = await supabase.rpc("business_id_for_collection_token", { _token: token });
    if (bizId) {
      const { data: biz } = await supabase.from("businesses").select("plan").eq("id", bizId).maybeSingle();
      if (biz?.plan) {
        const { data: limits } = await supabase.rpc("plan_limits", { _plan: biz.plan });
        max_video_seconds = (limits as any)?.[0]?.max_video_seconds ?? 30;
      }
    }

    const expired = new Date(row.expires_at).getTime() < Date.now();
    return json({
      ok: true,
      recipient_name: row.recipient_name,
      business_name: row.business_name,
      business_logo_url: row.business_logo_url,
      brand_color: row.brand_color,
      status: row.status,
      expired,
      already_completed: row.status === "completed",
      max_video_seconds,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
