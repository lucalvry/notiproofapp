// Public endpoint: writes widget_events rows. Also flips
// businesses.install_verified on the first impression.
import { createClient } from "npm:@supabase/supabase-js@2";
import { parseBody, widgetTrackBody } from "../_shared/validation.ts";
import { rateLimit, tooMany, callerIp } from "../_shared/rate-limit.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = parseBody(widgetTrackBody, raw, corsHeaders);
    if (!parsed.ok) return parsed.res;
    const {
      business_id,
      widget_id,
      proof_object_id = null,
      event_type,
      visitor_id = null,
      page_url = null,
      variant = null,
      meta = {},
      session_id = null,
      device_type = null,
      visitor_type = null,
    } = parsed.data;

    const ip = callerIp(req);
    const rl = await rateLimit({ key: `track:${business_id}:${ip}`, max: 600, windowSec: 60 });
    if (!rl.ok) return tooMany(corsHeaders, rl.retryAfter);

    const safeVariant = variant === "A" || variant === "B" ? variant : null;
    const safeMeta = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};

    const { error } = await supabase.from("widget_events").insert({
      business_id,
      widget_id,
      proof_object_id,
      event_type,
      visitor_id,
      page_url,
      variant: safeVariant,
      meta: safeMeta,
      session_id,
      device_type,
      visitor_type,
    });
    if (error) throw error;

    // Conversion assist: when a conversion fires, look back 7 days for the
    // most recent interaction by the same visitor and write a sibling
    // `conversion_assist` row crediting that proof + widget.
    if (event_type === "conversion" && visitor_id) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: lastInteraction } = await supabase
        .from("widget_events")
        .select("widget_id, proof_object_id, variant")
        .eq("business_id", business_id)
        .eq("visitor_id", visitor_id)
        .eq("event_type", "interaction")
        .gte("fired_at", sevenDaysAgo)
        .order("fired_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastInteraction) {
        await supabase.from("widget_events").insert({
          business_id,
          widget_id: lastInteraction.widget_id,
          proof_object_id: lastInteraction.proof_object_id,
          event_type: "conversion_assist",
          visitor_id,
          page_url,
          variant: lastInteraction.variant,
          meta: safeMeta,
          session_id,
          device_type,
          visitor_type,
        });
      }
    }

    if (event_type === "impression") {
      const { data: biz } = await supabase
        .from("businesses")
        .select("settings, install_verified")
        .eq("id", business_id)
        .maybeSingle();
      const settings = (biz?.settings as Record<string, unknown>) ?? {};
      if (!biz?.install_verified) {
        await supabase
          .from("businesses")
          .update({ install_verified: true, settings: { ...settings, install_verified: true, install_verified_at: new Date().toISOString() } })
          .eq("id", business_id);
      }
    }

    return json({ ok: true });
  } catch (e) {
    captureEdgeError(e, req, { function_name: "widget-track" });
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
