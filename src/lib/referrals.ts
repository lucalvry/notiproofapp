// Referral program rules (client mirror of supabase/functions/_shared/referral-commission.ts).
export const REFERRAL_COMMISSION_RATE = 0.2;
export const REFERRAL_COOKIE_DAYS = 60;
const REF_KEY = "notiproof.ref";

export function commissionCents(amountPaidCents: number): number {
  if (!Number.isFinite(amountPaidCents) || amountPaidCents <= 0) return 0;
  return Math.round(amountPaidCents * REFERRAL_COMMISSION_RATE);
}

/** Total owed: pending commissions only; reversed and paid ones are excluded. */
export function pendingCommissionTotal(rows: { status: string; commission_cents: number }[]): number {
  return rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.commission_cents, 0);
}

export function saveReferralCode(code: string, now = Date.now()) {
  const clean = code.trim().toLowerCase().slice(0, 32);
  if (!/^[a-z0-9]+$/.test(clean)) return;
  localStorage.setItem(REF_KEY, JSON.stringify({ code: clean, savedAt: now }));
}

export function getReferralCode(now = Date.now()): string | null {
  try {
    const raw = localStorage.getItem(REF_KEY);
    if (!raw) return null;
    const { code, savedAt } = JSON.parse(raw) as { code: string; savedAt: number };
    if (now - savedAt > REFERRAL_COOKIE_DAYS * 86_400_000) {
      localStorage.removeItem(REF_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  localStorage.removeItem(REF_KEY);
}

export function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}
