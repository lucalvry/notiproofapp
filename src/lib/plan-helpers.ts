// Centralised plan resolution + usage hook so every screen reads limits the
// same way. Server-side enforcement lives in SQL triggers + RPCs (see the
// `plan_limits`, `business_plan_usage`, `can_*` functions). This module is
// the read path for the UI.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { planByKey, type PlanDefinition } from "@/lib/plans";

export interface PlanUsage {
  proofs_mtd: number;
  events_mtd: number;
  storage_bytes: number;
  active_widgets: number;
  domains: number;
  seats: number;
  pending_invites: number;
  extra_seats: number;
}

const EMPTY_USAGE: PlanUsage = {
  proofs_mtd: 0,
  events_mtd: 0,
  storage_bytes: 0,
  active_widgets: 0,
  domains: 0,
  seats: 0,
  pending_invites: 0,
  extra_seats: 0,
};

export function getEffectivePlan(business: { plan?: string | null; plan_tier?: string | null } | null | undefined): PlanDefinition {
  return planByKey(business?.plan ?? business?.plan_tier ?? "free");
}

export function usePlan() {
  const { businesses, currentBusinessId } = useAuth();
  const business = businesses.find((b) => b.id === currentBusinessId) ?? null;
  const plan = getEffectivePlan(business);
  return { plan, business };
}

export function usePlanUsage() {
  const { currentBusinessId } = useAuth();
  const { plan } = usePlan();
  const [usage, setUsage] = useState<PlanUsage>(EMPTY_USAGE);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!currentBusinessId) {
      setUsage(EMPTY_USAGE);
      setLoading(false);
      return;
    }
    setLoading(true);
    (supabase.rpc as any)("business_plan_usage", { _business_id: currentBusinessId })
      .then(({ data }: any) => {
        if (data) setUsage({ ...EMPTY_USAGE, ...(data as PlanUsage) });
      })
      .finally(() => setLoading(false));
  }, [currentBusinessId, refreshKey]);

  const refresh = () => setRefreshKey((n) => n + 1);
  const seatLimit = plan.teamSeatsIncluded + (usage.extra_seats ?? 0);

  return {
    usage,
    plan,
    loading,
    refresh,
    atProofLimit: usage.proofs_mtd >= plan.proofLimit,
    atEventLimit: usage.events_mtd >= plan.eventLimit,
    atDomainLimit: usage.domains >= plan.domainLimit,
    atActiveWidgetLimit: usage.active_widgets >= plan.activeWidgetLimit,
    atSeatLimit: usage.seats + usage.pending_invites >= seatLimit,
    storageMbUsed: Math.round(usage.storage_bytes / (1024 * 1024)),
    seatLimit,
  };
}
