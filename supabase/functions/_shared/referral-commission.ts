// Referral commission rules. Keep REFERRAL_COMMISSION_RATE in sync with
// src/lib/referrals.ts (tested there).
export const REFERRAL_COMMISSION_RATE = 0.2;

export function commissionCents(amountPaidCents: number): number {
  if (!Number.isFinite(amountPaidCents) || amountPaidCents <= 0) return 0;
  return Math.round(amountPaidCents * REFERRAL_COMMISSION_RATE);
}

/**
 * Applies referral side effects for a platform-billing Stripe event.
 * - invoice.payment_succeeded with a subscription → pending commission (idempotent per invoice)
 * - charge.refunded → matching commission reversed
 * - customer.subscription.deleted → referral marked churned (no further invoices = no further commission)
 */
// deno-lint-ignore no-explicit-any
export async function handleReferralEvent(supabase: any, event: { type: string; data: { object: Record<string, unknown> } }) {
  const obj = event.data.object;
  const customerId = (obj.customer as string) ?? null;
  if (!customerId) return;

  if (event.type === "charge.refunded") {
    const invoiceId = (obj.invoice as string) ?? null;
    const chargeId = (obj.id as string) ?? null;
    const q = supabase.from("referral_commissions").update({ status: "reversed", reversed_at: new Date().toISOString() });
    if (invoiceId) await q.eq("stripe_invoice_id", invoiceId);
    else if (chargeId) await q.eq("stripe_charge_id", chargeId);
    return;
  }

  const { data: business } = await supabase
    .from("businesses").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  if (!business) return;
  const { data: owners } = await supabase
    .from("business_users").select("user_id").eq("business_id", business.id).eq("role", "owner");
  const ownerIds = (owners ?? []).map((o: { user_id: string }) => o.user_id);
  if (ownerIds.length === 0) return;
  const { data: referral } = await supabase
    .from("referrals").select("id, referrer_user_id, status, first_paid_at")
    .in("referred_user_id", ownerIds).limit(1).maybeSingle();
  if (!referral) return;

  if (event.type === "customer.subscription.deleted") {
    await supabase.from("referrals").update({ status: "churned", churned_at: new Date().toISOString() }).eq("id", referral.id);
    return;
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoiceId = obj.id as string;
    const amount = Number(obj.amount_paid ?? 0);
    if (!invoiceId || !obj.subscription || amount <= 0) return;
    await supabase.from("referral_commissions").upsert({
      referral_id: referral.id,
      referrer_user_id: referral.referrer_user_id,
      stripe_invoice_id: invoiceId,
      stripe_charge_id: (obj.charge as string) ?? null,
      amount_paid_cents: amount,
      commission_cents: commissionCents(amount),
      currency: ((obj.currency as string) ?? "usd").toLowerCase(),
      status: "pending",
    }, { onConflict: "stripe_invoice_id", ignoreDuplicates: true });
    await supabase.from("referrals").update({
      status: "paying",
      first_paid_at: referral.first_paid_at ?? new Date().toISOString(),
      churned_at: null,
    }).eq("id", referral.id);
  }
}
