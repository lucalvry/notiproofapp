import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlanUsage } from "@/lib/plan-helpers";
import {
  PLANS,
  planByKey,
  priceForInterval,
  yearlySavingsPercent,
  type BillingInterval,
  type PlanKey,
} from "@/lib/plans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import {
  ExternalLink,
  Loader2,
  Check,
  ArrowUpRight,
  FileText,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

interface BusinessBilling {
  plan_tier: string;
  plan: string;
  monthly_event_limit: number;
  monthly_proof_limit: number;
  plan_expires_at: string | null;
  stripe_subscription_id: string | null;
}

interface UsageNow {
  proofThisMonth: number;
  eventsThisMonth: number;
  storageMbUsed: number;
}

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  total: number;
  currency: string;
  created: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
}

function startOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export default function BillingSettings() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const { toast } = useToast();
  const [billing, setBilling] = useState<BusinessBilling | null>(null);
  const [usage, setUsage] = useState<UsageNow | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [openPlans, setOpenPlans] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const canManage = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const currentPlan = planByKey(billing?.plan_tier ?? billing?.plan);

  const loadAll = async () => {
    if (!currentBusinessId) return;
    setBilling(null);
    setUsage(null);
    setInvoices(null);
    setInvoicesError(null);

    const monthStart = startOfMonthIso();

    const [bizRes, proofRes, eventRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("plan, plan_tier, monthly_event_limit, monthly_proof_limit, plan_expires_at, stripe_subscription_id")
        .eq("id", currentBusinessId)
        .maybeSingle(),
      supabase
        .from("proof_objects")
        .select("id", { count: "exact", head: true })
        .eq("business_id", currentBusinessId)
        .gte("created_at", monthStart),
      supabase
        .from("widget_events")
        .select("id", { count: "exact", head: true })
        .eq("business_id", currentBusinessId)
        .gte("fired_at", monthStart),
    ]);

    // Storage usage via plan-usage RPC (best-effort)
    let storageMbUsed = 0;
    const { data: usageRow } = await (supabase.rpc as any)("business_plan_usage", { _business_id: currentBusinessId });
    if (usageRow && typeof usageRow.storage_bytes === "number") {
      storageMbUsed = Math.round(usageRow.storage_bytes / (1024 * 1024));
    }

    if ((bizRes as any).data) setBilling((bizRes as any).data as BusinessBilling);
    setUsage({
      proofThisMonth: proofRes.count ?? 0,
      eventsThisMonth: eventRes.count ?? 0,
      storageMbUsed,
    });

    // Invoices via edge function (non-blocking)
    const inv = await supabase.functions.invoke("stripe-list-invoices", {
      body: { business_id: currentBusinessId },
    });
    if (inv.error) {
      setInvoicesError(inv.error.message);
      setInvoices([]);
    } else {
      setInvoices((inv.data?.invoices ?? []) as Invoice[]);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  const openPortal = async () => {
    if (!currentBusinessId) return;
    setBusyAction("portal");
    const { data, error } = await supabase.functions.invoke("stripe-portal-session", {
      body: { business_id: currentBusinessId, return_url: window.location.href },
    });
    setBusyAction(null);
    if (error || !data?.url) {
      if (showRateLimitToastIf(error ?? data)) return;
      toast({
        title: "Unable to open billing portal",
        description: error?.message ?? data?.error,
        variant: "destructive",
      });
      return;
    }
    window.location.assign(data.url);
  };

  const startCheckout = async (planKey: PlanKey, chosenInterval: BillingInterval = interval) => {
    if (!currentBusinessId || planKey === "free") return;
    setBusyAction(`${planKey}:${chosenInterval}`);
    const { data, error } = await supabase.functions.invoke("stripe-checkout-session", {
      body: {
        business_id: currentBusinessId,
        plan_key: planKey,
        interval: chosenInterval,
        success_url: `${window.location.origin}/settings/billing?status=success`,
        cancel_url: `${window.location.origin}/settings/billing?status=cancelled`,
      },
    });
    setBusyAction(null);
    if (error || !data?.url) {
      if (showRateLimitToastIf(error ?? data)) return;
      toast({
        title: "Unable to start checkout",
        description: error?.message ?? data?.error,
        variant: "destructive",
      });
      return;
    }
    window.location.assign(data.url);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">SET-04</div>
        <h1 className="text-3xl font-bold mt-1">Billing</h1>
        <p className="text-muted-foreground mt-1">Manage your plan, usage, and invoices.</p>
        <div className="mt-2"><VideoBadgeLink audience="marketer" label="What paid plans unlock (1:20)" /></div>
      </div>

      {/* Current plan + upgrade CTA */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Current plan</div>
            <CardTitle className="text-2xl mt-1 capitalize flex items-center gap-2">
              {billing ? currentPlan.name : <Skeleton className="h-7 w-24" />}
              {currentPlan.highlight && <Sparkles className="h-4 w-4 text-accent" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{currentPlan.tagline}</p>
            {billing?.plan_expires_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Renews {new Date(billing.plan_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={currentPlan.key === "free" ? "secondary" : "default"} className="capitalize">
              {currentPlan.name}
            </Badge>
            {canManage && (
              <Button onClick={() => setOpenPlans(true)}>
                {currentPlan.key === "free" ? "Upgrade" : "Change plan"}
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Upgrade to Agency entry point (AGY route) */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Manage multiple clients?</div>
            <CardTitle className="text-lg mt-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              Upgrade to Agency
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              White-label client portal, shared team seats, cross-client reports, and consolidated billing. Built for marketing and PR agencies running social proof for multiple brands.
            </p>
          </div>
          <Button asChild>
            <a href="/agency/signup">
              Set up agency
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </CardHeader>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage this month</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-6">
          <UsageMeter
            label="Proof items"
            used={usage?.proofThisMonth ?? null}
            limit={billing?.monthly_proof_limit ?? currentPlan.proofLimit}
          />
          <UsageMeter
            label="Widget events"
            used={usage?.eventsThisMonth ?? null}
            limit={billing?.monthly_event_limit ?? currentPlan.eventLimit}
          />
          <UsageMeter
            label={`Media storage (MB of ${currentPlan.storageMb})`}
            used={usage?.storageMbUsed ?? null}
            limit={currentPlan.storageMb}
          />
        </CardContent>
      </Card>

      <SeatsCard plan={currentPlan} canManage={canManage} />

      {/* Plan comparison */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Compare plans</CardTitle>
          <IntervalToggle value={interval} onChange={setInterval} />
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.key === currentPlan.key;
              const displayPrice = priceForInterval(plan, interval);
              const savings = yearlySavingsPercent(plan);
              const buttonKey = `${plan.key}:${interval}`;
              return (
                <div
                  key={plan.key}
                  className={`rounded-lg border p-4 flex flex-col ${
                    plan.highlight ? "border-accent ring-1 ring-accent/30" : ""
                  } ${isCurrent ? "bg-muted/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.tagline}</div>
                    </div>
                    {plan.highlight && (
                      <Badge variant="default" className="text-[10px]">Popular</Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      ${displayPrice}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                    {interval === "yearly" && plan.key !== "free" && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Billed ${plan.yearlyPriceUsd}/year
                        {savings > 0 && (
                          <span className="text-success ml-1">· Save {savings}%</span>
                        )}
                      </div>
                    )}
                    {interval === "monthly" && plan.key !== "free" && savings > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        or ${plan.yearlyMonthlyPriceUsd}/mo billed yearly
                      </div>
                    )}
                  </div>
                  <ul className="mt-4 space-y-1.5 text-sm flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current plan
                      </Button>
                    ) : plan.key === "free" ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={!canManage || busyAction !== null}
                        onClick={openPortal}
                      >
                        Downgrade
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!canManage || busyAction !== null}
                        onClick={() => startCheckout(plan.key, interval)}
                      >
                        {busyAction === buttonKey && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                        {currentPlan.monthlyPriceUsd > plan.monthlyPriceUsd ? "Switch" : "Upgrade"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment method + invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Payment & invoices</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={openPortal}
            disabled={!canManage || busyAction === "portal"}
          >
            {busyAction === "portal" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            Manage payment method
          </Button>
        </CardHeader>
        <CardContent>
          {invoices === null ? (
            <Skeleton className="h-32 w-full" />
          ) : invoices.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">No invoices yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {invoicesError
                  ? "Connect Stripe to see invoice history."
                  : "Once you start a paid plan, invoices will appear here."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Number</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium text-right">Amount</th>
                    <th className="px-2 py-2 font-medium text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30">
                      <td className="px-2 py-2 whitespace-nowrap">
                        {new Date(inv.created * 1000).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{inv.number ?? "—"}</td>
                      <td className="px-2 py-2 capitalize">
                        <Badge
                          variant={inv.status === "paid" ? "default" : "secondary"}
                          className="text-[10px] capitalize"
                        >
                          {inv.status ?? "open"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-right">
                        {(inv.total / 100).toLocaleString(undefined, {
                          style: "currency",
                          currency: (inv.currency || "usd").toUpperCase(),
                        })}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {inv.invoice_pdf || inv.hosted_invoice_url ? (
                          <a
                            className="text-accent hover:underline inline-flex items-center gap-1"
                            href={inv.invoice_pdf ?? inv.hosted_invoice_url ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan selection modal */}
      <Dialog open={openPlans} onOpenChange={setOpenPlans}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Choose a plan</DialogTitle>
            <DialogDescription>
              You'll be redirected to Stripe Checkout to complete the upgrade.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-2">
            <IntervalToggle value={interval} onChange={setInterval} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {PLANS.filter((p) => p.key !== "free").map((plan) => {
              const isCurrent = plan.key === currentPlan.key;
              const displayPrice = priceForInterval(plan, interval);
              const buttonKey = `${plan.key}:${interval}`;
              const savings = yearlySavingsPercent(plan);
              return (
                <div
                  key={plan.key}
                  className={`rounded-lg border p-4 ${
                    plan.highlight ? "border-accent ring-1 ring-accent/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">{plan.tagline}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${displayPrice}</div>
                      <div className="text-xs text-muted-foreground">/month</div>
                    </div>
                  </div>
                  {interval === "yearly" && (
                    <div className="text-xs text-muted-foreground mt-2">
                      ${plan.yearlyPriceUsd} billed yearly
                      {savings > 0 && <span className="text-success ml-1">· Save {savings}%</span>}
                    </div>
                  )}
                  <Button
                    className="w-full mt-4"
                    disabled={isCurrent || busyAction !== null}
                    onClick={() => startCheckout(plan.key, interval)}
                  >
                    {busyAction === buttonKey && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    {isCurrent ? "Current plan" : "Continue to checkout"}
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeatsCard({ plan, canManage }: { plan: ReturnType<typeof planByKey>; canManage: boolean }) {
  const { usage, seatLimit, atSeatLimit } = usePlanUsage();
  const { toast } = useToast();
  const seatsUsed = usage.seats + usage.pending_invites;
  const extraOffered = plan.extraSeatPriceUsd > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Team seats</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {plan.teamSeatsIncluded} included on {plan.name}
            {usage.extra_seats > 0 ? ` · +${usage.extra_seats} extra purchased` : ""}
          </p>
        </div>
        {extraOffered && canManage && (
          <Button
            size="sm"
            variant={atSeatLimit ? "default" : "outline"}
            onClick={() =>
              toast({
                title: "Extra seats coming soon",
                description: `Additional seats are $${plan.extraSeatPriceUsd}/month each. Contact support to add seats while self-serve checkout is being finalized.`,
              })
            }
          >
            Add extra seat (${plan.extraSeatPriceUsd}/mo)
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium">Seats in use</div>
          <div className="text-xs text-muted-foreground">
            {seatsUsed} / {seatLimit}
          </div>
        </div>
        <Progress
          value={seatLimit ? Math.min(100, Math.round((seatsUsed / seatLimit) * 100)) : 0}
          className="mt-2 h-2"
        />
        {atSeatLimit && (
          <p className="text-xs text-destructive mt-2 inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Seat limit reached — upgrade or add an extra seat to invite more teammates.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border bg-muted/40 p-1 text-sm">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-3 py-1 rounded-full transition-colors ${
          value === "monthly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`px-3 py-1 rounded-full transition-colors inline-flex items-center gap-1.5 ${
          value === "yearly" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
        }`}
      >
        Yearly
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
          Save ~17%
        </Badge>
      </button>
    </div>
  );
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number | null;
  limit: number;
}) {
  const percent = useMemo(() => {
    if (used === null || !limit) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }, [used, limit]);
  const danger = percent >= 90;
  const warn = percent >= 75 && percent < 90;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">
          {used === null ? "—" : `${used.toLocaleString()} / ${limit.toLocaleString()}`}
        </div>
      </div>
      <Progress value={percent} className="mt-2 h-2" />
      <div className="flex items-center gap-1 mt-1.5 text-xs">
        {danger ? (
          <span className="inline-flex items-center gap-1 text-destructive">
            <AlertTriangle className="h-3 w-3" /> {percent}% used — consider upgrading
          </span>
        ) : warn ? (
          <span className="inline-flex items-center gap-1 text-gold">
            <AlertTriangle className="h-3 w-3" /> {percent}% used
          </span>
        ) : (
          <span className="text-muted-foreground">{percent}% of monthly limit</span>
        )}
      </div>
    </div>
  );
}
