import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const db = supabase as any;

interface Proof {
  id: string;
  author_name: string | null;
  content: string | null;
  rating: number | null;
}

export function ProofMultiSelect({
  businessId,
  selected,
  onChange,
}: {
  businessId: string | null;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    db.from("proof_objects")
      .select("id,author_name,content,rating")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => {
        setProofs((data as Proof[]) ?? []);
        setLoading(false);
      });
  }, [businessId]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const filtered = proofs.filter((p) =>
    !search ? true : ((p.author_name ?? "") + " " + (p.content ?? "")).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <Input placeholder="Search proofs…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="border rounded-md max-h-72 overflow-y-auto divide-y">
        {loading ? (
          <div className="p-2 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground text-center">No approved proofs found.</p>
        ) : (
          filtered.map((p) => (
            <label key={p.id} className="flex gap-3 p-3 hover:bg-muted/50 cursor-pointer items-start">
              <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate">{p.author_name || "Anonymous"}</span>
                  {p.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-gold">
                      <Star className="h-3 w-3 fill-gold" /> {p.rating}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
              </div>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">{selected.length} selected</p>
    </div>
  );
}
