import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { WizardProgress } from "@/components/onboarding/WizardProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingBag, Store, Star, MessageCircle, Zap, Award, ArrowRight, SkipForward, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WooCommerceConnectDialog } from "@/components/integrations/WooCommerceConnectDialog";

// Stripe is intentionally excluded from data integrations — it powers NotiProof's
// own subscription billing in /settings/billing, not customer purchase ingestion.
const providers = [
  { id: "shopify" as const, name: "Shopify", desc: "Sync orders and reviews", icon: ShoppingBag, color: "text-success" },
  { id: "woocommerce" as const, name: "WooCommerce", desc: "WordPress store events", icon: Store, color: "text-accent" },
  { id: "google_reviews" as const, name: "Google Reviews", desc: "Import public review proof", icon: Star, color: "text-gold" },
  { id: "trustpilot" as const, name: "Trustpilot", desc: "Customer review platform", icon: MessageCircle, color: "text-teal" },
  { id: "g2" as const, name: "G2", desc: "B2B software reviews", icon: Award, color: "text-destructive" },
  { id: "zapier" as const, name: "Zapier", desc: "5,000+ app triggers", icon: Zap, color: "text-gold" },
];

type ProviderId = typeof providers[number]["id"];

export default function OnbConnect() {
  const [selected, setSelected] = useState<ProviderId | null>(null);
  const [loading, setLoading] = useState(false);
  const [shopifyOpen, setShopifyOpen] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [shopifyLoading, setShopifyLoading] = useState(false);
  const [wooOpen, setWooOpen] = useState(false);
  const [wooIntegrationId, setWooIntegrationId] = useState<string | null>(null);
  const { currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createIntegration = async (provider: ProviderId) => {
    if (!currentBusinessId) return null;
    const { data, error } = await supabase
      .from("integrations")
      .insert({
        business_id: currentBusinessId,
        platform: provider,
        status: "pending",
      } as any)
      .select("id")
      .single();
    if (error) {
      toast({ title: "Could not save integration", description: error.message, variant: "destructive" });
      return null;
    }
    return data.id as string;
  };

  const handleConnect = async () => {
    if (!selected || !currentBusinessId) {
      navigate("/onboarding/install");
      return;
    }

    if (selected === "shopify") {
      setShopifyOpen(true);
      return;
    }

    if (selected === "woocommerce") {
      setLoading(true);
      const id = await createIntegration("woocommerce");
      setLoading(false);
      if (!id) return;
      setWooIntegrationId(id);
      setWooOpen(true);
      return;
    }

    setLoading(true);
    const id = await createIntegration(selected);
    setLoading(false);
    if (!id) return;

    // Generic providers: stash a pending integration and continue.
    navigate("/onboarding/install");
  };

  const handleSkip = async () => {
    navigate("/onboarding/install");
  };

  const handleShopifyStart = async () => {
    if (!currentBusinessId) return;
    const cleaned = shopDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!/^[a-z0-9-]+\.myshopify\.com$/.test(cleaned)) {
      toast({
        title: "Invalid shop domain",
        description: "Use {your-store}.myshopify.com",
        variant: "destructive",
      });
      return;
    }
    setShopifyLoading(true);
    const integrationId = await createIntegration("shopify");
    if (!integrationId) {
      setShopifyLoading(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke("oauth-shopify-start", {
      body: { shop: cleaned, integration_id: integrationId },
    });
    setShopifyLoading(false);
    if (error || !data?.install_url) {
      toast({
        title: "Could not start Shopify install",
        description: error?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }
    window.location.href = data.install_url as string;
  };

  return (
    <div className="animate-fade-in">
      <WizardProgress current={1} />
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ONB-01</div>
        <h1 className="text-3xl font-bold mt-1">Connect a data source</h1>
        <p className="text-muted-foreground mt-2">Pick where your social proof comes from. You can add more later.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {providers.map(({ id, name, desc, icon: Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelected(id)}
            className={cn(
              "text-left p-5 rounded-lg border-2 bg-card transition-all hover:border-accent/60 hover:shadow-md",
              selected === id ? "border-accent shadow-md ring-2 ring-accent/20" : "border-border"
            )}
          >
            <Icon className={cn("h-7 w-7 mb-3", color)} />
            <div className="font-semibold">{name}</div>
            <div className="text-sm text-muted-foreground mt-1">{desc}</div>
          </button>
        ))}
      </div>
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <SkipForward className="h-4 w-4" />
            Don't have an integration handy? Skip — you can manually add testimonials.
          </div>
          <Button variant="ghost" size="sm" onClick={handleSkip}>Skip</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end mt-6">
        <Button onClick={handleConnect} disabled={loading} size="lg">
          {loading ? "Connecting..." : selected === "shopify" ? "Connect Shopify" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <Dialog open={shopifyOpen} onOpenChange={setShopifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Shopify</DialogTitle>
            <DialogDescription>
              Enter your Shopify store domain to start the install. You'll be redirected to Shopify to approve access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="shop-domain">Shop domain</Label>
            <Input
              id="shop-domain"
              placeholder="your-store.myshopify.com"
              value={shopDomain}
              onChange={(e) => setShopDomain(e.target.value)}
              disabled={shopifyLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShopifyOpen(false)} disabled={shopifyLoading}>
              Cancel
            </Button>
            <Button onClick={handleShopifyStart} disabled={shopifyLoading || !shopDomain.trim()}>
              {shopifyLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting…</> : "Continue to Shopify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WooCommerceConnectDialog
        open={wooOpen}
        integrationId={wooIntegrationId}
        onOpenChange={setWooOpen}
        onConnected={() => navigate("/onboarding/install")}
      />
    </div>
  );
}
