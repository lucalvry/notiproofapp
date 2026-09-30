import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ShieldCheck } from "lucide-react";

const db = supabase as any;

export default function AgenciesTab() {
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, reseller: 0, members: 0, clients: 0 });
  const [healthBuckets, setHealthBuckets] = useState({ green: 0, amber: 0, red: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: ags }, { count: memberCount }, { count: clientCount }] = await Promise.all([
        db.from("agencies").select("id, name, plan_tier, client_seat_limit, reseller_mode, custom_subdomain, subdomain_verified, created_at").order("created_at", { ascending: false }).limit(50),
        db.from("agency_team_members").select("*", { count: "exact", head: true }),
        db.from("agency_client_relationships").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      setAgencies(ags ?? []);
      setStats({
        total: ags?.length ?? 0,
        reseller: (ags ?? []).filter((a: any) => a.reseller_mode).length,
        members: memberCount ?? 0,
        clients: clientCount ?? 0,
      });

      // Rough health distribution: count clients per agency, classify
      const { data: rels } = await db
        .from("agency_client_relationships")
        .select("agency_id, status")
        .eq("status", "active")
        .limit(5000);
      const byAg = new Map<string, number>();
      for (const r of rels ?? []) byAg.set(r.agency_id, (byAg.get(r.agency_id) ?? 0) + 1);
      let green = 0, amber = 0, red = 0;
      for (const a of ags ?? []) {
        const seats = a.client_seat_limit ?? 0;
        const used = byAg.get(a.id) ?? 0;
        const pct = seats > 0 ? used / seats : 0;
        if (used === 0) red += 1;
        else if (pct < 0.3) amber += 1;
        else green += 1;
      }
      setHealthBuckets({ green, amber, red });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Agencies" value={stats.total} icon={Building2} />
        <Stat label="Reseller mode" value={stats.reseller} icon={ShieldCheck} />
        <Stat label="Team members" value={stats.members} icon={Users} />
        <Stat label="Active clients" value={stats.clients} icon={Users} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agency health distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <HealthBar label="Healthy" value={healthBuckets.green} total={stats.total} color="bg-success" />
          <HealthBar label="At risk" value={healthBuckets.amber} total={stats.total} color="bg-gold" />
          <HealthBar label="Idle / no clients" value={healthBuckets.red} total={stats.total} color="bg-destructive" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agencies</CardTitle>
        </CardHeader>
        <CardContent>
          {agencies.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No agencies yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Name</th>
                    <th className="text-left py-2 pr-3">Plan</th>
                    <th className="text-right py-2 pr-3">Seats</th>
                    <th className="text-left py-2 pr-3">Subdomain</th>
                    <th className="text-left py-2 pr-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {agencies.map((a: any) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 truncate max-w-[220px]">{a.name}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">{a.plan_tier ?? "—"}</Badge>
                        {a.reseller_mode && <Badge variant="secondary" className="ml-1 text-xs">reseller</Badge>}
                      </td>
                      <td className="py-2 pr-3 text-right text-xs">{a.client_seat_limit ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs font-mono">
                        {a.custom_subdomain ?? "—"}
                        {a.custom_subdomain && (
                          <Badge variant={a.subdomain_verified ? "secondary" : "outline"} className="ml-1 text-[10px]">
                            {a.subdomain_verified ? "verified" : "pending"}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
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

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function HealthBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span>{label}</span>
        <span className="text-muted-foreground">{value} ({pct}%)</span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
