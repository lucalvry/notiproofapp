import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, UserPlus, AlertTriangle, ShieldCheck } from "lucide-react";

interface AuthMetrics {
  users_total: number;
  dau: number; wau: number; mau: number;
  signups_7d: number;
  signups_30d: number;
  signup_series: { day: string; n: number }[];
  failed_logins_24h_estimate: number;
  onboarding: { businesses_total: number; businesses_onboarded: number; businesses_installed: number };
  churn_risk_businesses: number;
}

export default function UsersTab() {
  const [data, setData] = useState<AuthMetrics | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("get-auth-metrics");
      if (error) setErr(error.message);
      else setData(data as AuthMetrics);
    })();
  }, []);

  if (err) return <div className="text-sm text-destructive">{err}</div>;
  if (!data) return <Skeleton className="h-96 w-full" />;

  const stat = (label: string, value: number, sub?: string, Icon = Activity) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value.toLocaleString()}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );

  const max = Math.max(1, ...data.signup_series.map((d) => d.n));

  const funnel = data.onboarding;
  const totalBiz = funnel.businesses_total || 1;
  const onboardPct = Math.round((funnel.businesses_onboarded / totalBiz) * 100);
  const installPct = Math.round((funnel.businesses_installed / totalBiz) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat("Users total", data.users_total)}
        {stat("DAU", data.dau, `WAU ${data.wau} · MAU ${data.mau}`, Activity)}
        {stat("Signups 7d", data.signups_7d, `${data.signups_30d} in 30d`, UserPlus)}
        {stat("Churn risk", data.churn_risk_businesses, "Biz inactive 30d", AlertTriangle)}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signups (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.signup_series.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No recent signups.</div>
            ) : (
              <div className="flex items-end gap-1 h-32">
                {data.signup_series.map((d) => (
                  <div key={d.day} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${(d.n / max) * 100}%` }} title={`${d.day}: ${d.n}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Onboarding funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Bar label="Businesses" value={funnel.businesses_total} pct={100} />
            <Bar label="Onboarded" value={funnel.businesses_onboarded} pct={onboardPct} />
            <Bar label="Widget installed" value={funnel.businesses_installed} pct={installPct} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Security signals
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Failed login estimate (24h): <span className="font-semibold text-foreground">{data.failed_logins_24h_estimate}</span>
          <p className="text-xs mt-2">Supabase Auth does not expose failed-attempt counts via API; this estimate reads from user metadata only.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Bar({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground">{value.toLocaleString()} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
