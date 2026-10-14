import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import { normalizeWebsite, triggerSiteAnalysis } from "../utils";
import { useGuidedSetup } from "../context";

interface Props {
  onSkip: () => void;
  onSaved: () => void;
}

/** Step 1: business name + website + industry. Reuses the same
 *  create_business RPC + analyze-business-site call as AppLayout's
 *  create-business dialog (for mode "new"), or updates the businesses row
 *  directly (for mode "existing"), same as Settings → Business. */
export function BusinessStep({ onSkip, onSaved }: Props) {
  const { businesses, currentBusinessId, setCurrentBusinessId, refresh } = useAuth();
  const { mode, businessId, setBusinessId } = useGuidedSetup();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const websiteRef = useRef<HTMLInputElement>(null);

  const existing = businesses.find((b) => b.id === (businessId ?? currentBusinessId));
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (mode === "new") return;
    const id = businessId ?? currentBusinessId;
    if (!id) return;
    setLoading(true);
    (supabase as any)
      .from("businesses")
      .select("name, website_url, industry")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }: any) => {
        setName(data?.name ?? "");
        setWebsite(data?.website_url ?? "");
        setIndustry(data?.industry ?? "");
        setLoading(false);
      });
  }, [mode, businessId, currentBusinessId]);

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Enter a business name", variant: "destructive" });
      return;
    }
    const normalizedWebsite = normalizeWebsite(website);
    if (!normalizedWebsite) {
      setWebsiteError("Enter your website address, e.g. acme.com");
      websiteRef.current?.focus();
      return;
    }
    setWebsiteError(null);
    setSaving(true);

    if (mode === "new") {
      const { data, error } = await supabase.rpc("create_business" as never, { _name: trimmed } as never);
      if (error) {
        setSaving(false);
        toast({ title: "Couldn't create business", description: error.message, variant: "destructive" });
        return;
      }
      const newId = typeof data === "string" ? data : null;
      if (!newId) {
        setSaving(false);
        toast({ title: "Couldn't create business", variant: "destructive" });
        return;
      }
      await supabase
        .from("businesses")
        .update({ website_url: normalizedWebsite, industry: industry.trim() || null })
        .eq("id", newId);
      await refresh();
      setCurrentBusinessId(newId);
      setBusinessId(newId);
      queryClient.clear();
      setAnalyzing(true);
      await triggerSiteAnalysis(newId, normalizedWebsite, toast);
      await refresh();
      setAnalyzing(false);
      setSaving(false);
      onSaved();
      return;
    }

    const id = businessId ?? currentBusinessId;
    if (!id) {
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("businesses")
      .update({ name: trimmed, website_url: normalizedWebsite, industry: industry.trim() || null } as any)
      .eq("id", id);
    if (error) {
      setSaving(false);
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    const websiteChanged = normalizedWebsite !== (existing as any)?.website_url;
    if (websiteChanged) {
      setAnalyzing(true);
      await triggerSiteAnalysis(id, normalizedWebsite, toast);
      setAnalyzing(false);
    }
    await refresh();
    queryClient.invalidateQueries();
    setSaving(false);
    onSaved();
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gs-business-name">Business name</Label>
        <Input id="gs-business-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gs-business-website">
          Website <span className="text-destructive">*</span>
        </Label>
        <Input
          id="gs-business-website"
          ref={websiteRef}
          value={website}
          onChange={(e) => {
            setWebsite(e.target.value);
            if (websiteError) setWebsiteError(null);
          }}
          placeholder="acme.com"
        />
        <p className="text-xs text-muted-foreground">We read this to learn about your business and pre-fill your brand voice.</p>
        {websiteError && <p className="text-xs text-destructive">{websiteError}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="gs-business-industry">Industry (optional)</Label>
        <Input id="gs-business-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="SaaS, ecommerce…" />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onSkip} disabled={mode === "new"}>
          Skip for now
        </Button>
        <Button onClick={save} disabled={saving || !name.trim() || !website.trim()}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {analyzing ? "Analyzing website…" : "Saving…"}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" /> Save & continue
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
