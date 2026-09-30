import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface RevenueData {
  mrr_usd: number;
  arr_usd: number;
  arpu_usd: number;
  paying_businesses: number;
  plan_distribution: Record<string, number>;
  stripe: { mrr_usd: number; active: number; past_due: number; canceled_30d: number } | null;
  stripe_configured: boolean;
  stripe_error: string | null;
  businesses_with_subscription: number;
  recent_changes: Array<{ id: string; business_id: string; action: string; details: any; created_at: string }>;
}

export default function RevenueTab() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-metrics");
      if (error) setErr(error.message);
      else setData(data as RevenueData);
    })();
  }, []);

  if (err) return <div className="text-sm text-destructive">{err}</div>;
  if (!data) return <Skeleton className="h-96 w-full" />;

  const stat = (label: string, value: string | number, sub?: string, Icon = CircleDollarSign) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat("MRR", `$${data.mrr_usd.toLocaleString()}`, data.stripe ? "Live from Stripe" : "From plan tiers")}
        {stat("ARR", `$${data.arr_usd.toLocaleString()}`, "MRR × 12", TrendingUp)}
        {stat("ARPU", `$${data.arpu_usd.toLocaleString()}`, `${data.paying_businesses} paying`, Users)}
        {stat("Paying", data.paying_businesses, `${data.businesses_with_subscription} linked to Stripe`, Users)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.plan_distribution).map(([plan, n]) => {
              const total = Object.values(data.plan_distribution).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((n / total) * 100);
              return (
                <div key={plan} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{plan}</span>
                    <span className="text-muted-foreground">{n.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              Stripe health
              <Badge variant={data.stripe_configured ? "secondary" : "outline"}>
                {data.stripe_configured ? "Connected" : "Not configured"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {data.stripe ? (
              <>
                <div className="flex justify-between"><span>Active subs</span><span>{data.stripe.active}</span></div>
                <div className="flex justify-between"><span>Past due</span><span className={data.stripe.past_due > 0 ? "text-destructive font-semibold" : ""}>{data.stripe.past_due}</span></div>
                <div className="flex justify-between"><span>Canceled (30d)</span><span>{data.stripe.canceled_30d}</span></div>
              </>
            ) : data.stripe_error ? (
              <div className="text-destructive text-xs flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{data.stripe_error}</div>
            ) : (
              <p className="text-muted-foreground">Add a STRIPE_SECRET_KEY secret to compute live MRR from Stripe subscriptions.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent plan changes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_changes.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No plan changes logged yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recent_changes.map((r) => (
                <li key={r.id} className="flex justify-between border-b last:border-0 py-2">
                  <span className="font-mono text-xs">{r.action}</span>
                  <span className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
