import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, FileText, FileBarChart, Megaphone, Settings as SettingsIcon, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClientHeader {
  id: string;
  name: string;
  industry: string | null;
  plan: string | null;
  status: string;
  health: number | null;
}

function healthBadge(score: number | null) {
  if (score == null) return <Badge variant="outline">No data</Badge>;
  if (score >= 70) return <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">Healthy {score}</Badge>;
  if (score >= 40) return <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/15">At risk {score}</Badge>;
  return <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/15">Critical {score}</Badge>;
}

const SHORTCUTS = [
  { to: (id: string) => `/agency/clients/${id}/manage`, icon: SettingsIcon, label: "Overview & settings", desc: "Plan, notes, benchmarks" },
  { to: () => `/proof`, icon: Sparkles, label: "Proof library", desc: "Curate testimonials & reviews" },
  { to: () => `/content`, icon: FileText, label: "Content", desc: "Generate & publish posts" },
  { to: () => `/campaigns`, icon: Megaphone, label: "Campaigns", desc: "Automated proof requests" },
  { to: () => `/analytics`, icon: BarChart3, label: "Analytics", desc: "Performance dashboards" },
  { to: (id: string) => `/agency/clients/${id}/report`, icon: FileBarChart, label: "Generate report", desc: "Branded client report" },
];

export default function ClientWorkspace() {
  const { client_id } = useParams();
  const navigate = useNavigate();
  const { agency, setActiveClientId } = useAgency();
  const [client, setClient] = useState<ClientHeader | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agency || !client_id) return;
    setActiveClientId(client_id);
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: rel }, hsRes] = await Promise.all([
        supabase
          .from("agency_client_relationships")
          .select("status, business:businesses!agency_client_relationships_client_business_id_fkey(id, name, industry, plan)")
          .eq("agency_id", agency.id)
          .eq("client_business_id", client_id)
          .maybeSingle(),
        supabase.rpc("get_client_health_score", { _client_business_id: client_id }),
      ]);
      if (cancelled) return;
      const hsRow = Array.isArray(hsRes.data) ? hsRes.data[0] : null;
      const health = hsRow && typeof hsRow.score === "number" ? hsRow.score : null;
      if (!rel?.business) {
        setClient(null);
      } else {
        setClient({
          id: (rel.business as any).id,
          name: (rel.business as any).name,
          industry: (rel.business as any).industry,
          plan: (rel.business as any).plan,
          status: rel.status,
          health,
        });
      }

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agency?.id, client_id]);

  const exit = () => {
    setActiveClientId(null);
    navigate("/agency/clients");
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading client…</div>;
  if (!client) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/agency/clients")}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Client not found or you don't have access.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 md:p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          {agency?.logo_url ? (
            <img src={agency.logo_url} alt={agency.name} className="h-8 w-8 rounded object-contain bg-white border" />
          ) : (
            <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">{agency?.name.slice(0,2).toUpperCase()}</div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">Managing client</div>
            <div className="text-lg font-semibold">{client.name}</div>
          </div>
          {healthBadge(client.health)}
          <Badge variant="outline" className="capitalize">{client.status}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={exit}><X className="h-4 w-4 mr-1.5" />Exit client</Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
        <p className="text-sm text-muted-foreground">{client.industry ?? "Industry not set"} · Plan {client.plan ?? "—"}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHORTCUTS.map(({ to, icon: Icon, label, desc }) => (
          <Link key={label} to={to(client.id)} className="group">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
