import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useToast } from "@/hooks/use-toast";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import {
  AGENCY_PLANS,
  agencyPlanByKey,
  agencyPriceForInterval,
  agencyYearlySavingsPercent,
  type AgencyPlanKey,
  type BillingInterval,
} from "@/lib/agency-plans";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  Loader2,
  Settings,
  Sparkles,
  Users,
  Briefcase,
  Receipt,
} from "lucide-react";

interface UsageCounts {
  clients: number;
  teamMembers: number;
}

interface ResellerSummaryRow {
  client_id: string;
  client_name: string;
  retail: number;
  cost: number;
  margin: number;
}

export default function AgencyBilling() {
  const { agency, role, refresh } = useAgency();
  const { toast } = useToast();
  const isAdmin = role === "admin";

  const [usage, setUsage] = useState<UsageCounts | null>(null);
  const [openPlans, setOpenPlans] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [resellerRows, setResellerRows] = useState<ResellerSummaryRow[] | null>(null);
  const [resellerEnabled, setResellerEnabled] = useState(false);

  const currentPlan = useMemo(() => agencyPlanByKey(agency?.plan_tier), [agency?.plan_tier]);

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    (async () => {
      const [clientsRes, teamRes, resellerRes, clientsForResellerRes] = await Promise.all([
        supabase
          .from("agency_client_relationships")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .neq("status", "removed"),
        supabase
          .from("agency_team_members")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .not("invitation_accepted_at", "is", null),
        supabase
          .from("agency_reseller_config")
          .select("pricing, payment_collection")
          .eq("agency_id", agency.id)
          .maybeSingle(),
        supabase
          .from("agency_client_relationships")
          .select("client_business_id, client_plan, businesses!agency_client_relationships_client_business_id_fkey(name)")
          .eq("agency_id", agency.id)
          .eq("status", "active"),
      ]);
      if (cancelled) return;
      setUsage({ clients: clientsRes.count ?? 0, teamMembers: teamRes.count ?? 0 });

      const pricing = (resellerRes.data?.pricing ?? {}) as Record<string, { retail?: number; cost?: number }>;
      const hasResellerPricing = Object.keys(pricing).length > 0;
      setResellerEnabled(hasResellerPricing);

      if (hasResellerPricing && clientsForResellerRes.data) {
        const rows: ResellerSummaryRow[] = clientsForResellerRes.data.map((row: any) => {
          const planKey: string = row.client_plan ?? "free";
          const tier = pricing[planKey] ?? {};
          const retail = Number(tier.retail ?? 0);
          const cost = Number(tier.cost ?? 0);
          return {
            client_id: row.client_business_id,
            client_name: row.businesses?.name ?? "—",
            retail,
            cost,
            margin: retail - cost,
          };
        });
        setResellerRows(rows);
      } else {
        setResellerRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agency?.id]);

  if (!agency) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const seatUsed = usage?.clients ?? 0;
  const seatLimit = agency.client_seat_limit ?? 0;
  const seatPercent = seatLimit > 0 ? Math.min(100, Math.round((seatUsed / seatLimit) * 100)) : 0;
  const nearCap = seatLimit > 0 && seatUsed / seatLimit >= 0.8;

  const openPortal = async () => {
    if (!isAdmin) return;
    setBusyAction("portal");
    const { data, error } = await supabase.functions.invoke("stripe-portal-session", {
      body: { agency_id: agency.id, return_url: window.location.href },
    });
    setBusyAction(null);
    if (error || !data?.url) {
      if (showRateLimitToastIf(error ?? data)) return;
      toast({
        title: "Unable to open billing portal",
        description: error?.message ?? data?.error ?? "Stripe is not connected for this agency yet.",
        variant: "destructive",
      });
      return;
    }
    window.location.assign(data.url);
  };

  const startCheckout = async (planKey: AgencyPlanKey, chosen: BillingInterval) => {
    if (!isAdmin) return;
    if (planKey === "enterprise_agency") {
      window.location.href = "mailto:sales@notiproof.xyz?subject=Enterprise%20agency%20plan";
      return;
    }
    setBusyAction(`${planKey}:${chosen}`);
    const { data, error } = await supabase.functions.invoke("stripe-checkout-session", {
      body: {
        agency_id: agency.id,
        plan_key: planKey,
        interval: chosen,
        success_url: `${window.location.origin}/agency/billing?status=success`,
        cancel_url: `${window.location.origin}/agency/billing?status=cancelled`,
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
    await refresh();
    window.location.assign(data.url);
  };

  const totalRetail = resellerRows?.reduce((s, r) => s + r.retail, 0) ?? 0;
  const totalCost = resellerRows?.reduce((s, r) => s + r.cost, 0) ?? 0;
  const totalMargin = totalRetail - totalCost;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ABILL-01</div>
          <h1 className="text-3xl font-bold mt-1">Agency billing</h1>
          <p className="text-muted-foreground mt-1">Manage your agency plan, seats, and reseller revenue.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/agency/billing/reseller">
            <Settings className="h-4 w-4 mr-2" />
            Reseller settings
          </Link>
        </Button>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">Current plan</div>
            <CardTitle className="text-2xl mt-1 flex items-center gap-2">
              {currentPlan.name}
              {currentPlan.highlight && <Sparkles className="h-4 w-4 text-accent" />}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{currentPlan.tagline}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="default" className="capitalize">{currentPlan.name}</Badge>
            {isAdmin && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={openPortal} disabled={busyAction === "portal"}>
                  {busyAction === "portal" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
                  Manage in Stripe
                </Button>
                <Button onClick={() => setOpenPlans(true)}>
                  Change plan
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Seat usage */}
      <Card className={nearCap ? "border-amber-500/40" : undefined}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Client seats
          </CardTitle>
          <CardDescription>
            Each active client workspace counts as one seat. Suspended or removed clients don't count.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-sm mb-2">
              <span>
                <span className="font-semibold text-foreground">{seatUsed}</span>
                <span className="text-muted-foreground"> / {seatLimit} clients</span>
              </span>
              <span className="text-muted-foreground text-xs">{seatPercent}% used</span>
            </div>
            <Progress value={seatPercent} className={nearCap ? "bg-amber-500/10" : undefined} />
          </div>
          {nearCap && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              You're approaching your seat limit. Upgrade your plan to onboard more clients.
              {isAdmin && (
                <Button size="sm" variant="link" className="px-1" onClick={() => setOpenPlans(true)}>
                  See upgrade options
                </Button>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{usage?.teamMembers ?? "—"}</span>
              <span className="text-muted-foreground">team members of {currentPlan.teamSeats}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{seatUsed}</span>
              <span className="text-muted-foreground">active clients</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reseller revenue summary */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Reseller revenue
            </CardTitle>
            <CardDescription>
              {resellerEnabled
                ? "Estimated monthly retail vs. NotiProof cost per client. Collection is handled manually in Phase 3."
                : "Configure per-tier retail pricing to start tracking your client revenue."}
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/agency/billing/reseller">Configure</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!resellerEnabled ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No reseller pricing configured yet.
            </div>
          ) : resellerRows && resellerRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No active clients on a paid tier yet.</div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Client</th>
                    <th className="text-right p-3">Retail / mo</th>
                    <th className="text-right p-3">Cost / mo</th>
                    <th className="text-right p-3">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {resellerRows?.map((r) => (
                    <tr key={r.client_id} className="border-t">
                      <td className="p-3">{r.client_name}</td>
                      <td className="p-3 text-right">${r.retail.toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">${r.cost.toFixed(2)}</td>
                      <td className={`p-3 text-right font-medium ${r.margin > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        ${r.margin.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr className="border-t">
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right">${totalRetail.toFixed(2)}</td>
                    <td className="p-3 text-right">${totalCost.toFixed(2)}</td>
                    <td className={`p-3 text-right ${totalMargin > 0 ? "text-emerald-600" : ""}`}>
                      ${totalMargin.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openPlans} onOpenChange={setOpenPlans}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Choose an agency plan</DialogTitle>
            <DialogDescription>
              Plans include the white-label portal, cross-client reports, and team seats. Stripe handles the rest.
            </DialogDescription>
          </DialogHeader>
          <IntervalToggle value={interval} onChange={setInterval} />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {AGENCY_PLANS.map((plan) => {
              const isCurrent = plan.key === currentPlan.key;
              const price = agencyPriceForInterval(plan, interval);
              const savings = agencyYearlySavingsPercent(plan);
              const busy = busyAction === `${plan.key}:${interval}`;
              return (
                <Card key={plan.key} className={`flex flex-col ${plan.highlight ? "border-primary shadow-md" : ""}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {plan.name}
                      {plan.highlight && <Badge variant="default">Popular</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    <div>
                      {plan.key === "enterprise_agency" ? (
                        <div className="text-xl font-bold">Custom</div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold">${price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                          {interval === "yearly" && savings > 0 && (
                            <div className="text-xs text-emerald-600">Save {savings}% billed annually</div>
                          )}
                        </>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-sm flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      disabled={isCurrent || busy || !isAdmin}
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => startCheckout(plan.key, interval)}
                    >
                      {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      {isCurrent ? "Current plan" : plan.key === "enterprise_agency" ? "Talk to sales" : "Select"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntervalToggle({ value, onChange }: { value: BillingInterval; onChange: (v: BillingInterval) => void }) {
  return (
    <div className="inline-flex p-1 rounded-md bg-muted text-xs font-medium">
      {(["monthly", "yearly"] as const).map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded ${value === opt ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          {opt === "monthly" ? "Monthly" : "Yearly"}
        </button>
      ))}
    </div>
  );
}
