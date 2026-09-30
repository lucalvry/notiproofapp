// Agency plan catalogue. Separate from individual business plans (src/lib/plans.ts).
// Used by /agency/billing and the stripe-checkout-session edge function when
// purchasing/upgrading an agency subscription. Stripe price IDs are configured
// per-tier per-interval as Supabase secrets — the names live here.

export type AgencyPlanKey = "starter_agency" | "growth_agency" | "scale_agency" | "enterprise_agency";
export type BillingInterval = "monthly" | "yearly";

export interface AgencyPlan {
  key: AgencyPlanKey;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  yearlyMonthlyPriceUsd: number;
  yearlyPriceUsd: number;
  clientSeats: number;
  teamSeats: number;
  features: string[];
  highlight?: boolean;
  /** Stripe price secret names per interval. Undefined for enterprise (sales-led). */
  stripePriceSecrets?: Record<BillingInterval, string>;
}

export const AGENCY_PLANS: AgencyPlan[] = [
  {
    key: "starter_agency",
    name: "Starter",
    tagline: "For new agencies finding their feet",
    monthlyPriceUsd: 199,
    yearlyMonthlyPriceUsd: 166,
    yearlyPriceUsd: 1_992,
    clientSeats: 5,
    teamSeats: 3,
    features: [
      "5 client workspaces",
      "3 team seats",
      "White-label client portal",
      "Cross-client reports",
      "Email support",
    ],
    stripePriceSecrets: {
      monthly: "STRIPE_AGENCY_STARTER_MONTHLY",
      yearly: "STRIPE_AGENCY_STARTER_YEARLY",
    },
  },
  {
    key: "growth_agency",
    name: "Growth",
    tagline: "For established agencies scaling client load",
    monthlyPriceUsd: 499,
    yearlyMonthlyPriceUsd: 416,
    yearlyPriceUsd: 4_992,
    clientSeats: 15,
    teamSeats: 10,
    highlight: true,
    features: [
      "15 client workspaces",
      "10 team seats",
      "Custom subdomain portal",
      "Scheduled reports",
      "AI recommendations",
      "Priority support",
    ],
    stripePriceSecrets: {
      monthly: "STRIPE_AGENCY_GROWTH_MONTHLY",
      yearly: "STRIPE_AGENCY_GROWTH_YEARLY",
    },
  },
  {
    key: "scale_agency",
    name: "Scale",
    tagline: "For high-volume agencies and consultancies",
    monthlyPriceUsd: 999,
    yearlyMonthlyPriceUsd: 832,
    yearlyPriceUsd: 9_984,
    clientSeats: 40,
    teamSeats: 25,
    features: [
      "40 client workspaces",
      "25 team seats",
      "Reseller pricing tools",
      "Dedicated success manager",
      "Custom contract terms",
    ],
    stripePriceSecrets: {
      monthly: "STRIPE_AGENCY_SCALE_MONTHLY",
      yearly: "STRIPE_AGENCY_SCALE_YEARLY",
    },
  },
  {
    key: "enterprise_agency",
    name: "Enterprise",
    tagline: "Custom terms for large operators",
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    clientSeats: 999,
    teamSeats: 999,
    features: [
      "Unlimited client workspaces",
      "Unlimited team seats",
      "SAML SSO",
      "Custom SLAs",
      "Stripe Connect (Phase 4)",
    ],
  },
];

export function agencyPlanByKey(key: string | null | undefined): AgencyPlan {
  return AGENCY_PLANS.find((p) => p.key === key) ?? AGENCY_PLANS[0];
}

export function agencyPriceForInterval(plan: AgencyPlan, interval: BillingInterval): number {
  return interval === "yearly" ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
}

export function agencyYearlySavingsPercent(plan: AgencyPlan): number {
  if (!plan.monthlyPriceUsd) return 0;
  const annualIfMonthly = plan.monthlyPriceUsd * 12;
  if (!annualIfMonthly) return 0;
  return Math.round((1 - plan.yearlyPriceUsd / annualIfMonthly) * 100);
}
