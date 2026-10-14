import { useEffect, useState } from "react";
import { usePlan } from "@/lib/plan-helpers";
import { useAuth } from "@/contexts/AuthContext";
import { trialStatus, type TrialStatus } from "@/lib/trial";

export const UPGRADE_REQUIRED_EVENT = "notiproof:upgrade-required";

/** Opens the shared "Upgrade to continue" dialog. */
export function showUpgradeDialog() {
  window.dispatchEvent(new CustomEvent(UPGRADE_REQUIRED_EVENT));
}

/**
 * Free trial gate for the current business. `requireActive()` returns false
 * (and opens the upgrade dialog) when the trial has ended and the account is view-only.
 */
export function useTrialGate(tick = false) {
  const { profile } = useAuth();
  const { business, testPlanOverride } = usePlan();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!tick) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tick]);

  const unlimited = !!profile?.is_admin && !testPlanOverride;
  const plan = profile?.is_admin && testPlanOverride ? testPlanOverride.key : business?.plan;
  const status: TrialStatus = trialStatus(
    { plan, trial_ends_at: business?.trial_ends_at ?? null, unlimited },
    now,
  );

  const requireActive = () => {
    if (trialStatus({ plan, trial_ends_at: business?.trial_ends_at ?? null, unlimited }).state === "ended") {
      showUpgradeDialog();
      return false;
    }
    return true;
  };

  return { status, ended: status.state === "ended", requireActive };
}
