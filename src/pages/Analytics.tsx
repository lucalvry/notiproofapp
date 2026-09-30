import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { BarChart3, ArrowUpDown, TrendingUp, Lock, Sparkles } from "lucide-react";
import { usePlan } from "@/lib/plan-helpers";
import { Link } from "react-router-dom";

interface Bucket {
  bucket: string;
  date: string;
  impressions: number;
  interactions: number;
  conversions: number;
  assists: number;
  ctr: number;
}

interface ProofTypeSlice {
  type: string;
  count: number;
}

interface TopProofRow {
  proof_id: string;
  author_name: string | null;
  type: string;
  impressions: number;
  interactions: number;
  conversions: number;
  assists: number;
}

type SortKey = "impressions" | "interactions" | "conversions" | "assists";

const TYPE_COLORS = ["hsl(var(--accent))", "hsl(var(--teal))", "hsl(var(--gold))", "hsl(var(--primary))", "hsl(var(--muted-foreground))"];
const MIN_IMPRESSIONS_THRESHOLD = 50;

export default function Analytics() {
  const { currentBusinessId } = useAuth();
  const { plan } = usePlan();
  const retentionDays = isFinite(plan.dataRetentionDays) ? plan.dataRetentionDays : Infinity;
  const rangeOptions = [
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
    { value: "90", label: "Last 90 days" },
  ].filter((o) => Number(o.value) <= retentionDays);
  const [range, setRange] = useState(() => {
    const max = Math.min(30, retentionDays);
    return String(max);
  });
  const [data, setData] = useState<Bucket[] | null>(null);
  const [proofByType, setProofByType] = useState<ProofTypeSlice[] | null>(null);
  const [topProof, setTopProof] = useState<TopProofRow[] | null>(null);
  const [responseRate, setResponseRate] = useState<{ sent: number; responded: number } | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("impressions");

  useEffect(() => {
    if (!currentBusinessId) {
      setData(null);
      setProofByType(null);
      setTopProof(null);
      setResponseRate(null);
      return;
    }
    setData(null);
    setProofByType(null);
    setTopProof(null);
    setResponseRate(null);

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - Number(range));
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // Server-side aggregation via Postgres RPC — scales to millions of events
    // and avoids the 1000-row default cap. Spec: ANA-01 "Aggregate via Supabase RPC".
    Promise.all([
      supabase.rpc("get_widget_analytics", {
        _business_id: currentBusinessId,
        _start: startIso,
        _end: endIso,
      }),
      (supabase as any).rpc("get_top_proof_performance", {
        _business_id: currentBusinessId,
        _start: startIso,
        _end: endIso,
        _limit: 10,
      }),
      (supabase as any)
        .from("proof_objects")
        .select("type, created_at")
        .eq("business_id", currentBusinessId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .limit(5000),
      (supabase as any)
        .from("testimonial_requests")
        .select("status, sent_at, responded_at, completed_at")
        .eq("business_id", currentBusinessId)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .limit(5000),
    ]).then(([analyticsRes, topRes, proofRes, requestsRes]) => {
      // Daily buckets — all aggregation done server-side
      const arr: Bucket[] = (analyticsRes.data ?? []).map((row: any) => {
        const key = String(row.bucket);
        return {
          bucket: key,
          date: new Date(key).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          impressions: row.impressions ?? 0,
          interactions: row.interactions ?? 0,
          conversions: row.conversions ?? 0,
          assists: row.assists ?? 0,
          ctr: row.impressions > 0 ? Number(((row.interactions / row.impressions) * 100).toFixed(2)) : 0,
        };
      });
      setData(arr);

      // Proof by type
      const typeCounts = new Map<string, number>();
      ((proofRes.data ?? []) as any[]).forEach((p) => {
        typeCounts.set(p.type as string, (typeCounts.get(p.type as string) ?? 0) + 1);
      });
      setProofByType(
        Array.from(typeCounts.entries())
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
      );

      // Testimonial response rate
      const reqs = (requestsRes.data ?? []) as any[];
      const sent = reqs.filter((r) => r.sent_at).length;
      const responded = reqs.filter(
        (r) =>
          r.responded_at ||
          r.completed_at ||
          r.status === "responded" ||
          r.status === "completed",
      ).length;
      setResponseRate({ sent, responded });

      // Top proof — already aggregated server-side
      const top: TopProofRow[] = (topRes.data ?? []).map((row: any) => ({
        proof_id: row.proof_id,
        author_name: row.author_name ?? null,
        type: row.proof_type,
        impressions: row.impressions ?? 0,
        interactions: row.interactions ?? 0,
        conversions: row.conversions ?? 0,
        assists: row.assists ?? 0,
      }));
      setTopProof(top);
    });
  }, [currentBusinessId, range]);

  const totals = useMemo(
    () =>
      (data ?? []).reduce(
        (acc, d) => ({
          impressions: acc.impressions + d.impressions,
          interactions: acc.interactions + d.interactions,
          conversions: acc.conversions + d.conversions,
          assists: acc.assists + d.assists,
        }),
        { impressions: 0, interactions: 0, conversions: 0, assists: 0 },
      ),
    [data],
  );

  const ctr = totals.impressions ? ((totals.interactions / totals.impressions) * 100).toFixed(1) : "0.0";
  const responseRatePct =
    responseRate && responseRate.sent > 0
      ? ((responseRate.responded / responseRate.sent) * 100).toFixed(1)
      : null;

  const sortedTop = useMemo(() => {
    if (!topProof) return [];
    return [...topProof].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 10);
  }, [topProof, sortKey]);

  const isLoading = data === null || proofByType === null || topProof === null;
  const belowThreshold =
    !isLoading && totals.impressions < MIN_IMPRESSIONS_THRESHOLD;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ANA-01</div>
          <h1 className="text-3xl font-bold mt-1">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Impressions, interactions, conversions, and proof performance.
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {rangeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isFinite(retentionDays) && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="flex-1">
            Your {plan.name} plan keeps analytics for {retentionDays} days. Older data is purged automatically.
            {retentionDays < 365 && (
              <> <Link to="/settings/billing" className="underline font-medium">Upgrade</Link> for longer retention.</>
            )}
          </p>
        </div>
      )}

      <Tabs defaultValue="widgets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="widgets">Widgets &amp; proof</TabsTrigger>
          <TabsTrigger value="content"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Content performance</TabsTrigger>
        </TabsList>

        <TabsContent value="widgets" className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Widget impressions" value={isLoading ? null : totals.impressions.toLocaleString()} />
        <StatCard label="Widget interactions" value={isLoading ? null : totals.interactions.toLocaleString()} />
        <StatCard
          label="Assisted conversions"
          value={isLoading ? null : totals.assists.toLocaleString()}
          sub={isLoading ? undefined : `${totals.conversions.toLocaleString()} direct conversions`}
        />
        <StatCard
          label="Request response rate"
          value={responseRate === null ? null : responseRatePct === null ? "—" : `${responseRatePct}%`}
          sub={
            responseRate
              ? `${responseRate.responded} of ${responseRate.sent} requests`
              : undefined
          }
        />
      </div>

      {belowThreshold && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent mb-2">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">Charts unlock at 50 impressions</p>
            <p className="text-xs text-muted-foreground mt-1">
              You have {totals.impressions} so far in the selected range. Once visitors see your widgets more often, daily trends and per-proof performance will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Two charts side by side */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impressions over time</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : belowThreshold ? (
              <EmptyChart />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="impressions" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="interactions" stroke="hsl(var(--teal))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="conversions" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion rate trend</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : belowThreshold ? (
              <EmptyChart label={`Current CTR: ${ctr}%`} />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(v: number) => `${v}%`}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ctr"
                      name="CTR"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-muted-foreground mt-2">
                  Average CTR: <span className="font-semibold text-foreground">{ctr}%</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Proof by type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proof collected by type</CardTitle>
          </CardHeader>
          <CardContent>
            {proofByType === null ? (
              <Skeleton className="h-64 w-full" />
            ) : proofByType.length === 0 ? (
              <EmptyChart label="No proof collected in this range." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={proofByType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.type} (${entry.count})`}
                    >
                      {proofByType.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top performing proof */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top performing proof</CardTitle>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impressions">Sort by impressions</SelectItem>
                <SelectItem value="interactions">Sort by interactions</SelectItem>
                <SelectItem value="conversions">Sort by conversions</SelectItem>
                <SelectItem value="assists">Sort by assists</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {topProof === null ? (
              <Skeleton className="h-48 w-full" />
            ) : sortedTop.length === 0 ? (
              <EmptyChart label="No proof has fired widget events yet." />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Author</th>
                      <th className="px-2 py-2 font-medium">Type</th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Impressions"
                          active={sortKey === "impressions"}
                          onClick={() => setSortKey("impressions")}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Interactions"
                          active={sortKey === "interactions"}
                          onClick={() => setSortKey("interactions")}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Conversions"
                          active={sortKey === "conversions"}
                          onClick={() => setSortKey("conversions")}
                        />
                      </th>
                      <th className="px-2 py-2 font-medium text-right">
                        <SortHeader
                          label="Assists"
                          active={sortKey === "assists"}
                          onClick={() => setSortKey("assists")}
                        />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedTop.map((row) => (
                      <tr key={row.proof_id} className="hover:bg-muted/30">
                        <td className="px-2 py-2 truncate max-w-[200px]">
                          {row.author_name ?? "Anonymous"}
                        </td>
                        <td className="px-2 py-2">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {row.type}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.impressions.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.interactions.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.conversions.toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {row.assists.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <ContentAnalyticsTab businessId={currentBusinessId} startIso={(() => { const d = new Date(); d.setDate(d.getDate() - Number(range)); return d.toISOString(); })()} endIso={new Date().toISOString()} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | null; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">
          {value === null ? <Skeleton className="h-7 w-20" /> : value}
        </div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label = "No activity yet" }: { label?: string }) {
  return (
    <div className="py-16 text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3">
        <BarChart3 className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Once visitors see your widgets, data will appear here.
      </p>
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${
        active ? "text-foreground" : ""
      }`}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

function ContentAnalyticsTab({ businessId, startIso, endIso }: { businessId: string | null; startIso: string; endIso: string }) {
  const [stats, setStats] = useState<{
    generated: number;
    published: number;
    failed: number;
    by_type: { type: string; count: number }[];
    by_day: { date: string; published: number }[];
    top_channel: string | null;
  } | null>(null);

  useEffect(() => {
    if (!businessId) return;
    setStats(null);
    Promise.all([
      (supabase as any).from("content_pieces").select("id, output_type, status, created_at").eq("business_id", businessId).gte("created_at", startIso).lte("created_at", endIso).limit(5000),
      (supabase as any).from("content_publish_events").select("id, status, published_at, channel_id").eq("business_id", businessId).gte("created_at", startIso).lte("created_at", endIso).limit(5000),
      (supabase as any).from("publishing_channels").select("id, provider").eq("business_id", businessId),
    ]).then(([pieces, events, channels]: any[]) => {
      const ps = (pieces.data ?? []) as any[];
      const ev = (events.data ?? []) as any[];
      const ch = (channels.data ?? []) as any[];
      const chMap = new Map(ch.map((c: any) => [c.id, c.provider]));
      const typeCounts = new Map<string, number>();
      ps.forEach((p) => typeCounts.set(p.output_type, (typeCounts.get(p.output_type) ?? 0) + 1));
      const dayMap = new Map<string, number>();
      ev.filter((e) => e.status === "published" && e.published_at).forEach((e) => {
        const d = new Date(e.published_at).toISOString().slice(0, 10);
        dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
      });
      const channelCounts = new Map<string, number>();
      ev.filter((e) => e.status === "published" && e.channel_id).forEach((e) => {
        const prov = chMap.get(e.channel_id) ?? "unknown";
        channelCounts.set(prov as string, (channelCounts.get(prov as string) ?? 0) + 1);
      });
      const topCh = Array.from(channelCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      setStats({
        generated: ps.length,
        published: ev.filter((e) => e.status === "published").length,
        failed: ev.filter((e) => e.status === "failed").length,
        by_type: Array.from(typeCounts.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
        by_day: Array.from(dayMap.entries()).sort().map(([date, published]) => ({ date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }), published })),
        top_channel: topCh,
      });
    });
  }, [businessId, startIso, endIso]);

  if (!stats) return <Skeleton className="h-72 w-full" />;

  const totalEvents = stats.published + stats.failed;
  const successRate = totalEvents > 0 ? ((stats.published / totalEvents) * 100).toFixed(1) : "—";

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pieces generated" value={stats.generated.toLocaleString()} />
        <StatCard label="Pieces published" value={stats.published.toLocaleString()} />
        <StatCard label="Publish success rate" value={successRate === "—" ? "—" : `${successRate}%`} sub={`${stats.failed} failed`} />
        <StatCard label="Top channel" value={stats.top_channel ? stats.top_channel.replace(/_/g, " ") : "—"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Pieces published per day</CardTitle></CardHeader>
          <CardContent>
            {stats.by_day.length === 0 ? (
              <EmptyChart label="No content published in this range." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.by_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="published" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pieces generated by type</CardTitle></CardHeader>
          <CardContent>
            {stats.by_type.length === 0 ? (
              <EmptyChart label="No content generated yet." />
            ) : (
              <div className="space-y-2">
                {stats.by_type.map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-sm">
                    <span className="capitalize">{t.type.replace(/_/g, " ")}</span>
                    <Badge variant="outline">{t.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
