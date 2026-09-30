import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentPieceCard, OUTPUT_TYPE_LABELS, type ContentPieceCardData } from "./ContentPieceCard";

const db = supabase as any;

type Row = ContentPieceCardData;

export function ContentLibraryTab() {
  const { currentBusinessId } = useAuth();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const load = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    db.from("content_pieces")
      .select("id, output_type, status, content, char_count, proof_object_id, proof_objects(author_name)")
      .eq("business_id", currentBusinessId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: any) => {
        setItems(
          ((data as any[]) ?? []).map((r) => ({
            id: r.id,
            output_type: r.output_type,
            status: r.status,
            content: r.content ?? "",
            char_count: r.char_count,
            proof_object_id: r.proof_object_id,
            proof_author: r.proof_objects?.author_name ?? null,
          })),
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    if (!currentBusinessId) return;
    const ch = supabase
      .channel(`content-${currentBusinessId}`)
      .on("broadcast", { event: "piece_generated" }, () => load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "content_pieces", filter: `business_id=eq.${currentBusinessId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  const filtered = useMemo(() => {
    let list = items;
    if (type !== "all") list = list.filter((i) => i.output_type === type);
    if (status !== "all") list = list.filter((i) => i.status === status);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.content.toLowerCase().includes(q));
    }
    return list;
  }, [items, type, status, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(OUTPUT_TYPE_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p>No content pieces match your filters.</p>
            <p className="text-xs">Generate content from an approved proof to populate this library.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => <ContentPieceCard key={p.id} piece={p} onChange={load} />)}
        </div>
      )}
    </div>
  );
}
