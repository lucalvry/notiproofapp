import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Loader2, ExternalLink, Plug } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const db = supabase as any;

const PROVIDER_LABELS: Record<string, string> = {
  buffer: "Buffer",
  mailchimp: "Mailchimp",
  klaviyo: "Klaviyo",
  convertkit: "ConvertKit",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
};

interface Channel {
  id: string;
  provider: string;
  account_label: string | null;
  status: string;
  config: Record<string, unknown>;
}

interface ResultRow {
  channelId: string;
  status: "pending" | "publishing" | "published" | "failed" | "scheduled";
  message?: string;
  url?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPieceId: string;
  contentText: string;
  outputType: string;
}

export function PublishModal({ open, onOpenChange, contentPieceId, contentText, outputType }: Props) {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [optionsByChannel, setOptionsByChannel] = useState<Record<string, Record<string, any>>>({});
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<Record<string, ResultRow>>({});

  useEffect(() => {
    if (!open || !currentBusinessId) return;
    setLoading(true);
    setResults({});
    setSelected(new Set());
    db.from("publishing_channels")
      .select("id, provider, account_label, status, config")
      .eq("business_id", currentBusinessId)
      .eq("status", "active")
      .then(({ data }: any) => {
        setChannels((data as Channel[]) ?? []);
        setLoading(false);
      });
  }, [open, currentBusinessId]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const setChannelOption = (channelId: string, key: string, value: any) => {
    setOptionsByChannel((prev) => ({ ...prev, [channelId]: { ...(prev[channelId] ?? {}), [key]: value } }));
  };

  const copy = () => {
    navigator.clipboard.writeText(contentText);
    toast({ title: "Copied to clipboard" });
  };

  const download = (ext: "txt" | "md") => {
    const blob = new Blob([contentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${outputType}-${contentPieceId.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    if (selected.size === 0) {
      toast({ title: "Select at least one channel", variant: "destructive" });
      return;
    }
    if (scheduleEnabled && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      toast({ title: "Pick a future date/time", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const initial: Record<string, ResultRow> = {};
    for (const id of selected) initial[id] = { channelId: id, status: scheduleEnabled ? "scheduled" : "publishing" };
    setResults(initial);

    for (const channelId of selected) {
      const opts = optionsByChannel[channelId] ?? {};
      try {
        if (scheduleEnabled) {
          const { data, error } = await db.from("content_publish_events").insert({
            business_id: currentBusinessId,
            content_piece_id: contentPieceId,
            channel_id: channelId,
            scheduled_at: new Date(scheduleAt).toISOString(),
            status: "scheduled",
            payload: { options: opts },
          }).select("id").single();
          if (error) throw new Error(error.message);
          setResults((prev) => ({ ...prev, [channelId]: { channelId, status: "scheduled", message: `Scheduled for ${new Date(scheduleAt).toLocaleString()}` } }));
        } else {
          const { data, error } = await supabase.functions.invoke("publish-content-piece", {
            body: { content_piece_id: contentPieceId, channel_id: channelId, options: opts },
          });
          if (error) throw new Error(error.message);
          if ((data as any)?.ok === false) throw new Error((data as any)?.error ?? "Publish failed");
          setResults((prev) => ({
            ...prev,
            [channelId]: { channelId, status: "published", url: (data as any)?.external_post_url ?? null },
          }));
        }
      } catch (e: any) {
        setResults((prev) => ({ ...prev, [channelId]: { channelId, status: "failed", message: e.message } }));
      }
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish content</DialogTitle>
          <DialogDescription>Send to one or more channels, or copy / download the text.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copy}><Copy className="h-3.5 w-3.5 mr-1.5" /> Copy</Button>
            <Button variant="outline" size="sm" onClick={() => download("txt")}><Download className="h-3.5 w-3.5 mr-1.5" /> .txt</Button>
            <Button variant="outline" size="sm" onClick={() => download("md")}><Download className="h-3.5 w-3.5 mr-1.5" /> .md</Button>
          </div>

          <div>
            <Label className="text-sm font-semibold">Channels</Label>
            {loading ? (
              <div className="space-y-2 mt-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : channels.length === 0 ? (
              <Card className="mt-2">
                <CardContent className="py-6 text-center text-sm text-muted-foreground space-y-2">
                  <Plug className="h-6 w-6 mx-auto opacity-60" />
                  <p>No active publishing channels yet.</p>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/content/channels" onClick={() => onOpenChange(false)}>Connect a channel</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2 mt-2">
                {channels.map((ch) => {
                  const isSelected = selected.has(ch.id);
                  const result = results[ch.id];
                  return (
                    <Card key={ch.id} className={isSelected ? "border-primary" : ""}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggle(ch.id)} />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{PROVIDER_LABELS[ch.provider] ?? ch.provider}</div>
                            {ch.account_label && <div className="text-xs text-muted-foreground">{ch.account_label}</div>}
                          </div>
                          {result && (
                            <Badge variant={result.status === "failed" ? "destructive" : result.status === "published" ? "default" : "secondary"} className="capitalize">
                              {result.status}
                            </Badge>
                          )}
                        </div>

                        {isSelected && (
                          <ChannelOptionsPanel
                            provider={ch.provider}
                            options={optionsByChannel[ch.id] ?? {}}
                            setOption={(k, v) => setChannelOption(ch.id, k, v)}
                          />
                        )}

                        {result && (result.url || result.message) && (
                          <div className="text-xs">
                            {result.url && (
                              <a href={result.url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 hover:underline">
                                View post <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {result.message && <div className="text-muted-foreground">{result.message}</div>}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Schedule for later</Label>
                <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              </div>
              {scheduleEnabled && (
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={submit} disabled={submitting || selected.size === 0 || channels.length === 0}>
            {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {scheduleEnabled ? "Schedule" : "Publish now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChannelOptionsPanel({
  provider,
  options,
  setOption,
}: {
  provider: string;
  options: Record<string, any>;
  setOption: (k: string, v: any) => void;
}) {
  if (provider === "mailchimp" || provider === "klaviyo" || provider === "convertkit") {
    return (
      <div className="space-y-2 pl-7">
        <Input
          placeholder="Subject line"
          value={options.subject ?? ""}
          onChange={(e) => setOption("subject", e.target.value)}
        />
        <Input
          placeholder="List / segment ID (optional override)"
          value={options.list_id ?? ""}
          onChange={(e) => setOption("list_id", e.target.value)}
        />
      </div>
    );
  }
  if (provider === "linkedin") {
    return (
      <div className="pl-7">
        <select
          className="border rounded px-2 py-1 text-sm bg-background"
          value={options.visibility ?? "PUBLIC"}
          onChange={(e) => setOption("visibility", e.target.value)}
        >
          <option value="PUBLIC">Public</option>
          <option value="CONNECTIONS">Connections only</option>
        </select>
      </div>
    );
  }
  if (provider === "buffer") {
    return (
      <div className="pl-7">
        <Input
          placeholder="Profile IDs (comma separated)"
          value={(options.profile_ids ?? []).join(",")}
          onChange={(e) => setOption("profile_ids", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </div>
    );
  }
  return null;
}
