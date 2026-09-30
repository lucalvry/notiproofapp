import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SourceProofPanel, type SourceProof } from "./components/SourceProofPanel";
import { GeneratedPieceCard, type GeneratedPiece } from "./components/GeneratedPieceCard";
import { OUTPUT_TYPES, FREE_TIER_TYPES, type OutputType } from "./components/OutputTypeTabs";
import { PublishModal } from "./components/PublishModal";

const db = supabase as any;
const TONES = ["professional", "casual", "enthusiastic", "witty", "formal"] as const;

export default function ContentGenerator() {
  const { proof_id: proofId } = useParams<{ proof_id: string }>();
  const navigate = useNavigate();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();

  const [proof, setProof] = useState<SourceProof | null>(null);
  const [businessPlan, setBusinessPlan] = useState<string>("free");
  const [tone, setTone] = useState<string>("professional");
  const [defaultTone, setDefaultTone] = useState<string>("professional");
  const [pieces, setPieces] = useState<Record<OutputType, GeneratedPiece | null>>(
    () => Object.fromEntries(OUTPUT_TYPES.map((t) => [t.id, null])) as Record<OutputType, GeneratedPiece | null>
  );
  const [generating, setGenerating] = useState<Set<OutputType>>(new Set());
  const [bootstrapping, setBootstrapping] = useState(true);

  const isFree = businessPlan === "free";
  const allowedTypes = useMemo<OutputType[]>(
    () => (isFree ? FREE_TIER_TYPES : OUTPUT_TYPES.map((t) => t.id)),
    [isFree]
  );

  useEffect(() => {
    if (!proofId || !currentBusinessId) return;

    (async () => {
      setBootstrapping(true);
      const [proofRes, voiceRes, bizRes, piecesRes] = await Promise.all([
        db.from("proof_objects").select("*").eq("id", proofId).eq("business_id", currentBusinessId).maybeSingle(),
        db.from("business_brand_voice").select("default_tone").eq("business_id", currentBusinessId).maybeSingle(),
        db.from("businesses").select("plan").eq("id", currentBusinessId).maybeSingle(),
        db
          .from("content_pieces")
          .select("id, output_type, content, status, char_count, edit_history, created_at")
          .eq("business_id", currentBusinessId)
          .eq("proof_object_id", proofId)
          .order("created_at", { ascending: false }),
      ]);

      if (!proofRes.data) {
        toast({ title: "Proof not found", variant: "destructive" });
        navigate("/content");
        return;
      }

      setProof(proofRes.data as SourceProof);

      const initialTone = (voiceRes.data as any)?.default_tone || "professional";
      setDefaultTone(initialTone);
      setTone(initialTone);
      setBusinessPlan((bizRes.data as any)?.plan || "free");

      const map: Record<string, GeneratedPiece> = {};
      for (const row of (piecesRes.data || []) as any[]) {
        if (!map[row.output_type]) map[row.output_type] = row;
      }
      setPieces((prev) => {
        const next = { ...prev };
        for (const t of OUTPUT_TYPES) next[t.id] = (map[t.id] as GeneratedPiece) || null;
        return next;
      });
      setBootstrapping(false);
    })();
  }, [proofId, currentBusinessId, navigate, toast]);

  useEffect(() => {
    if (!currentBusinessId || !proofId) return;
    const channel = supabase
      .channel(`content-${currentBusinessId}`)
      .on("broadcast", { event: "piece_generated" }, (payload: any) => {
        const row = payload?.payload as GeneratedPiece & { proof_object_id?: string };
        if (!row || row.proof_object_id !== proofId) return;
        setPieces((prev) => ({ ...prev, [row.output_type]: row }));
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(row.output_type);
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusinessId, proofId]);

  const refresh = async () => {
    if (!proofId || !currentBusinessId) return;
    const { data } = await db
      .from("content_pieces")
      .select("id, output_type, content, status, char_count, edit_history, created_at")
      .eq("business_id", currentBusinessId)
      .eq("proof_object_id", proofId)
      .order("created_at", { ascending: false });
    const map: Record<string, GeneratedPiece> = {};
    for (const row of (data || []) as any[]) {
      if (!map[row.output_type]) map[row.output_type] = row;
    }
    setPieces((prev) => {
      const next = { ...prev };
      for (const t of OUTPUT_TYPES) next[t.id] = (map[t.id] as GeneratedPiece) || null;
      return next;
    });
  };

  const callGenerate = async (types: OutputType[]) => {
    if (!proofId || !currentBusinessId || types.length === 0) return;
    setGenerating((prev) => new Set([...prev, ...types]));
    try {
      const { error } = await supabase.functions.invoke("generate-content-pieces", {
        body: {
          proof_object_id: proofId,
          business_id: currentBusinessId,
          tone,
          output_types: types,
        },
      });
      if (error) throw error;
      setTimeout(refresh, 1500);
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || String(e), variant: "destructive" });
      setGenerating((prev) => {
        const next = new Set(prev);
        for (const t of types) next.delete(t);
        return next;
      });
    }
  };

  const generateAll = () => callGenerate(allowedTypes);
  const regenerate = (t: OutputType) => callGenerate([t]);

  const [publishTarget, setPublishTarget] = useState<GeneratedPiece | null>(null);
  const handlePublish = (piece: GeneratedPiece) => setPublishTarget(piece);

  const anyGenerating = generating.size > 0;

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/content")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Content
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label htmlFor="tone" className="text-xs text-muted-foreground">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger id="tone" className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}{t === defaultTone ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={generateAll} disabled={anyGenerating || bootstrapping || !proof}>
            {anyGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {anyGenerating ? "Generating…" : "Generate all content"}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Content generator</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Spin up {allowedTypes.length} ready-to-publish pieces from this proof.
          {isFree && " Free plan includes 3 formats — upgrade for the full set."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div>
          <SourceProofPanel proof={proof} />
        </div>

        <div>
          {bootstrapping ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading…
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OUTPUT_TYPES.map((t) => {
                const allowed = allowedTypes.includes(t.id);
                return (
                  <GeneratedPieceCard
                    key={t.id}
                    outputType={t.id}
                    piece={pieces[t.id]}
                    loading={generating.has(t.id)}
                    locked={!allowed}
                    onRegenerate={regenerate}
                    onPublish={handlePublish}
                    onUpdated={refresh}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {publishTarget && (
        <PublishModal
          open={!!publishTarget}
          onOpenChange={(o) => !o && setPublishTarget(null)}
          contentPieceId={publishTarget.id}
          contentText={publishTarget.content}
          outputType={publishTarget.output_type}
        />
      )}
    </div>
  );
}