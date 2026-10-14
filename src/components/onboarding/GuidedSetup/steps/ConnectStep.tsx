import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { WooCommerceConnectDialog } from "@/components/integrations/WooCommerceConnectDialog";

type Provider = "shopify" | "woocommerce" | "google_reviews" | "trustpilot" | "g2" | "zapier" | "webhook";

// Same provider list + insert mechanism as IntegrationsList / onboarding Connect.
const providers: { id: Provider; label: string; description: string }[] = [
  { id: "shopify", label: "Shopify", description: "Orders and reviews" },
  { id: "woocommerce", label: "WooCommerce", description: "WordPress store events" },
  { id: "google_reviews", label: "Google Reviews", description: "Public reviews" },
  { id: "trustpilot", label: "Trustpilot", description: "Customer reviews" },
  { id: "g2", label: "G2", description: "B2B software reviews" },
  { id: "zapier", label: "Zapier", description: "5,000+ app triggers" },
];

interface Props {
  businessId: string | null;
  onSkip: () => void;
  onConnected: () => void;
}

export function ConnectStep({ businessId, onSkip, onConnected }: Props) {
  const { toast } = useToast();
  const [adding, setAdding] = useState<Provider | null>(null);
  const [wooOpen, setWooOpen] = useState(false);
  const [wooIntegrationId, setWooIntegrationId] = useState<string | null>(null);

  const addIntegration = async (provider: Provider) => {
    if (!businessId) return;
    setAdding(provider);
    const { error } = await supabase
      .from("integrations")
      .insert({ business_id: businessId, platform: provider, status: "pending" } as any);
    setAdding(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${providers.find((p) => p.id === provider)?.label} added`, description: "Configure credentials under Integrations." });
    onConnected();
  };

  const startWooCommerceConnect = async () => {
    if (!businessId) return;
    setAdding("woocommerce");
    const { data, error } = await supabase
      .from("integrations")
      .insert({ business_id: businessId, platform: "woocommerce", status: "pending" } as any)
      .select("id")
      .single();
    setAdding(null);
    if (error || !data) {
      toast({ title: "Failed", description: error?.message, variant: "destructive" });
      return;
    }
    setWooIntegrationId(data.id as string);
    setWooOpen(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pick where your social proof comes from. You can add more later, or skip and request testimonials directly.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {providers.map((p) => (
          <Card key={p.id} className="border">
            <CardContent className="pt-4">
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">{p.description}</div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3"
                disabled={adding === p.id || !businessId}
                onClick={() => (p.id === "woocommerce" ? startWooCommerceConnect() : addIntegration(p.id))}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {adding === p.id ? "Adding…" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onConnected}>Save & continue</Button>
      </div>

      <WooCommerceConnectDialog
        open={wooOpen}
        integrationId={wooIntegrationId}
        onOpenChange={setWooOpen}
        onConnected={onConnected}
      />
    </div>
  );
}
