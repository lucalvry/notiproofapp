import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { posthog } from "@/lib/posthog";

/**
 * Fires a $pageview to PostHog on every route change. Mounted once inside
 * <BrowserRouter>. No-ops when the visitor has opted out (admins/impersonation).
 */
export function PostHogPageviewTracker() {
  const location = useLocation();
  const last = useRef<string>("");

  useEffect(() => {
    const path = location.pathname + location.search;
    if (path === last.current) return;
    last.current = path;
    try {
      if (posthog.has_opted_out_capturing?.()) return;
      posthog.capture("$pageview", { $current_url: window.location.href });
    } catch {
      // ignore
    }
  }, [location.pathname, location.search]);

  return null;
}