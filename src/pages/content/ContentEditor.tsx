import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, Archive, Trash2, Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getSpec, countWords, OUTPUT_TYPES, type OutputType } from "./components/OutputTypeTabs";
import { OUTPUT_TYPE_LABELS } from "./components/ContentPieceCard";
import { SourceProofSidebar } from "./components/SourceProofSidebar";
import { VersionHistoryDrawer, type HistoryEntry } from "./components/VersionHistoryDrawer";
import { PublishModal } from "./components/PublishModal";

const db = supabase as any;

interface PieceRow {
  id: string;
  business_id: string;
  proof_object_id: string;
  output_type: OutputType;
  status: string;
  content: string;
  char_count: number | null;
  edit_history: HistoryEntry[] | null;
}

export default function ContentEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();

  const [piece, setPiece] = useState<PieceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);

  const load = async () => {
    if (!id || !currentBusinessId) return;
    setLoading(true);
    const { data } = await db
      .from("content_pieces")
      .select("id, business_id, proof_object_id, output_type, status, content, char_count, edit_history")
      .eq("id", id)
      .eq("business_id", currentBusinessId)
      .maybeSingle();
    if (!data) {
      toast({ title: "Content piece not found", variant: "destructive" });
      navigate("/content");
      return;
    }
    setPiece(data as PieceRow);
    setDraft((data as PieceRow).content || "");
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentBusinessId]);

  const spec = useMemo(() => (piece ? getSpec(piece.output_type as OutputType) : null), [piece]);
  const isKnown = !!spec;
  const count = spec?.countMode === "words" ? countWords(draft) : draft.length;
  const overWarn = spec?.warnAt != null && count >= spec.warnAt;
  const overHard = spec?.hardLimit != null && count > spec.hardLimit;
  const dirty = !!piece && draft !== piece.content;

  const save = async () => {
    if (!piece || !dirty) return;
    setSaving(true);
    const history = Array.isArray(piece.edit_history) ? piece.edit_history : [];
    const next: HistoryEntry[] = [
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
    load();
  };

  const setStatus = async (status: string, label: string) => {
    if (!piece) return;
    setBusyAction(label);
    const { error } = await db.from("content_pieces").update({ status }).eq("id", piece.id);
    setBusyAction(null);
    if (error) {
      toast({ title: `${label} failed`, description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: label });
    load();
  };

  const remove = async () => {
    if (!piece) return;
    if (!confirm("Delete this content piece? This cannot be undone.")) return;
    setBusyAction("delete");
    const { error } = await db.from("content_pieces").delete().eq("id", piece.id);
    setBusyAction(null);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted" });
    navigate("/content");
  };

  if (loading || !piece) {
    return (
      <div className="container mx-auto py-12 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…
      </div>
    );
  }

  const typeLabel = OUTPUT_TYPE_LABELS[piece.output_type] ?? piece.output_type;
  const knownTypes = OUTPUT_TYPES.map((t) => t.id) as string[];

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Content
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <VersionHistoryDrawer
            pieceId={piece.id}
            currentContent={piece.content}
            history={Array.isArray(piece.edit_history) ? piece.edit_history : []}
            onReverted={load}
          />
          {piece.status !== "approved" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatus("approved", "Approved")}
              disabled={busyAction === "Approved"}
            >
              {busyAction === "Approved" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
          )}
          {piece.status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatus("archived", "Archived")}
              disabled={busyAction === "Archived"}
            >
              <Archive className="h-4 w-4 mr-1" /> Archive
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={remove}
            disabled={busyAction === "delete"}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={() => setPublishOpen(true)}>
            <Send className="h-4 w-4 mr-1" /> Publish
          </Button>
        </div>
      </div>

      {piece && (
        <PublishModal
          open={publishOpen}
          onOpenChange={setPublishOpen}
          contentPieceId={piece.id}
          contentText={draft}
          outputType={piece.output_type}
        />
      )}

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{typeLabel}</Badge>
        <Badge variant={piece.status === "approved" ? "default" : "secondary"} className="capitalize">
          {piece.status}
        </Badge>
        {!isKnown && knownTypes.length > 0 && (
          <span className="text-xs text-muted-foreground">Unknown format — limits not enforced</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={16}
              className="resize-y text-sm leading-relaxed font-mono"
            />
            <div className="flex items-center justify-between">
              <span
                className={
                  overHard
                    ? "text-destructive text-sm font-medium"
                    : overWarn
                    ? "text-amber-600 dark:text-amber-400 text-sm font-medium"
                    : "text-sm text-muted-foreground"
                }
              >
                {count}
                {spec?.hardLimit ? ` / ${spec.hardLimit}` : ""}{" "}
                {spec?.countMode === "words" ? "words" : "chars"}
              </span>
              <Button onClick={save} disabled={!dirty || saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        <SourceProofSidebar proofId={piece.proof_object_id} />
      </div>
    </div>
  );
}