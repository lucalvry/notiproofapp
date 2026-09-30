import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Settings as SettingsIcon, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";
import { WooCommerceConnectDialog } from "@/components/integrations/WooCommerceConnectDialog";

type Integration = Database["public"]["Tables"]["integrations"]["Row"] & {
  provider?: string;
  last_sync_at?: string | null;
  auto_request_delay_days?: number | null;
  auto_request_delay_minutes?: number | null;
};
type Provider =
  | "stripe"
  | "shopify"
  | "woocommerce"
  | "gumroad"
  | "webhook"
  | "zapier"
  | "google_reviews"
  | "trustpilot"
  | "g2"
  | "plaid"
  | "wordpress";

const db = supabase as any;

const providerLabels: Record<Provider, string> = {
  stripe: "Stripe",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  gumroad: "Gumroad",
  webhook: "Webhook",
  zapier: "Zapier",
  google_reviews: "Google Reviews",
  trustpilot: "Trustpilot",
  g2: "G2",
  plaid: "Plaid",
  wordpress: "WordPress",
};

const providerColors: Record<string, string> = {
  stripe: "bg-purple/15 text-purple",
  shopify: "bg-success/15 text-success",
  woocommerce: "bg-accent/15 text-accent",
  google_reviews: "bg-gold/15 text-gold",
  trustpilot: "bg-teal/15 text-teal",
  webhook: "bg-muted text-foreground",
  zapier: "bg-gold/15 text-gold",
  g2: "bg-destructive/15 text-destructive",
  gumroad: "bg-pink/15 text-pink",
  plaid: "bg-accent/15 text-accent",
  wordpress: "bg-accent/15 text-accent",
};

function ProviderMark({ id, label }: { id: string; label: string }) {
  return (
    <div
      className={`h-10 w-10 rounded-md flex items-center justify-center font-bold text-sm ${
        providerColors[id] ?? "bg-accent/10 text-accent"
      }`}
      aria-hidden
    >
      {label.slice(0, 2).toUpperCase()}
    </div>
  );
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  pending: "secondary",
  error: "destructive",
  disconnected: "outline",
};

interface AvailableEntry {
  id: Provider;
  label: string;
  description: string;
  comingSoon?: boolean;
}

// Stripe is intentionally excluded — it's used internally for NotiProof's own
// subscription billing (see /settings/billing), not as a customer-facing integration.
const available: AvailableEntry[] = [
  { id: "shopify", label: "Shopify", description: "Orders and reviews" },
  { id: "woocommerce", label: "WooCommerce", description: "WordPress store events" },
  { id: "google_reviews", label: "Google Reviews", description: "Public reviews" },
  { id: "trustpilot", label: "Trustpilot", description: "Customer reviews" },
  { id: "g2", label: "G2", description: "B2B software reviews" },
  { id: "zapier", label: "Zapier", description: "5,000+ app triggers" },
  { id: "webhook", label: "Webhook", description: "Custom event source" },
];

interface IntegrationStat {
  integration_id: string;
  proof_count: number;
  events_total: number;
  last_event_at: string | null;
}

