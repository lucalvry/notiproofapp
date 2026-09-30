import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Check,
  Archive,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { OUTPUT_TYPE_LABELS } from "./components/ContentPieceCard";
import { SourceProofSidebar } from "./components/SourceProofSidebar";

const db = supabase as any;

interface DraftRow {
  id: string;
  output_type: string;
  content: string;
  char_count: number | null;
  proof_object_id: string;
  created_at: string;
  proof_author?: string | null;
}

export default function BulkReview() {
  const navigate = useNavigate();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<DraftRow[]>([]);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const load = useCallback(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    db.from("content_pieces")
      .select("id, output_type, content, char_count, proof_object_id, created_at, proof_objects(author_name)")
      .eq("business_id", currentBusinessId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }: any) => {
        const rows = ((data as any[]) ?? []).map((r) => ({
          id: r.id,
          output_type: r.output_type,
          content: r.content ?? "",
          char_count: r.char_count,
          proof_object_id: r.proof_object_id,
          created_at: r.created_at,
          proof_author: r.proof_objects?.author_name ?? null,
        })) as DraftRow[];
        setItems(rows);
        setLoading(false);
      });
  }, [currentBusinessId]);

  useEffect(() => {
    load();
    if (!currentBusinessId) return;
    const ch = supabase
      .channel(`content-review-${currentBusinessId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "content_pieces",
          filter: `business_id=eq.${currentBusinessId}`,
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated.status !== "draft") {
            setItems((prev) => prev.filter((p) => p.id !== updated.id));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [currentBusinessId, load]);

  const total = items.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = items[safeIndex];

  const advance = useCallback((dir: 1 | -1 = 1) => {
    setIndex((i) => {
      const next = i + dir;
      if (next < 0) return 0;
      return next;
    });
  }, []);

  const setStatus = useCallback(
    async (status: "approved" | "archived") => {
      const piece = items[indexRef.current];
      if (!piece) return;
      setActionBusy(true);
      const { error } = await db.from("content_pieces").update({ status }).eq("id", piece.id);
      setActionBusy(false);
      if (error) {
        toast({ title: "Failed", description: error.message, variant: "destructive" });
        return;
      }
      setReviewed((prev) => new Set(prev).add(piece.id));
      setItems((prev) => prev.filter((p) => p.id !== piece.id));
      // index stays — list shrinks beneath us
    },
    [items, toast],
  );

  const openInEditor = useCallback(() => {
    const piece = items[indexRef.current];
    if (!piece) return;
    window.open(`/content/${piece.id}/edit`, "_blank");
  }, [items]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "j") {
        e.preventDefault();
        advance(1);
      } else if (key === "k") {
        e.preventDefault();
        advance(-1);
      } else if (key === "a") {
        e.preventDefault();
        setStatus("approved");
      } else if (key === "r") {
        e.preventDefault();
        setStatus("archived");
      } else if (key === "e") {
        e.preventDefault();
        openInEditor();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance, setStatus, openInEditor]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkSetStatus = async (status: "approved" | "archived") => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await db.from("content_pieces").update({ status }).in("id", ids);
    setBulkBusy(false);
    if (error) {
      toast({ title: "Bulk update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${ids.length} pieces ${status}` });
    setReviewed((prev) => {
      const next = new Set(prev);
      ids.forEach((i) => next.add(i));
      return next;
    });
    setItems((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  };

  const reviewedCount = reviewed.size;
  const totalSeen = useMemo(() => reviewedCount + items.length, [reviewedCount, items.length]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Content
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => bulkSetStatus("approved")}
            disabled={selected.size === 0 || bulkBusy}
          >
            <Check className="h-4 w-4 mr-1" /> Approve selected ({selected.size})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => bulkSetStatus("archived")}
            disabled={selected.size === 0 || bulkBusy}
          >
            <Archive className="h-4 w-4 mr-1" /> Reject selected
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Bulk review</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use <kbd className="px-1 py-0.5 border rounded text-[10px]">J</kbd>/
          <kbd className="px-1 py-0.5 border rounded text-[10px]">K</kbd> to move,{" "}
          <kbd className="px-1 py-0.5 border rounded text-[10px]">A</kbd> approve,{" "}
          <kbd className="px-1 py-0.5 border rounded text-[10px]">R</kbd> reject,{" "}
          <kbd className="px-1 py-0.5 border rounded text-[10px]">E</kbd> open editor.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading drafts…
          </CardContent>
        </Card>
      ) : total === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p>No drafts left to review.</p>
            {reviewedCount > 0 && (
              <p className="text-xs">You reviewed {reviewedCount} pieces in this session.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            {current && (
              <Card className="border-primary/40">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {OUTPUT_TYPE_LABELS[current.output_type] ?? current.output_type}
                      </Badge>
                      {current.proof_author && (
                        <span className="text-xs text-muted-foreground">From {current.proof_author}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {safeIndex + 1} of {total}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{current.content}</p>
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => advance(-1)}
                      disabled={safeIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Prev (K)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => advance(1)}
                      disabled={safeIndex >= total - 1}
                    >
                      Next (J) <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={openInEditor}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" /> Edit (E)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setStatus("archived")}
                        disabled={actionBusy}
                      >
                        <Archive className="h-4 w-4 mr-1" /> Reject (R)
                      </Button>
                      <Button size="sm" onClick={() => setStatus("approved")} disabled={actionBusy}>
                        <Check className="h-4 w-4 mr-1" /> Approve (A)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-mono">
                All drafts ({total})
              </p>
              <div className="border rounded-md divide-y">
                {items.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-muted/40 transition ${
                      i === safeIndex ? "bg-muted/60" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleSelect(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {OUTPUT_TYPE_LABELS[p.output_type] ?? p.output_type}
                        </Badge>
                        {p.proof_author && <span className="truncate">From {p.proof_author}</span>}
                      </div>
                      <p className="text-sm line-clamp-1 mt-0.5">{p.content}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SourceProofSidebar proofId={current?.proof_object_id} />
        </div>
      )}

      <div className="fixed bottom-4 right-6 bg-background/90 backdrop-blur border rounded-full px-4 py-2 text-xs shadow-md">
        {reviewedCount} of {totalSeen} reviewed
      </div>
    </div>
  );
}