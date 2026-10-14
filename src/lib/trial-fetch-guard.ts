import { UPGRADE_REQUIRED_EVENT } from "@/hooks/useTrialGate";

/**
 * The database rejects changes from accounts whose free trial has ended
 * (error text "TRIAL_ENDED"). Watch API responses so any blocked save, on any
 * page, opens the upgrade dialog instead of a confusing error.
 */
export function installTrialFetchGuard() {
  if (typeof window === "undefined" || (window as any).__npTrialGuard) return;
  (window as any).__npTrialGuard = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await original(...args);
    if (res.status >= 400 && res.status < 500) {
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : (args[0] as Request).url;
      if (url.includes(".supabase.co/rest/v1/")) {
        res.clone().text().then((t) => {
          if (t.includes("TRIAL_ENDED")) window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT));
        }).catch(() => {});
      }
    }
    return res;
  };
}
