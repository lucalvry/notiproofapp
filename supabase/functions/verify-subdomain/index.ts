// EF-07: Verifies that an agency's custom subdomain CNAME resolves to NotiProof.
// Two entry modes:
//   - Authenticated (Authorization header): caller must be admin of the agency.
//   - Cron (x-internal-secret header == INTERNAL_TRIGGER_SECRET): batch-verifies all unverified subdomains.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET");
// Expected CNAME target. Adjust when DNS infra is finalised; keep override via env.
const CNAME_TARGET = (Deno.env.get("NOTIPROOF_CNAME_TARGET") ?? "portal.notiproof.com").toLowerCase();

const admin = createClient(SERVICE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function checkCname(host: string): Promise<{ verified: boolean; records: string[]; error?: string }> {
  try {
    const records = await Deno.resolveDns(host, "CNAME");
    const verified = records.some((r) => r.toLowerCase().replace(/\.$/, "") === CNAME_TARGET);
    return { verified, records };
  } catch (e) {
    return { verified: false, records: [], error: String((e as Error)?.message ?? e) };
  }
}

async function verifyOne(agencyId: string, subdomain: string) {
  const result = await checkCname(subdomain);
  if (result.verified) {
    await admin.from("agencies").update({ subdomain_verified: true }).eq("id", agencyId);
  }
  return { agency_id: agencyId, subdomain, ...result };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const internalSecret = req.headers.get("x-internal-secret");
    const isCron = !!INTERNAL_SECRET && internalSecret === INTERNAL_SECRET;

    if (isCron) {
      // Batch verify all unverified subdomains
      const { data: agencies } = await admin
        .from("agencies")
        .select("id, custom_subdomain")
        .not("custom_subdomain", "is", null)
        .eq("subdomain_verified", false);

      const results = [];
      for (const a of agencies ?? []) {
        if (!a.custom_subdomain) continue;
        results.push(await verifyOne(a.id, a.custom_subdomain));
      }
      return json({ ok: true, checked: results.length, results });
    }

    // Authenticated single-agency check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SERVICE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { agency_id, subdomain } = body as { agency_id?: string; subdomain?: string };
    if (!agency_id) return json({ error: "agency_id required" }, 400);

    const { data: isAdmin } = await userClient.rpc("is_agency_admin", { _agency_id: agency_id });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    let host = subdomain;
    if (!host) {
      const { data: ag } = await admin.from("agencies").select("custom_subdomain").eq("id", agency_id).maybeSingle();
      host = ag?.custom_subdomain ?? undefined;
    }
    if (!host) return json({ error: "no subdomain configured" }, 400);

    const result = await verifyOne(agency_id, host);
    if (!result.verified) {
      return json({
        verified: false,
        records: result.records,
        expected: CNAME_TARGET,
        message: "CNAME not found yet. DNS changes can take up to 48 hours to propagate.",
      });
    }
    return json({ verified: true, records: result.records });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});