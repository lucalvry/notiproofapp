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
import { Save, Loader2, X } from "lucide-react";
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

  useEffect(() => {
    if (!currentBusinessId) return;
    setLoading(true);
    (supabase as any)
      .from("business_brand_voice")
      .select("*")
      .eq("business_id", currentBusinessId)
      .maybeSingle()
      .then(({ data }: any) => {
        setRow(
          data ?? {
            business_id: currentBusinessId,
            default_tone: "professional",
            voice_examples: "",
            avoid_words: [],
            use_words: [],
          }
        );
        setLoading(false);
      });
  }, [currentBusinessId]);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const payload = {
      business_id: row.business_id,
      default_tone: row.default_tone,
      voice_examples: row.voice_examples?.trim() || null,
      avoid_words: row.avoid_words,
      use_words: row.use_words,
    };
    const { error } = await (supabase as any)
      .from("business_brand_voice")
      .upsert(payload, { onConflict: "business_id" });
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Brand voice saved" });
  };

  if (loading || !row) return <Skeleton className="h-64 w-full max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-4">
      <ReadOnlyBanner />
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
