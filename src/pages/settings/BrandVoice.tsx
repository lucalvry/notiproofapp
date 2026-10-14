import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, X, Sparkles } from "lucide-react";
import { triggerSiteAnalysis } from "@/components/onboarding/GuidedSetup/utils";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "playful", label: "Playful" },
  { value: "bold", label: "Bold" },
  { value: "minimal", label: "Minimal" },
  { value: "luxury", label: "Luxury" },
];

interface BrandVoiceRow {
  id?: string;
  business_id: string;
  default_tone: string;
  voice_examples: string | null;
  avoid_words: string[];
  use_words: string[];
}

interface BusinessProfile {
  target_audience?: string;
  customers?: string;
  problems_solved?: string;
  how_customers_search?: string;
  brand_tone?: string;
  industry?: string;
}

function WordList({
  label,
  placeholder,
  words,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  words: string[];
  onChange: (w: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (words.includes(v)) return setDraft("");
    onChange([...words, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={disabled || !draft.trim()}>
          Add
        </Button>
      </div>
      {words.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {words.map((w) => (
            <Badge key={w} variant="secondary" className="gap-1 pr-1">
              {w}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(words.filter((x) => x !== w))}
                  className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Remove ${w}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandVoiceSettings() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<BrandVoiceRow | null>(null);

  // Business DNA fields — sourced from business_profile (AI-extracted) and
  // editable here; saved back onto businesses.business_profile.
  const [targetAudience, setTargetAudience] = useState("");
  const [problemsSolved, setProblemsSolved] = useState("");
  const [howCustomersSearch, setHowCustomersSearch] = useState("");

  const [websiteUrl, setWebsiteUrl] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [failed, setFailed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    void (supabase as any)
      .from("ai_job_failures")
      .select("id")
      .eq("business_id", currentBusinessId)
      .eq("task", "brand_dna")
      .eq("status", "pending")
      .limit(1)
      .then(({ data }: any) => setFailed((data ?? []).length > 0));
    Promise.all([
      (supabase as any)
        .from("business_brand_voice")
        .select("*")
        .eq("business_id", currentBusinessId)
        .maybeSingle(),
      (supabase as any)
        .from("businesses")
        .select("business_profile, website_url")
        .eq("id", currentBusinessId)
        .maybeSingle(),
    ]).then(([{ data: voiceData }, { data: bizData }]: any[]) => {
      const profile: BusinessProfile = bizData?.business_profile ?? {};
      setWebsiteUrl(bizData?.website_url ?? null);
      setHasProfile(!!(profile.target_audience || profile.problems_solved || profile.brand_tone));
      setRow(
        voiceData ?? {
          business_id: currentBusinessId,
          default_tone: /^(professional|friendly|playful|bold|minimal|luxury)$/.test(profile.brand_tone ?? "")
            ? (profile.brand_tone as string)
            : "professional",
          voice_examples: "",
          avoid_words: [],
          use_words: [],
        }
      );
      setTargetAudience(profile.target_audience || profile.customers || "");
      setProblemsSolved(profile.problems_solved || "");
      setHowCustomersSearch(profile.how_customers_search || "");
      setLoading(false);
    });
  }, [currentBusinessId, reloadKey]);

  const reanalyze = async () => {
    if (!currentBusinessId || !websiteUrl) return;
    setAnalyzing(true);
    await triggerSiteAnalysis(currentBusinessId, websiteUrl, toast);
    setAnalyzing(false);
    setReloadKey((k) => k + 1);
  };

  const save = async () => {
    if (!row || !currentBusinessId) return;
    setSaving(true);
    const payload = {
      business_id: row.business_id,
      default_tone: row.default_tone,
      voice_examples: row.voice_examples?.trim() || null,
      avoid_words: row.avoid_words,
      use_words: row.use_words,
    };
    const [{ error: voiceErr }, { data: bizData }] = await Promise.all([
      (supabase as any).from("business_brand_voice").upsert(payload, { onConflict: "business_id" }),
      (supabase as any).from("businesses").select("business_profile").eq("id", currentBusinessId).maybeSingle(),
    ]);
    if (!voiceErr) {
      const mergedProfile = {
        ...(bizData?.business_profile ?? {}),
        target_audience: targetAudience.trim() || undefined,
        problems_solved: problemsSolved.trim() || undefined,
        how_customers_search: howCustomersSearch.trim() || undefined,
      };
      await (supabase as any)
        .from("businesses")
        .update({ business_profile: mergedProfile })
        .eq("id", currentBusinessId);
    }
    setSaving(false);
    if (voiceErr) return toast({ title: "Save failed", description: voiceErr.message, variant: "destructive" });
    toast({ title: "Brand voice saved" });
  };

  if (loading || !row) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="w-full space-y-4">
      <ReadOnlyBanner />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business DNA</CardTitle>
          <CardDescription>
            Who you serve and what you solve for them. AI reads your website as soon as you add your business and pre-fills this — review and tweak it below.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {analyzing ? (
              <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Analyzing your website…</Badge>
            ) : failed ? (
              <Badge variant="destructive">Last extraction failed — not your fault. Our team can see it; you can also retry</Badge>
            ) : hasProfile ? (
              <Badge variant="secondary">Extracted from your website</Badge>
            ) : (
              <Badge variant="outline">Not extracted yet</Badge>
            )}
            <Button size="sm" variant="outline" onClick={reanalyze} disabled={!canEdit || analyzing || !websiteUrl}>
              <Sparkles className="h-4 w-4 mr-2" />
              {hasProfile ? "Re-analyze website" : "Analyze website"}
            </Button>
            {!websiteUrl && <span className="text-xs text-muted-foreground">Add your website in Settings → Business first.</span>}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Target audience & customers</Label>
            <Textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Small e-commerce brands with 2-20 employees selling physical products online."
              rows={3}
              maxLength={1000}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>Problems you solve / value you provide</Label>
            <Textarea
              value={problemsSolved}
              onChange={(e) => setProblemsSolved(e.target.value)}
              placeholder="e.g. Helps stores turn customer reviews into social proof that boosts conversion."
              rows={3}
              maxLength={1000}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label>How customers search for you</Label>
            <Textarea
              value={howCustomersSearch}
              onChange={(e) => setHowCustomersSearch(e.target.value)}
              placeholder="e.g. 'social proof widget for Shopify', 'show live sales notifications on my site'"
              rows={2}
              maxLength={500}
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand voice</CardTitle>
          <CardDescription>
            Used by AI to generate on-brand testimonial copy, social posts, and case studies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Default tone</Label>
            <Select
              value={row.default_tone}
              onValueChange={(v) => setRow({ ...row, default_tone: v })}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Voice examples</Label>
            <Textarea
              value={row.voice_examples ?? ""}
              onChange={(e) => setRow({ ...row, voice_examples: e.target.value })}
              placeholder="Paste 1–3 short paragraphs in your brand's voice — emails, ads, or website copy."
              rows={6}
              maxLength={4000}
              disabled={!canEdit}
            />
            <p className="text-xs text-muted-foreground">
              The AI will mirror cadence, vocabulary, and style from these samples.
            </p>
          </div>

          <WordList
            label="Words to use"
            placeholder="e.g. effortless, crafted"
            words={row.use_words}
            onChange={(w) => setRow({ ...row, use_words: w })}
            disabled={!canEdit}
          />
          <WordList
            label="Words to avoid"
            placeholder="e.g. cheap, basic"
            words={row.avoid_words}
            onChange={(w) => setRow({ ...row, avoid_words: w })}
            disabled={!canEdit}
          />

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving || !canEdit}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
