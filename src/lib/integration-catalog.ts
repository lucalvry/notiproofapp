// Honest build status of every integration, from the code audit (Oct 2026).
// Update this whenever an integration is finished or changed.
export type BuildStatus = "live" | "partial" | "not_built";

export interface CatalogEntry { provider: string; label: string; kind: "proof source" | "publishing"; status: BuildStatus; note: string }

export const INTEGRATION_CATALOG: CatalogEntry[] = [
  { provider: "stripe", label: "Stripe", kind: "proof source", status: "live", note: "Webhook turns payments into purchase proof." },
  { provider: "shopify", label: "Shopify", kind: "proof source", status: "live", note: "Sign-in flow + order webhook." },
  { provider: "woocommerce", label: "WooCommerce", kind: "proof source", status: "live", note: "Key connect + order webhook." },
  { provider: "zapier", label: "Zapier / webhook", kind: "proof source", status: "live", note: "Secret-protected incoming webhook." },
  { provider: "google_reviews", label: "Google Reviews", kind: "proof source", status: "live", note: "Imports reviews by Place ID." },
  { provider: "trustpilot", label: "Trustpilot", kind: "proof source", status: "partial", note: "Webhook receiver only; no account connect or import." },
  { provider: "g2", label: "G2", kind: "proof source", status: "partial", note: "Webhook receiver only; no account connect or import." },
  { provider: "gumroad", label: "Gumroad", kind: "proof source", status: "not_built", note: "Listed, no backend." },
  { provider: "plaid", label: "Plaid", kind: "proof source", status: "not_built", note: "Listed, no backend." },
  { provider: "wordpress", label: "WordPress", kind: "proof source", status: "not_built", note: "No plugin; snippet install only." },
  { provider: "buffer", label: "Buffer", kind: "publishing", status: "partial", note: "Sign-in flow built; never posted successfully." },
  { provider: "mailchimp", label: "Mailchimp", kind: "publishing", status: "partial", note: "Pasted key, not verified on save." },
  { provider: "klaviyo", label: "Klaviyo", kind: "publishing", status: "partial", note: "Pasted key, not verified on save." },
  { provider: "convertkit", label: "ConvertKit", kind: "publishing", status: "partial", note: "Pasted key, not verified on save." },
  { provider: "linkedin", label: "LinkedIn", kind: "publishing", status: "not_built", note: "Posting code only; no LinkedIn app or sign-in flow." },
  { provider: "twitter", label: "X (Twitter)", kind: "publishing", status: "not_built", note: "Posting code only; no X app or sign-in flow." },
];

/** Publishing providers users can't actually connect yet. */
export const COMING_SOON_CHANNELS = new Set(["linkedin", "twitter"]);