export default function IntegrationsList() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [items, setItems] = useState<Integration[]>([]);
  const [stats, setStats] = useState<Map<string, IntegrationStat>>(new Map());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Provider | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [wooOpen, setWooOpen] = useState(false);
  const [wooIntegrationId, setWooIntegrationId] = useState<string | null>(null);

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const [{ data, error }, statsRes] = await Promise.all([
      (supabase as any)
        .from("integrations")
        .select("*")
        .eq("business_id", currentBusinessId)
        .order("created_at", { ascending: false }),
      db.rpc("business_integration_stats", { _business_id: currentBusinessId }),
    ]);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setItems(((data ?? []) as any[]).filter((i: any) => (i.provider ?? i.platform) !== "stripe"));
    const map = new Map<string, IntegrationStat>();
    ((statsRes.data ?? []) as IntegrationStat[]).forEach((s) => map.set(s.integration_id, s));
    setStats(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  const addIntegration = async (provider: Provider) => {
    if (!currentBusinessId) return;
    setAdding(provider);
    const { error } = await supabase
      .from("integrations")
      .insert({ business_id: currentBusinessId, platform: provider, status: "pending" } as any);
    setAdding(null);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({
      title: `${providerLabels[provider]} added`,
      description: "Configure credentials in the integration settings.",
    });
    load();
  };

  const startWooCommerceConnect = async () => {
    if (!currentBusinessId) return;
    setAdding("woocommerce");
    // Re-use an existing pending WC integration if one exists, otherwise create one.
    const { data: existing } = await supabase
      .from("integrations")
      .select("id, status")
      .eq("business_id", currentBusinessId)
      .eq("platform", "woocommerce")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let id = existing?.id as string | undefined;
    if (!id) {
      const { data, error } = await supabase
        .from("integrations")
        .insert({
          business_id: currentBusinessId,
          platform: "woocommerce",
          status: "pending",
        } as any)
        .select("id")
        .single();
      if (error) {
        setAdding(null);
        return toast({ title: "Failed", description: error.message, variant: "destructive" });
      }
      id = data.id as string;
    }
    setAdding(null);
    setWooIntegrationId(id);
    setWooOpen(true);
  };

  const disconnectIntegration = async (id: string) => {
    setDisconnecting(id);
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    setDisconnecting(null);
    if (error) return toast({ title: "Disconnect failed", description: error.message, variant: "destructive" });
    toast({ title: "Disconnected" });
    load();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <ReadOnlyBanner />
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">INT-01</div>
        <h1 className="text-3xl font-bold mt-1">Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect data sources to feed proof into NotiProof.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-3">Connected</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No integrations connected yet. Pick a source from the list below.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((i: any) => {
                const cfg = (i.config ?? {}) as { display_name?: string };
                const stat = stats.get(i.id);
                const provider = (i.provider ?? i.platform) as Provider;
                return (
                  <Card key={i.id} className="border">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <ProviderMark id={provider} label={providerLabels[provider] ?? provider} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {cfg.display_name ?? providerLabels[provider] ?? provider}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize truncate">
                            {String(provider).replace("_", " ")}
                          </div>
                        </div>
                        <Badge variant={statusVariant[i.status]} className="capitalize flex-shrink-0">
                          {i.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
                        <div>
                          <div className="font-medium text-foreground">
                            {stat?.proof_count ?? 0}
                          </div>
                          <div>proof imported</div>
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {(i as any).last_sync_at
                              ? new Date(i.last_sync_at).toLocaleDateString()
                              : stat?.last_event_at
                                ? new Date(stat.last_event_at).toLocaleDateString()
                                : "—"}
                          </div>
                          <div>last sync</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t pt-2">
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/integrations/${i.id}`}>
                            <SettingsIcon className="h-3.5 w-3.5 mr-1" /> Manage
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={disconnecting === i.id || !canEdit}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Disconnect {cfg.display_name ?? providerLabels[provider] ?? provider}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Events will stop flowing into NotiProof. Existing proof items remain.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => disconnectIntegration(i.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Disconnect
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold mb-3">Available</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {available.map((entry) => (
              <Card key={entry.id} className="border">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <ProviderMark id={entry.id} label={entry.label} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {entry.label}
                        {entry.comingSoon && (
                          <Badge variant="secondary" className="text-[10px]">Soon</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{entry.description}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={() => {
                      if (entry.comingSoon) return;
                      if (entry.id === "woocommerce") {
                        startWooCommerceConnect();
                        return;
                      }
                      addIntegration(entry.id as Provider);
                    }}
                    disabled={adding === entry.id || entry.comingSoon || !canEdit}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {entry.comingSoon ? "Coming soon" : adding === entry.id ? "Adding…" : "Add"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <WooCommerceConnectDialog
        open={wooOpen}
        integrationId={wooIntegrationId}
        onOpenChange={setWooOpen}
        onConnected={load}
      />
    </div>
  );
}
