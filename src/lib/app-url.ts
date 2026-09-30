// Canonical production origin for OAuth + email callbacks.
// Lovable preview URLs are dev-only — never used as redirect targets.
// Hard-coded so preview, prod, and localhost all funnel users back to prod after auth.
export const APP_URL = "https://app.notiproof.com";

// Use this for all OAuth and email redirects so users always land on prod.
export const appRedirect = (path: string) =>
  `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
