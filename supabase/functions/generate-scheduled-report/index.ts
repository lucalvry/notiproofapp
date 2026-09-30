// EF-08: Generates and emails scheduled cross-client agency reports.
// Triggered by pg_cron daily at 06:00 UTC (or manually with x-internal-secret).
// For each due scheduled_reports row: aggregates per-client metrics, optionally
// calls EF-06 for AI recommendations, renders HTML, sends via Brevo, advances next_run_at.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SERVICE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") ?? "noreply@notiproof.com";
const SENDER_NAME = Deno.env.get("BREVO_SENDER_NAME") ?? "NotiProof";
const INTERNAL_SECRET = Deno.env.get("INTERNAL_TRIGGER_SECRET");
const APP_URL = (Deno.env.get("APP_URL") ?? "https://notiproof.com").replace(/\/+$/, "");

const admin = createClient(SERVICE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function addInterval(d: Date, frequency: "weekly" | "monthly"): Date {
  const next = new Date(d);
  if (frequency === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

type ClientMetrics = {
  client_business_id: string;
  client_name: string;
  proofs_total: number;
  proofs_30d: number;
  content_total: number;
  content_30d: number;
  health: { score: number; status: string };
};

async function gatherClientMetrics(clientBusinessId: string): Promise<ClientMetrics | null> {
  const { data: biz } = await admin.from("businesses").select("name").eq("id", clientBusinessId).maybeSingle();
  if (!biz) return null;

  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

  const [{ count: proofsTotal }, { count: proofs30 }, { count: contentTotal }, { count: content30 }, healthRes] =
    await Promise.all([
      admin.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", clientBusinessId),
      admin.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", clientBusinessId).gte("created_at", since30),
      admin.from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", clientBusinessId),
      admin.from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", clientBusinessId).gte("created_at", since30),
      admin.rpc("get_client_health_score", { _client_business_id: clientBusinessId }),
    ]);

  const health = Array.isArray(healthRes.data) && healthRes.data.length > 0 ? healthRes.data[0] : { score: 0, status: "red" };

  return {
    client_business_id: clientBusinessId,
    client_name: biz.name,
    proofs_total: proofsTotal ?? 0,
    proofs_30d: proofs30 ?? 0,
    content_total: contentTotal ?? 0,
    content_30d: content30 ?? 0,
    health: { score: health.score ?? 0, status: health.status ?? "red" },
  };
}

function renderReportHtml(opts: {
  agencyName: string;
  agencyLogoUrl: string | null;
  brandColor: string;
  sections: string[];
  clients: ClientMetrics[];
}): string {
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.brandColor) ? opts.brandColor : "#2563eb";
  const logo = opts.agencyLogoUrl
    ? `<img src="${escapeHtml(opts.agencyLogoUrl)}" alt="${escapeHtml(opts.agencyName)}" style="max-height:48px"/>`
    : `<div style="font-weight:700;font-size:20px">${escapeHtml(opts.agencyName)}</div>`;

  const showProof = opts.sections.length === 0 || opts.sections.includes("proof");
  const showContent = opts.sections.length === 0 || opts.sections.includes("content");
  const showHealth = opts.sections.length === 0 || opts.sections.includes("health");

  const totalProofs = opts.clients.reduce((s, c) => s + c.proofs_total, 0);
  const totalContent = opts.clients.reduce((s, c) => s + c.content_total, 0);

  const rows = opts.clients
    .map(
      (c) => `<tr style="border-top:1px solid #eee">
        <td style="padding:8px 12px">${escapeHtml(c.client_name)}</td>
        ${showProof ? `<td style="padding:8px 12px;text-align:right">${c.proofs_30d} / ${c.proofs_total}</td>` : ""}
        ${showContent ? `<td style="padding:8px 12px;text-align:right">${c.content_30d} / ${c.content_total}</td>` : ""}
        ${showHealth ? `<td style="padding:8px 12px;text-align:right"><span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${c.health.status === "green" ? "#d1fae5" : c.health.status === "amber" ? "#fef3c7" : "#fee2e2"};color:#111;font-size:12px">${c.health.score}</span></td>` : ""}
      </tr>`,
    )
    .join("");

  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#111;background:#f5f5f5;padding:32px">
<div style="max-width:760px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">${logo}<div style="color:#666;font-size:13px">${new Date().toISOString().slice(0, 10)}</div></div>
<h1 style="margin:0 0 8px;color:${color}">Client portfolio report</h1>
<p style="margin:0 0 24px;color:#444">${opts.clients.length} clients · ${totalProofs} total proofs · ${totalContent} content pieces</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<thead><tr style="background:#fafafa">
<th style="padding:8px 12px;text-align:left">Client</th>
${showProof ? `<th style="padding:8px 12px;text-align:right">Proof (30d / all)</th>` : ""}
${showContent ? `<th style="padding:8px 12px;text-align:right">Content (30d / all)</th>` : ""}
${showHealth ? `<th style="padding:8px 12px;text-align:right">Health</th>` : ""}
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="margin-top:32px;font-size:13px;color:#666">Sent by ${escapeHtml(opts.agencyName)} via NotiProof.</p>
</div></body></html>`;
}

async function processOne(reportId: string) {
  const { data: report, error } = await admin
    .from("scheduled_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) return { reportId, ok: false, error: error?.message ?? "not found" };

  const { data: agency } = await admin
    .from("agencies")
    .select("id, name, logo_url, brand_color")
    .eq("id", report.agency_id)
    .maybeSingle();
  if (!agency) return { reportId, ok: false, error: "agency missing" };

  // Resolve client list — if empty array, use all active clients of this agency.
  let clientIds: string[] = (report.client_business_ids ?? []) as string[];
  if (clientIds.length === 0) {
    const { data: rels } = await admin
      .from("agency_client_relationships")
      .select("client_business_id")
      .eq("agency_id", agency.id)
      .eq("status", "active");
    clientIds = (rels ?? []).map((r) => r.client_business_id);
  }

  const metrics: ClientMetrics[] = [];
  for (const id of clientIds) {
    const m = await gatherClientMetrics(id);
    if (m) metrics.push(m);
  }

  const html = renderReportHtml({
    agencyName: agency.name,
    agencyLogoUrl: agency.logo_url,
    brandColor: agency.brand_color ?? "#2563eb",
    sections: (report.sections ?? []) as string[],
    clients: metrics,
  });

  // Send to each recipient
  const recipients: string[] = (report.send_to ?? []).filter(Boolean);
  let sent = 0;
  if (BREVO_API_KEY && recipients.length > 0) {
    for (const email of recipients) {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": BREVO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: { email: SENDER_EMAIL, name: agency.name || SENDER_NAME },
          to: [{ email }],
          subject: `${agency.name} — client portfolio report`,
          htmlContent: html,
        }),
      });
      const txt = await res.text();
      if (res.ok) sent += 1;
      else console.error("brevo send failed", res.status, txt);
    }
  }

  // Compute next_run_at
  const now = new Date();
  const next = addInterval(now, report.frequency as "weekly" | "monthly");
  await admin
    .from("scheduled_reports")
    .update({ last_run_at: now.toISOString(), next_run_at: next.toISOString() })
    .eq("id", reportId);

  return { reportId, ok: true, sent, recipients: recipients.length, clients: metrics.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const internalSecret = req.headers.get("x-internal-secret");
    const isCron = !!INTERNAL_SECRET && internalSecret === INTERNAL_SECRET;
    const body = await req.json().catch(() => ({}));
    const { report_id } = body as { report_id?: string };

    if (!isCron && !report_id) return json({ error: "unauthorized" }, 401);

    if (report_id) {
      const result = await processOne(report_id);
      return json(result);
    }

    // Cron path: find all due reports
    const nowIso = new Date().toISOString();
    const { data: due } = await admin
      .from("scheduled_reports")
      .select("id")
      .eq("is_active", true)
      .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`);

    const results = [];
    for (const r of due ?? []) {
      results.push(await processOne(r.id));
    }
    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});