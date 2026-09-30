// Plan catalogue for NotiProof. Used by Billing UI and checkout edge function.
// Stripe price IDs are read from edge function secrets — keep the price secret
// names here in sync with the secrets configured for the project.
//
// Pricing model (per stored business rule):
// All plans get ALL core features (unlimited integrations, notifications,
// testimonials, forms, AI). Plans differ ONLY by these limits:
//   1. domainLimit       — number of websites
//   2. eventLimit        — monthly widget views
//   3. proofLimit        — monthly proof items
//   4. storageMb         — total media storage
//   5. maxVideoSeconds   — per-video duration cap
//   6. removeBranding    — hide "Powered by NotiProof" badge
//   7. activeWidgetLimit — number of active widgets
//   8. dataRetentionDays — how long widget_events are kept
//   9. teamSeatsIncluded — included seats; extras billed at extraSeatPriceUsd

export type PlanKey = "free" | "starter" | "growth" | "agency";
export type BillingInterval = "monthly" | "yearly";

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  tagline: string;
  monthlyPriceUsd: number;
  /** Effective monthly price when billed yearly (already discounted). */
  yearlyMonthlyPriceUsd: number;
  /** Total annual charge when billed yearly. */
  yearlyPriceUsd: number;

  // ---- The 9 limit dimensions ----
  /** Monthly proof items that can be created. */
  proofLimit: number;
  /** Monthly widget impressions/events. */
  eventLimit: number;
  /** Distinct websites/domains. Use Infinity for unlimited. */
  domainLimit: number;
  /** Total media storage in megabytes. */
  storageMb: number;
  /** Max duration of a single uploaded/recorded video in seconds. */
  maxVideoSeconds: number;
  /** When true, the "Powered by NotiProof" badge can be hidden. */
  removeBranding: boolean;
  /** Active (non-draft) widgets allowed. Use Infinity for unlimited. */
  activeWidgetLimit: number;
  /** Days of widget_events history retained. Use Infinity for unlimited. */
  dataRetentionDays: number;
  /** Team seats included in the plan price. */
  teamSeatsIncluded: number;
  /** USD/month per additional seat beyond `teamSeatsIncluded`. 0 = not offered. */
  extraSeatPriceUsd: number;

  highlight?: boolean;
  /** Marketing bullet points shown on the Billing page. */
  features: string[];
  /** Stripe price secret names per interval — undefined for free plan. */
  stripePriceSecrets?: Record<BillingInterval, string>;
}

export const PLANS: PlanDefinition[] = [
  {
    key: "free",
    name: "Free",
    tagline: "For testing and small projects",
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    yearlyPriceUsd: 0,
    proofLimit: 100,
    eventLimit: 10_000,
    domainLimit: 1,
    storageMb: 100,
    maxVideoSeconds: 30,
    removeBranding: false,
    activeWidgetLimit: 1,
    dataRetentionDays: 30,
    teamSeatsIncluded: 1,
    extraSeatPriceUsd: 0,
    features: [
      "1 website",
      "1 active widget",
      "100 proof items / month",
      "10,000 widget views / month",
      "100 MB media storage",
      "30s max video length",
      "30-day analytics retention",
      '"Powered by NotiProof" badge',
    ],
  },
  {
    key: "starter",
    name: "Starter",
    tagline: "For growing storefronts",
    monthlyPriceUsd: 29,
    yearlyMonthlyPriceUsd: 24,
    yearlyPriceUsd: 288,
    proofLimit: 1_000,
    eventLimit: 100_000,
    domainLimit: 5,
    storageMb: 1_000,
    maxVideoSeconds: 60,
    removeBranding: true,
    activeWidgetLimit: Infinity,
    dataRetentionDays: 90,
    teamSeatsIncluded: 1,
    extraSeatPriceUsd: 3,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_STARTER_MONTHLY",
      yearly: "STRIPE_PRICE_STARTER_YEARLY",
    },
    features: [
      "5 websites",
      "Unlimited active widgets",
      "1,000 proof items / month",
      "100,000 widget views / month",
      "1 GB media storage",
      "60s max video length",
      "90-day analytics retention",
      "Remove NotiProof badge",
      "Extra seats $3/mo",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    tagline: "For established brands",
    monthlyPriceUsd: 79,
    yearlyMonthlyPriceUsd: 66,
    yearlyPriceUsd: 792,
    proofLimit: 10_000,
    eventLimit: 1_000_000,
    domainLimit: 20,
    storageMb: 10_000,
    maxVideoSeconds: 180,
    removeBranding: true,
    activeWidgetLimit: Infinity,
    dataRetentionDays: 365,
    teamSeatsIncluded: 1,
    extraSeatPriceUsd: 3,
    highlight: true,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
      yearly: "STRIPE_PRICE_GROWTH_YEARLY",
    },
    features: [
      "20 websites",
      "Unlimited active widgets",
      "10,000 proof items / month",
      "1M widget views / month",
      "10 GB media storage",
      "3 min max video length",
      "1-year analytics retention",
      "Remove NotiProof badge",
      "Extra seats $3/mo",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    tagline: "For high-volume teams",
    monthlyPriceUsd: 199,
    yearlyMonthlyPriceUsd: 166,
    yearlyPriceUsd: 1_992,
    proofLimit: 100_000,
    eventLimit: 10_000_000,
    domainLimit: Infinity,
    storageMb: 100_000,
    maxVideoSeconds: 300,
    removeBranding: true,
    activeWidgetLimit: Infinity,
    dataRetentionDays: Infinity,
    teamSeatsIncluded: 1,
    extraSeatPriceUsd: 3,
    stripePriceSecrets: {
      monthly: "STRIPE_PRICE_AGENCY_MONTHLY",
      yearly: "STRIPE_PRICE_AGENCY_YEARLY",
    },
    features: [
      "Unlimited websites",
      "Unlimited active widgets",
      "100,000 proof items / month",
      "10M widget views / month",
      "100 GB media storage",
      "5 min max video length",
      "Unlimited analytics retention",
      "Remove NotiProof badge",
      "Extra seats $3/mo",
    ],
  },
];

export function planByKey(key: string | null | undefined): PlanDefinition {
  return PLANS.find((p) => p.key === key) ?? PLANS[0];
}

export function priceForInterval(plan: PlanDefinition, interval: BillingInterval): number {
  return interval === "yearly" ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
}

/** Yearly savings as a percentage versus monthly billing. */
export function yearlySavingsPercent(plan: PlanDefinition): number {
  if (!plan.monthlyPriceUsd) return 0;
  const annualIfMonthly = plan.monthlyPriceUsd * 12;
  if (!annualIfMonthly) return 0;
  return Math.round((1 - plan.yearlyPriceUsd / annualIfMonthly) * 100);
}

/** Format a number that may be Infinity for UI display. */
export function formatLimit(n: number, suffix = ""): string {
  if (!isFinite(n)) return "Unlimited";
  return `${n.toLocaleString()}${suffix}`;
}
