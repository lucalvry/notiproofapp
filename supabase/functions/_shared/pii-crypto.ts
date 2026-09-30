// AES-256-GCM encryption helper for PII at rest.
// Key is read from PII_ENCRYPTION_KEY (base64-encoded 32 bytes).
// Format on disk: [12-byte IV][ciphertext+auth-tag]
//
// Usage:
//   const enc = await encryptString("user@example.com");
//   await admin.from("proof_objects").update({ author_email_encrypted: enc, author_email: null }).eq(...)
//
//   const plaintext = await decryptString(rowFromDb.author_email_encrypted);

const KEY_B64 = Deno.env.get("PII_ENCRYPTION_KEY");
if (!KEY_B64) {
  console.warn("[pii-crypto] PII_ENCRYPTION_KEY is not set — PII encryption is disabled");
}

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;
  if (!KEY_B64) throw new Error("PII_ENCRYPTION_KEY not configured");
  const raw = base64Decode(KEY_B64);
  if (raw.byteLength !== 32) {
    throw new Error(`PII_ENCRYPTION_KEY must decode to 32 bytes (got ${raw.byteLength})`);
  }
  cachedKey = await crypto.subtle.importKey(
    "raw",
    raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return cachedKey;
}

function base64Decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("Invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/** Encrypt a string. Returns hex string suitable for inserting into a bytea column via `\x...` literal. */
export async function encryptString(plaintext: string): Promise<string> {
  if (!plaintext) throw new Error("Empty plaintext");
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ctBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const ct = new Uint8Array(ctBuf);
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return "\\x" + bytesToHex(out);
}

/** Decrypt a bytea value returned by Supabase (hex string starting with \x, or Uint8Array). */
export async function decryptString(stored: string | Uint8Array | null | undefined): Promise<string | null> {
  if (!stored) return null;
  const bytes = typeof stored === "string" ? hexToBytes(stored) : stored;
  if (bytes.length < 13) throw new Error("Encrypted blob too short");
  const iv = bytes.slice(0, 12);
  const ct = bytes.slice(12);
  const key = await getKey();
  const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(ptBuf);
}

/** Encrypt an arbitrary JSON-serializable object. */
export async function encryptJson(obj: unknown): Promise<string> {
  return encryptString(JSON.stringify(obj ?? {}));
}

/** Decrypt to arbitrary JSON. Returns null if input is null/empty. */
export async function decryptJson<T = unknown>(stored: string | Uint8Array | null | undefined): Promise<T | null> {
  const s = await decryptString(stored);
  if (s === null) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export const piiEncryptionEnabled = !!KEY_B64;
