// One-shot backfill: encrypts existing plaintext PII into the new bytea columns.
// - proof_objects.author_email      → author_email_encrypted (then plaintext cleared)
// - integrations.credentials (jsonb) → credentials_encrypted (then plaintext set to {})
//
// Idempotent: skips rows that already have the encrypted column populated.
// Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptString, encryptJson, piiEncryptionEnabled } from "../_shared/pii-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!piiEncryptionEnabled) return json({ error: "PII_ENCRYPTION_KEY not configured" }, 500);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Authentication required" }, 401);

    const authed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Authentication required" }, 401);

    const { data: profile } = await admin.from("users").select("is_admin").eq("id", userData.user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: "Admin only" }, 403);

    const dryRun = Boolean((await req.json().catch(() => ({}))).dry_run);

    // ---- Proof emails ----
    const { data: emailRows, error: emailErr } = await admin
      .from("proof_objects")
      .select("id, business_id, author_email, author_email_encrypted")
      .not("author_email", "is", null);
    if (emailErr) return json({ error: emailErr.message }, 500);

    const emailResults: Array<{ id: string; status: string; error?: string }> = [];
    for (const row of emailRows ?? []) {
      if (row.author_email_encrypted) {
        emailResults.push({ id: row.id, status: "already_encrypted" });
        continue;
      }
      if (!row.author_email) {
        emailResults.push({ id: row.id, status: "skipped_empty" });
        continue;
      }
      try {
        const enc = await encryptString(row.author_email);
        if (!dryRun) {
          const { error: upErr } = await admin
            .from("proof_objects")
            .update({ author_email_encrypted: enc, author_email: null, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          if (upErr) throw upErr;
          await admin.from("pii_encryption_audit").insert({
            actor_user_id: userData.user.id,
            business_id: row.business_id,
            resource_table: "proof_objects",
            resource_id: row.id,
            action: "backfill",
            context: { field: "author_email" },
          });
        }
        emailResults.push({ id: row.id, status: dryRun ? "would_encrypt" : "encrypted" });
      } catch (e) {
        emailResults.push({ id: row.id, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    // ---- Integration credentials ----
    const { data: integRows, error: integErr } = await admin
      .from("integrations")
      .select("id, business_id, credentials, credentials_encrypted");
    if (integErr) return json({ error: integErr.message }, 500);

    const integResults: Array<{ id: string; status: string; error?: string }> = [];
    for (const row of integRows ?? []) {
      if (row.credentials_encrypted) {
        integResults.push({ id: row.id, status: "already_encrypted" });
        continue;
      }
      const creds = (row.credentials ?? {}) as Record<string, unknown>;
      const isEmpty = !creds || Object.keys(creds).length === 0;
      if (isEmpty) {
        integResults.push({ id: row.id, status: "skipped_empty" });
        continue;
      }
      try {
        const enc = await encryptJson(creds);
        if (!dryRun) {
          const { error: upErr } = await admin
            .from("integrations")
            .update({ credentials_encrypted: enc, credentials: {}, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          if (upErr) throw upErr;
          await admin.from("pii_encryption_audit").insert({
            actor_user_id: userData.user.id,
            business_id: row.business_id,
            resource_table: "integrations",
            resource_id: row.id,
            action: "backfill",
            context: { field: "credentials" },
          });
        }
        integResults.push({ id: row.id, status: dryRun ? "would_encrypt" : "encrypted" });
      } catch (e) {
        integResults.push({ id: row.id, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    return json({
      ok: true,
      dry_run: dryRun,
      proof_emails: emailResults,
      integrations: integResults,
      summary: {
        emails_total: emailResults.length,
        emails_encrypted: emailResults.filter((r) => r.status === "encrypted" || r.status === "would_encrypt").length,
        integrations_total: integResults.length,
        integrations_encrypted: integResults.filter((r) => r.status === "encrypted" || r.status === "would_encrypt").length,
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
