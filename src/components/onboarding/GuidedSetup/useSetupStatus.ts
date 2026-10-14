import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StepKey } from "./types";
import { businessStepDone } from "@/lib/setup-progress";

export interface SetupCounts {
  businessName: string | null;
  websiteUrl: string | null;
  installVerified: boolean;
  integrationsConnected: number;
  testimonialRequests: number;
  proofTotal: number;
  proofApproved: number;
  widgets: number;
  firstWidgetId: string | null;
  domainCount: number;
}

const EMPTY: SetupCounts = {
  businessName: null,
  websiteUrl: null,
  installVerified: false,
  integrationsConnected: 0,
  testimonialRequests: 0,
  proofTotal: 0,
  proofApproved: 0,
  widgets: 0,
  firstWidgetId: null,
  domainCount: 0,
};

/** Reads the same tables/counts as SetupChecklist so completion state always
 *  matches the real data — no parallel storage. */
export function useSetupStatus(businessId: string | null) {
  const [counts, setCounts] = useState<SetupCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!businessId) {
      setCounts(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [biz, integrations, requests, proofTotal, proofApproved, widgets, firstWidget, domains] = await Promise.all([
        supabase.from("businesses").select("name, website_url, install_verified").eq("id", businessId).maybeSingle(),
        supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "connected"),
        (supabase as any).from("testimonial_requests").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "approved"),
        supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("widgets").select("id").eq("business_id", businessId).order("created_at", { ascending: true }).limit(1),
        supabase.from("business_domains").select("id", { count: "exact", head: true }).eq("business_id", businessId),
      ]);
      const bizRow = (biz.data ?? {}) as { name?: string | null; website_url?: string | null; install_verified?: boolean | null };
      setCounts({
        businessName: bizRow.name ?? null,
        websiteUrl: bizRow.website_url ?? null,
        installVerified: !!bizRow.install_verified,
        integrationsConnected: integrations.count ?? 0,
        testimonialRequests: requests.count ?? 0,
        proofTotal: proofTotal.count ?? 0,
        proofApproved: proofApproved.count ?? 0,
        widgets: widgets.count ?? 0,
        firstWidgetId: (firstWidget.data as any)?.[0]?.id ?? null,
        domainCount: domains.count ?? 0,
      });
    } catch {
      setCounts(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, loading, refresh };
}

export function stepDone(key: StepKey, counts: SetupCounts | null): boolean {
  if (!counts) return false;
  switch (key) {
    case "business":
      return businessStepDone({ website_url: counts.websiteUrl, domainCount: counts.domainCount });
    case "connect":
      return counts.integrationsConnected > 0 || counts.testimonialRequests > 0;
    case "proof":
      return counts.proofTotal > 0;
    case "widget":
      return counts.widgets > 0;
    case "install":
      return counts.installVerified;
    case "done":
      return false;
    default:
      return false;
  }
}

export function firstIncompleteStep(counts: SetupCounts | null): StepKey {
  const order: StepKey[] = ["business", "connect", "proof", "widget", "install"];
  const found = order.find((k) => !stepDone(k, counts));
  return found ?? "done";
}
