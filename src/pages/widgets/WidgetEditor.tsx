import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Code, Lock } from "lucide-react";
import { PreviewRender, type WidgetConfig as SharedWidgetConfig } from "@/components/widgets/PreviewRender";
import type { Database } from "@/integrations/supabase/types";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";
import { widgetEditorSchema, fieldErrors } from "@/lib/validation";

type Widget = Database["public"]["Tables"]["widgets"]["Row"] & {
  type?: string;
  target_url?: string | null;
  frequency_cap_per_user?: number | null;
  load_delay_ms?: number | null;
};
type WidgetType = Database["public"]["Enums"]["widget_type"];
type Proof = Database["public"]["Tables"]["proof_objects"]["Row"];
type Json = Database["public"]["Tables"]["widgets"]["Row"]["config"];
const db = supabase as any;

type Variant =
  | "floating"
  | "inline"
  | "badge"
  | "banner"
  | "wall"
  | "carousel"
  | "marquee"
  | "masonry"
  | "avatar_row"
  | "video_hero"
  | "logo_strip";

interface WidgetConfig extends SharedWidgetConfig {
  // Display rules
  url_filter_mode?: "all" | "include" | "exclude";
  url_patterns?: string;
  visitor_type?: "all" | "new" | "returning";
  load_delay?: number; // seconds
  frequency_cap?: number; // per visitor per day
  cooldown_seconds?: number; // min seconds between shows for the same visitor
  // Proof source
  source_filter?: "all" | "selected";
  selected_proof_ids?: string[];
  rotation?: "newest" | "random" | "rating";
  // Default CTA fallbacks
  default_cta_label?: string;
  default_cta_url?: string;
  // A/B
  ab_enabled?: boolean;
  ab_variant_label?: string;
  ab_split?: number; // 0–100, share routed to variant B
  /** Spec WID-02: "Auto-select winner after N impressions." */
  ab_winner_threshold?: number;
  /** Set by the cleanup-widget-events cron when a winner is auto-promoted. */
  ab_winner?: "A" | "B";
  ab_winner_decided_at?: string;
  ab_winner_ctr_a?: number;
  ab_winner_ctr_b?: number;
  variant_b?: Partial<WidgetConfig>;
}

const variantToType: Record<Variant, WidgetType> = {
  floating: "popup",
  inline: "inline",
  badge: "banner",
  banner: "banner",
  wall: "wall",
  carousel: "carousel",
  marquee: "marquee",
  masonry: "masonry",
  avatar_row: "avatar_row",
  video_hero: "video_hero",
  logo_strip: "logo_strip",
};

/** Variants that mount inline at a placeholder rather than as a global overlay. */
const EMBEDDED_VARIANTS: Variant[] = [
  "inline",
  "carousel",
  "marquee",
  "masonry",
  "avatar_row",
  "video_hero",
  "logo_strip",
];

