import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Users, MessageSquareQuote, Plus, ArrowRight, TrendingUp } from "lucide-react";
import { YouTubeEmbed } from "@/components/video/YouTubeEmbed";

type ClientRow = {
  id: string;
  client_business_id: string;
  status: string;
  client_name: string;
  industry: string | null;
  plan: string;
  health: { score: number; status: "green" | "amber" | "red" };
};

function HealthDot({ status }: { status: "green" | "amber" | "red" }) {
  const cls =
    status === "green"
      ? "bg-emerald-500"
      : status === "amber"
        ? "bg-amber-500"
        : "bg-rose-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

export default function AgencyDashboard() {
  const { agency } = useAgency();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState({
    total_clients: 0,
    active_clients: 0,
    team_members: 0,
    proof_30d: 0,
  });

  useEffect(() => {
    if (!agency) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [relRes, teamRes] = await Promise.all([
        supabase
          .from("agency_client_relationships")
          .select("id, status, client_plan, client_business_id, businesses(id, name, industry, plan)")
          .eq("agency_id", agency.id),
        supabase
          .from("agency_team_members")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agency.id)
          .not("invitation_accepted_at", "is", null),
      ]);

      const rels = relRes.data ?? [];
      const clientIds = rels.map((r: any) => r.client_business_id);

      // Fetch 30d proof counts in one go
      let proofCounts: Record<string, number> = {};
      let total30d = 0;
      if (clientIds.length > 0) {
        const { data: po } = await supabase
          .from("proof_objects")
          .select("business_id")
          .in("business_id", clientIds)
          .gte("created_at", since);
        for (const row of po ?? []) {
          const bid = (row as any).business_id as string;
          proofCounts[bid] = (proofCounts[bid] ?? 0) + 1;
          total30d += 1;
        }
      }

      // Fetch health scores per client (in parallel)
      const healthByClient: Record<string, { score: number; status: "green" | "amber" | "red" }> = {};
      await Promise.all(
        clientIds.map(async (cid: string) => {
          const { data } = await supabase.rpc("get_client_health_score", { _client_business_id: cid });
          const row = Array.isArray(data) && data[0] ? data[0] : null;
          healthByClient[cid] = {
            score: row?.score ?? 0,
            status: ((row?.status as string) ?? "red") as "green" | "amber" | "red",
          };
        }),
      );

      if (cancelled) return;

      const rows: ClientRow[] = rels.map((r: any) => ({
        id: r.id,
        client_business_id: r.client_business_id,
        status: r.status,
        client_name: r.businesses?.name ?? "Unnamed client",
        industry: r.businesses?.industry ?? null,
        plan: r.client_plan ?? r.businesses?.plan ?? "free",
        health: healthByClient[r.client_business_id] ?? { score: 0, status: "red" },
      }));

      setClients(rows);
      setStats({
        total_clients: rels.length,
        active_clients: rels.filter((r: any) => r.status === "active").length,
        team_members: teamRes.count ?? 0,
        proof_30d: total30d,
      });
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [agency]);

  if (!agency) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agency dashboard</h1>
          <p className="text-muted-foreground text-sm">Across {stats.total_clients} client{stats.total_clients === 1 ? "" : "s"}.</p>
        </div>
        <Button asChild className="gap-1">
          <Link to="/agency/clients/new">
            <Plus className="h-4 w-4" />
            Add client
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active clients" value={stats.active_clients} sub={`of ${stats.total_clients} total`} icon={Briefcase} />
        <StatCard label="Team members" value={stats.team_members} sub="across your agency" icon={Users} />
        <StatCard label="Proof (30d)" value={stats.proof_30d} sub="all clients combined" icon={MessageSquareQuote} />
        <StatCard label="Seat usage" value={`${stats.total_clients}/${agency.client_seat_limit}`} sub="client seats" icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Client health</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/agency/clients" className="gap-1">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="grid md:grid-cols-2 gap-6 py-6">
              <div className="space-y-3">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
                <h3 className="font-semibold">No clients yet</h3>
                <p className="text-sm text-muted-foreground">Watch the 90-second agency tour, then add your first client to spin up a white-label workspace.</p>
                <Button asChild>
                  <Link to="/agency/clients/new">
                    <Plus className="h-4 w-4 mr-1" />
                    Add your first client
                  </Link>
                </Button>
              </div>
              <YouTubeEmbed audience="agency" mode="inline" rounded="lg" caption="" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {clients.slice(0, 9).map((c) => (
                <Link
                  key={c.id}
                  to={`/agency/clients/${c.client_business_id}`}
                  className="block rounded-lg border p-3 hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{c.client_name}</div>
                    <HealthDot status={c.health.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">{c.plan}</Badge>
                    {c.industry && <span className="truncate">{c.industry}</span>}
                    <span className="ml-auto font-mono">{c.health.score}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      </CardContent>
    </Card>
  );
}