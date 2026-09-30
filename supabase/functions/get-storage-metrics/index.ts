// Admin-only: returns aggregate storage usage across proof media and
// Supabase Storage buckets (best-effort via Storage list API).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await admin.from("users").select("is_admin").eq("id", user.id).maybeSingle();
  return data?.is_admin ? admin : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sum proof media sizes (denormalised on proof_objects)
    const { data: rows } = await admin
      .from("proof_objects")
      .select("media_size_bytes")
      .not("media_size_bytes", "is", null)
      .limit(50000);
    const proofMediaBytes = (rows ?? []).reduce(
      (a: number, r: any) => a + (Number(r.media_size_bytes) || 0),
      0,
    );

    // List buckets and their object counts (size totals not exposed; rough metric)
    const { data: buckets } = await admin.storage.listBuckets();
    const bucketStats: { name: string; objects: number }[] = [];
    for (const b of buckets ?? []) {
      const { data: list } = await admin.storage.from(b.name).list("", { limit: 1000 });
      bucketStats.push({ name: b.name, objects: list?.length ?? 0 });
    }

    return new Response(
      JSON.stringify({
        proof_media_bytes: proofMediaBytes,
        buckets: bucketStats,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("get-storage-metrics error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
