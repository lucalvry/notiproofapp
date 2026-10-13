// Single email sender for every edge function. Uses Resend (RESEND_API_KEY secret).
// Sender domain notiproof.xyz must be verified in Resend.
const RESEND_URL = "https://api.resend.com/emails";
export const EMAIL_FROM_ADDRESS = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "noreply@notiproof.xyz";
export const EMAIL_FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") ?? "NotiProof";

export function emailConfigured(): boolean {
  return !!Deno.env.get("RESEND_API_KEY");
}

export interface SendEmailInput {
  to: { email: string; name?: string | null };
  subject: string;
  html: string;
  text?: string;
  fromName?: string | null;
  replyTo?: string;
}

export interface SendEmailResult { ok: boolean; status: number; id?: string; error?: string }

function cleanName(n: string) {
  return n.replace(/[<>"\r\n]/g, "").trim().slice(0, 80) || EMAIL_FROM_NAME;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, status: 500, error: "RESEND_API_KEY is not configured" };
  const to = input.to.name ? `${cleanName(input.to.name)} <${input.to.email}>` : input.to.email;
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${cleanName(input.fromName || EMAIL_FROM_NAME)} <${EMAIL_FROM_ADDRESS}>`,
      to: [to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    let msg = body;
    try { const p = JSON.parse(body); msg = p?.message ?? p?.error ?? body; } catch { /* raw */ }
    console.error(`Resend send failed [${res.status}]: ${body}`);
    return { ok: false, status: res.status, error: `Resend: ${msg}` };
  }
  let id: string | undefined;
  try { id = JSON.parse(body)?.id; } catch { /* ignore */ }
  return { ok: true, status: res.status, id };
}
