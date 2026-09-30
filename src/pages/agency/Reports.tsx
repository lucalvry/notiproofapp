// RPT-01: Cross-client portfolio reports — aggregate metrics, health league table, print export.
import "@/styles/print.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, Printer, FileBarChart, ArrowRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

type Range = "7d" | "30d" | "90d";

interface ClientRow {
  business_id: string;
  name: string;
  industry: string | null;
  proofs: number;
  content: number;
  health: { score: number; status: "green" | "amber" | "red" };
}

interface DayBucket {
  date: string;
  proofs: number;
  content: number;
}

function rangeStart(r: Range): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (r === "7d" ? 7 : r === "30d" ? 30 : 90));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function healthBadge(s: "green" | "amber" | "red", score: number) {
  const cls =
    s === "green" ? "bg-emerald-500/15 text-emerald-700"
    : s === "amber" ? "bg-amber-500/15 text-amber-700"
    : "bg-red-500/15 text-red-700";
  return <Badge className={`${cls} hover:${cls}`}>{score}</Badge>;
}

export default function AgencyReports() {
  const { agency } = useAgency();
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [series, setSeries] = useState<DayBucket[]>([]);

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = rangeStart(range).toISOString();

      const { data: rels } = await supabase
        .from("agency_client_relationships")
        .select("client_business_id, businesses(id, name, industry)")
        .eq("agency_id", agency.id)
        .eq("status", "active");
      const ids = (rels ?? []).map((r: any) => r.client_business_id);

      if (ids.length === 0) {
        if (!cancelled) { setClients([]); setSeries([]); setLoading(false); }
        return;
      }

      const [{ data: proofs }, { data: pieces }, healthArr] = await Promise.all([
        supabase.from("proof_objects").select("id, business_id, created_at").in("business_id", ids).gte("created_at", since),
        supabase.from("content_pieces").select("id, business_id, created_at").in("business_id", ids).gte("created_at", since),
        Promise.all(ids.map(async (id) => {
          const { data } = await supabase.rpc("get_client_health_score", { _client_business_id: id });
          const row = Array.isArray(data) && data[0] ? data[0] : null;
          return { id, score: row?.score ?? 0, status: (row?.status ?? "red") as "green" | "amber" | "red" };
        })),
      ]);

      const proofByBiz: Record<string, number> = {};
      const contentByBiz: Record<string, number> = {};
      const dayMap: Record<string, DayBucket> = {};
      const start = rangeStart(range);
      for (let d = new Date(start); d <= new Date(); d.setUTCDate(d.getUTCDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        dayMap[k] = { date: k, proofs: 0, content: 0 };
      }
      for (const p of proofs ?? []) {
        proofByBiz[p.business_id] = (proofByBiz[p.business_id] ?? 0) + 1;
        const k = (p.created_at as string).slice(0, 10);
        if (dayMap[k]) dayMap[k].proofs += 1;
      }
      for (const p of pieces ?? []) {
        contentByBiz[p.business_id] = (contentByBiz[p.business_id] ?? 0) + 1;
        const k = (p.created_at as string).slice(0, 10);
        if (dayMap[k]) dayMap[k].content += 1;
      }

      const healthMap = Object.fromEntries(healthArr.map((h) => [h.id, h]));
      const rows: ClientRow[] = (rels ?? []).map((r: any) => ({
        business_id: r.client_business_id,
        name: r.businesses?.name ?? "Unnamed",
        industry: r.businesses?.industry ?? null,
        proofs: proofByBiz[r.client_business_id] ?? 0,
        content: contentByBiz[r.client_business_id] ?? 0,
        health: healthMap[r.client_business_id]
          ? { score: healthMap[r.client_business_id].score, status: healthMap[r.client_business_id].status }
          : { score: 0, status: "red" },
      }));

      if (cancelled) return;
      setClients(rows);
      setSeries(Object.values(dayMap));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agency?.id, range]);

  const totals = useMemo(() => {
    const proofs = clients.reduce((s, c) => s + c.proofs, 0);
    const content = clients.reduce((s, c) => s + c.content, 0);
    const avgHealth = clients.length
      ? Math.round(clients.reduce((s, c) => s + c.health.score, 0) / clients.length)
      : 0;
    return { proofs, content, avgHealth, clients: clients.length };
  }, [clients]);

  const league = useMemo(
    () => [...clients].sort((a, b) => b.health.score - a.health.score),
    [clients],
  );

  if (!agency) return null;

  return (
    <div className="space-y-6" id="agency-report-print">
      <div className="flex items-start justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Portfolio reports</h1>
          <p className="text-muted-foreground text-sm">
            Aggregate performance across all active clients.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" asChild>
            <Link to="/agency/reports/schedule"><Calendar className="h-4 w-4 mr-2" />Schedule</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active clients" value={totals.clients} />
        <Stat label="Proof items" value={totals.proofs} />
        <Stat label="Content pieces" value={totals.content} />
        <Stat label="Avg health" value={totals.avgHealth} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity over time</CardTitle>
          <CardDescription>Daily proof + content totals across all clients.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? <Skeleton className="h-full w-full" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="proofs" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="content" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Volume by client</CardTitle>
          <CardDescription>Proof vs. content for this period.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {loading ? <Skeleton className="h-full w-full" /> : clients.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clients}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Legend />
                <Bar dataKey="proofs" fill="hsl(var(--primary))" />
                <Bar dataKey="content" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client league table</CardTitle>
          <CardDescription>Ranked by health score.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-40 w-full" /> : league.length === 0 ? <Empty /> : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Client</th>
                    <th className="px-3 py-2 font-medium">Industry</th>
                    <th className="px-3 py-2 font-medium text-right">Proofs</th>
                    <th className="px-3 py-2 font-medium text-right">Content</th>
                    <th className="px-3 py-2 font-medium text-right">Health</th>
                    <th className="px-3 py-2 no-print" />
                  </tr>
                </thead>
                <tbody>
                  {league.map((c, i) => (
                    <tr key={c.business_id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.industry ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{c.proofs}</td>
                      <td className="px-3 py-2 text-right">{c.content}</td>
                      <td className="px-3 py-2 text-right">{healthBadge(c.health.status, c.health.score)}</td>
                      <td className="px-3 py-2 text-right no-print">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/agency/clients/${c.business_id}/report`}>
                            Report <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
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
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Empty() {
  return (
    <div className="text-center py-8 text-sm text-muted-foreground">
      <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
      No active clients in this range yet.
      <div className="mt-3">
        <Button asChild size="sm" variant="outline">
          <Link to="/agency/clients/new"><Plus className="h-4 w-4 mr-1" />Add a client</Link>
        </Button>
      </div>
    </div>
  );
}
