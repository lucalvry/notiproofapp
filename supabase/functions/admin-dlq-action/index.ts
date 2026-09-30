// Admin-only: bulk actions on the integration_events dead-letter queue.
// Actions:
//   - retry_all      : reset failed events with retry_count < 3 back to 'received'
//   - drain_all      : mark all failed events (retry_count >= 3) as 'dropped'
//   - retry_event    : retry a single event by id
//   - drop_event     : drop a single event by id

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
  return data?.is_admin ? { admin, userId: user.id } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ctx = await requireAdmin(req);
    if (!ctx) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { admin } = ctx;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    let affected = 0;
    if (action === "retry_all") {
      const { data, error } = await admin
        .from("integration_events")
        .update({ status: "received", error_message: null, processed_at: null })
        .eq("status", "failed")
        .select("id");
      if (error) throw error;
      affected = data?.length ?? 0;
    } else if (action === "drain_all") {
      const { data, error } = await admin
        .from("integration_events")
        .update({ status: "dropped" })
        .eq("status", "failed")
        .select("id");
      if (error) throw error;
      affected = data?.length ?? 0;
    } else if (action === "retry_event" && body.event_id) {
      const { data, error } = await admin
        .from("integration_events")
        .update({ status: "received", error_message: null, processed_at: null })
        .eq("id", body.event_id)
        .select("id");
      if (error) throw error;
      affected = data?.length ?? 0;
    } else if (action === "drop_event" && body.event_id) {
      const { data, error } = await admin
        .from("integration_events")
        .update({ status: "dropped" })
        .eq("id", body.event_id)
        .select("id");
      if (error) throw error;
      affected = data?.length ?? 0;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, affected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-dlq-action error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
