import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ContentSubNav } from "./components/ContentSubNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plug, Trash2, ExternalLink, Loader2, Zap } from "lucide-react";

const db = supabase as any;

const PROVIDERS = [
  { id: "mailchimp", label: "Mailchimp", type: "api_key", help: "Find under Account → Extras → API keys" },
  { id: "klaviyo", label: "Klaviyo", type: "api_key", help: "Account → Settings → API keys" },
  { id: "convertkit", label: "ConvertKit", type: "api_key", help: "Account → Account settings → Advanced → API Secret" },
  { id: "buffer", label: "Buffer", type: "oauth", docs: "https://buffer.com/developers/api" },
  { id: "linkedin", label: "LinkedIn", type: "oauth", docs: "https://learn.microsoft.com/en-us/linkedin/marketing/" },
  { id: "twitter", label: "Twitter / X", type: "oauth", docs: "https://developer.x.com/" },
] as const;

interface Channel {
  id: string;
  provider: string;
  account_label: string | null;
  status: string;
  last_used_at: string | null;
  config: Record<string, unknown>;
}

export default function ChannelsHub() {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectFor, setConnectFor] = useState<typeof PROVIDERS[number] | null>(null);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  const load = () => {
    if (!currentBusinessId) return;
    setLoading(true);
    db.from("publishing_channels")
      .select("id, provider, account_label, status, last_used_at, config")
      .eq("business_id", currentBusinessId)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        setChannels((data as Channel[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [currentBusinessId]);

  // Refresh the list when an OAuth popup posts back.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.type === "buffer-oauth") {
        load();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line
  }, [currentBusinessId]);

  const startBufferOAuth = async () => {
    if (!currentBusinessId) return;
    setOauthBusy("buffer");
    try {
      const { data, error } = await supabase.functions.invoke("oauth-buffer-start", {
        body: { business_id: currentBusinessId },
      });
      if (error) throw new Error(error.message);
      const url = (data as any)?.install_url;
      if (!url) throw new Error("No install URL returned");
      window.open(url, "_blank", "width=720,height=820");
    } catch (e: any) {
      toast({ title: "Buffer connect failed", description: e.message, variant: "destructive" });
    } finally {
      setOauthBusy(null);
    }
  };

  const disconnect = async (id: string) => {
    if (!confirm("Disconnect this channel?")) return;
    const { error } = await db.from("publishing_channels").update({ status: "disconnected" }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Disconnected" });
    load();
  };

  const [testingId, setTestingId] = useState<string | null>(null);
  const test = async (id: string) => {
    setTestingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("publishing-channel-credentials", {
        body: { action: "test", channel_id: id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.ok) {
        toast({ title: "Connection OK", description: (data as any).detail ?? "Reachable" });
      } else {
        toast({ title: "Test failed", description: (data as any)?.error ?? "Unknown error", variant: "destructive" });
      }
      load();
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PUB-03</div>
        <h1 className="text-3xl font-bold mt-1">Publishing channels</h1>
        <p className="text-muted-foreground mt-1">Connect outlets where your content gets sent.</p>
      </div>
      <ContentSubNav />

      <div>
        <h2 className="text-sm font-semibold mb-3">Connected ({channels.filter((c) => c.status === "active").length})</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : channels.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No channels connected yet.</CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channels.map((ch) => (
              <Card key={ch.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{PROVIDERS.find((p) => p.id === ch.provider)?.label ?? ch.provider}</div>
                    <Badge variant={ch.status === "active" ? "default" : "outline"} className="capitalize">{ch.status}</Badge>
                  </div>
                  {ch.account_label && <div className="text-xs text-muted-foreground">{ch.account_label}</div>}
                  {ch.last_used_at && <div className="text-xs text-muted-foreground">Last used {new Date(ch.last_used_at).toLocaleDateString()}</div>}
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => test(ch.id)} disabled={testingId === ch.id}>
                      {testingId === ch.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                      Test
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => disconnect(ch.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Available providers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROVIDERS.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  {p.label}
                  <Badge variant="outline" className="text-[10px]">{p.type === "oauth" ? "OAuth" : "API key"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.type === "api_key" ? (
                  <Button size="sm" onClick={() => setConnectFor(p)}>
                    <Plug className="h-3.5 w-3.5 mr-1" /> Connect
                  </Button>
                ) : p.id === "buffer" ? (
                  <Button size="sm" onClick={startBufferOAuth} disabled={oauthBusy === "buffer"}>
                    {oauthBusy === "buffer"
                      ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      : <Plug className="h-3.5 w-3.5 mr-1" />}
                    Connect with Buffer
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <a href={(p as any).docs} target="_blank" rel="noreferrer">
                      Docs <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {connectFor && (
        <ConnectApiKeyDialog
          provider={connectFor}
          businessId={currentBusinessId!}
          onClose={() => setConnectFor(null)}
          onConnected={() => {
            setConnectFor(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ConnectApiKeyDialog({
  provider,
  businessId,
  onClose,
  onConnected,
}: {
  provider: typeof PROVIDERS[number];
  businessId: string;
  onClose: () => void;
  onConnected: () => void;
}) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [label, setLabel] = useState("");
  const [listId, setListId] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!apiKey.trim()) return toast({ title: "API key required", variant: "destructive" });
    setBusy(true);
    try {
      // Create the channel row first
      const { data: ch, error: insErr } = await db.from("publishing_channels").insert({
        business_id: businessId,
        provider: provider.id,
        account_label: label || provider.label,
        status: "active",
        config: { list_id: listId || undefined, from_email: fromEmail || undefined },
      }).select().single();
      if (insErr) throw new Error(insErr.message);

      // Encrypt + store credentials via a generic call to integration-credentials pattern
      // (publishing_channels uses same encrypted bytea column)
      const { error: credErr } = await supabase.functions.invoke("publishing-channel-credentials", {
        body: {
          action: "set",
          channel_id: ch.id,
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim() || undefined,
          from_email: fromEmail || undefined,
        },
      });
      if (credErr) {
        // Roll back row if function missing/fails
        await db.from("publishing_channels").delete().eq("id", ch.id);
        throw new Error(credErr.message);
      }
      toast({ title: `${provider.label} connected` });
      onConnected();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {provider.label}</DialogTitle>
          <DialogDescription>{(provider as any).help}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Account label</Label>
            <Input placeholder="e.g. Marketing list" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">API key</Label>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          {provider.id === "convertkit" && (
            <div className="space-y-1">
              <Label className="text-xs">API secret</Label>
              <Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
            </div>
          )}
          {(provider.id === "mailchimp" || provider.id === "klaviyo") && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Default list / audience ID</Label>
                <Input value={listId} onChange={(e) => setListId(e.target.value)} />
              </div>
              {provider.id === "mailchimp" && (
                <div className="space-y-1">
                  <Label className="text-xs">From email</Label>
                  <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
