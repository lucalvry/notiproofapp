import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

const db = supabase as any;

export default function AgencyDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [a, c, m, i] = await Promise.all([
        db.from("agencies").select("*").eq("id", id).maybeSingle(),
        db.from("agency_client_relationships").select("id, status, client_plan, created_at, client_business_id, businesses:client_business_id(id, name, website_url, plan_tier)").eq("agency_id", id).order("created_at", { ascending: false }),
        db.from("agency_team_members").select("id, role, created_at, users:user_id(email, full_name)").eq("agency_id", id),
        db.from("agency_team_invitations").select("id, email, role, status, expires_at").eq("agency_id", id).order("created_at", { ascending: false }),
      ]);
      setAgency(a.data); setClients(c.data ?? []); setMembers(m.data ?? []); setInvites(i.data ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!agency) return <div className="p-6 text-sm text-muted-foreground">Agency not found.</div>;

  const active = clients.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
      <div>
        <h1 className="text-2xl font-bold">{agency.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{agency.plan_tier}</Badge>
          {agency.reseller_mode && <Badge variant="secondary">reseller</Badge>}
          {agency.custom_subdomain && <Badge variant="outline">{agency.custom_subdomain} · {agency.subdomain_verified ? "verified" : "pending"}</Badge>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Client seats used" value={`${active} / ${agency.client_seat_limit}`} />
        <Stat label="Team members" value={members.length} />
        <Stat label="Pending invites" value={invites.filter((x) => x.status === "pending").length} />
        <Stat label="Created" value={new Date(agency.created_at).toLocaleDateString()} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Clients</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? <p className="text-sm text-muted-foreground">No clients.</p> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b"><tr><th className="text-left py-2">Business</th><th className="text-left">Status</th><th className="text-left">Plan</th><th className="text-left">Added</th></tr></thead>
              <tbody>{clients.map((c) => (
                <tr key={c.id} className="border-b last:border-0">
                  <td className="py-2"><Link className="underline" to={`/admin/businesses/${c.client_business_id}`}>{c.businesses?.name ?? "—"}</Link></td>
                  <td><Badge variant="outline" className="text-xs">{c.status}</Badge></td>
                  <td className="text-xs">{c.client_plan ?? c.businesses?.plan_tier ?? "—"}</td>
                  <td className="text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>))}</tbody>
            </table>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Team</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {members.length === 0 && <p className="text-muted-foreground">No members.</p>}
          {members.map((m) => (
            <div key={m.id} className="flex justify-between border-b last:border-0 py-1">
              <span>{m.users?.full_name || m.users?.email || "—"}</span><Badge variant="outline" className="text-xs">{m.role}</Badge>
            </div>))}
          {invites.map((i) => (
            <div key={i.id} className="flex justify-between border-b last:border-0 py-1 text-muted-foreground">
              <span>{i.email} (invite)</span><Badge variant="outline" className="text-xs">{i.status}</Badge>
            </div>))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className="text-xl font-bold">{value}</div></CardContent></Card>
  );
}
