// Provider-specific connection panels for the four spec'd integrations:
// Google Reviews, Trustpilot, G2, Zapier. Renders nothing for other providers.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, RefreshCw, Star, Zap, Trash2, Upload, Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Integration = Database["public"]["Tables"]["integrations"]["Row"];

interface IntegrationCfg {
  webhook_secret?: string;
  field_map?: {
    author_name?: string;
    content?: string;
    rating?: string;
    media_url?: string;
  };
  place_id?: string;
  place_name?: string;
}

const SUPABASE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

function generateSecret() {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface Props {
  integration: Integration;
  onChanged: () => void;
}

export function ProviderConnectCard({ integration, onChanged }: Props) {
  const { toast } = useToast();
  // `provider` may not appear on the typed integration row depending on the
  // generated types; fall back to the platform field which always exists.
  const provider = ((integration as any).provider ?? (integration as any).platform) as string;
  if (
    provider !== "google_reviews" &&
    provider !== "trustpilot" &&
    provider !== "g2" &&
    provider !== "zapier"
  ) {
    return null;
  }

  const cfg = (integration.config ?? {}) as IntegrationCfg;
  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  if (provider === "google_reviews") return <GoogleReviewsCard integration={integration} onChanged={onChanged} />;
  if (provider === "trustpilot" || provider === "g2") {
    return <ReviewWebhookCard integration={integration} cfg={cfg} onChanged={onChanged} copy={copy} provider={provider} />;
  }
  return <ZapierCard integration={integration} cfg={cfg} onChanged={onChanged} copy={copy} />;
}

/* ─── Google Reviews ─────────────────────────────────────────────────────── */

interface GRSummary {
  place_id: string | null;
  place_name: string | null;
  has_byok_key: boolean;
  masked_byok_key: string | null;
  uses_platform_key: boolean;
  last_sync_at: string | null;
  review_count: number;
}

function GoogleReviewsCard({ integration, onChanged }: Props) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<GRSummary | null>(null);
  const [placeId, setPlaceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<"connect" | "sync" | "clear" | null>(null);

  const load = async () => {
    const { data } = await supabase.functions.invoke("integration-google-reviews", {
      body: { action: "summary", integration_id: integration.id },
    });
    if (data?.ok) setSummary(data as GRSummary);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration.id]);

  const connect = async () => {
    if (!placeId.trim()) return;
    setBusy("connect");
    const { data, error } = await supabase.functions.invoke("integration-google-reviews", {
      body: {
        action: "connect",
        integration_id: integration.id,
        place_id: placeId.trim(),
        api_key: apiKey.trim() || undefined,
      },
    });
    setBusy(null);
    if (error || !data?.ok) {
      return toast({
        title: "Couldn't connect",
        description: (data as any)?.details ?? error?.message ?? (data as any)?.error,
        variant: "destructive",
      });
    }
    toast({ title: "Place connected", description: data.place_name ?? data.place_id });
    setPlaceId("");
    setApiKey("");
    load();
    onChanged();
  };

  const sync = async () => {
    setBusy("sync");
    const { data, error } = await supabase.functions.invoke("integration-google-reviews", {
      body: { action: "sync", integration_id: integration.id },
    });
    setBusy(null);
    if (error || !data?.ok) {
      return toast({
        title: "Sync failed",
        description: (data as any)?.details ?? error?.message ?? (data as any)?.error,
        variant: "destructive",
      });
    }
    toast({
      title: `Imported ${data.imported}`,
      description: `${data.scanned} reviews scanned · ${data.skipped} skipped (already imported or empty)`,
    });
    load();
    onChanged();
  };

  const clear = async () => {
    setBusy("clear");
    await supabase.functions.invoke("integration-google-reviews", {
      body: { action: "clear", integration_id: integration.id },
    });
    setBusy(null);
    toast({ title: "Disconnected" });
    load();
    onChanged();
  };

  const isConnected = !!summary?.place_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="h-4 w-4 text-gold" /> Google Reviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Place</span>
                <span className="font-medium truncate">{summary?.place_name ?? summary?.place_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Place ID</span>
                <span className="font-mono text-xs truncate">{summary?.place_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">API key</span>
                <span className="font-mono text-xs">
                  {summary?.has_byok_key ? summary?.masked_byok_key : summary?.uses_platform_key ? "Platform key" : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Imported reviews</span>
                <span>{summary?.review_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last sync</span>
                <span>{summary?.last_sync_at ? new Date(summary.last_sync_at).toLocaleString() : "—"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={sync} disabled={busy !== null}>
                {busy === "sync" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Sync now
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={clear} disabled={busy !== null}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect place
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Google Places API returns the 5 most recent reviews per location.
              Run sync periodically to import new ones — duplicates are skipped automatically.
            </p>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Google Place ID</Label>
              <Input
                placeholder="ChIJ…"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
                disabled={busy !== null}
              />
              <p className="text-xs text-muted-foreground">
                Find your Place ID at{" "}
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  Google's Place ID Finder
                </a>.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Google Maps API key (optional)</Label>
              <Input
                type="password"
                placeholder="Leave blank to use platform key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={busy !== null}
              />
              <p className="text-xs text-muted-foreground">
                Bring your own key if you need control over quota or billing.
                Otherwise NotiProof's shared platform key is used.
              </p>
            </div>
            <Button onClick={connect} disabled={busy !== null || !placeId.trim()}>
              {busy === "connect" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Connect place
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Trustpilot / G2 (review webhook + paste import) ────────────────────── */

interface ReviewWebhookProps {
  integration: Integration;
  cfg: IntegrationCfg;
  provider: "trustpilot" | "g2";
  onChanged: () => void;
  copy: (text: string, label: string) => void;
}

const PROVIDER_META: Record<
  "trustpilot" | "g2",
  { label: string; placeholder: string; fnSlug: string; payloadExample: string; triggerHint: string }
> = {
  trustpilot: {
    label: "Trustpilot",
    placeholder: `[\n  {\n    "id": "abc123",\n    "stars": 5,\n    "title": "Great product",\n    "text": "Really happy with the service…",\n    "consumer": { "displayName": "Jane S." },\n    "createdAt": "2026-04-20T12:00:00Z"\n  }\n]`,
    fnSlug: "webhook-trustpilot",
    payloadExample: `{\n  "id": "{{review_id}}",\n  "stars": {{stars}},\n  "title": "{{title}}",\n  "text": "{{text}}",\n  "createdAt": "{{created_at}}",\n  "consumer": {\n    "displayName": "{{consumer_name}}",\n    "imageUrl": "{{consumer_image}}"\n  }\n}`,
    triggerHint: "Trustpilot → New Review (or the Trustpilot RSS feed on Free plans)",
  },
  g2: {
    label: "G2",
    placeholder: `[\n  {\n    "id": 7777,\n    "star_rating": 5,\n    "title": "Best in class",\n    "comment": "We've been using this tool for…",\n    "user": { "name": "Alex P." },\n    "submitted_at": "2026-04-21T09:00:00Z"\n  }\n]`,
    fnSlug: "webhook-g2",
    payloadExample: `{\n  "id": {{review_id}},\n  "star_rating": {{stars}},\n  "title": "{{title}}",\n  "comment": "{{comment}}",\n  "submitted_at": "{{submitted_at}}",\n  "user": { "name": "{{reviewer_name}}" }\n}`,
    triggerHint: "G2 → New Review (via G2's RSS feed or the G2 Review Stream API)",
  },
};

function ReviewWebhookCard({ integration, cfg, provider, onChanged, copy }: ReviewWebhookProps) {
  const { toast } = useToast();
  const meta = PROVIDER_META[provider];
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [rotating, setRotating] = useState(false);

  const secret = cfg.webhook_secret ?? "";
  const webhookUrl = secret
    ? `${SUPABASE_FN_URL}/${meta.fnSlug}?integration_id=${integration.id}&secret=${secret}`
    : "";

  const ensureSecret = async () => {
    if (secret) return;
    await rotateSecret();
  };

  const rotateSecret = async () => {
    setRotating(true);
    const next = generateSecret();
    const { error } = await supabase
      .from("integrations")
      .update({ config: { ...((integration.config ?? {}) as Record<string, any>), webhook_secret: next } as any })
      .eq("id", integration.id);
    setRotating(false);
    if (error) return toast({ title: "Couldn't rotate secret", description: error.message, variant: "destructive" });
    toast({ title: "Secret rotated", description: "Update any external systems using the previous URL." });
    onChanged();
  };

  const submitImport = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(importText); } catch {
      return toast({ title: "Invalid JSON", description: "Paste a JSON array of reviews.", variant: "destructive" });
    }
    const reviews = Array.isArray(parsed) ? parsed : [parsed];
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("integration-reviews-import", {
      body: { integration_id: integration.id, reviews, format: provider },
    });
    setImporting(false);
    if (error || !(data as any)?.ok) {
      return toast({
        title: "Import failed",
        description: (data as any)?.error ?? error?.message,
        variant: "destructive",
      });
    }
    toast({
      title: `Imported ${(data as any).imported}`,
      description: `${(data as any).skipped} skipped (duplicates or empty).`,
    });
    setImportOpen(false);
    setImportText("");
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{meta.label} connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!secret ? (
          <>
            <p className="text-sm text-muted-foreground">
              Generate a webhook URL to start receiving {meta.label} reviews, or import a batch by pasting JSON below.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={ensureSecret} disabled={rotating}>
                {rotating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Generate webhook URL
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" /> Paste reviews
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Webhook delivery URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(webhookUrl, "Webhook URL")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                POST a single review or {`{ "reviews": [...] }`} batch (max 50). Duplicate IDs are auto-skipped.
              </p>
            </div>
            <Accordion type="single" collapsible className="border-t pt-1">
              <AccordionItem value="how" className="border-none">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  How to connect
                </AccordionTrigger>
                <AccordionContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Option 1 — Zapier or Make (recommended)</p>
                    <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                      <li><span className="font-medium text-foreground">Trigger:</span> {meta.triggerHint}.</li>
                      <li><span className="font-medium text-foreground">Action:</span> Webhooks → POST → paste the URL above.</li>
                      <li><span className="font-medium text-foreground">Body:</span> send JSON in the shape below (map each <code className="text-xs">{`{{field}}`}</code> to the matching field from the trigger step).</li>
                    </ol>
                    <div className="relative">
                      <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-x-auto">{meta.payloadExample}</pre>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-7"
                        onClick={() => copy(meta.payloadExample, "Payload template")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Option 2 — Paste reviews (manual)</p>
                    <p className="text-muted-foreground">
                      Use the <span className="font-medium text-foreground">Paste reviews</span> button below to backfill a JSON export from your {meta.label} dashboard.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">Option 3 — Direct API</p>
                    <p className="text-muted-foreground">
                      Any server you control can POST to this URL — a single review object or{" "}
                      <code className="text-xs">{`{ "reviews": [...] }`}</code> (max 50 per call).
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground border-t pt-3">
                    New reviews land in <span className="font-medium text-foreground">Proof → Pending review</span> for approval. Duplicates by review ID are skipped automatically.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="h-3.5 w-3.5 mr-1" /> Paste reviews
              </Button>
              <Button variant="ghost" size="sm" onClick={rotateSecret} disabled={rotating} className="text-muted-foreground">
                {rotating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Rotate secret
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import {meta.label} reviews</DialogTitle>
            <DialogDescription>
              Paste a JSON array of up to 200 reviews. Duplicates are skipped automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={12}
            placeholder={meta.placeholder}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancel</Button>
            <Button onClick={submitImport} disabled={importing || !importText.trim()}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ─── Zapier ──────────────────────────────────────────────────────────────── */

interface ZapierCardProps {
  integration: Integration;
  cfg: IntegrationCfg;
  onChanged: () => void;
  copy: (text: string, label: string) => void;
}

function ZapierCard({ integration, cfg, onChanged, copy }: ZapierCardProps) {
  const { toast } = useToast();
  const [rotating, setRotating] = useState(false);
  const [savingMap, setSavingMap] = useState(false);
  const [authorPath, setAuthorPath] = useState(cfg.field_map?.author_name ?? "author_name");
  const [contentPath, setContentPath] = useState(cfg.field_map?.content ?? "content");
  const [ratingPath, setRatingPath] = useState(cfg.field_map?.rating ?? "rating");
  const [mediaPath, setMediaPath] = useState(cfg.field_map?.media_url ?? "media_url");

  const secret = cfg.webhook_secret ?? "";
  const webhookUrl = secret
    ? `${SUPABASE_FN_URL}/webhook-zapier?integration_id=${integration.id}&secret=${secret}`
    : "";

  const rotateSecret = async () => {
    setRotating(true);
    const next = generateSecret();
    const { error } = await supabase
      .from("integrations")
      .update({ config: { ...((integration.config ?? {}) as Record<string, any>), webhook_secret: next } as any })
      .eq("id", integration.id);
    setRotating(false);
    if (error) return toast({ title: "Couldn't rotate secret", description: error.message, variant: "destructive" });
    toast({ title: secret ? "Secret rotated" : "Webhook URL ready" });
    onChanged();
  };

  const saveMap = async () => {
    setSavingMap(true);
    const { error } = await supabase
      .from("integrations")
      .update({
        config: {
          ...((integration.config ?? {}) as Record<string, any>),
          field_map: {
            author_name: authorPath.trim() || "author_name",
            content: contentPath.trim() || "content",
            rating: ratingPath.trim() || "rating",
            media_url: mediaPath.trim() || "media_url",
          },
        } as any,
      })
      .eq("id", integration.id);
    setSavingMap(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Field mapping saved" });
    onChanged();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-gold" /> Zapier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!secret ? (
          <>
            <p className="text-sm text-muted-foreground">
              Generate a webhook URL, then paste it into a Zapier "Webhooks by Zapier → POST" action.
              Map any of your 5,000+ apps to NotiProof in minutes.
            </p>
            <Button onClick={rotateSecret} disabled={rotating}>
              {rotating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Generate webhook URL
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(webhookUrl, "Webhook URL")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Send a JSON POST with at minimum a <code>content</code> field. Add a <code>rating</code> (1-5) to mark it as a testimonial.
              </p>
            </div>

            <div className="border-t pt-4 space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Field mapping (optional)</Label>
              <p className="text-xs text-muted-foreground -mt-2">
                Use dotted paths like <code>data.author.name</code> if your payload nests fields.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Author name path</Label>
                  <Input value={authorPath} onChange={(e) => setAuthorPath(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Content path</Label>
                  <Input value={contentPath} onChange={(e) => setContentPath(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Rating path</Label>
                  <Input value={ratingPath} onChange={(e) => setRatingPath(e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Media URL path</Label>
                  <Input value={mediaPath} onChange={(e) => setMediaPath(e.target.value)} className="font-mono text-xs" />
                </div>
              </div>
              <Button size="sm" onClick={saveMap} disabled={savingMap}>
                {savingMap ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Save mapping
              </Button>
            </div>

            <div className="border-t pt-3">
              <Button variant="ghost" size="sm" onClick={rotateSecret} disabled={rotating} className="text-muted-foreground">
                {rotating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Rotate secret
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
