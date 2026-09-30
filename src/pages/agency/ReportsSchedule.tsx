// RPT-03: Scheduled reports — CRUD over scheduled_reports table. Drives EF-08 via cron.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, Plus, Power, Trash2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const SECTIONS = [
  { id: "proof", label: "Proof" },
  { id: "content", label: "Content" },
  { id: "health", label: "Health" },
];

interface Report {
  id: string;
  name: string | null;
  client_business_ids: string[];
  frequency: "weekly" | "monthly";
  sections: string[];
  send_to: string[];
  scheduled_time: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface ClientOption {
  id: string;
  name: string;
}

export default function ReportsSchedule() {
  const { agency } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const draft = editing ?? {
    id: "",
    name: "",
    client_business_ids: [] as string[],
    frequency: "monthly" as const,
    sections: ["proof", "content", "health"],
    send_to: [] as string[],
    scheduled_time: "06:00:00",
    is_active: true,
    last_run_at: null,
    next_run_at: null,
  };

  const [draftState, setDraftState] = useState<Report>(draft as Report);

  useEffect(() => {
    if (open) setDraftState((editing ?? draft) as Report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const load = async () => {
    if (!agency) return;
    setLoading(true);
    const [{ data: rep }, { data: rels }] = await Promise.all([
      supabase
        .from("scheduled_reports")
        .select("*")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("agency_client_relationships")
        .select("client_business_id, businesses(id, name)")
        .eq("agency_id", agency.id)
        .eq("status", "active"),
    ]);
    setReports((rep ?? []) as Report[]);
    setClients(
      (rels ?? []).map((r: any) => ({
        id: r.client_business_id,
        name: r.businesses?.name ?? "Unnamed",
      })),
    );
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [agency?.id]);

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (r: Report) => { setEditing(r); setOpen(true); };

  const save = async () => {
    if (!agency) return;
    if (!draftState.send_to.length) {
      return toast({ title: "Add at least one recipient", variant: "destructive" });
    }
    setSaving(true);
    const payload = {
      agency_id: agency.id,
      name: draftState.name?.trim() || `Report ${new Date().toISOString().slice(0, 10)}`,
      client_business_ids: draftState.client_business_ids,
      frequency: draftState.frequency,
      sections: draftState.sections,
      send_to: draftState.send_to.map((s) => s.trim()).filter(Boolean),
      scheduled_time: draftState.scheduled_time,
      is_active: draftState.is_active,
    };
    const { error } = editing
      ? await supabase.from("scheduled_reports").update(payload).eq("id", editing.id)
      : await supabase.from("scheduled_reports").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: editing ? "Schedule updated" : "Schedule created" });
    setOpen(false);
    setEditing(null);
    void load();
  };

  const toggleActive = async (r: Report) => {
    const { error } = await supabase.from("scheduled_reports").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    void load();
  };

  const remove = async (r: Report) => {
    if (!confirm(`Delete schedule "${r.name ?? r.id}"?`)) return;
    const { error } = await supabase.from("scheduled_reports").delete().eq("id", r.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Schedule deleted" });
    void load();
  };

  const runNow = async (r: Report) => {
    setRunning(r.id);
    try {
      const { error } = await supabase.functions.invoke("generate-scheduled-report", {
        body: { report_id: r.id },
      });
      if (error) throw error;
      toast({ title: "Report sent", description: `Delivered to ${r.send_to.length} recipient(s)` });
      void load();
    } catch (e: any) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  if (!agency) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/agency/reports"><ArrowLeft className="h-4 w-4 mr-2" />Back to reports</Link>
      </Button>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Scheduled reports</h1>
          <p className="text-muted-foreground text-sm">
            Auto-email portfolio reports to your team or directly to clients.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New schedule</Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No scheduled reports yet.</p>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Create your first schedule</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {reports.map((r) => (
                <div key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name ?? "Untitled"}</span>
                      <Badge variant={r.is_active ? "default" : "secondary"} className="capitalize">
                        {r.is_active ? "Active" : "Paused"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{r.frequency}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.client_business_ids.length === 0 ? "All clients" : `${r.client_business_ids.length} clients`}
                      {" · "}
                      {r.send_to.length} recipient{r.send_to.length === 1 ? "" : "s"}
                      {r.next_run_at && ` · next ${new Date(r.next_run_at).toLocaleString()}`}
                      {r.last_run_at && ` · last ${new Date(r.last_run_at).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => runNow(r)} disabled={running === r.id}>
                      {running === r.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                      Run now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(r)}>
                      <Power className="h-4 w-4 mr-1" />
                      {r.is_active ? "Pause" : "Activate"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit schedule" : "New schedule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={draftState.name ?? ""}
                onChange={(e) => setDraftState({ ...draftState, name: e.target.value })}
                placeholder="Weekly portfolio report"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={draftState.frequency}
                  onValueChange={(v) => setDraftState({ ...draftState, frequency: v as "weekly" | "monthly" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send time (UTC)</Label>
                <Input
                  type="time"
                  value={draftState.scheduled_time.slice(0, 5)}
                  onChange={(e) => setDraftState({ ...draftState, scheduled_time: `${e.target.value}:00` })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sections</Label>
              <div className="flex flex-wrap gap-3">
                {SECTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={draftState.sections.includes(s.id)}
                      onCheckedChange={() =>
                        setDraftState({
                          ...draftState,
                          sections: draftState.sections.includes(s.id)
                            ? draftState.sections.filter((x) => x !== s.id)
                            : [...draftState.sections, s.id],
                        })
                      }
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Clients</Label>
              <p className="text-xs text-muted-foreground">Leave empty to include all active clients.</p>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {clients.length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No active clients.</div>
                ) : clients.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer px-1 py-0.5">
                    <Checkbox
                      checked={draftState.client_business_ids.includes(c.id)}
                      onCheckedChange={() =>
                        setDraftState({
                          ...draftState,
                          client_business_ids: draftState.client_business_ids.includes(c.id)
                            ? draftState.client_business_ids.filter((x) => x !== c.id)
                            : [...draftState.client_business_ids, c.id],
                        })
                      }
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Recipients (comma-separated emails)</Label>
              <Input
                value={draftState.send_to.join(", ")}
                onChange={(e) =>
                  setDraftState({
                    ...draftState,
                    send_to: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="ops@agency.com, client@example.com"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={draftState.is_active}
                onCheckedChange={(c) => setDraftState({ ...draftState, is_active: !!c })}
              />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? "Save changes" : "Create schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
