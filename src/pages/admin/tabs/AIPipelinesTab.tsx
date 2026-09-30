import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

const db = supabase as any;

interface Agg {
  function_name: string;
  total: number;
  success: number;
  error: number;
  avg_ms: number;
  last_at: string | null;
}

const TRACKED = [
  "generate-case-study",
  "generate-content-pieces",
  "generate-scheduled-report",
  "generate-client-recommendations",
  "suggest-subject-lines",
  "enrich-proof-product-images",
  "scheduled-email-sender",
  "campaign-trigger-evaluator",
  "fetch-product-from-url",
  "publish-content-piece",
];

export default function AIPipelinesTab() {
  const [aggs, setAggs] = useState<Agg[] | null>(null);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await db
        .from("ef_invocation_log")
        .select("function_name, status, duration_ms, created_at")
        .gte("created_at", since)
        .limit(20000);

      const map = new Map<string, Agg>();
      for (const fn of TRACKED) {
        map.set(fn, { function_name: fn, total: 0, success: 0, error: 0, avg_ms: 0, last_at: null });
      }
      const totals = new Map<string, number>();
      for (const r of data ?? []) {
        const k = r.function_name as string;
        let cur = map.get(k);
        if (!cur) {
          cur = { function_name: k, total: 0, success: 0, error: 0, avg_ms: 0, last_at: null };
          map.set(k, cur);
        }
        cur.total += 1;
        if (r.status === "error") cur.error += 1;
        else cur.success += 1;
        totals.set(k, (totals.get(k) ?? 0) + (Number(r.duration_ms) || 0));
        if (!cur.last_at || new Date(r.created_at) > new Date(cur.last_at)) cur.last_at = r.created_at;
      }
      for (const [k, v] of map) {
        if (v.total > 0) v.avg_ms = Math.round((totals.get(k) ?? 0) / v.total);
      }
      setAggs(Array.from(map.values()).sort((a, b) => b.total - a.total));
    })();
  }, []);

  if (!aggs) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Edge Function activity (24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aggs.every((a) => a.total === 0) ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No <code>ef_invocation_log</code> rows in the last 24h. Edge Functions need the
              instrumentation helper appended on completion before metrics show here.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {aggs.map((a) => {
                const successRate = a.total > 0 ? Math.round((a.success / a.total) * 100) : 0;
                const tone =
                  a.total === 0
                    ? "bg-muted/30 border-muted"
                    : successRate >= 95
                      ? "border-success/40"
                      : successRate >= 80
                        ? "border-gold/40"
                        : "border-destructive/40";
                return (
                  <div key={a.function_name} className={`rounded-md border p-3 ${tone}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-xs truncate">{a.function_name}</div>
                      {a.total > 0 && (
                        <Badge variant={successRate >= 95 ? "secondary" : "destructive"} className="text-xs">
                          {successRate}%
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <Cell label="Calls" value={a.total} />
                      <Cell label="Errors" value={a.error} />
                      <Cell label="Avg ms" value={a.avg_ms} />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      {a.last_at ? `Last: ${new Date(a.last_at).toLocaleString()}` : "No calls in 24h"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