export default function WidgetEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const { currentBusinessId, businesses, currentBusinessRole } = useAuth();
  const business = businesses.find((b) => b.id === currentBusinessId);
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  // Treat anything not on a paid plan as free for the powered-by lock.
  // We don't have plan in BusinessSummary, so use businesses table later if needed.
  const isFreePlan = true;
  void business;

  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [abStats, setAbStats] = useState<{
    A: { impressions: number; interactions: number };
    B: { impressions: number; interactions: number };
  } | null>(null);
  const [w, setW] = useState<Partial<Widget>>({
    name: "Untitled widget",
    type: "popup",
    status: "draft",
    config: {
      variant: "floating",
      position: "bottom-left",
      interval_seconds: 6,
      show_avatar: true,
      show_rating: true,
      url_filter_mode: "all",
      visitor_type: "all",
      load_delay: 0,
      frequency_cap: 0,
      cooldown_seconds: 30,
      source_filter: "all",
      rotation: "newest",
      ab_enabled: false,
      powered_by: true,
    } as unknown as Json,
  });
  const [sample, setSample] = useState<Proof | null>(null);
  const [approvedProofs, setApprovedProofs] = useState<Proof[]>([]);

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    db.from("widgets").select("*").eq("id", id).eq("business_id", currentBusinessId).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
        if (data) setW(data);
        setLoading(false);
      });
  }, [id, currentBusinessId, toast]);

  useEffect(() => {
    if (!currentBusinessId) return;
    db.from("proof_objects").select("*").eq("business_id", currentBusinessId).eq("status", "approved").order("created_at", { ascending: false })
      .then(({ data }) => {
        setApprovedProofs(data ?? []);
        setSample(data?.[0] ?? null);
      });
  }, [currentBusinessId]);

  // Load A/B variant stats for the last 14 days when enabled.
  useEffect(() => {
    if (!id || !currentBusinessId || !(w.config as WidgetConfig | undefined)?.ab_enabled) {
      setAbStats(null);
      return;
    }
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    db
      .from("widget_events")
      .select("event_type, variant")
      .eq("business_id", currentBusinessId)
      .eq("widget_id", id)
      .gte("fired_at", since)
      .in("event_type", ["impression", "interaction"])
      .limit(10000)
      .then(({ data }) => {
        const acc = {
          A: { impressions: 0, interactions: 0 },
          B: { impressions: 0, interactions: 0 },
        };
        (data ?? []).forEach((row: any) => {
          const v = (row.variant as "A" | "B" | null) ?? "A";
          if (v !== "A" && v !== "B") return;
          if (row.event_type === "impression") acc[v].impressions++;
          else if (row.event_type === "interaction") acc[v].interactions++;
        });
        setAbStats(acc);
      });
  }, [id, currentBusinessId, (w.config as WidgetConfig | undefined)?.ab_enabled]);

  const cfg = (w.config ?? {}) as WidgetConfig;
  const updateConfig = (patch: Partial<WidgetConfig>) =>
    setW({ ...w, config: { ...cfg, ...patch } as unknown as Json });
  const variant = (cfg.variant ?? "floating") as Variant;

  const setVariant = (v: Variant) => {
    setW({ ...w, type: variantToType[v], config: { ...cfg, variant: v } as unknown as Json });
  };

  const toggleSelectedProof = (proofId: string) => {
    const cur = new Set(cfg.selected_proof_ids ?? []);
    if (cur.has(proofId)) cur.delete(proofId); else cur.add(proofId);
    updateConfig({ selected_proof_ids: Array.from(cur) });
  };

  const save = async () => {
    if (!currentBusinessId || !w.name) return;
    const validated = fieldErrors(widgetEditorSchema, {
      name: w.name,
      target_url: w.target_url ?? "",
      frequency_cap_per_user: w.frequency_cap_per_user ?? 0,
      load_delay_ms: w.load_delay_ms ?? 0,
    });
    if (!validated.ok) {
      const first = Object.values(validated.errors)[0] ?? "Check the highlighted fields";
      return toast({ title: "Check widget settings", description: first, variant: "destructive" });
    }
    // Free plan forces powered_by on
    const finalConfig = isFreePlan ? { ...cfg, powered_by: true } : cfg;
    setSaving(true);
    if (isNew) {
      const { data, error } = await db.from("widgets").insert({
        business_id: currentBusinessId,
        name: validated.data.name,
        type: w.type ?? "popup",
        status: w.status ?? "draft",
        config: finalConfig as unknown as Json,
      }).select("id").single();
      setSaving(false);
      if (error || !data) return toast({ title: "Save failed", description: error?.message, variant: "destructive" });
      toast({ title: "Widget created" });
      navigate(`/widgets/${data.id}/edit`, { replace: true });
    } else {
      const { error } = await db.from("widgets").update({
        name: validated.data.name, type: w.type, status: w.status, config: finalConfig as unknown as Json,
      }).eq("id", id!);
      setSaving(false);
      if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
      toast({ title: "Saved" });
    }
  };

  if (loading) return <div className="space-y-4 max-w-5xl"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  const widgetIdForSnippet = id ?? "WIDGET_ID";
  const scriptSnippet = `<script async src="${window.location.origin}/widget.js" data-business="${currentBusinessId}" data-widget="${widgetIdForSnippet}"></script>`;
  const placeholderSnippet = `<div data-notiproof-inline data-widget="${widgetIdForSnippet}"></div>`;
  const isEmbedded = EMBEDDED_VARIANTS.includes(variant);

  return (
    <div className="space-y-6 animate-fade-in">
      <ReadOnlyBanner />
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/widgets"><ArrowLeft className="h-4 w-4 mr-1" /> Back to widgets</Link></Button>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">WID-02</div>
          <h1 className="text-3xl font-bold mt-1">{isNew ? "New widget" : canEdit ? "Edit widget" : "View widget"}</h1>
        </div>
        <Button onClick={save} disabled={saving || !canEdit}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="general">
              <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="general" className="text-xs sm:text-sm">General</TabsTrigger>
                <TabsTrigger value="design" className="text-xs sm:text-sm">Design</TabsTrigger>
                <TabsTrigger value="rules" className="text-xs sm:text-sm">Rules</TabsTrigger>
                <TabsTrigger value="source" className="text-xs sm:text-sm">Source</TabsTrigger>
                <TabsTrigger value="install" className="text-xs sm:text-sm">Install</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Name</Label><Input value={w.name ?? ""} onChange={(e) => setW({ ...w, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Widget type</Label>
                  <Select value={variant} onValueChange={(v) => setVariant(v as Variant)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Notifications</div>
                      <SelectItem value="floating">Floating popup</SelectItem>
                      <SelectItem value="banner">Top banner</SelectItem>
                      <SelectItem value="wall">Wall (badge + popup)</SelectItem>
                      <SelectItem value="badge">Badge</SelectItem>
                      <div className="px-2 py-1 mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Embedded</div>
                      <SelectItem value="inline">Inline single</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="marquee">Marquee</SelectItem>
                      <SelectItem value="masonry">Wall / Masonry</SelectItem>
                      <SelectItem value="avatar_row">Avatar row</SelectItem>
                      <SelectItem value="video_hero">Video hero</SelectItem>
                      <SelectItem value="logo_strip">Logo strip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select value={w.status} onValueChange={(v) => setW({ ...w, status: v as Widget["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>A/B test variant</Label>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Beta</span>
                    </div>
                    <Switch checked={!!cfg.ab_enabled} onCheckedChange={(c) => updateConfig({ ab_enabled: c })} />
                  </div>
                  {cfg.ab_winner && (
                    <div className="rounded-md border border-teal/40 bg-teal/5 p-3 text-xs">
                      <div className="font-semibold text-teal mb-0.5">
                        Variant {cfg.ab_winner} promoted to winner
                      </div>
                      <div className="text-muted-foreground">
                        {cfg.ab_winner_decided_at
                          ? `Auto-selected on ${new Date(cfg.ab_winner_decided_at).toLocaleDateString()}.`
                          : "Auto-selected by the cleanup job."}
                        {typeof cfg.ab_winner_ctr_a === "number" && typeof cfg.ab_winner_ctr_b === "number" && (
                          <> CTR A {(cfg.ab_winner_ctr_a * 100).toFixed(1)}% vs B {(cfg.ab_winner_ctr_b * 100).toFixed(1)}%.</>
                        )}
                      </div>
                    </div>
                  )}
                  {cfg.ab_enabled && (
                    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Traffic split (% to Variant B)</Label>
                          <span className="text-xs text-muted-foreground">{cfg.ab_split ?? 50}%</span>
                        </div>
                        <Slider
                          min={0}
                          max={100}
                          step={10}
                          value={[cfg.ab_split ?? 50]}
                          onValueChange={([v]) => updateConfig({ ab_split: v })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Variant B overrides</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Position</Label>
                            <Select
                              value={(cfg.variant_b?.position as string) ?? cfg.position ?? "bottom-left"}
                              onValueChange={(v) =>
                                updateConfig({ variant_b: { ...(cfg.variant_b ?? {}), position: v } })
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="bottom-left">Bottom left</SelectItem>
                                <SelectItem value="bottom-right">Bottom right</SelectItem>
                                <SelectItem value="top-left">Top left</SelectItem>
                                <SelectItem value="top-right">Top right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Interval (s)</Label>
                            <Input
                              type="number"
                              min={2}
                              max={60}
                              value={cfg.variant_b?.interval_seconds ?? cfg.interval_seconds ?? 6}
                              onChange={(e) =>
                                updateConfig({
                                  variant_b: { ...(cfg.variant_b ?? {}), interval_seconds: Number(e.target.value) },
                                })
                              }
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Visitors are bucketed deterministically by visitor id. Promote the winner manually once data is in.
                        </p>
                      </div>

                      {/* Auto-pick winner threshold (spec WID-02) */}
                      <div className="space-y-1.5 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Auto-suggest winner after</Label>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {cfg.ab_winner_threshold ?? 1000} impressions / variant
                          </span>
                        </div>
                        <Slider
                          min={100}
                          max={5000}
                          step={100}
                          value={[cfg.ab_winner_threshold ?? 1000]}
                          onValueChange={([v]) => updateConfig({ ab_winner_threshold: v })}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Once both variants pass this threshold the higher-CTR variant is highlighted below for one-click promotion.
                        </p>
                      </div>

                      {/* Results strip — last 14 days */}
                      {abStats && (() => {
                        const rate = (s: { impressions: number; interactions: number }) =>
                          s.impressions > 0 ? (s.interactions / s.impressions) * 100 : 0;
                        const rA = rate(abStats.A);
                        const rB = rate(abStats.B);
                        const totalImpr = abStats.A.impressions + abStats.B.impressions;
                        const threshold = cfg.ab_winner_threshold ?? 1000;
                        const bothPastThreshold =
                          abStats.A.impressions >= threshold && abStats.B.impressions >= threshold;
                        const winner: "A" | "B" | null = bothPastThreshold
                          ? rB > rA
                            ? "B"
                            : rA > rB
                              ? "A"
                              : null
                          : null;
                        return (
                          <div className="space-y-2 border-t pt-3">
                            <Label className="text-xs">Results — last 14 days</Label>
                            {totalImpr === 0 ? (
                              <p className="text-[11px] text-muted-foreground">
                                No traffic recorded yet. Activate the widget and wait for impressions.
                              </p>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {(["A", "B"] as const).map((v) => {
                                    const s = abStats[v];
                                    const r = v === "A" ? rA : rB;
                                    const isWinner = winner === v;
                                    return (
                                      <div
                                        key={v}
                                        className={
                                          "rounded-md border bg-background p-2 " +
                                          (isWinner ? "border-accent ring-1 ring-accent/40" : "")
                                        }
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-semibold">
                                            Variant {v}
                                            {isWinner && (
                                              <span className="ml-1 text-[10px] uppercase tracking-wider text-accent">
                                                winner
                                              </span>
                                            )}
                                          </span>
                                          <span className="text-muted-foreground tabular-nums">
                                            {r.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                                          {s.impressions.toLocaleString()} impr · {s.interactions.toLocaleString()} int
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                {bothPastThreshold && winner && (
                                  <p className="text-[11px] text-accent">
                                    Both variants passed {threshold.toLocaleString()} impressions. Variant {winner} is winning by{" "}
                                    {Math.abs(rA - rB).toFixed(1)} pts.
                                  </p>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={!canEdit || (rB <= rA && abStats.B.impressions > 0)}
                                  onClick={() => {
                                    const overrides = (cfg.variant_b ?? {}) as Partial<WidgetConfig>;
                                    if (Object.keys(overrides).length === 0) {
                                      toast({ title: "No Variant B overrides to promote" });
                                      return;
                                    }
                                    updateConfig({
                                      ...overrides,
                                      ab_enabled: false,
                                      variant_b: undefined,
                                      ab_split: undefined,
                                    });
                                    toast({
                                      title: "Variant B promoted",
                                      description: "Settings copied to base config. Save to apply.",
                                    });
                                  }}
                                  className="w-full"
                                >
                                  Promote Variant B as winner
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <Label>"Powered by NotiProof"</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{isFreePlan ? "Required on the free plan" : "Show a small attribution"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFreePlan && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      <Switch checked={isFreePlan ? true : cfg.powered_by !== false} disabled={isFreePlan} onCheckedChange={(c) => updateConfig({ powered_by: c })} />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 mt-4">
                {variant === "floating" && (
                  <>
                    <div className="space-y-2"><Label>Position</Label>
                      <Select value={cfg.position ?? "bottom-left"} onValueChange={(v) => updateConfig({ position: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Rotation interval (seconds)</Label>
                      <Input type="number" min={2} max={60} value={cfg.interval_seconds ?? 6} onChange={(e) => updateConfig({ interval_seconds: Number(e.target.value) })} />
                    </div>
                  </>
                )}
                {variant === "carousel" && (
                  <>
                    <div className="space-y-2"><Label>Cards visible at once</Label>
                      <Select value={String(cfg.card_count ?? 1)} onValueChange={(v) => updateConfig({ card_count: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 card</SelectItem>
                          <SelectItem value="2">2 cards</SelectItem>
                          <SelectItem value="3">3 cards</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Autoplay</Label>
                      <Switch checked={cfg.autoplay !== false} onCheckedChange={(c) => updateConfig({ autoplay: c })} />
                    </div>
                    {cfg.autoplay !== false && (
                      <div className="space-y-2"><Label>Autoplay interval (seconds)</Label>
                        <Input type="number" min={2} max={30} value={cfg.interval_seconds ?? 5} onChange={(e) => updateConfig({ interval_seconds: Number(e.target.value) })} />
                      </div>
                    )}
                  </>
                )}
                {variant === "marquee" && (
                  <>
                    <div className="space-y-2"><Label>Direction</Label>
                      <Select value={cfg.direction ?? "left"} onValueChange={(v) => updateConfig({ direction: v as "left" | "right" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Right → Left</SelectItem>
                          <SelectItem value="right">Left → Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Speed</Label>
                      <Select value={cfg.speed ?? "normal"} onValueChange={(v) => updateConfig({ speed: v as "slow" | "normal" | "fast" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="slow">Slow</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="fast">Fast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {variant === "masonry" && (
                  <div className="space-y-2"><Label>Columns</Label>
                    <Select value={String(cfg.columns ?? 3)} onValueChange={(v) => updateConfig({ columns: Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 columns</SelectItem>
                        <SelectItem value="3">3 columns</SelectItem>
                        <SelectItem value="4">4 columns</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Falls back to fewer columns on narrow screens.</p>
                  </div>
                )}
                {(variant === "carousel" || variant === "masonry") && (
                  <div className="space-y-2"><Label>Style preset</Label>
                    <Select value={cfg.style_preset ?? "soft"} onValueChange={(v) => updateConfig({ style_preset: v as "soft" | "bold" | "minimal" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft">Soft</SelectItem>
                        <SelectItem value="bold">Bold</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {variant === "logo_strip" && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Grayscale logos</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Logos fade to color on hover.</p>
                    </div>
                    <Switch checked={cfg.logo_grayscale !== false} onCheckedChange={(c) => updateConfig({ logo_grayscale: c })} />
                  </div>
                )}
                <div className="flex items-center justify-between"><Label>Show avatar</Label><Switch checked={cfg.show_avatar !== false} onCheckedChange={(c) => updateConfig({ show_avatar: c })} /></div>
                <div className="flex items-center justify-between"><Label>Show rating</Label><Switch checked={cfg.show_rating !== false} onCheckedChange={(c) => updateConfig({ show_rating: c })} /></div>
                <div className="space-y-2"><Label>Brand color</Label><Input type="color" value={cfg.brand_color ?? "#0EA5E9"} onChange={(e) => updateConfig({ brand_color: e.target.value })} className="h-10 w-20 p-1" /></div>
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label>Default CTA</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Used when a proof doesn't have its own call-to-action. If left blank, the business website is used.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default CTA label</Label>
                    <Input
                      value={cfg.default_cta_label ?? ""}
                      onChange={(e) => updateConfig({ default_cta_label: e.target.value })}
                      placeholder="Learn more"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Default CTA URL</Label>
                    <Input
                      type="url"
                      value={cfg.default_cta_url ?? ""}
                      onChange={(e) => updateConfig({ default_cta_url: e.target.value })}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>URL filtering</Label>
                  <Select value={cfg.url_filter_mode ?? "all"} onValueChange={(v) => updateConfig({ url_filter_mode: v as WidgetConfig["url_filter_mode"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show on all pages</SelectItem>
                      <SelectItem value="include">Only on pages matching…</SelectItem>
                      <SelectItem value="exclude">Hide on pages matching…</SelectItem>
                    </SelectContent>
                  </Select>
                  {cfg.url_filter_mode && cfg.url_filter_mode !== "all" && (
                    <Textarea
                      rows={3}
                      placeholder={"/checkout/*\n/pricing"}
                      value={cfg.url_patterns ?? ""}
                      onChange={(e) => updateConfig({ url_patterns: e.target.value })}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">One pattern per line. Use <code>*</code> as a wildcard.</p>
                </div>
                <div className="space-y-2">
                  <Label>Visitor type</Label>
                  <Select value={cfg.visitor_type ?? "all"} onValueChange={(v) => updateConfig({ visitor_type: v as WidgetConfig["visitor_type"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All visitors</SelectItem>
                      <SelectItem value="new">New visitors only</SelectItem>
                      <SelectItem value="returning">Returning visitors only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Load delay</Label><span className="text-xs text-muted-foreground">{cfg.load_delay ?? 0}s</span></div>
                  <Slider min={0} max={30} step={1} value={[cfg.load_delay ?? 0]} onValueChange={([v]) => updateConfig({ load_delay: v })} />
                </div>
                <div className="space-y-2">
                  <Label>Frequency cap (per visitor per day)</Label>
                  <Input type="number" min={0} value={cfg.frequency_cap ?? 0} onChange={(e) => updateConfig({ frequency_cap: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">0 = no cap.</p>
                </div>
                <div className="space-y-2">
                  <Label>Cooldown between shows (seconds)</Label>
                  <Input type="number" min={0} max={3600} value={cfg.cooldown_seconds ?? 30} onChange={(e) => updateConfig({ cooldown_seconds: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Wait time before the same visitor sees the next proof. 0 = no cooldown.</p>
                </div>
              </TabsContent>

              <TabsContent value="source" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Which proofs feed this widget?</Label>
                  <Select value={cfg.source_filter ?? "all"} onValueChange={(v) => updateConfig({ source_filter: v as WidgetConfig["source_filter"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All approved proofs</SelectItem>
                      <SelectItem value="selected">Only selected proofs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rotation</Label>
                  <Select value={cfg.rotation ?? "newest"} onValueChange={(v) => updateConfig({ rotation: v as WidgetConfig["rotation"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="rating">Highest rating first</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cfg.source_filter === "selected" && (
                  <div className="space-y-2">
                    <Label>Select proofs ({(cfg.selected_proof_ids ?? []).length} chosen)</Label>
                    <div className="border rounded-md max-h-64 overflow-y-auto divide-y">
                      {approvedProofs.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No approved proofs yet.</p>
                      ) : (
                        approvedProofs.map((p) => (
                          <label key={p.id} className="flex items-start gap-2 p-3 cursor-pointer hover:bg-muted/40">
                            <Checkbox
                              checked={(cfg.selected_proof_ids ?? []).includes(p.id)}
                              onCheckedChange={() => toggleSelectedProof(p.id)}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{p.author_name ?? "Anonymous"}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{p.content}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="install" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-sm">1. Loader script</Label>
                  <p className="text-xs text-muted-foreground">Paste once before <code className="bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code> on every page where this widget should appear.</p>
                  <pre className="bg-secondary text-foreground text-xs p-4 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all">{scriptSnippet}</pre>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(scriptSnippet); toast({ title: "Copied" }); }}><Code className="h-3.5 w-3.5 mr-1" /> Copy script</Button>
                </div>
                {isEmbedded && (
                  <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm">2. Placement</Label>
                    <p className="text-xs text-muted-foreground">Drop this placeholder where the widget should render in the page (e.g. inside your homepage, pricing page, etc.).</p>
                    <pre className="bg-secondary text-foreground text-xs p-4 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all">{placeholderSnippet}</pre>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(placeholderSnippet); toast({ title: "Copied" }); }}><Code className="h-3.5 w-3.5 mr-1" /> Copy placement</Button>
                  </div>
                )}
                {!isEmbedded && (
                  <p className="text-xs text-muted-foreground border-t pt-4">This widget overlays the page automatically — no placeholder needed.</p>
                )}
                <p className="text-[11px] text-muted-foreground border-t pt-4">
                  Need different styles in different places? <Link to="/widgets" className="underline">Create one widget per placement</Link> — each gets its own embed snippet.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="bg-secondary/30 sticky top-20 self-start">
          <CardContent className="pt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono mb-3">Live preview</div>
            <div className="bg-card rounded-lg border h-96 flex items-center justify-center relative overflow-hidden">
              <PreviewRender
                variant={variant}
                cfg={{ ...cfg, review_count: approvedProofs.length }}
                sample={sample}
                samples={approvedProofs}
                showPoweredBy={isFreePlan ? true : cfg.powered_by !== false}
              />
            </div>
            {approvedProofs.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                No approved proof yet. <Link to="/proof" className="text-foreground underline underline-offset-2 hover:no-underline">Add your first proof →</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
