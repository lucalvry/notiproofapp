import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Send, Lock, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSpec, countWords, type OutputType } from "./OutputTypeTabs";

const db = supabase as any;

export interface GeneratedPiece {
  id: string;
  output_type: OutputType;
  content: string;
  status: string;
  char_count?: number | null;
  edit_history?: any[] | null;
}

interface Props {
  outputType: OutputType;
  piece: GeneratedPiece | null;
  loading: boolean;
  locked?: boolean;
  onRegenerate: (outputType: OutputType) => void;
  onPublish: (piece: GeneratedPiece) => void;
  onUpdated: () => void;
}

export function GeneratedPieceCard({
  outputType,
  piece,
  loading,
  locked,
  onRegenerate,
  onPublish,
  onUpdated,
}: Props) {
  const spec = getSpec(outputType);
  const { toast } = useToast();
  const [draft, setDraft] = useState(piece?.content || "");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (piece?.content !== undefined) setDraft(piece.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [piece?.id, piece?.content]);

  const count = spec.countMode === "words" ? countWords(draft) : draft.length;
  const overWarn = spec.warnAt != null && count >= spec.warnAt;
  const overHard = spec.hardLimit != null && count > spec.hardLimit;

  const dirty = !!piece && draft !== piece.content;

  const save = async () => {
    if (!piece || !dirty) return;
    setSaving(true);
    const history = Array.isArray(piece.edit_history) ? piece.edit_history : [];
    const next = [
      ...history.slice(-9),
      { content: piece.content, edited_at: new Date().toISOString() },
    ];
    const { error } = await db
      .from("content_pieces")
      .update({
        content: draft,
        char_count: draft.length,
        edit_history: next,
      })
      .eq("id", piece.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    onUpdated();
  };

  const copy = () => {
    navigator.clipboard.writeText(draft);
    toast({ title: "Copied to clipboard" });
  };

  const approve = async () => {
    if (!piece) return;
    setBusyAction("approve");
    const { error } = await db.from("content_pieces").update({ status: "approved" }).eq("id", piece.id);
    setBusyAction(null);
    if (error) return toast({ title: "Approve failed", description: error.message, variant: "destructive" });
    toast({ title: "Approved" });
    onUpdated();
  };

  if (locked) {
    return (
      <Card className="opacity-70 border-dashed">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Badge variant="outline" className="text-[10px]">{spec.label}</Badge>
          <Lock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upgrade to Starter to generate {spec.label.toLowerCase()} content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading && !piece) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Badge variant="outline" className="text-[10px]">{spec.label}</Badge>
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-3 w-full rounded bg-muted animate-pulse" />
          <div className="h-3 w-11/12 rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!piece) {
    return (
      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Badge variant="outline" className="text-[10px]">{spec.label}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">No content yet for this format.</p>
          <Button size="sm" variant="outline" onClick={() => onRegenerate(outputType)}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={piece.status === "approved" ? "border-primary/40" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{spec.label}</Badge>
          <Badge variant={piece.status === "approved" ? "default" : "secondary"} className="text-[10px] capitalize">
            {piece.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={spec.countMode === "words" ? 7 : Math.min(7, Math.max(3, Math.ceil(draft.length / 60)))}
          className="resize-none text-sm leading-relaxed"
          placeholder="Generated content will appear here…"
        />

        <div className="flex items-center justify-between text-xs">
          <span
            className={
              overHard
                ? "text-destructive font-medium"
                : overWarn
                ? "text-amber-600 dark:text-amber-400 font-medium"
                : "text-muted-foreground"
            }
          >
            {count}
            {spec.hardLimit ? ` / ${spec.hardLimit}` : ""} {spec.countMode === "words" ? "words" : "chars"}
          </span>
          {dirty && (
            <Button size="sm" variant="ghost" onClick={save} disabled={saving} className="h-6 text-xs">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 pt-2 border-t">
          <Button size="sm" variant="ghost" onClick={copy}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onRegenerate(outputType)} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            Regenerate
          </Button>
          {piece.status !== "approved" && (
            <Button size="sm" variant="ghost" onClick={approve} disabled={busyAction === "approve"}>
              {busyAction === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 mr-1" />
              )}
              Approve
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onPublish(piece)} className="ml-auto">
            <Send className="h-3.5 w-3.5 mr-1" /> Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}