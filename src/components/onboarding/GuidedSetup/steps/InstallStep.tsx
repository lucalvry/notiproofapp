import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Loader2, Search } from "lucide-react";
import { APP_URL } from "@/lib/app-url";

interface Props {
  businessId: string | null;
  widgetId: string | null;
  onSkip: () => void;
  onVerified: () => void;
}

/** Same snippet + verify-domain edge function call as src/pages/onboarding/Install.tsx. */
export function InstallStep({ businessId, widgetId, onSkip, onVerified }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("businesses")
      .select("install_verified, website_url")
      .eq("id", businessId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { install_verified?: boolean; website_url?: string | null } | null;
        if (row?.install_verified) setVerified(true);
        if (row?.website_url) setSiteUrl(row.website_url);
      });
  }, [businessId]);

  const snippet = `<script async src="${APP_URL}/widget.js" data-business="${businessId ?? ""}"${widgetId ? ` data-widget="${widgetId}"` : ""}></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const checkNow = async () => {
    if (!businessId || !siteUrl.trim()) {
      toast({ title: "Enter your website URL first", variant: "destructive" });
      return;
    }
    setChecking(true);
    setCheckError(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-domain", {
        body: { url: siteUrl.trim(), business_id: businessId },
      });
      if (error) throw error;
      const result = data as { verified: boolean; error?: string };
      if (result.verified) {
        setVerified(true);
        toast({ title: "Install verified!", description: "Your script is live." });
        onVerified();
      } else {
        setCheckError(result.error ?? "We couldn't find the NotiProof script on that page.");
      }
    } catch (e) {
      setCheckError((e as Error).message ?? "Verification failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="html">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="wordpress">WordPress</TabsTrigger>
          <TabsTrigger value="webflow">Webflow</TabsTrigger>
        </TabsList>
        {(["shopify", "html", "wordpress", "webflow"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="relative mt-3">
              <pre className="bg-secondary text-foreground text-xs p-4 rounded-md overflow-x-auto font-mono whitespace-pre">{snippet}</pre>
              <Button size="sm" variant="outline" onClick={copy} className="absolute top-2 right-2">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor="gs-install-url">Your website URL</Label>
        <div className="flex gap-2">
          <Input
            id="gs-install-url"
            type="url"
            placeholder="https://yourstore.com"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            disabled={checking || verified}
          />
          <Button onClick={checkNow} disabled={checking || verified || !siteUrl.trim()}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2">{verified ? "Verified" : "Check installation"}</span>
          </Button>
        </div>
        {checkError && <p className="text-xs text-destructive">{checkError}</p>}
        {verified && <p className="text-xs text-accent">Install verified — your script is live.</p>}
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={onVerified}>Continue</Button>
      </div>
    </div>
  );
}
