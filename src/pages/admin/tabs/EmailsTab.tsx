import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

const db = supabase as any;

interface EmailSendRow {
  id: string;
  email: string;
  template: string;
  business_id: string | null;
  user_id: string | null;
  created_at: string;
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function EmailsTab() {
  const [rows, setRows] = useState<EmailSendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await db.rpc("admin_recent_email_sends", { p_limit: 100 });
      if (error) setError(error.message);
      setRows((data ?? []) as EmailSendRow[]);
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Recent lifecycle &amp; status emails
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-sm text-destructive py-6 text-center">{error}</div>
        ) : !rows ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No emails sent yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase border-b">
                <tr>
                  <th className="text-left py-2 pr-3">Recipient</th>
                  <th className="text-left py-2 pr-3">Template</th>
                  <th className="text-left py-2 pr-3">Sent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{r.email}</td>
                    <td className="py-2 pr-3"><Badge variant="outline" className="font-mono text-xs">{r.template}</Badge></td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{relTime(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
