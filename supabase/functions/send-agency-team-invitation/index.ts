// Sends an agency-branded invitation email to a teammate.
// Creates/updates a row in agency_team_invitations and emails the invitee a link
// to /agency/accept-invite?token=...
//
// Auth: caller must be an admin of the agency.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@notiproof.com";
const SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") ?? "NotiProof";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://notiproof.com").replace(/\/+$/, "");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SERVICE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const agency_id = String(body.agency_id ?? "");
    const emailRaw = String(body.email ?? "").trim().toLowerCase();
    const role = body.role === "admin" ? "admin" : "member";

    if (!agency_id || !emailRaw) return json({ error: "missing required fields" }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return json({ error: "invalid email" }, 400);

    // Authorize: caller must be an active admin of this agency.
    const { data: membership } = await admin
      .from("agency_team_members")
      .select("id, role, invitation_accepted_at")
      .eq("agency_id", agency_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership || membership.role !== "admin" || !membership.invitation_accepted_at) {
      return json({ error: "forbidden" }, 403);
    }

    // Upsert invitation (regenerate token if re-inviting).
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: inv, error: invErr } = await admin
      .from("agency_team_invitations")
      .upsert(
        {
          agency_id,
          email: emailRaw,
          role,
          token,
          invited_by: userData.user.id,
          status: "pending",
          expires_at,
          accepted_at: null,
        },
        { onConflict: "agency_id,email" },
      )
      .select()
      .single();
    if (invErr) return json({ error: invErr.message }, 500);

    const { data: agency } = await admin
      .from("agencies")
      .select("name, logo_url, brand_color")
      .eq("id", agency_id)
      .maybeSingle();
    if (!agency) return json({ error: "agency not found" }, 404);

    const acceptUrl = `${APP_URL}/agency/accept-invite?token=${token}`;
    const safeAgency = esc(agency.name);
    const color = /^#[0-9a-fA-F]{6}$/.test(agency.brand_color ?? "") ? agency.brand_color! : "#2563eb";
    const logo = agency.logo_url
      ? `<img src="${esc(agency.logo_url)}" alt="${safeAgency}" style="max-height:48px;margin-bottom:24px" />`
      : `<div style="font-weight:700;font-size:20px;margin-bottom:24px">${safeAgency}</div>`;

    const subject = `${agency.name} invited you to join their NotiProof agency workspace`;
    const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111;padding:32px;background:#f5f5f5">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
${logo}
<h1 style="font-size:22px;margin:0 0 12px">You're invited to ${safeAgency}</h1>
<p style="margin:0 0 16px">You've been invited as a <strong>${esc(role)}</strong> on ${safeAgency}'s NotiProof agency workspace.</p>
<p style="margin:0 0 24px">Click below to accept. You'll need to sign in or create a NotiProof account with <strong>${esc(emailRaw)}</strong>.</p>
<a href="${esc(acceptUrl)}" style="display:inline-block;background:${color};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a>
<p style="margin-top:24px;font-size:13px;color:#666">This invitation expires in 14 days. If you weren't expecting it, you can ignore this email.</p>
</div></body></html>`;
    const text = `${agency.name} invited you to join their NotiProof agency workspace.\n\nAccept: ${acceptUrl}`;

    if (!BREVO_API_KEY) {
      return json({ ok: true, simulated: true, invitation_id: inv.id, acceptUrl });
    }

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: agency.name || SENDER_NAME },
        to: [{ email: emailRaw }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    const brevoBody = await brevoRes.text();
    if (!brevoRes.ok) {
      return json({ error: "brevo_failed", status: brevoRes.status, body: brevoBody }, 502);
    }
    return json({ ok: true, invitation_id: inv.id, acceptUrl });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
