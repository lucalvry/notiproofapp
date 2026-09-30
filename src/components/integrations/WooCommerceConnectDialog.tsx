import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  integrationId: string | null;
  onOpenChange: (open: boolean) => void;
  onConnected?: () => void;
}

type Step = 1 | 2 | 3;

export function WooCommerceConnectDialog({
  open,
  integrationId,
  onOpenChange,
  onConnected,
}: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [storeUrl, setStoreUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  useEffect(() => {
    if (open) {
      setStep(1);
      setStoreUrl("");
      setConsumerKey("");
      setConsumerSecret("");
      setWebhookUrl("");
      setWebhookSecret("");
    }
  }, [open]);

  const cleanedStore = storeUrl.trim().replace(/\/+$/, "").replace(/^https?:\/\//i, "");
  const restApiDeepLink = cleanedStore
    ? `https://${cleanedStore}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
    : "";
  const webhookDeepLink = cleanedStore
    ? `https://${cleanedStore}/wp-admin/admin.php?page=wc-settings&tab=advanced&section=webhooks`
    : "";

  const validateStep1 = () => {
    if (!cleanedStore.includes(".")) {
      toast({
        title: "Invalid store URL",
        description: "Use the full domain, e.g. shop.example.com",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleConnect = async () => {
    if (!integrationId) return;
    if (!consumerKey.trim() || !consumerSecret.trim()) {
      toast({
        title: "Missing keys",
        description: "Paste both the Consumer Key and Consumer Secret.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("integration-woocommerce", {
      body: {
        action: "connect",
        integration_id: integrationId,
        store_url: storeUrl,
        consumer_key: consumerKey.trim(),
        consumer_secret: consumerSecret.trim(),
      },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({
        title: "Could not connect",
        description: error?.message ?? data?.error ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }
    setWebhookUrl(data.webhook_url);
    setWebhookSecret(data.webhook_secret);
    setStep(3);
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const finish = async () => {
    onConnected?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect WooCommerce</DialogTitle>
          <DialogDescription>
            Three quick steps. We never see passwords for your WordPress admin.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
                  step >= n
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step > n ? <Check className="h-4 w-4" /> : n}
              </div>
              {n < 3 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded",
                    step > n ? "bg-accent" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wc-store-url">Store URL</Label>
              <Input
                id="wc-store-url"
                placeholder="shop.example.com"
                value={storeUrl}
                onChange={(e) => setStoreUrl(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Where your WooCommerce store is hosted.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription className="text-xs">
                In WordPress: <strong>WooCommerce → Settings → Advanced → REST API</strong>
                {" "}→ <strong>Add key</strong> with permission <strong>Read</strong>.
                Copy both values here.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={restApiDeepLink} target="_blank" rel="noreferrer">
                Open REST API page <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
            <div className="space-y-2">
              <Label htmlFor="wc-ck">Consumer Key</Label>
              <Input
                id="wc-ck"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerKey}
                onChange={(e) => setConsumerKey(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wc-cs">Consumer Secret</Label>
              <Input
                id="wc-cs"
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={consumerSecret}
                onChange={(e) => setConsumerSecret(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                Back
              </Button>
              <Button onClick={handleConnect} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                  </>
                ) : (
                  <>
                    Verify & continue <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Connected. Final step: tell WooCommerce where to send order events.
              </AlertDescription>
            </Alert>
            <Button asChild variant="outline" size="sm" className="w-full">
              <a href={webhookDeepLink} target="_blank" rel="noreferrer">
                Open Webhooks page <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </a>
            </Button>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                Click <strong>Add webhook</strong> and use these values
                (create one for <strong>Order created</strong> and one for{" "}
                <strong>Order updated</strong>):
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Delivery URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(webhookUrl, "Webhook URL")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Secret</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookSecret} className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(webhookSecret, "Secret")}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Status: <strong>Active</strong> · API Version:{" "}
                <strong>WP REST API Integration v3</strong>
              </p>
            </div>
            <DialogFooter>
              <Button onClick={finish}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}