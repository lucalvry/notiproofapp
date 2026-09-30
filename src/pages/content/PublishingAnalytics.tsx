import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContentSubNav } from "./components/ContentSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

const db = supabase as any;

interface EvRow {
  id: string;
  channel_id: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  error_message: string | null;
  publishing_channels?: { provider: string; account_label: string | null } | null;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(142 70% 35%)", "hsl(280 70% 55%)", "hsl(40 85% 50%)", "hsl(190 75% 45%)"];

export default function PublishingAnalytics() {
  const { currentBusinessId } = useAuth();
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<EvRow[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    db.from("content_publish_events")
      .select("id, channel_id, status, scheduled_at, published_at, created_at, error_message, publishing_channels(provider, account_label)")
      .eq("business_id", currentBusinessId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }: any) => setRows((data as EvRow[]) ?? []));
  }, [currentBusinessId, days]);

  const { chart, providers, total, success, failed, recentFailures } = useMemo(() => {
    const byDay: Record<string, Record<string, number>> = {};
    const provs = new Set<string>();
    let total = 0, success = 0, failed = 0;
    const failures: EvRow[] = [];
    for (const r of rows) {
      total++;
      if (r.status === "published") success++;
      if (r.status === "failed") { failed++; failures.push(r); }
      const d = (r.published_at ?? r.created_at).slice(0, 10);
      const prov = r.publishing_channels?.provider ?? "unknown";
      provs.add(prov);
      byDay[d] = byDay[d] ?? {};
      byDay[d][prov] = (byDay[d][prov] ?? 0) + 1;
    }
    const chart = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({ day: day.slice(5), ...counts }));
    return {
      chart,
      providers: Array.from(provs),
      total,
      success,
      failed,
      recentFailures: failures.slice(0, 10),
    };
  }, [rows]);

  const successRate = total ? Math.round((success / total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PUB-04</div>
          <h1 className="text-3xl font-bold mt-1">Publishing analytics</h1>
          <p className="text-muted-foreground mt-1">Throughput and success across all your publishing channels.</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(parseInt(v, 10))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ContentSubNav />

      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Total publishes</div><div className="text-2xl font-bold">{total}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Successful</div><div className="text-2xl font-bold">{success}</div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="text-xs text-muted-foreground">Success rate</div><div className="text-2xl font-bold">{successRate}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Publishes per day</CardTitle></CardHeader>
        <CardContent style={{ height: 320 }}>
          {chart.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">No publishing activity yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                {providers.map((p, i) => (
                  <Bar key={p} dataKey={p} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent failures</CardTitle></CardHeader>
        <CardContent>
          {recentFailures.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No failed publishes 🎉</div>
          ) : (
            <div className="space-y-2">
              {recentFailures.map((f) => (
                <div key={f.id} className="flex items-start gap-3 text-sm border-b pb-2">
                  <Badge variant="destructive" className="mt-0.5">{f.publishing_channels?.provider}</Badge>
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</div>
                    <div className="text-xs">{f.error_message ?? "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
