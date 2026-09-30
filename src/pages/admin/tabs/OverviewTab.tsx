import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Building2,
  MessageSquareQuote,
  CircleDollarSign,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sparkles,
  Plug,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const db = supabase as any;

interface ActiveAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  domain: string;
  alert_key: string;
  message: string;
  link_tab: string | null;
  created_at: string;
}

interface OverviewStats {
  businesses_total: number;
  businesses_active: number;
  businesses_new_30d: number;
  paying_businesses: number;
  proof_total: number;
  proof_last_24h: number;
  moderation_queue: number;
  integration_backlog: number;
  integration_errors: number;
  mrr_usd: number;
}

interface SeriesRow {
  day: string;
  new_businesses: number;
  new_proofs: number;
}

interface Snapshot {
  generated_at: string;
  overview_stats: OverviewStats | null;
  daily_series: SeriesRow[];
  alerts_active: number;
  ef_calls_24h: number;
  integration_health: { provider: string; total: number; success_rate: number }[];
  queue_depth: { pending_email_sends: number; pending_enrichment: number };
  businesses_active_24h: number;
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function OverviewTab({ onTabChange }: { onTabChange: (t: string) => void }) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [series, setSeries] = useState<SeriesRow[] | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [alerts, setAlerts] = useState<ActiveAlert[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  const load = async () => {
    const [statsRes, seriesRes, snapRes, alertsRes, auditRes] = await Promise.all([
      db.rpc("admin_overview_stats"),
      db.rpc("admin_daily_series", { _days: 30 }),
      db.rpc("admin_latest_snapshot", { _scope: "admin_overview" }),
      db.rpc("admin_active_alerts"),
      db
        .from("admin_audit_log")
        .select("id, action, details, admin_user_id, business_id, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setStats((statsRes.data ?? null) as OverviewStats | null);
    setSeries(
      ((seriesRes.data ?? []) as SeriesRow[]).map((r) => ({
        ...r,
        day: new Date(r.day).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      })),
    );
    setSnapshot((snapRes.data ?? null) as Snapshot | null);
    setAlerts((alertsRes.data ?? []) as ActiveAlert[]);
    setAudit((auditRes.data ?? []) as any[]);
  };

  useEffect(() => {
    load();
  }, []);

  const integrationOk =
    snapshot && snapshot.integration_health.length > 0
      ? snapshot.integration_health.every((p) => p.total < 10 || p.success_rate >= 0.9)
      : true;

  const queueDepth =
    (snapshot?.queue_depth.pending_email_sends ?? 0) +
    (snapshot?.queue_depth.pending_enrichment ?? 0);

  return (
    <div className="space-y-6">
      {/* 6 critical health indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <HealthCard
          label="Platform"
          value={alerts.some((a) => a.severity === "critical") ? "Issues" : "Live"}
          tone={alerts.some((a) => a.severity === "critical") ? "danger" : "ok"}
          icon={CheckCircle2}
          sub="Health check"
        />
        <HealthCard
          label="Active alerts"
          value={alerts.length}
          tone={alerts.length === 0 ? "ok" : alerts.some((a) => a.severity === "critical") ? "danger" : "warn"}
          icon={AlertTriangle}
          sub={alerts.length ? "needs attention" : "all clear"}
        />
        <HealthCard
          label="MRR"
          value={stats ? `$${stats.mrr_usd.toLocaleString()}` : null}
          tone="info"
          icon={CircleDollarSign}
          sub={stats ? `${stats.paying_businesses} paying` : undefined}
        />
        <HealthCard
          label="Active 24h"
          value={snapshot?.businesses_active_24h ?? null}
          tone="ok"
          icon={Building2}
          sub={stats ? `of ${stats.businesses_total} total` : undefined}
        />
        <HealthCard
          label="AI queue"
          value={queueDepth}
          tone={queueDepth > 200 ? "warn" : "ok"}
          icon={Sparkles}
          sub={`${snapshot?.ef_calls_24h ?? 0} EF calls 24h`}
        />
        <HealthCard
          label="Integrations"
          value={integrationOk ? "OK" : "Degraded"}
          tone={integrationOk ? "ok" : "warn"}
          icon={Plug}
          sub={`${stats?.integration_errors ?? 0} error · ${stats?.integration_backlog ?? 0} backlog`}
        />
      </div>

      {/* Charts row */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!series ? (
            <Skeleton className="h-72 w-full" />
          ) : series.every((s) => s.new_businesses === 0 && s.new_proofs === 0) ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No activity yet in the last 30 days.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new_businesses"
                    name="New businesses"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_proofs"
                    name="New proofs"
                    stroke="hsl(var(--teal))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Active alerts
              <Badge variant="secondary" className="ml-2">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                No active alerts. Platform is healthy.
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between gap-3 rounded-md border p-3 text-sm ${
                    a.severity === "critical"
                      ? "border-destructive/40 bg-destructive/5"
                      : a.severity === "warning"
                        ? "border-gold/40 bg-gold/5"
                        : "border-accent/40 bg-accent/5"
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Badge
                      variant={a.severity === "critical" ? "destructive" : "secondary"}
                      className="shrink-0 mt-0.5 uppercase text-[10px]"
                    >
                      {a.severity}
                    </Badge>
                    <div className="min-w-0">
                      <div className="truncate">{a.message}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {a.domain} · {relTime(a.created_at)}
                      </div>
                    </div>
                  </div>
                  {a.link_tab && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onTabChange(a.link_tab!)}
                      className="shrink-0"
                    >
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Admin action log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Admin actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
            {audit.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No admin actions recorded.
              </div>
            ) : (
              audit.map((a) => (
                <div key={a.id} className="text-sm border-l-2 border-accent/40 pl-3 py-1">
                  <div className="font-medium">{a.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {relTime(a.created_at)}
                    {a.business_id && (
                      <>
                        {" · "}
                        <Link
                          to={`/admin/businesses/${a.business_id}`}
                          className="text-accent hover:underline"
                        >
                          business
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick nav */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ["revenue", "Revenue", CircleDollarSign],
            ["users", "Users", Building2],
            ["agencies", "Agencies", ShieldCheck],
            ["ai", "AI Pipelines", Sparkles],
            ["integrations", "Integrations", Plug],
            ["enrichment", "Enrichment", MessageSquareQuote],
            ["system", "System", Activity],
          ].map(([tab, label, Icon]: any) => (
            <Button
              key={tab}
              variant="outline"
              onClick={() => onTabChange(tab)}
              className="justify-start"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({
  label,
  value,
  tone,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number | null;
  tone: "ok" | "warn" | "danger" | "info";
  icon: typeof Building2;
  sub?: string;
}) {
  const toneCls =
    tone === "danger"
      ? "border-destructive/40 bg-destructive/5"
      : tone === "warn"
        ? "border-gold/40 bg-gold/5"
        : tone === "info"
          ? "border-accent/40 bg-accent/5"
          : "border-success/40 bg-success/5";
  const iconCls =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-gold"
        : tone === "info"
          ? "text-accent"
          : "text-success";
  return (
    <Card className={toneCls}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${iconCls}`} />
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-xl font-bold">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
        {sub && <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>}
      </CardContent>
    </Card>
  );
}