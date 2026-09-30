import { posthog } from "./posthog";
import { Sentry } from "./sentry";
import { useEffect, useState } from "react";

interface IdentifyParams {
  id: string;
  email?: string | null;
  isAdmin?: boolean;
  isImpersonating?: boolean;
  businessId?: string | null;
  extra?: Record<string, unknown>;
}

/**
 * Identify the current user for Sentry + PostHog. Admins and active
 * impersonation sessions are opted out of PostHog capture and tagged
 * `internal: true` in Sentry so we don't pollute product metrics.
 */
export function identifyUser({
  id,
  email,
  isAdmin,
  isImpersonating,
  businessId,
  extra,
}: IdentifyParams) {
  const internal = !!(isAdmin || isImpersonating);

  try {
    Sentry.setUser({ id, email: email ?? undefined });
    Sentry.setTag("internal", internal ? "true" : "false");
    if (businessId) Sentry.setTag("business_id", businessId);
  } catch {
    // ignore
  }

  try {
    if (internal) {
      if (!posthog.has_opted_out_capturing()) posthog.opt_out_capturing();
      return;
    }
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    posthog.identify(id, {
      email: email ?? undefined,
      business_id: businessId ?? undefined,
      ...extra,
    });
  } catch {
    // ignore
  }
}

export function resetUser() {
  try {
    Sentry.setUser(null);
    Sentry.setTag("internal", "false");
  } catch {
    // ignore
  }
  try {
    if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
    posthog.reset();
  } catch {
    // ignore
  }
}

export type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_step_completed"
  | "widget_published"
  | "proof_collected"
  | "content_generated"
  | "content_published"
  | "campaign_created"
  | "case_study_created";

export function track(event: AnalyticsEvent | string, props?: Record<string, unknown>) {
  try {
    posthog.capture(event, props);
  } catch {
    // ignore
  }
}

export function isFeatureEnabled(flag: string): boolean {
  try {
    return !!posthog.isFeatureEnabled(flag);
  } catch {
    return false;
  }
}

export function useFeatureFlag(flag: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return !!posthog.isFeatureEnabled(flag);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    let mounted = true;
    try {
      posthog.onFeatureFlags(() => {
        if (!mounted) return;
        setEnabled(!!posthog.isFeatureEnabled(flag));
      });
    } catch {
      // ignore
    }
    return () => {
      mounted = false;
    };
  }, [flag]);
  return enabled;
}