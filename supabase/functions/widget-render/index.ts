// Public endpoint: returns widget config + recent approved proofs for a business.
// No auth required. Reads-only. Used by /widget.js at runtime.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const businessId = url.searchParams.get("business");
    const widgetId = url.searchParams.get("widget");
    const limitParam = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, Math.floor(limitParam))) : 20;
    const requestDomainRaw = url.searchParams.get("domain");
    if (!businessId) {
      return json({ error: "business param required" }, 400);
    }

    // ---- Domain allowlist gate -------------------------------------------
    // If the business has at least one verified domain, the requesting
    // hostname MUST match one. If it has none yet, we allow rendering so
    // first-install / onboarding live preview keeps working.
    if (requestDomainRaw) {
      const requestHost = normalizeHost(requestDomainRaw);
      const { data: domains } = await supabase
        .from("business_domains")
        .select("domain, is_verified")
        .eq("business_id", businessId);
      const verified = (domains ?? []).filter((d: any) => d.is_verified);
      if (verified.length > 0) {
        const allowed = verified.some((d: any) => d.domain === requestHost);
        if (!allowed) {
          return json({ widget: null, business: null, proofs: [] });
        }
      }
    }

    // Pick widget: explicit id, else first active widget for business.
    let widgetQ = supabase.from("widgets").select("id, name, type, status, config")
      .eq("business_id", businessId);
    widgetQ = widgetId ? widgetQ.eq("id", widgetId) : widgetQ.eq("status", "active");
    const { data: widgets, error: wErr } = await widgetQ.limit(1);
    if (wErr) throw wErr;
    const widget = widgets?.[0] ?? null;

    const { data: bizRow } = await supabase
      .from("businesses")
      .select("name, website_url, plan")
      .eq("id", businessId)
      .maybeSingle();
    const business = bizRow
      ? { name: bizRow.name, website_url: bizRow.website_url }
      : null;

    // ---- Plan-based gates: monthly event cap + branding override --------
    // Even if the saved widget config has `powered_by: false`, plans that
    // don't include `removeBranding` (Free) get the badge forced back on
    // here, so the lock cannot be bypassed by editing config in the DB.
    if (bizRow?.plan) {
      const [{ data: usage }, { data: limits }] = await Promise.all([
        supabase.rpc("business_plan_usage", { _business_id: businessId }),
        supabase.rpc("plan_limits", { _plan: bizRow.plan }),
      ]);
      const eventLimit = (limits as any)?.[0]?.event_limit ?? null;
      const removeBranding = (limits as any)?.[0]?.remove_branding === true;
      const eventsMtd = (usage as any)?.events_mtd ?? 0;
      if (eventLimit && eventsMtd >= eventLimit) {
        return json({ widget: null, business, proofs: [], disabled: true, reason: "event_limit_reached" });
      }
      if (widget && !removeBranding) {
        const cfg = (widget as any).config ?? {};
        (widget as any).config = { ...cfg, powered_by: true };
      }
    }

    const { data: proofs, error: pErr } = await supabase
      .from("proof_objects")
      .select(
        "id, type, content, highlight_phrase, author_name, author_avatar_url, author_photo_url, author_role, author_company, author_company_logo_url, author_website_url, cta_label, cta_url, rating, media_url, poster_url, source, created_at",
      )
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (pErr) throw pErr;

    return json({ widget, business, proofs: proofs ?? [] });
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

function normalizeHost(raw: string): string {
  let v = String(raw || "").trim().toLowerCase();
  v = v.replace(/^[a-z]+:\/\//, "");
  v = v.replace(/\/.*$/, "");
  v = v.replace(/:\d+$/, "");
  v = v.replace(/^www\./, "");
  return v;
}
