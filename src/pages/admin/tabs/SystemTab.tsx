import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Clock, HeartPulse, ArrowRight } from "lucide-react";

const db = supabase as any;

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_start: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
}

function relTime(iso: string | null) {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SystemTab() {
  const [jobs, setJobs] = useState<CronJob[] | null>(null);
  const [tableSizes, setTableSizes] = useState<{ table: string; count: number }[] | null>(null);

  const load = async () => {
    const [jobsRes] = await Promise.all([db.rpc("admin_pg_cron_jobs")]);
    setJobs((jobsRes.data ?? []) as CronJob[]);

    // simple table size counts for headline tables (limited to fast queries)
    const tables = [
      "businesses",
      "users",
      "agencies",
      "proof_objects",
      "content_pieces",
      "integration_events",
      "widget_events",
      "testimonial_requests",
    ];
    const sizes = await Promise.all(
      tables.map(async (t) => {
        const { count } = await db.from(t).select("*", { count: "exact", head: true });
        return { table: t, count: count ?? 0 };
      }),
    );
    setTableSizes(sizes);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* pg_cron jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduled jobs (pg_cron)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!jobs ? (
            <Skeleton className="h-48 w-full" />
          ) : jobs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No cron jobs registered.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="text-left py-2 pr-3">Job</th>
                    <th className="text-left py-2 pr-3">Schedule</th>
                    <th className="text-left py-2 pr-3">Last run</th>
                    <th className="text-left py-2 pr-3">Status</th>
                    <th className="text-left py-2 pr-3">Duration</th>
                    <th className="text-left py-2 pr-3">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.jobid} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{j.jobname}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{j.schedule}</td>
                      <td className="py-2 pr-3 text-xs">{relTime(j.last_start)}</td>
                      <td className="py-2 pr-3">
                        {j.last_status ? (
                          <Badge
                            variant={
                              j.last_status === "succeeded" ? "secondary" : "destructive"
                            }
                          >
                            {j.last_status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {j.last_duration_ms != null ? `${j.last_duration_ms}ms` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {j.active ? (
                          <Badge variant="secondary">on</Badge>
                        ) : (
                          <Badge variant="outline">off</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database row counts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Database — top tables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tableSizes ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {tableSizes.map((t) => (
                <div key={t.table} className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground font-mono">{t.table}</div>
                  <div className="text-lg font-bold mt-1">{t.count.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to legacy health page */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4" />
            Legacy health view
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Integration health, edge function logs and the older ADM-05 view are still available
            on the dedicated health page.
          </p>
          <Button asChild variant="outline">
            <Link to="/admin/health">
              Open legacy health <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}