// RPT-02: Per-client branded report — config panel + live HTML preview, AI recommendations, print/send.
import "@/styles/print.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, Printer, Sparkles, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/contexts/AgencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Range = "7d" | "30d" | "90d";

const SECTIONS: { id: string; label: string }[] = [
  { id: "proof", label: "Proof activity" },
  { id: "content", label: "Content output" },
  { id: "health", label: "Health & recommendations" },
];

function rangeStart(r: Range): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - (r === "7d" ? 7 : r === "30d" ? 30 : 90));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default function ClientReport() {
  const { client_id } = useParams();
  const navigate = useNavigate();
  const { agency } = useAgency();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<{ id: string; name: string; industry: string | null } | null>(null);
  const [range, setRange] = useState<Range>("30d");
  const [sections, setSections] = useState<string[]>(["proof", "content", "health"]);
  const [metrics, setMetrics] = useState({ proofs: 0, content: 0, requests: 0, accepted: 0 });
  const [health, setHealth] = useState<{ score: number; status: "green" | "amber" | "red" } | null>(null);
  const [recs, setRecs] = useState<string[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsSource, setRecsSource] = useState<string>("");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!agency || !client_id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = rangeStart(range).toISOString();
      const [bizRes, { count: pCount }, { count: cCount }, { count: rCount }, { count: aCount }, hRes] = await Promise.all([
        supabase.from("businesses").select("id, name, industry").eq("id", client_id).maybeSingle(),
        supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", client_id).gte("created_at", since),
        supabase.from("content_pieces").select("id", { count: "exact", head: true }).eq("business_id", client_id).gte("created_at", since),
        supabase.from("testimonial_requests").select("id", { count: "exact", head: true }).eq("business_id", client_id).gte("created_at", since),
        supabase.from("proof_objects").select("id", { count: "exact", head: true }).eq("business_id", client_id).eq("status", "approved").gte("created_at", since),
        supabase.rpc("get_client_health_score", { _client_business_id: client_id }),
      ]);
      if (cancelled) return;
      setClient(bizRes.data as any);
      setMetrics({
        proofs: pCount ?? 0,
        content: cCount ?? 0,
        requests: rCount ?? 0,
        accepted: aCount ?? 0,
      });
      const hsRow = Array.isArray(hRes.data) && hRes.data[0] ? hRes.data[0] : null;
      setHealth(hsRow ? { score: hsRow.score ?? 0, status: (hsRow.status ?? "red") as any } : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [agency?.id, client_id, range]);

  const dateRange = useMemo(() => {
    const start = rangeStart(range);
    const end = new Date();
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }, [range]);

  const toggleSection = (id: string) => {
    setSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const generateRecs = async () => {
    if (!client_id) return;
    setRecsLoading(true);
    try {
      const responseRate = metrics.requests > 0 ? metrics.accepted / metrics.requests : 0;
      const monthsInRange = range === "7d" ? 0.25 : range === "30d" ? 1 : 3;
      const { data, error } = await supabase.functions.invoke("generate-client-recommendations", {
        body: {
          client_business_id: client_id,
          industry: client?.industry ?? "default",
          metrics: {
            proofs_per_month: metrics.proofs / monthsInRange,
            response_rate: responseRate,
            content_per_proof: metrics.proofs > 0 ? metrics.content / metrics.proofs : 0,
          },
          date_range_start: dateRange.start,
          date_range_end: dateRange.end,
        },
      });
      if (error) throw error;
      setRecs((data?.recommendations ?? []) as string[]);
      setRecsSource(data?.source ?? "");
    } catch (e: any) {
      toast({ title: "Could not generate recommendations", description: e.message, variant: "destructive" });
    } finally {
      setRecsLoading(false);
    }
  };

  const sendReport = async () => {
    if (!agency || !client_id || !sendEmail.trim()) return;
    setSending(true);
    try {
      // Create a one-off scheduled_reports row, immediately invoke EF-08 by id, then deactivate.
      const { data: row, error: insErr } = await supabase
        .from("scheduled_reports")
        .insert({
          agency_id: agency.id,
          name: `One-off — ${client?.name ?? "client"} — ${new Date().toISOString().slice(0, 10)}`,
          client_business_ids: [client_id],
          frequency: "monthly",
          sections,
          send_to: sendEmail.split(",").map((s) => s.trim()).filter(Boolean),
          scheduled_time: "06:00:00",
          is_active: false,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      const { error } = await supabase.functions.invoke("generate-scheduled-report", {
        body: { report_id: row.id },
      });
      if (error) throw error;
      toast({ title: "Report sent", description: `Emailed to ${sendEmail}` });
      setSendOpen(false);
      setSendEmail("");
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (!agency) return null;
  if (loading || !client) {
    return <div className="p-8"><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/agency/clients/${client_id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to workspace
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />Print / PDF
          </Button>
          <Button size="sm" onClick={() => setSendOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />Send to client
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Config panel */}
        <Card className="no-print h-fit">
          <CardHeader>
            <CardTitle className="text-base">Configure</CardTitle>
            <CardDescription>Adjust what appears in the report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Date range</Label>
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sections</Label>
              {SECTIONS.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={sections.includes(s.id)} onCheckedChange={() => toggleSection(s.id)} />
                  {s.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live preview */}
        <div
          id="agency-report-print"
          className="rounded-lg border bg-card p-6 md:p-10 space-y-6"
          style={{ borderTopWidth: 4, borderTopColor: agency.brand_color ?? "hsl(var(--primary))" }}
        >
          <header className="flex items-start justify-between gap-4 pb-4 border-b">
            <div>
              {agency.logo_url ? (
                <img src={agency.logo_url} alt={agency.name} className="h-10 mb-2" />
              ) : (
                <div className="font-bold text-lg" style={{ color: agency.brand_color ?? undefined }}>
                  {agency.name}
                </div>
              )}
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <p className="text-sm text-muted-foreground">
                Performance report · {dateRange.start} → {dateRange.end}
              </p>
            </div>
            {health && (
              <Badge
                className={
                  health.status === "green" ? "bg-emerald-500/15 text-emerald-700"
                  : health.status === "amber" ? "bg-amber-500/15 text-amber-700"
                  : "bg-red-500/15 text-red-700"
                }
              >
                Health {health.score}
              </Badge>
            )}
          </header>

          {sections.includes("proof") && (
            <section className="space-y-3">
              <h2 className="font-semibold text-lg">Proof activity</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCell label="Proof items" value={metrics.proofs} />
                <MetricCell label="Approved" value={metrics.accepted} />
                <MetricCell label="Requests sent" value={metrics.requests} />
                <MetricCell label="Response rate" value={metrics.requests > 0 ? `${Math.round((metrics.accepted / metrics.requests) * 100)}%` : "—"} />
              </div>
            </section>
          )}

          {sections.includes("content") && (
            <section className="space-y-3">
              <h2 className="font-semibold text-lg">Content output</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <MetricCell label="Pieces created" value={metrics.content} />
                <MetricCell label="Per proof" value={metrics.proofs > 0 ? (metrics.content / metrics.proofs).toFixed(1) : "—"} />
                <MetricCell label="Period length" value={range} />
              </div>
            </section>
          )}

          {sections.includes("health") && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-semibold text-lg">AI recommendations</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateRecs}
                  disabled={recsLoading}
                  className="no-print"
                >
                  {recsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {recs.length === 0 ? "Generate" : "Regenerate"}
                </Button>
              </div>
              {recs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Click Generate to produce 3 tailored recommendations based on this client's metrics.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recs.map((r, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span
                        className="flex-shrink-0 h-6 w-6 rounded-full bg-secondary text-xs flex items-center justify-center font-semibold mt-0.5"
                        style={{ background: agency.brand_color ?? undefined, color: agency.brand_color ? "#fff" : undefined }}
                      >
                        {i + 1}
                      </span>
                      <Textarea
                        value={r}
                        onChange={(e) => setRecs((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                        rows={2}
                        className="flex-1 print:border-0 print:p-0 print:resize-none print:bg-transparent"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="no-print"
                        onClick={() => setRecs((arr) => arr.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {recsSource && (
                <p className="text-xs text-muted-foreground no-print">
                  Source: {recsSource}
                </p>
              )}
            </section>
          )}

          <footer className="pt-4 border-t text-xs text-muted-foreground">
            Prepared by {agency.name} · Generated {new Date().toLocaleDateString()}
          </footer>
        </div>
      </div>

      {sendOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 no-print" onClick={() => setSendOpen(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-base">Send report</CardTitle>
              <CardDescription>Emails a branded HTML version of this report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Recipient email(s)</Label>
                <Input
                  type="text"
                  placeholder="client@example.com, you@agency.com"
                  value={sendEmail}
                  onChange={(e) => setSendEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Comma-separated for multiple recipients.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setSendOpen(false)} disabled={sending}>Cancel</Button>
                <Button onClick={sendReport} disabled={sending || !sendEmail.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
