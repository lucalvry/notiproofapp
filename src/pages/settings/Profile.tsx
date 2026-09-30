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
];

export function SettingsLayout() {
  useLocation();
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">SET</div>
        <h1 className="text-3xl font-bold mt-1">Settings</h1>
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

  if (loading || !b) return <Skeleton className="h-64 w-full max-w-2xl" />;

  return (
    <div className="max-w-2xl space-y-4">
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
      <DomainsCard />
    </div>
  );
}
