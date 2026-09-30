import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2, Sparkles } from "lucide-react";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";

const TONES = ["professional", "friendly", "casual", "enthusiastic", "authoritative", "witty"];
const OUTPUT_TYPES = [
  { value: "twitter_post", label: "X / Twitter post" },
  { value: "linkedin_post", label: "LinkedIn post" },
  { value: "instagram_caption", label: "Instagram caption" },
  { value: "email_snippet", label: "Email snippet" },
  { value: "blog_intro", label: "Blog intro" },
  { value: "ad_copy", label: "Ad copy" },
];

export default function ContentPreferences() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [notifyOnReady, setNotifyOnReady] = useState(true);
  const [defaultTones, setDefaultTones] = useState<string[]>([]);
  const [defaultOutputs, setDefaultOutputs] = useState<string[]>([]);

  useEffect(() => {
    if (!currentBusinessId) return;
    (supabase as any)
      .from("businesses")
      .select("content_auto_generate, content_notify_on_ready, content_default_tones, content_default_output_types")
      .eq("id", currentBusinessId)
      .maybeSingle()
      .then(({ data }: any) => {
        setAutoGenerate(!!data?.content_auto_generate);
        setNotifyOnReady(data?.content_notify_on_ready ?? true);
        setDefaultTones(data?.content_default_tones ?? []);
        setDefaultOutputs(data?.content_default_output_types ?? []);
        setLoading(false);
      });
  }, [currentBusinessId]);

  const toggle = (list: string[], v: string, setter: (n: string[]) => void) => {
    setter(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };

  const save = async () => {
    if (!currentBusinessId) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("businesses")
      .update({
        content_auto_generate: autoGenerate,
        content_notify_on_ready: notifyOnReady,
        content_default_tones: defaultTones,
        content_default_output_types: defaultOutputs,
      })
      .eq("id", currentBusinessId);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Preferences saved" });
  };

  if (loading) return <Skeleton className="h-64 w-full max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">SET-06</div>
      <ReadOnlyBanner />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple" /> Content automation
          </CardTitle>
          <CardDescription>Control how NotiProof generates AI content from your proof.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Auto-generate content</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When a new proof is approved, automatically draft content pieces for review.</p>
            </div>
            <Switch checked={autoGenerate} onCheckedChange={setAutoGenerate} disabled={!canEdit} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="text-sm font-medium">Email me when content is ready</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Send a notification when AI-generated drafts are waiting for review.</p>
            </div>
            <Switch checked={notifyOnReady} onCheckedChange={setNotifyOnReady} disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default tones</CardTitle>
          <CardDescription>Pre-selected tones in the content generator.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => {
              const active = defaultTones.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(defaultTones, t, setDefaultTones)}
                  className="focus:outline-none"
                >
                  <Badge variant={active ? "default" : "outline"} className="capitalize cursor-pointer">{t}</Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default output types</CardTitle>
          <CardDescription>Pre-selected formats in the content generator.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {OUTPUT_TYPES.map((o) => {
              const active = defaultOutputs.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => toggle(defaultOutputs, o.value, setDefaultOutputs)}
                  className="focus:outline-none"
                >
                  <Badge variant={active ? "default" : "outline"} className="cursor-pointer">{o.label}</Badge>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !canEdit}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save preferences
        </Button>
      </div>
    </div>
  );
}