import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  Copy,
  ExternalLink,
  Lock,
  RefreshCw,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { WooCommerceConnectDialog } from "@/components/integrations/WooCommerceConnectDialog";
import { ProviderConnectCard } from "@/components/integrations/ProviderConnectCard";

type Integration = Database["public"]["Tables"]["integrations"]["Row"] & {
  provider?: string;
  last_sync_at?: string | null;
  auto_request_delay_days?: number | null;
  auto_request_delay_minutes?: number | null;
};
type Event = Database["public"]["Tables"]["integration_events"]["Row"];

interface IntegrationConfig {
  display_name?: string;
  auto_request_enabled?: boolean;
  auto_request_delay_minutes?: number;
  shop?: string;
}

const SUPABASE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export default function IntegrationDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);

  // WooCommerce-specific state
  const [wooSummary, setWooSummary] = useState<{
    has_credentials: boolean;
    masked_key: string | null;
    store_url: string;
    webhook_url: string;
    webhook_secret: string | null;
  } | null>(null);
  const [wooDialogOpen, setWooDialogOpen] = useState(false);
  const [wooBusy, setWooBusy] = useState<"test" | "backfill" | "clear" | "backfill_requests" | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [autoRequest, setAutoRequest] = useState(false);
  const [delayDays, setDelayDays] = useState("14");

  // Secure credential summary (masked) — never load the raw token to the browser.
  const [maskedToken, setMaskedToken] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [credBusy, setCredBusy] = useState(false);

  const loadEvents = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("integration_events")
      .select("*")
      .eq("integration_id", id)
      .order("received_at", { ascending: false })
      .limit(20);
    setEvents(data ?? []);
  };

  const loadCredSummary = async () => {
    if (!id) return;
    const { data } = await supabase.functions.invoke("integration-credentials", {
      body: { action: "summary", integration_id: id },
    });
    if (data?.ok) {
      setHasToken(!!data.has_token);
      setMaskedToken(data.masked_token ?? null);
    }
  };

  const loadWooSummary = async () => {
    if (!id) return;
    const { data } = await supabase.functions.invoke("integration-woocommerce", {
      body: { action: "summary", integration_id: id },
    });
    if (data?.ok) setWooSummary(data);
  };

  const refetch = async () => {
    if (!id || !currentBusinessId) return;
    const [i, e] = await Promise.all([
      (supabase as any)
        .from("integrations")
        .select("*")
        .eq("id", id)
        .eq("business_id", currentBusinessId)
        .maybeSingle(),
      supabase
        .from("integration_events")
        .select("*")
        .eq("integration_id", id)
        .order("received_at", { ascending: false })
        .limit(20),
    ]);
    if ((i as any).data) {
      const idata: any = (i as any).data;
      setIntegration(i.data as any);
      const cfg = (idata.config ?? {}) as IntegrationConfig;
      setDisplayName(cfg.display_name ?? "");
      setAutoRequest(!!idata.auto_request_enabled || !!cfg.auto_request_enabled);
      setDelayDays(String(idata.auto_request_delay_days ?? 14));
      setShopDomain(cfg.shop ?? "");
      if (idata.platform === "woocommerce" || idata.provider === "woocommerce") {
        loadWooSummary();
      }
    }
    setEvents(e.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    refetch();
    loadCredSummary();

    const channel = supabase
      .channel(`int-events-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "integration_events", filter: `integration_id=eq.${id}` },
        () => loadEvents(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, currentBusinessId]);

  const save = async () => {
    if (!integration) return;
    setSaving(true);
    const cfg = (integration.config ?? {}) as IntegrationConfig;
    const days = Math.max(0, Math.min(60, Number(delayDays) || 0));
    const { error } = await (supabase as any)
      .from("integrations")
      .update({
        auto_request_enabled: autoRequest,
        auto_request_delay_days: days,
        config: {
          ...cfg,
          display_name: displayName,
          // Mirror to config for legacy reads only.
          auto_request_enabled: autoRequest,
          auto_request_delay_minutes: days * 1440,
        },
      })
      .eq("id", integration.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Saved" });
  };

  const remove = async () => {
    if (!integration) return;
    const { error } = await supabase.from("integrations").delete().eq("id", integration.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    navigate("/integrations");
  };

  const setCredential = async () => {
    if (!integration || !newToken.trim()) return;
    setCredBusy(true);
    const { data, error } = await supabase.functions.invoke("integration-credentials", {
      body: { action: "set", integration_id: integration.id, access_token: newToken.trim() },
    });
    setCredBusy(false);
    if (error || !data?.ok) {
      return toast({
        title: "Could not save credential",
        description: error?.message ?? data?.error,
        variant: "destructive",
      });
    }
    setNewToken("");
    setHasToken(true);
    setMaskedToken(data.masked_token ?? null);
    toast({ title: "Credential saved", description: "Stored securely server-side." });
  };

  const clearCredential = async () => {
    if (!integration) return;
    setCredBusy(true);
    const { data, error } = await supabase.functions.invoke("integration-credentials", {
      body: { action: "clear", integration_id: integration.id },
    });
    setCredBusy(false);
    if (error || !data?.ok) {
      return toast({
        title: "Could not clear credential",
        description: error?.message ?? data?.error,
        variant: "destructive",
      });
    }
    setHasToken(false);
    setMaskedToken(null);
    toast({ title: "Credential cleared" });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const startShopifyOAuth = async () => {
    if (!integration) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("oauth-shopify-start", {
        body: { shop: shopDomain, integration_id: integration.id },
      });
      if (error || !data?.install_url) throw new Error(error?.message ?? "Failed to start OAuth");
      window.open(data.install_url, "_blank", "width=600,height=720");
    } catch (e: any) {
      toast({ title: "Connection failed", description: e.message, variant: "destructive" });
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full max-w-3xl" />;
  if (!integration) return <div className="text-muted-foreground">Integration not found.</div>;

  const isWoo = (integration as any).platform === "woocommerce" || (integration as any).provider === "woocommerce";

  const shopifyWebhookUrl = `${SUPABASE_FN_URL}/webhook-shopify?integration_id=${integration.id}`;

  // Build a 14-day event chart from the loaded events list.
  const days: { day: string; events: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), events: 0 });
  }
  const dayKey = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  events.forEach((e) => {
    const k = dayKey(e.received_at);
    const row = days.find((r) => r.day === k);
    if (row) row.events += 1;
  });
  const proofImported = events.filter((e) => !!e.proof_object_id).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
          <Link to="/integrations">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to integrations
          </Link>
        </Button>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">INT-02</div>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold capitalize">{integration.provider.replace("_", " ")}</h1>
          <Badge className="capitalize">{integration.status}</Badge>
        </div>
      </div>

      {/* Activity chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Activity (last 14 days)</span>
            <span className="text-xs font-normal text-muted-foreground">
              {proofImported} proof imported · {events.length} events
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No events yet.</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="events" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

{/* Stripe is internal billing only — not exposed as an integration in the UI. */}
{integration.provider === "stripe" && (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Stripe</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Stripe powers your NotiProof subscription billing. Manage your plan and payment method in{" "}
        <Link to="/settings/billing" className="text-accent underline">Billing settings</Link>.
      </p>
    </CardContent>
  </Card>
)}

      {integration.provider === "shopify" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shopify connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Shop domain</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="your-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                />
                <Button onClick={startShopifyOAuth} disabled={connecting || !shopDomain}>
                  {connecting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  {integration.status === "connected" ? "Reconnect" : "Connect"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                A new window will open for you to authorize NotiProof.
              </p>
            </div>
            <div className="border-t pt-3 space-y-2">
              <Label>Webhook URL (optional, for orders/create)</Label>
              <div className="flex gap-2">
                <Input readOnly value={shopifyWebhookUrl} className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => copy(shopifyWebhookUrl, "Webhook URL")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isWoo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">WooCommerce connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wooSummary?.has_credentials ? (
              <>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Store</span>
                    <span className="font-medium truncate">{wooSummary.store_url}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">REST API key</span>
                    <span className="font-mono text-xs">{wooSummary.masked_key}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Webhook delivery URL</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={wooSummary.webhook_url} className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={() => copy(wooSummary.webhook_url, "Webhook URL")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {wooSummary.webhook_secret && (
                  <div className="space-y-2">
                    <Label className="text-xs">Webhook secret</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={wooSummary.webhook_secret}
                        className="font-mono text-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copy(wooSummary.webhook_secret!, "Secret")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={wooBusy !== null}
                    onClick={async () => {
                      setWooBusy("test");
                      const { data } = await supabase.functions.invoke("integration-woocommerce", {
                        body: { action: "test", integration_id: integration.id },
                      });
                      setWooBusy(null);
                      if (data?.ok) toast({ title: "Connection OK" });
                      else toast({ title: "Connection failed", variant: "destructive" });
                    }}
                  >
                    {wooBusy === "test" ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    )}
                    Test connection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={wooBusy !== null}
                    onClick={async () => {
                      setWooBusy("backfill");
                      const { data, error } = await supabase.functions.invoke("integration-woocommerce", {
                        body: { action: "backfill", integration_id: integration.id },
                      });
                      setWooBusy(null);
                      if (error || !data?.ok) {
                        toast({
                          title: "Backfill failed",
                          description: error?.message ?? data?.error,
                          variant: "destructive",
                        });
                      } else {
                        const reqMsg = typeof data.requests_scheduled === "number"
                          ? ` · ${data.requests_scheduled} testimonial request${data.requests_scheduled === 1 ? "" : "s"} scheduled`
                          : "";
                        toast({
                          title: `Imported ${data.imported} order${data.imported === 1 ? "" : "s"}${reqMsg}`,
                        });
                        loadEvents();
                      }
                    }}
                  >
                    {wooBusy === "backfill" && (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    )}
                    Backfill last 30 days
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={wooBusy !== null}
                    onClick={async () => {
                      setWooBusy("backfill_requests");
                      const { data, error } = await supabase.functions.invoke("integration-woocommerce", {
                        body: { action: "backfill_requests", integration_id: integration.id },
                      });
                      setWooBusy(null);
                      if (error || !data?.ok) {
                        toast({
                          title: "Couldn't queue requests",
                          description: error?.message ?? data?.error ?? "Make sure auto-request is enabled.",
                          variant: "destructive",
                        });
                      } else {
                        const missing = data.missing_email ?? 0;
                        toast({
                          title: `${data.scheduled} testimonial request${data.scheduled === 1 ? "" : "s"} queued`,
                          description: missing > 0
                            ? `${missing} older proof${missing === 1 ? "" : "s"} have no email on file — open them and use "Request testimonial" to enter one.`
                            : undefined,
                        });
                      }
                    }}
                  >
                    {wooBusy === "backfill_requests" && (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    )}
                    Backfill missing requests
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    disabled={wooBusy !== null}
                    onClick={async () => {
                      setWooBusy("clear");
                      await supabase.functions.invoke("integration-woocommerce", {
                        body: { action: "clear", integration_id: integration.id },
                      });
                      setWooBusy(null);
                      toast({ title: "Disconnected" });
                      loadWooSummary();
                    }}
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  This WooCommerce integration isn't configured yet. Run the guided setup to
                  connect your store.
                </p>
                <Button onClick={() => setWooDialogOpen(true)}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Configure WooCommerce
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <ProviderConnectCard integration={integration} onChanged={refetch} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="flex items-start justify-between gap-4 border-t pt-4">
            <div>
              <Label>Auto-request testimonials</Label>
              <div className="text-xs text-muted-foreground">
                Send a request automatically after qualifying events.
              </div>
            </div>
            <Switch checked={autoRequest} onCheckedChange={setAutoRequest} />
          </div>

          {autoRequest && (
            <div className="space-y-2">
              <Label>Delay before sending (days)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default 14 days. Range: 0–60. The customer's email is captured
                from the order and a testimonial request is queued for sending.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {integration.provider !== "shopify" &&
        integration.provider !== "stripe" &&
        integration.provider !== "woocommerce" &&
        integration.provider !== "google_reviews" &&
        integration.provider !== "trustpilot" &&
        integration.provider !== "g2" &&
        integration.provider !== "zapier" &&
        !isWoo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Tokens are stored server-side only. The browser never sees the saved value.
            </p>
            {hasToken && (
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-medium">Token saved</div>
                  <div className="text-xs text-muted-foreground font-mono">{maskedToken ?? "••••"}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={clearCredential}
                  disabled={credBusy}
                >
                  Clear
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>{hasToken ? "Replace token" : "Access token / API key"}</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder="sk_…"
                />
                <Button onClick={setCredential} disabled={credBusy || !newToken.trim()}>
                  {credBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No events received yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">{e.event_type}</TableCell>
                    <TableCell>
                      {e.processed_at ? (
                        <Badge variant="default">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(e.received_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect this integration?</AlertDialogTitle>
              <AlertDialogDescription>
                Events will stop flowing into NotiProof.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save
        </Button>
      </div>

      <WooCommerceConnectDialog
        open={wooDialogOpen}
        integrationId={integration.id}
        onOpenChange={setWooDialogOpen}
        onConnected={() => {
          loadWooSummary();
        }}
      />
    </div>
  );
}
