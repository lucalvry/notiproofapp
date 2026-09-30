import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WizardProgress } from "@/components/onboarding/WizardProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Search } from "lucide-react";

export default function OnbInstall() {
  const [params] = useSearchParams();
  const widgetId = params.get("widget");
  const [copied, setCopied] = useState(false);
  const [verified, setVerified] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const { currentBusinessId } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentBusinessId) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("businesses")
        .select("settings, install_verified, website_url")
        .eq("id", currentBusinessId)
        .maybeSingle();
      const row = data as ({ settings?: Record<string, unknown> | null; install_verified?: boolean; website_url?: string | null } | null);
      const s = row?.settings ?? {};
      if (!cancelled && (row?.install_verified || s.install_verified)) setVerified(true);
      if (!cancelled && row?.website_url && !siteUrl) setSiteUrl(row.website_url);
    };
    check();
    const id = setInterval(() => { if (!verified) check(); }, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [currentBusinessId, verified, siteUrl]);

  const snippet = `<script async src="${window.location.origin}/widget.js" data-business="${currentBusinessId ?? ""}"${widgetId ? ` data-widget="${widgetId}"` : ""}></script>`;
  const wpSnippet = `<!-- Add to your theme's footer.php before </body> -->\n${snippet}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const handleCheckNow = async () => {
    if (!currentBusinessId || !siteUrl.trim()) {
      toast({ title: "Enter your website URL first", variant: "destructive" });
      return;
    }
    setChecking(true);
    setCheckError(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-domain", {
        body: { url: siteUrl.trim(), business_id: currentBusinessId },
      });
      if (error) throw error;
      const result = data as { verified: boolean; domain?: string; error?: string };
      if (result.verified) {
        setVerified(true);
        toast({ title: "Install verified!", description: "Your script is live." });
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
    <div className="animate-fade-in">
      <WizardProgress current={2} />
      <div className="text-center mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">ONB-02</div>
        <h1 className="text-3xl font-bold mt-1">Install the script</h1>
        <p className="text-muted-foreground mt-2">Add one line of code to your site, then verify the install.</p>
      </div>

      <Tabs defaultValue="html">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="wordpress">WordPress</TabsTrigger>
          <TabsTrigger value="webflow">Webflow</TabsTrigger>
        </TabsList>
        <TabsContent value="shopify"><Card><CardContent className="pt-6 space-y-4"><p className="text-sm text-muted-foreground">Open your theme layout (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">theme.liquid</code>) and paste before <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code>.</p><Snippet code={snippet} onCopy={handleCopy} copied={copied} /></CardContent></Card></TabsContent>
        <TabsContent value="html"><Card><CardContent className="pt-6 space-y-4"><p className="text-sm text-muted-foreground">Paste just before <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;/body&gt;</code> on every page where the widget should appear.</p><Snippet code={snippet} onCopy={handleCopy} copied={copied} /></CardContent></Card></TabsContent>
        <TabsContent value="wordpress"><Card><CardContent className="pt-6 space-y-4"><p className="text-sm text-muted-foreground">Open your active theme's <code className="text-xs bg-muted px-1.5 py-0.5 rounded">footer.php</code> and add this snippet right before the closing body tag.</p><Snippet code={wpSnippet} onCopy={handleCopy} copied={copied} /></CardContent></Card></TabsContent>
        <TabsContent value="webflow"><Card><CardContent className="pt-6 space-y-4"><p className="text-sm text-muted-foreground">Project settings → Custom code → Footer. Paste and publish.</p><Snippet code={snippet} onCopy={handleCopy} copied={copied} /></CardContent></Card></TabsContent>
      </Tabs>

      <div className="mt-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label htmlFor="site-url" className="text-sm font-medium">Your website URL</Label>
              <p className="text-xs text-muted-foreground mb-2">We'll fetch the page and scan it for the NotiProof script.</p>
              <div className="flex gap-2">
                <Input
                  id="site-url"
                  type="url"
                  placeholder="https://yourstore.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  disabled={checking || verified}
                />
                <Button onClick={handleCheckNow} disabled={checking || verified || !siteUrl.trim()}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span className="ml-2">{verified ? "Verified" : "Check now"}</span>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t">
              {verified ? (
                <>
                  <Check className="h-5 w-5 text-accent" />
                  <div className="text-sm"><span className="font-medium">Install verified.</span> Your script is live on your site.</div>
                </>
              ) : checkError ? (
                <div className="text-sm text-destructive">{checkError}</div>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Waiting for first impression — or click "Check now" to verify manually.</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <Button variant="outline" onClick={() => navigate("/onboarding/connect")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => navigate("/onboarding/preview")} size="lg">
          Preview widget <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Snippet({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="relative">
      <pre className="bg-secondary text-foreground text-xs p-4 rounded-md overflow-x-auto font-mono whitespace-pre">{code}</pre>
      <Button size="sm" variant="outline" onClick={onCopy} className="absolute top-2 right-2">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}