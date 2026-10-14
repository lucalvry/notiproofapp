import { useEffect, useState } from "react";
import { useGuidedSetup, type StepKey } from "@/components/onboarding/GuidedSetup";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X } from "lucide-react";

interface ChecklistCounts {
  websiteUrl: string | null;
  installVerified: boolean;
  integrationsConnected: number;
  testimonialRequests: number;
  proofTotal: number;
  proofApproved: number;
  widgets: number;
  firstWidgetId: string | null;
}

interface Step {
  key: string;
  title: string;
  hint?: string;
  done: boolean;
  step: StepKey;
}

function dismissKey(businessId: string) {
  return `notiproof.setupChecklist.dismissed.${businessId}`;
}

export function SetupChecklist() {
  const { businesses, currentBusinessId } = useAuth();
  const guided = useGuidedSetup();
  const currentBusiness = businesses.find((b) => b.id === currentBusinessId);
  const [counts, setCounts] = useState<ChecklistCounts | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!currentBusinessId) return;
    setDismissed(localStorage.getItem(dismissKey(currentBusinessId)) === "1");
    setCounts(null);

    Promise.all([
      supabase.from("businesses").select("website_url, install_verified").eq("id", currentBusinessId).maybeSingle(),
      supabase.from("integrations").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "connected"),
      (supabase as any).from("testimonial_requests").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
      supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
      supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId).eq("status", "approved"),
      supabase.from("widgets").select("id", { count: "exact", head: true }).eq("business_id", currentBusinessId),
      supabase.from("widgets").select("id").eq("business_id", currentBusinessId).order("created_at", { ascending: true }).limit(1),
    ]).then(([biz, integrations, requests, proofTotal, proofApproved, widgets, firstWidget]: any[]) => {
      const bizRow = (biz.data ?? {}) as { website_url?: string | null; install_verified?: boolean | null };
      setCounts({
        websiteUrl: bizRow.website_url ?? null,
        installVerified: !!bizRow.install_verified,
        integrationsConnected: integrations.count ?? 0,
        testimonialRequests: requests.count ?? 0,
        proofTotal: proofTotal.count ?? 0,
        proofApproved: proofApproved.count ?? 0,
        widgets: widgets.count ?? 0,
        firstWidgetId: firstWidget.data?.[0]?.id ?? null,
      });
    }).catch(() => {
      setCounts({
        websiteUrl: null,
        installVerified: false,
        integrationsConnected: 0,
        testimonialRequests: 0,
        proofTotal: 0,
        proofApproved: 0,
        widgets: 0,
        firstWidgetId: null,
      });
    });
  }, [currentBusinessId]);

  if (!currentBusinessId) return null;

  if (counts === null) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Getting started</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-2 w-full" />
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const steps: Step[] = [
    {
      key: "business",
      step: "business",
      title: "Add your business + website",
      done: !!currentBusiness && !!counts.websiteUrl,
          },
    {
      key: "source",
      step: "connect",
      title: "Connect a proof source",
      hint: "We suggest starting with Google reviews — or try Stripe, Shopify, WooCommerce, or request testimonials directly.",
      done: counts.integrationsConnected > 0 || counts.testimonialRequests > 0,
          },
    {
      key: "import",
      step: "proof",
      title: "Import your proof",
      done: counts.proofTotal > 0,
          },
    {
      key: "approve",
      step: "proof",
      title: "Approve your proof",
      hint: counts.proofTotal - counts.proofApproved > 0 ? `${counts.proofTotal - counts.proofApproved} awaiting approval` : undefined,
      done: counts.proofApproved > 0,
          },
    {
      key: "widget",
      step: "widget",
      title: "Build a widget",
      done: counts.widgets > 0,
          },
    {
      key: "install",
      step: "install",
      title: "Install on your site",
      done: counts.installVerified,
          },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;
  const currentIndex = steps.findIndex((s) => !s.done);

  const handleDismiss = () => {
    if (currentBusinessId) localStorage.setItem(dismissKey(currentBusinessId), "1");
    setDismissed(true);
  };

  if (allDone && dismissed) return null;

  if (allDone) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Setup complete
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Getting started</CardTitle>
          <span className="text-sm text-muted-foreground">{completedCount} of {steps.length} complete</span>
        </div>
        <Progress value={(completedCount / steps.length) * 100} />
        <Button size="sm" variant="outline" className="w-fit" onClick={() => guided.open(steps[currentIndex]?.step)}>
          Open guided setup
        </Button>
      </CardHeader>
      <CardContent className="space-y-1">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex;
          return (
            <button
              type="button"
              key={step.key}
              onClick={() => guided.open(step.step)}
              className={`flex w-full text-left items-start gap-3 rounded-md px-2 py-2 -mx-2 transition-colors hover:bg-muted/40 ${
                isCurrent ? "bg-accent/10" : ""
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isCurrent ? "text-foreground" : "text-muted-foreground"}`} />
              )}
              <div className="min-w-0">
                <div className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.title}
                </div>
                {step.hint && !step.done && (
                  <div className="text-xs text-muted-foreground mt-0.5">{step.hint}</div>
                )}
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
