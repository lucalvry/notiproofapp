// Shared helpers for the one-click unsubscribe link used in lifecycle
// emails. Token is an HMAC of the lowercased email, keyed by the same
// INTERNAL_TRIGGER_SECRET used elsewhere for EF-to-EF auth.
async function hmacHex(secret: string, value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signUnsubscribeToken(email: string): Promise<string> {
  const secret = Deno.env.get('INTERNAL_TRIGGER_SECRET') || '';
  return hmacHex(secret, email.toLowerCase());
}

export async function verifyUnsubscribeToken(email: string, token: string | null): Promise<boolean> {
  const secret = Deno.env.get('INTERNAL_TRIGGER_SECRET');
  if (!secret || !token) return true;
  const expected = await hmacHex(secret, email.toLowerCase());
  return expected === token;
}

export function unsubscribeUrl(appUrl: string, supabaseUrl: string, email: string, token: string): string {
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/functions/v1/unsubscribe?email=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`;
}
