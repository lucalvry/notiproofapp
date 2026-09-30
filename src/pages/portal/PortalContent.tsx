import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalSession } from "@/components/layouts/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const db = supabase as any;

interface ContentRow {
  id: string;
  title: string | null;
  output_type: string | null;
  status: string | null;
  body_md: string | null;
  created_at: string;
}

export default function PortalContent() {
  const { client } = usePortalSession();
  const [rows, setRows] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await db
        .from("content_pieces")
        .select("id, title, output_type, status, body_md, created_at")
        .eq("business_id", client.business_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setRows((data as ContentRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Content</h1>
        <p className="text-muted-foreground text-sm">Content pieces generated for your business.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No content yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{c.title || "Untitled"}</div>
                  <div className="flex items-center gap-2">
                    {c.output_type && <Badge variant="outline" className="capitalize">{c.output_type.replace(/_/g, " ")}</Badge>}
                    {c.status && <Badge variant={c.status === "published" ? "default" : "outline"} className="capitalize">{c.status}</Badge>}
                  </div>
                </div>
                {c.body_md && <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{c.body_md}</p>}
                <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
