// EF-05: Sends an agency-branded invitation email to a client business contact.
// Two variants:
//   - new_client: brand-new client business created by the agency. Includes magic-link signup.
//   - link_existing: an existing NotiProof account; sends an approval-request email with token.
// Auth: requires the caller to be an admin of the agency in question.
// Email delivery: Brevo Transactional API.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@notiproof.xyz";
const SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") ?? "NotiProof";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://notiproof.xyz").replace(/\/+$/, "");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmail(opts: {
  agencyName: string;
  agencyLogoUrl: string | null;
  brandColor: string;
  welcomeMsg: string | null;
  clientName: string;
  portalUrl: string;
  approveUrl?: string;
  mode: "new_client" | "link_existing";
}): { subject: string; html: string; text: string } {
  const safeAgency = escapeHtml(opts.agencyName);
  const safeClient = escapeHtml(opts.clientName);
  const welcome = escapeHtml(opts.welcomeMsg ?? `${opts.agencyName} has set up a proof portal for you.`);
  const logo = opts.agencyLogoUrl
    ? `<img src="${escapeHtml(opts.agencyLogoUrl)}" alt="${safeAgency}" style="max-height:48px;margin-bottom:24px" />`
    : `<div style="font-weight:700;font-size:20px;margin-bottom:24px">${safeAgency}</div>`;
  const color = opts.brandColor && /^#[0-9a-fA-F]{6}$/.test(opts.brandColor) ? opts.brandColor : "#2563eb";

  if (opts.mode === "link_existing") {
    const subject = `${opts.agencyName} has requested to manage your NotiProof account`;
    const ctaUrl = opts.approveUrl ?? opts.portalUrl;
    const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111;padding:32px;background:#f5f5f5">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
${logo}
<h1 style="font-size:22px;margin:0 0 12px">${safeAgency} would like to manage your proof account</h1>
<p style="margin:0 0 16px">Hi ${safeClient}, ${safeAgency} has requested permission to view and manage your NotiProof workspace on your behalf.</p>
<p style="margin:0 0 24px">${welcome}</p>
<a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${color};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Approve connection</a>
<p style="margin-top:24px;font-size:13px;color:#666">If you didn't expect this request, you can safely ignore this email.</p>
</div></body></html>`;
    const text = `${opts.agencyName} would like to manage your proof account.\n\nApprove: ${ctaUrl}`;
    return { subject, html, text };
  }

  const subject = `${opts.agencyName} has set up your proof portal`;
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#111;padding:32px;background:#f5f5f5">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
${logo}
<h1 style="font-size:22px;margin:0 0 12px">Welcome, ${safeClient}</h1>
<p style="margin:0 0 16px">${welcome}</p>
<p style="margin:0 0 24px">Your proof portal is ready. Click below to set up your password and start collecting verified social proof.</p>
<a href="${escapeHtml(opts.portalUrl)}" style="display:inline-block;background:${color};color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Set up your account</a>
<p style="margin-top:32px;font-size:13px;color:#666">Sent by ${safeAgency}.</p>
</div></body></html>`;
  const text = `${opts.agencyName} has set up your proof portal.\n\nSet up your account: ${opts.portalUrl}`;
  return { subject, html, text };
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
    const {
      agency_id,
      client_business_id,
      client_email,
      client_name,
      mode = "new_client",
    } = body as {
      agency_id?: string;
      client_business_id?: string;
      client_email?: string;
      client_name?: string;
      mode?: "new_client" | "link_existing";
    };

    if (!agency_id || !client_business_id || !client_email || !client_name) {
      return json({ error: "missing required fields" }, 400);
    }

    // Authorize: caller must be admin of this agency.
    const { data: membership } = await admin
      .from("agency_team_members")
      .select("id, role, invitation_accepted_at")
      .eq("agency_id", agency_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!membership || membership.role !== "admin" || !membership.invitation_accepted_at) {
      return json({ error: "forbidden" }, 403);
    }

    // Fetch agency branding
    const { data: agency } = await admin
      .from("agencies")
      .select("name, logo_url, brand_color, portal_slug, slug, portal_welcome_msg, custom_subdomain, subdomain_verified")
      .eq("id", agency_id)
      .maybeSingle();

    if (!agency) return json({ error: "agency not found" }, 404);

    const portalHost =
      agency.subdomain_verified && agency.custom_subdomain
        ? `https://${agency.custom_subdomain}`
        : `${APP_URL}/portal/${agency.portal_slug ?? agency.slug}`;

    // For link_existing, generate an approval token and persist it on the relationship row.
    let approveUrl: string | undefined;
    if (mode === "link_existing") {
      const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      const { error: updErr } = await admin
        .from("agency_client_relationships")
        .update({ approval_token: token, invitation_sent_at: new Date().toISOString() })
        .eq("agency_id", agency_id)
        .eq("client_business_id", client_business_id);
      if (updErr) return json({ error: updErr.message }, 500);
      approveUrl = `${APP_URL}/agency/approve?token=${token}`;
    } else {
      await admin
        .from("agency_client_relationships")
        .update({ invitation_sent_at: new Date().toISOString() })
        .eq("agency_id", agency_id)
        .eq("client_business_id", client_business_id);
    }

    const { subject, html, text } = renderEmail({
      agencyName: agency.name,
      agencyLogoUrl: agency.logo_url,
      brandColor: agency.brand_color ?? "#2563eb",
      welcomeMsg: agency.portal_welcome_msg,
      clientName: client_name,
      portalUrl: portalHost,
      approveUrl,
      mode,
    });

    if (!BREVO_API_KEY) {
      return json({ ok: true, simulated: true, subject, portalUrl: portalHost, approveUrl });
    }

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: SENDER_EMAIL, name: agency.name || SENDER_NAME },
        to: [{ email: client_email, name: client_name }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    const brevoBody = await brevoRes.text();
    if (!brevoRes.ok) {
      return json({ error: "brevo_failed", status: brevoRes.status, body: brevoBody }, 502);
    }

    return json({ ok: true, portalUrl: portalHost, approveUrl });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});