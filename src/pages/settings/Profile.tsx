import { showAiFailureToast } from "@/components/onboarding/GuidedSetup/utils";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";
import { DomainsCard } from "@/components/settings/DomainsCard";
import { businessSettingsSchema, parseOrError } from "@/lib/validation";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { uploadToBunny } from "@/lib/bunny-upload";
import { Sparkles, Upload } from "lucide-react";
import { useRef } from "react";

type Business = Database["public"]["Tables"]["businesses"]["Row"] & {
  brand_color?: string | null;
  industry?: string | null;
  time_zone?: string | null;
  install_verified?: boolean;
};

interface BusinessSettings {
  industry?: string;
  brand_color?: string;
  time_zone?: string;
  install_verified?: boolean;
}

const tabs = [
  { to: "/settings", label: "Business", end: true },
  { to: "/settings/account", label: "My account" },
  { to: "/settings/team", label: "Team" },
  { to: "/settings/email", label: "Email" },
  { to: "/settings/brand-voice", label: "Brand voice" },
  
  { to: "/settings/content", label: "Content" },
  { to: "/settings/billing", label: "Billing" },
  { to: "/settings/referrals", label: "Referrals" },
];

export function SettingsLayout() {
  useLocation();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      <div className="border-b flex gap-4">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => cn("py-3 -mb-px border-b-2 text-sm font-medium transition-colors",
              isActive ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}

export default function ProfileSettings() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [b, setB] = useState<Business | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedProfile, setAnalyzedProfile] = useState<any | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentBusinessId) return;
    (supabase as any).from("businesses").select("*").eq("id", currentBusinessId).maybeSingle()
      .then(({ data }) => {
        setB(data as any);
        const rawSettings = ((data?.settings ?? {}) as BusinessSettings);
        setSettings({
          ...rawSettings,
          industry: (data as Business | null)?.industry ?? rawSettings.industry,
          brand_color: (data as Business | null)?.brand_color ?? rawSettings.brand_color,
          time_zone: (data as Business | null)?.time_zone ?? rawSettings.time_zone ?? "UTC",
          install_verified: (data as Business | null)?.install_verified ?? rawSettings.install_verified,
        });
        setLoading(false);
      });
  }, [currentBusinessId]);

  const save = async () => {
    if (!b) return;
    const parsed = parseOrError(businessSettingsSchema, {
      name: b.name,
      website_url: (b as any).website_url || undefined,
      industry: settings.industry || undefined,
      brand_color: settings.brand_color || undefined,
      time_zone: settings.time_zone || "UTC",
    });
    if (parsed.error) {
      return toast({ title: "Check your details", description: parsed.error, variant: "destructive" });
    }
    setSaving(true);
    const mergedSettings = { ...(((b as any).settings as BusinessSettings | null) ?? {}), ...settings };
    const { error } = await supabase.from("businesses").update({
      name: parsed.data.name,
      logo_url: b.logo_url,
      industry: parsed.data.industry ?? null,
      brand_color: parsed.data.brand_color ?? null,
      time_zone: parsed.data.time_zone ?? "UTC",
      settings: mergedSettings,
    } as any).eq("id", b.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };

  if (loading || !b) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="w-full space-y-4">
      <ReadOnlyBanner />
      <Card>
        <CardHeader><CardTitle className="text-base">Business profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Business name</Label><Input value={b.name} maxLength={120} onChange={(e) => setB({ ...b, name: e.target.value })} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Logo URL</Label><Input value={b.logo_url ?? ""} maxLength={2048} onChange={(e) => setB({ ...b, logo_url: e.target.value })} placeholder="https://…" disabled={!canEdit} /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Industry</Label><Input value={settings.industry ?? ""} maxLength={80} onChange={(e) => setSettings({ ...settings, industry: e.target.value })} placeholder="SaaS, ecommerce…" disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Brand color</Label><Input type="color" value={settings.brand_color ?? "#0EA5E9"} onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })} className="h-10 w-20 p-1" disabled={!canEdit} /></div>
          </div>
          <div className="space-y-2"><Label>Time zone</Label>
            <Select value={settings.time_zone ?? "UTC"} onValueChange={(v) => setSettings({ ...settings, time_zone: v })} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">America/New York</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los Angeles</SelectItem>
                <SelectItem value="Europe/London">Europe/London</SelectItem>
                <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end pt-2"><Button onClick={save} disabled={saving || !canEdit}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Shown in email previews and the business switcher.</p>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {b.logo_url ? <img src={b.logo_url} alt="Logo" className="h-full w-full object-contain" /> : null}
            </div>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => logoFileRef.current?.click()} disabled={!canEdit || uploadingLogo}>
                {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload logo
              </Button>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !b) return;
                  if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(file.type)) {
                    return toast({ title: "Unsupported image", description: "Use JPEG, PNG, WebP, GIF or SVG.", variant: "destructive" });
                  }
                  if (file.size > 2 * 1024 * 1024) {
                    return toast({ title: "Image too large", description: "Max 2 MB", variant: "destructive" });
                  }
                  setUploadingLogo(true);
                  try {
                    const url = await uploadToBunny({
                      kind: "assets",
                      folder: `logos/${b.id}`,
                      filename: `${Date.now()}_${file.name}`,
                      contentType: file.type,
                      blob: file,
                      businessId: b.id,
                    });
                    const { error } = await supabase.from("businesses").update({ logo_url: url } as any).eq("id", b.id);
                    if (error) throw error;
                    setB({ ...b, logo_url: url });
                    toast({ title: "Logo updated" });
                  } catch (err) {
                    toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
                  } finally {
                    setUploadingLogo(false);
                  }
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">PNG, JPG, WebP, GIF or SVG, up to 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Business DNA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Re-scan your website to refresh your industry, target audience, and brand voice suggestions. You can fine-tune everything under Brand voice.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canEdit || analyzing || !(b as any).website_url}
            onClick={async () => {
              if (!b || !(b as any).website_url) return;
              setAnalyzing(true);
              setAnalyzedProfile(null);
              try {
                const { data, error } = await supabase.functions.invoke("analyze-business-site", {
                  body: { business_id: b.id, url: (b as any).website_url },
                });
                if (error) throw error;
                if ((data as any)?.error === "ai_unavailable") {
                  if ((data as any)?.favicon_url) setB({ ...b, favicon_url: (data as any).favicon_url } as any);
                  showAiFailureToast(toast, (data as any)?.failure_id);
                  return;
                }
                if ((data as any)?.error) throw new Error((data as any).error);
                setAnalyzedProfile((data as any)?.profile ?? null);
                setB({ ...b, favicon_url: (data as any)?.favicon_url ?? b.logo_url, industry: (data as any)?.industry ?? b.industry } as any);
                setSettings({ ...settings, industry: (data as any)?.industry ?? settings.industry });
                toast({ title: "Website analyzed", description: "Review the extracted profile below, then adjust your brand voice." });
              } catch (err) {
                toast({ title: "Couldn't analyze website", description: (err as Error).message, variant: "destructive" });
              } finally {
                setAnalyzing(false);
              }
            }}
          >
            {analyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Analyze website
          </Button>
          {!(b as any).website_url && (
            <p className="text-xs text-destructive">Add a website above first.</p>
          )}
          {analyzedProfile && (
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <div><span className="font-medium">Industry: </span>{(b as any).industry || "—"}</div>
              {analyzedProfile.target_audience && <div><span className="font-medium">Target audience: </span>{analyzedProfile.target_audience}</div>}
              {analyzedProfile.problems_solved && <div><span className="font-medium">Problems solved: </span>{analyzedProfile.problems_solved}</div>}
              {analyzedProfile.how_customers_search && <div><span className="font-medium">How customers search: </span>{analyzedProfile.how_customers_search}</div>}
              {analyzedProfile.brand_tone && <div><span className="font-medium">Brand tone: </span>{analyzedProfile.brand_tone}</div>}
              {Array.isArray(analyzedProfile.words_to_use) && analyzedProfile.words_to_use.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">Words to use:</span>
                  {analyzedProfile.words_to_use.map((w: string) => <Badge key={w} variant="secondary">{w}</Badge>)}
                </div>
              )}
              {Array.isArray(analyzedProfile.words_to_avoid) && analyzedProfile.words_to_avoid.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">Words to avoid:</span>
                  {analyzedProfile.words_to_avoid.map((w: string) => <Badge key={w} variant="outline">{w}</Badge>)}
                </div>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Saved automatically. Fine-tune tone and word lists under Settings → Brand voice.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <DomainsCard />
    </div>
  );
}
