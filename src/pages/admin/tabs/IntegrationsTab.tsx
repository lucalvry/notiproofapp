import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

interface HealthRow {
  integration_id: string;
  business_id: string;
  business_name: string;
  provider: string;
  status: string;
  last_sync_at: string | null;
  events_24h: number;
  processed_24h: number;
  unprocessed_24h: number;
  success_rate: number | null;
}

export default function IntegrationsTab() {
  const [health, setHealth] = useState<HealthRow[] | null>(null);
  const [dlqCount, setDlqCount] = useState<number | null>(null);
  const [dlqSample, setDlqSample] = useState<any[]>([]);
  const [channelCount, setChannelCount] = useState<{ active: number; broken: number }>({ active: 0, broken: 0 });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [healthRes, dlqHead, dlqList, chanActive, chanBroken] = await Promise.all([
      db.rpc("admin_integration_health"),
      db.from("integration_events").select("*", { count: "exact", head: true }).eq("status", "failed"),
      db.from("integration_events").select("id, provider, error_message, received_at, business_id").eq("status", "failed").order("received_at", { ascending: false }).limit(10),
      db.from("publishing_channels").select("*", { count: "exact", head: true }).eq("status", "active"),
      db.from("publishing_channels").select("*", { count: "exact", head: true }).eq("status", "broken"),
    ]);
    setHealth((healthRes.data ?? []) as HealthRow[]);
    setDlqCount(dlqHead.count ?? 0);
    setDlqSample(dlqList.data ?? []);
    setChannelCount({ active: chanActive.count ?? 0, broken: chanBroken.count ?? 0 });
  };

  useEffect(() => { load(); }, []);

  const runAction = async (action: string, event_id?: string) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-dlq-action", { body: { action, event_id } });
    setBusy(false);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Done", description: `${action}: ${data?.affected ?? 0} event(s) affected` });
    load();
  };

  if (!health || dlqCount === null) return <Skeleton className="h-96 w-full" />;

  const broken = health.filter((h) => h.status === "error" || (h.success_rate !== null && h.success_rate < 80));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Integrations" value={health.length} icon={Plug} />
        <Stat label="Broken" value={broken.length} tone={broken.length > 0 ? "danger" : "ok"} />
        <Stat label="DLQ" value={dlqCount} tone={dlqCount > 50 ? "warn" : "ok"} />
        <Stat label="Publishing channels" value={channelCount.active} sub={`${channelCount.broken} broken`} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dead-letter queue</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => runAction("retry_all")} disabled={busy || dlqCount === 0}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry all
            </Button>
            <Button size="sm" variant="outline" onClick={() => runAction("drain_all")} disabled={busy || dlqCount === 0}>
              <Trash2 className="h-3 w-3 mr-1" /> Drain all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dlqSample.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Queue is empty.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Provider</th>
                    <th className="text-left py-2 pr-3">Error</th>
                    <th className="text-left py-2 pr-3">Received</th>
                    <th className="text-right py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dlqSample.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{e.provider}</td>
                      <td className="py-2 pr-3 text-xs truncate max-w-[300px]" title={e.error_message ?? ""}>{e.error_message ?? "—"}</td>
                      <td className="py-2 pr-3 text-xs">{new Date(e.received_at).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => runAction("retry_event", e.id)}>Retry</Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => runAction("drop_event", e.id)}>Drop</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-integration health (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {health.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No integrations connected.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Business</th>
                    <th className="text-left py-2 pr-3">Provider</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-right py-2 pr-3">Events</th>
                    <th className="text-right py-2 pr-3">Unprocessed</th>
                    <th className="text-right py-2 pr-3">Success</th>
                    <th className="text-left py-2 pr-3">Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {health.map((h) => (
                    <tr key={h.integration_id} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-xs truncate max-w-[200px]">{h.business_name}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{h.provider}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={h.status === "error" ? "destructive" : "secondary"} className="text-xs">{h.status}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right text-xs">{h.events_24h}</td>
                      <td className={`py-2 pr-3 text-right text-xs ${h.unprocessed_24h > 0 ? "text-destructive font-semibold" : ""}`}>{h.unprocessed_24h}</td>
                      <td className="py-2 pr-3 text-right text-xs">{h.success_rate === null ? "—" : `${h.success_rate}%`}</td>
                      <td className="py-2 pr-3 text-xs">{h.last_sync_at ? new Date(h.last_sync_at).toLocaleString() : "never"}</td>
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
