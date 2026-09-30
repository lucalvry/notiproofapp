import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, X } from "lucide-react";
import { ProofMultiSelect } from "./components/ProofMultiSelect";
import { StreamingPreview } from "./components/StreamingPreview";

const db = supabase as any;
const SECTIONS = ["Challenge", "Solution", "Results", "Quote", "Conclusion"];
const TONES = ["professional", "casual", "enthusiastic", "witty", "formal"];

export default function CaseStudyGenerator() {
  const { currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customerHandle, setCustomerHandle] = useState("");
  const [proofIds, setProofIds] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>(SECTIONS);
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");

  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [caseStudyId, setCaseStudyId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Default tone from brand voice
  useEffect(() => {
    if (!currentBusinessId) return;
    db.from("business_brand_voice")
      .select("default_tone")
      .eq("business_id", currentBusinessId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data?.default_tone) setTone(data.default_tone);
      });
  }, [currentBusinessId]);

  const cleanup = () => {
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
  };
  useEffect(() => () => cleanup(), []);

  const toggleSection = (s: string) =>
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const generate = async () => {
    if (!currentBusinessId) return;
    if (proofIds.length === 0) {
      toast({ title: "Select at least one proof", variant: "destructive" });
      return;
    }
    setText("");
    setCaseStudyId(null);
    setStreaming(true);

    // Subscribe BEFORE invoking
    cleanup();
    const ch = supabase
      .channel(`casestudy-${currentBusinessId}`)
      .on("broadcast", { event: "token" }, ({ payload }: any) => {
        setText((t) => t + (payload?.delta ?? ""));
      })
      .on("broadcast", { event: "complete" }, ({ payload }: any) => {
        if (payload?.case_study_id) setCaseStudyId(payload.case_study_id);
        setStreaming(false);
      });
    await ch.subscribe();
    channelRef.current = ch;

    try {
      const { error } = await supabase.functions.invoke("generate-case-study", {
        body: {
          business_id: currentBusinessId,
          customer_handle: customerHandle || null,
          proof_object_ids: proofIds,
          tone,
          length_target: length,
          include_sections: sections,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setStreaming(false);
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
  };

  const cancel = () => {
    cleanup();
    setStreaming(false);
    toast({ title: "Cancelled", description: "Stream stopped. Any drafted content was still saved." });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">CS-02</div>
        <h1 className="text-3xl font-bold mt-1">Generate case study</h1>
        <p className="text-muted-foreground mt-1">Long-form story streamed live from approved proof.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Customer handle</Label>
              <Input
                value={customerHandle}
                onChange={(e) => setCustomerHandle(e.target.value)}
                placeholder="e.g. Acme Inc."
                maxLength={120}
              />
            </div>

            <div>
              <Label>Source proofs</Label>
              <ProofMultiSelect businessId={currentBusinessId} selected={proofIds} onChange={setProofIds} />
            </div>

            <div>
              <Label>Sections</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sections.includes(s)} onCheckedChange={() => toggleSection(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Length</Label>
                <Select value={length} onValueChange={(v) => setLength(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (~400 words)</SelectItem>
                    <SelectItem value="medium">Medium (~800 words)</SelectItem>
                    <SelectItem value="long">Long (~1500 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={generate} disabled={streaming || proofIds.length === 0} className="flex-1">
                <Sparkles className="h-4 w-4 mr-1.5" />
                {streaming ? "Generating…" : "Generate"}
              </Button>
              {streaming && (
                <Button variant="outline" onClick={cancel}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
            {caseStudyId && !streaming && (
              <Button variant="default" className="w-full" onClick={() => navigate(`/case-studies/${caseStudyId}/edit`)}>
                Open in editor
              </Button>
            )}
          </CardContent>
        </Card>

        <div>
          <Label className="mb-2 block">Live preview</Label>
          <StreamingPreview text={text} streaming={streaming} />
        </div>
      </div>
    </div>
  );
}
