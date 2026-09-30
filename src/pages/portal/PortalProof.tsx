import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalSession } from "@/components/layouts/PortalLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search } from "lucide-react";

const db = supabase as any;

interface ProofRow {
  id: string;
  type: string | null;
  raw_content: string | null;
  outcome_claim: string | null;
  rating: number | null;
  status: string | null;
  customer_name: string | null;
  created_at: string;
}

export default function PortalProof() {
  const { client } = usePortalSession();
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await db
        .from("proof_objects")
        .select("id, type, raw_content, outcome_claim, rating, status, customer_name, created_at")
        .eq("business_id", client.business_id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      setRows((data as ProofRow[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [client]);

  const filtered = q
    ? rows.filter((r) =>
        [r.raw_content, r.outcome_claim, r.customer_name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q.toLowerCase()))
      )
    : rows;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Proof</h1>
          <p className="text-muted-foreground text-sm">All testimonials and reviews collected for your business.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No proof yet.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{p.type ?? "proof"}</Badge>
                  {p.status && (
                    <Badge variant={p.status === "approved" ? "default" : "outline"} className="capitalize">
                      {p.status.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                {p.rating != null && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < (p.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                )}
                {p.raw_content && <p className="text-sm line-clamp-3">{p.raw_content}</p>}
                {p.customer_name && (
                  <div className="text-xs text-muted-foreground">— {p.customer_name}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
