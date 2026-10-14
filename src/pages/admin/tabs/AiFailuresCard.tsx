import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bot, Loader2, RefreshCw } from "lucide-react";

interface ProviderError { provider: string; kind: string; reason: string; status: number | null }
interface FailureRow {
  id: string;
  business_id: string | null;
  task: string;
  provider_errors: ProviderError[];
  status: string;
  reported_by_user: boolean;
  user_note: string | null;
  attempts: number;
  created_at: string;
}

const TASK_LABEL: Record<string, string> = { brand_dna: "Brand DNA / brand voice extraction" };
const PROVIDER_LABEL: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", lovable: "Lovable AI" };

/** Lists AI jobs that failed on every provider, with each provider's exact reason. */
export default function AiFailuresCard() {
  const { toast } = useToast();
  const [rows, setRows] = useState<FailureRow[] | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("ai_job_failures" as never)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as unknown as FailureRow[]) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retry = async () => {
    setRetrying(true);
    const { data, error } = await supabase.functions.invoke("retry-ai-jobs", { body: {} });
    setRetrying(false);
    if (error) return toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    const d = data as { processed: number; resolved: number; still_failing: number };
    toast({ title: "Pending AI jobs re-run", description: `${d.resolved} fixed, ${d.still_failing} still failing.` });
    void load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4" /> Failed AI jobs
          {rows && rows.length > 0 && <Badge variant="destructive">{rows.length}</Badge>}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={retry} disabled={retrying}>
          {retrying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Credit topped up — retry pending jobs
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Every AI task tries Anthropic, then OpenAI, then Lovable AI. Jobs listed here failed on all three. They also retry automatically every hour.
        </p>
        {rows === null ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground">No failed AI jobs.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-md border p-3 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{TASK_LABEL[r.task] ?? r.task}</span>
                {r.reported_by_user && <Badge variant="secondary">Reported by user</Badge>}
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleString()} · {r.attempts} attempt{r.attempts === 1 ? "" : "s"}
                </span>
              </div>
              {r.business_id && <div className="text-xs text-muted-foreground">Business: {r.business_id}</div>}
              <ul className="text-xs space-y-0.5">
                {r.provider_errors.map((p, i) => (
                  <li key={i}><span className="font-medium">{PROVIDER_LABEL[p.provider] ?? p.provider}:</span> {p.reason}</li>
                ))}
              </ul>
              {r.user_note && <div className="text-xs">User note: {r.user_note}</div>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
