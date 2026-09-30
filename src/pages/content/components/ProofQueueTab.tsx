import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Star } from "lucide-react";

const db = supabase as any;

interface ProofRow {
  id: string;
  author_name: string | null;
  content: string | null;
  rating: number | null;
  created_at: string;
  type: string | null;
}

export function ProofQueueTab() {
  const { currentBusinessId } = useAuth();
  const [items, setItems] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    // Step 1: proof IDs that already have content pieces
    const { data: usedRows } = await db
      .from("content_pieces")
      .select("proof_object_id")
      .eq("business_id", currentBusinessId);
    const usedIds = new Set(((usedRows as any[]) ?? []).map((r) => r.proof_object_id).filter(Boolean));

    // Step 2: approved proofs not in that set
    const { data: proofs } = await db
      .from("proof_objects")
      .select("id, author_name, content, rating, created_at, type")
      .eq("business_id", currentBusinessId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);

    setItems(((proofs as any[]) ?? []).filter((p) => !usedIds.has(p.id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground space-y-2">
          <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p>You're all caught up.</p>
          <p className="text-xs">Approve more proofs in the Proof library to generate content from them.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((p) => (
        <Card key={p.id} className="flex flex-col h-full">
          <CardContent className="pt-5 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold truncate">{p.author_name ?? "Anonymous"}</span>
              {p.rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-gold">
                  <Star className="h-3 w-3 fill-gold" /> {p.rating}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{p.content}</p>
            <Badge variant="outline" className="text-[10px] capitalize w-fit">{p.type}</Badge>
            <Button asChild size="sm" className="w-full">
              <Link to={`/content/generate/${p.id}`}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> Generate content
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
