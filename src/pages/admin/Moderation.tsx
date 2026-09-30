import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, X, ShieldCheck, Sparkles, Flag, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

// Widened with optional legacy fields not present in generated DB types.
type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"] & {
  source?: string | null;
  type?: string | null;
  status?: string | null;
  media_type?: string | null;
  video_url?: string | null;
  outcome_claim?: string | null;
  ai_confidence?: number | null;
  source_metadata?: Record<string, unknown> | null;
  transcript?: string | null;
  raw_content?: string | null;
  author_email?: string | null;
};
type ProofStatus = string;

const db = supabase as any;

export default function Moderation() {
  const { toast } = useToast();
  const [items, setItems] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const open = openId ? items.find((i) => i.id === openId) ?? null : null;

  const load = () => {
    setLoading(true);
    db
      .from("proof_objects")
      .select("*")
      .in("status", ["pending_review", "pending"])
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }: { data: ProofRow[] | null }) => {
        setItems(data ?? []);
        setLoading(false);
        setSelected(new Set());
      });
  };
  useEffect(load, []);

  const decide = async (id: string, status: ProofStatus, extra: Partial<ProofRow> = {}): Promise<void> => {
    const { error } = await db.from("proof_objects").update({ status, ...extra }).eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setItems((s) => s.filter((x) => x.id !== id));
    setOpenId(null);
  };

  const bulkDecide = async (status: ProofStatus) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await db.from("proof_objects").update({ status }).in("id", ids);
    setBulkBusy(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setItems((s) => s.filter((x) => !selected.has(x.id)));
    setSelected(new Set());
    toast({ title: `${ids.length} item${ids.length === 1 ? "" : "s"} ${status}` });
  };

  const markSpam = async (id: string) => {
    const { data: row } = await db
      .from("proof_objects")
      .select("tags, source_metadata")
      .eq("id", id)
      .maybeSingle();
    const tags = Array.from(new Set([...((row?.tags as string[]) ?? []), "spam"]));
    const meta = (row?.source_metadata ?? {}) as Record<string, unknown>;
    await decide(id, "rejected", {
      tags,
      source_metadata: { ...meta, marked_spam_at: new Date().toISOString() } as never,
    });
    toast({ title: "Marked as spam" });
  };

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => (s.size === items.length ? new Set() : new Set(items.map((p) => p.id))));
  };

  const isVideo = (p: ProofRow) => (p.media_type ?? "").startsWith("video") || !!p.video_url;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ADM-04</div>
        <h1 className="text-3xl font-bold mt-1">Moderation queue</h1>
        <p className="text-muted-foreground mt-1">
          Review submitted proof before it goes live. Click any row to inspect details.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success mb-3">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">All caught up</h3>
              <p className="text-sm text-muted-foreground mt-1">No items waiting for review.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={selected.size === items.length && items.length > 0}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                  <span>
                    {selected.size > 0
                      ? `${selected.size} selected`
                      : `${items.length} pending`}
                  </span>
                </div>
                {selected.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" disabled={bulkBusy} onClick={() => bulkDecide("approved")}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={bulkBusy}
                      onClick={() => bulkDecide("rejected")}
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>

              <ul className="divide-y rounded-md border">
                {items.map((p) => {
                  const sel = selected.has(p.id);
                  return (
                    <li
                      key={p.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors ${sel ? "bg-accent/5" : ""}`}
                      onClick={() => setOpenId(p.id)}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel} onCheckedChange={() => toggleSel(p.id)} />
                      </div>
                      <div className="h-8 w-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {(p.author_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {p.author_name ?? "Anonymous"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {p.outcome_claim ?? p.content ?? "—"}
                        </div>
                      </div>
                      {p.ai_confidence !== null && p.ai_confidence !== undefined && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Sparkles className="h-3 w-3 text-accent" />
                          {Math.round(Number(p.ai_confidence) * 100)}%
                        </Badge>
                      )}
                      <Badge variant="secondary" className="capitalize text-[10px]">
                        {p.source ?? p.type}
                      </Badge>
                      {isVideo(p) && (
                        <Badge variant="outline" className="text-[10px]">
                          Video
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Review proof</SheetTitle>
          </SheetHeader>

          {open && <ModerationDetail proof={open} onDecide={decide} onSpam={markSpam} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ModerationDetail({
  proof,
  onDecide,
  onSpam,
}: {
  proof: ProofRow;
  onDecide: (id: string, status: ProofStatus, extra?: Partial<ProofRow>) => Promise<void>;
  onSpam: (id: string) => Promise<void>;
}) {
  const [claim, setClaim] = useState(proof.outcome_claim ?? "");
  const [tags, setTags] = useState<string[]>(proof.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    setClaim(proof.outcome_claim ?? "");
    setTags(proof.tags ?? []);
  }, [proof.id]);

  const isVideo = (proof.media_type ?? "").startsWith("video") || !!proof.video_url;

  const addTag = () => {
    const v = tagDraft.trim();
    if (!v || tags.includes(v)) {
      setTagDraft("");
      return;
    }
    setTags([...tags, v]);
    setTagDraft("");
  };

  const confirmAi = () => onDecide(proof.id, "approved", { outcome_claim: claim, tags });
  const editAndApprove = () => onDecide(proof.id, "approved", { outcome_claim: claim, tags });

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="capitalize">{proof.source ?? proof.type}</Badge>
        {proof.ai_confidence !== null && proof.ai_confidence !== undefined && (
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3 text-accent" />
            AI confidence {Math.round(Number(proof.ai_confidence) * 100)}%
          </Badge>
        )}
        {proof.rating && (
          <Badge variant="outline" className="gap-1">
            <Star className="h-3 w-3 fill-gold text-gold" />
            {proof.rating}
          </Badge>
        )}
      </div>

      {(proof.media_url || proof.video_url) && (
        <div className="rounded-md border bg-muted/30 p-2">
          {isVideo ? (
            <video
              src={proof.video_url ?? proof.media_url ?? undefined}
              controls
              className="w-full max-h-72 rounded"
            />
          ) : (
            <img
              src={proof.media_url ?? undefined}
              alt="proof"
              className="max-h-72 rounded mx-auto"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          )}
        </div>
      )}

      <Tabs defaultValue="content">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="ai">AI claim & tags</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-3 pt-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Author</Label>
            <div className="text-sm">{proof.author_name ?? "Anonymous"}</div>
            {proof.author_email && (
              <div className="text-xs text-muted-foreground">{proof.author_email}</div>
            )}
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Content</Label>
            <p className="text-sm whitespace-pre-wrap">{proof.content ?? "—"}</p>
          </div>
          {proof.transcript && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Transcript</Label>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{proof.transcript}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AI outcome claim
            </Label>
            <Textarea rows={3} value={claim} onChange={(e) => setClaim(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag…"
              />
              <Button type="button" variant="outline" onClick={addTag}>
                Add
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="pt-4">
          <pre className="text-xs bg-muted/40 rounded p-3 overflow-x-auto whitespace-pre-wrap">
            {proof.raw_content ?? proof.content ?? "—"}
          </pre>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        <Button onClick={confirmAi}>
          <Check className="h-4 w-4 mr-1" /> Confirm AI & approve
        </Button>
        <Button variant="outline" onClick={editAndApprove}>
          Approve with edits
        </Button>
        <Button variant="outline" onClick={() => onDecide(proof.id, "rejected")}>
          <X className="h-4 w-4 mr-1" /> Reject
        </Button>
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive ml-auto"
          onClick={() => onSpam(proof.id)}
        >
          <Flag className="h-4 w-4 mr-1" /> Mark spam
        </Button>
      </div>
    </div>
  );
}
