import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HardDrive, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

function fmtBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

export default function EnrichmentTab() {
  const [counts, setCounts] = useState<{ total: number; cached: number; pending: number; failed: number } | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [storage, setStorage] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ count: total }, { count: cached }, { count: pending }, { count: failed }, { data: jobRows }] = await Promise.all([
      db.from("proof_product_items").select("*", { count: "exact", head: true }).not("product_image_url", "is", null),
      db.from("proof_product_items").select("*", { count: "exact", head: true }).eq("image_fetch_status", "cached"),
      db.from("proof_product_items").select("*", { count: "exact", head: true }).eq("image_fetch_status", "pending"),
      db.from("proof_product_items").select("*", { count: "exact", head: true }).eq("image_fetch_status", "failed"),
      db.from("backfill_jobs").select("*").order("started_at", { ascending: false }).limit(10),
    ]);
    setCounts({
      total: total ?? 0,
      cached: cached ?? 0,
      pending: pending ?? 0,
      failed: failed ?? 0,
    });
    setJobs(jobRows ?? []);

    const { data } = await supabase.functions.invoke("get-storage-metrics");
    setStorage(data);
  };

  useEffect(() => { load(); }, []);

  const retryFailed = async () => {
    setBusy(true);
    const { data, error } = await db.rpc("retry_failed_product_image_enrichment");
    setBusy(false);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else toast({ title: "Requeued", description: `${data ?? 0} item(s) reset to pending` });
    load();
  };

  if (!counts) return <Skeleton className="h-96 w-full" />;

  const cachePct = counts.total > 0 ? Math.round((counts.cached / counts.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Product items" value={counts.total} icon={ImageIcon} />
        <Stat label="Cached" value={counts.cached} sub={`${cachePct}% coverage`} />
        <Stat label="Pending" value={counts.pending} tone={counts.pending > 100 ? "warn" : "ok"} />
        <Stat label="Failed" value={counts.failed} tone={counts.failed > 50 ? "danger" : "ok"} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Image enrichment pipeline</CardTitle>
          <Button size="sm" variant="outline" onClick={retryFailed} disabled={busy || counts.failed === 0}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry failed
          </Button>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Cache coverage</span>
              <span className="text-muted-foreground">{counts.cached} / {counts.total}</span>
            </div>
            <div className="h-2 bg-muted rounded overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${cachePct}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" /> Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {!storage ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="mb-3">Proof media total: <span className="font-semibold">{fmtBytes(storage.proof_media_bytes)}</span></div>
              {storage.buckets?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {storage.buckets.map((b: any) => (
                    <div key={b.name} className="rounded border p-2">
                      <div className="font-mono text-xs truncate">{b.name}</div>
                      <div className="text-muted-foreground text-xs">{b.objects} objects</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent backfill jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No backfill jobs recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Scope</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2 pr-3">Tried</th>
                    <th className="text-right py-2 pr-3">OK</th>
                    <th className="text-right py-2 pr-3">Fail</th>
                    <th className="text-left py-2 pr-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j: any) => (
                    <tr key={j.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{j.scope}</td>
                      <td className="py-2 pr-3"><Badge variant="outline" className="text-xs">{j.status}</Badge></td>
                      <td className="py-2 pr-3 text-right text-xs">{j.attempted ?? 0}</td>
                      <td className="py-2 pr-3 text-right text-xs">{j.succeeded ?? 0}</td>
                      <td className="py-2 pr-3 text-right text-xs">{j.failed ?? 0}</td>
                      <td className="py-2 pr-3 text-xs">{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</td>
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

function Stat({ label, value, sub, icon: Icon, tone }: { label: string; value: number; sub?: string; icon?: any; tone?: "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "border-destructive/40 bg-destructive/5" : tone === "warn" ? "border-gold/40 bg-gold/5" : "";
  return (
    <Card className={cls}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-xl font-bold">{value.toLocaleString()}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
