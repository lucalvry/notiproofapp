import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface RelRow {
  id: string;
  status: string;
  client_plan: string | null;
  notes: string | null;
  client_can_approve: boolean;
  business: { id: string; name: string; industry: string | null; plan: string | null } | null;
}

export default function ClientManage() {
  const { client_id } = useParams();
  const navigate = useNavigate();
  const { agency } = useAgency();
  const { toast } = useToast();
  const [rel, setRel] = useState<RelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{ proof: number; content: number; campaigns: number; health: number | null }>({ proof: 0, content: 0, campaigns: 0, health: null });
  const [benchmark, setBenchmark] = useState<number | null>(null);

  useEffect(() => {
    if (!agency || !client_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: r }, { count: proofCount }, { count: contentCount }, { count: campaignCount }, hsRes] = await Promise.all([
        supabase
          .from("agency_client_relationships")
          .select("id, status, client_plan, notes, client_can_approve, business:businesses!agency_client_relationships_client_business_id_fkey(id, name, industry, plan)")
          .eq("agency_id", agency.id)
          .eq("client_business_id", client_id)
          .maybeSingle(),
        supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", client_id),
        supabase.from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", client_id),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("business_id", client_id),
        supabase.rpc("get_client_health_score", { _client_business_id: client_id }),
      ]);
      if (cancelled) return;
      setRel(r as unknown as RelRow);
      const hsRow = Array.isArray(hsRes.data) ? hsRes.data[0] : null;
      setStats({
        proof: proofCount ?? 0,
        content: contentCount ?? 0,
        campaigns: campaignCount ?? 0,
        health: hsRow && typeof hsRow.score === "number" ? hsRow.score : null,
      });
      const industry = (r?.business as any)?.industry;
      if (industry) {
        const { data: bm } = await supabase.rpc("get_category_benchmark", { _industry: industry, _metric: "monthly_proof" });
        if (!cancelled) setBenchmark(typeof bm === "number" ? (bm as number) : null);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [agency?.id, client_id]);

  const save = async () => {
    if (!rel) return;
    setSaving(true);
    const { error } = await supabase
      .from("agency_client_relationships")
      .update({
        status: rel.status,
        client_plan: rel.client_plan,
        notes: rel.notes,
        client_can_approve: rel.client_can_approve,
      })
      .eq("id", rel.id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!rel?.business) return <div className="p-8 text-sm text-muted-foreground">Client not found.</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/agency/clients/${client_id}`)}><ArrowLeft className="h-4 w-4 mr-2" />Back to workspace</Button>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{rel.business.name}</h1>
        <p className="text-sm text-muted-foreground">Client administration</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Proof stats</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Health score" value={stats.health ?? "—"} />
            <StatCard label="Proof items" value={stats.proof} />
            <StatCard label="Content pieces" value={stats.content} />
            <StatCard label="Campaigns" value={stats.campaigns} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Internal notes</CardTitle>
              <CardDescription>Only your agency team can see these.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea rows={4} value={rel.notes ?? ""} onChange={(e) => setRel({ ...rel, notes: e.target.value })} />
              <Button size="sm" className="mt-3" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Category benchmark</CardTitle>
              <CardDescription>Monthly proof, {rel.business.industry ?? "no industry set"}</CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <StatCard label="This client" value={stats.proof} />
              <StatCard label="Industry benchmark" value={benchmark ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Relationship</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={rel.status} onValueChange={(v) => setRel({ ...rel, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client plan label</Label>
                <Input value={rel.client_plan ?? ""} onChange={(e) => setRel({ ...rel, client_plan: e.target.value })} placeholder="e.g. starter" />
              </div>
              <Button onClick={save} disabled={saving} className="sm:col-span-2 w-fit">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
