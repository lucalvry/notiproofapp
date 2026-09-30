import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalSession } from "@/components/layouts/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const db = supabase as any;

interface Daily { day: string; impressions: number; clicks: number; }

export default function PortalAnalytics() {
  const { client } = usePortalSession();
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, ctr: 0 });
  const [daily, setDaily] = useState<Daily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await db
        .from("widget_events")
        .select("event_type, created_at, business_id")
        .eq("business_id", client.business_id)
        .gte("created_at", since)
        .limit(5000);
      if (cancelled) return;
      const events = (data ?? []) as { event_type: string; created_at: string }[];
      const byDay = new Map<string, Daily>();
      let imp = 0; let clk = 0;
      for (const e of events) {
        const day = e.created_at.slice(0, 10);
        const row = byDay.get(day) ?? { day, impressions: 0, clicks: 0 };
        if (e.event_type === "impression") { row.impressions += 1; imp += 1; }
        else if (e.event_type === "click") { row.clicks += 1; clk += 1; }
        byDay.set(day, row);
      }
      setTotals({ impressions: imp, clicks: clk, ctr: imp ? (clk / imp) * 100 : 0 });
      setDaily(Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm">Widget performance over the last 30 days.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Impressions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{loading ? "…" : totals.impressions.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">Clicks</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{loading ? "…" : totals.clicks.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-normal text-muted-foreground">CTR</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{loading ? "…" : `${totals.ctr.toFixed(2)}%`}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily activity</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : daily.length === 0 ? (
            <div className="text-sm text-muted-foreground">No widget events in the last 30 days.</div>
          ) : (
            <div className="space-y-1.5">
              {daily.map((d) => {
                const max = Math.max(...daily.map((x) => x.impressions), 1);
                const pct = (d.impressions / max) * 100;
                return (
                  <div key={d.day} className="flex items-center gap-3 text-xs">
                    <div className="w-20 text-muted-foreground">{d.day}</div>
                    <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, background: "var(--brand-primary, hsl(var(--primary)))" }} />
                    </div>
                    <div className="w-24 text-right tabular-nums">{d.impressions} imp · {d.clicks} clk</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
