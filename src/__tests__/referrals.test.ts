import { describe, it, expect, beforeEach } from "vitest";
import {
  REFERRAL_COMMISSION_RATE,
  commissionCents,
  pendingCommissionTotal,
  saveReferralCode,
  getReferralCode,
} from "@/lib/referrals";

describe("referral commission", () => {
  it("is exactly 20%", () => {
    expect(REFERRAL_COMMISSION_RATE).toBe(0.2);
    expect(commissionCents(4900)).toBe(980);
  });

  it("pays nothing on a zero or failed payment", () => {
    expect(commissionCents(0)).toBe(0);
  });

  it("excludes reversed (refunded) and already-paid commissions from what is owed", () => {
    expect(
      pendingCommissionTotal([
        { status: "pending", commission_cents: 980 },
        { status: "reversed", commission_cents: 980 },
        { status: "paid", commission_cents: 980 },
      ]),
    ).toBe(980);
  });
});

describe("referral link memory", () => {
  beforeEach(() => localStorage.clear());

  it("remembers a referral code for 60 days", () => {
    const t0 = 1_000_000;
    saveReferralCode("ABC123", t0);
    expect(getReferralCode(t0 + 59 * 86_400_000)).toBe("abc123");
    expect(getReferralCode(t0 + 61 * 86_400_000)).toBeNull();
  });
});
