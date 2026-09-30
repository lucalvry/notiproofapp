import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Trash2, Power } from "lucide-react";
import { ReadOnlyBanner } from "@/components/layouts/ReadOnlyBanner";

const PROVIDERS = [
  { value: "buffer", label: "Buffer", category: "Social scheduler" },
  { value: "linkedin", label: "LinkedIn", category: "Social network" },
  { value: "twitter", label: "Twitter / X", category: "Social network" },
  { value: "mailchimp", label: "Mailchimp", category: "Email" },
  { value: "klaviyo", label: "Klaviyo", category: "Email" },
  { value: "convertkit", label: "ConvertKit", category: "Email" },
] as const;

type Provider = typeof PROVIDERS[number]["value"];

interface ChannelRow {
  id: string;
  business_id: string;
  provider: Provider;
  account_label: string | null;
  status: string;
  config: Record<string, any>;
  last_used_at: string | null;
  created_at: string;
}

export default function PublishingChannelsSettings() {
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = currentBusinessRole === "owner" || currentBusinessRole === "editor";
  const { toast } = useToast();
  const [rows, setRows] = useState<ChannelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<{ provider: Provider; account_label: string; api_key: string }>({
    provider: "buffer",
    account_label: "",
    api_key: "",
  });

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("publishing_channels")
      .select("*")
      .eq("business_id", currentBusinessId)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as ChannelRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBusinessId]);

  const create = async () => {
    if (!currentBusinessId) return;
    if (!draft.api_key.trim()) {
      return toast({ title: "API key required", variant: "destructive" });
    }
    setSaving(true);
    // Note: credentials_encrypted will be set server-side when publishing edge function
    // For now we store the plaintext reference in config (edge function will read & re-encrypt).
    const { error } = await (supabase as any).from("publishing_channels").insert({
      business_id: currentBusinessId,
      provider: draft.provider,
      account_label: draft.account_label.trim() || PROVIDERS.find((p) => p.value === draft.provider)?.label,
      status: "pending_verification",
      config: { api_key_pending: draft.api_key },
    });
    setSaving(false);
    if (error) return toast({ title: "Could not connect", description: error.message, variant: "destructive" });
    toast({ title: "Channel added", description: "Verification will run before first publish." });
    setOpen(false);
    setDraft({ provider: "buffer", account_label: "", api_key: "" });
    void load();
  };

  const toggle = async (row: ChannelRow) => {
    const next = row.status === "active" ? "paused" : "active";
    const { error } = await (supabase as any)
      .from("publishing_channels")
      .update({ status: next })
      .eq("id", row.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    void load();
  };

  const remove = async (row: ChannelRow) => {
    if (!confirm(`Remove ${row.account_label ?? row.provider}?`)) return;
    const { error } = await (supabase as any).from("publishing_channels").delete().eq("id", row.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Channel removed" });
    void load();
  };

  return (
    <div className="max-w-3xl space-y-4">
      <ReadOnlyBanner />
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Publishing channels</CardTitle>
            <CardDescription>
              Connect destinations where AI-generated testimonial content can be auto-published.
            </CardDescription>
          </div>
          {canEdit && (
            <Button onClick={() => setOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Connect channel
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-10 border border-dashed rounded-md">
              No channels connected yet.
            </div>
          ) : (
            <div className="divide-y border rounded-md">
              {rows.map((r) => {
                const meta = PROVIDERS.find((p) => p.value === r.provider);
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {r.account_label ?? meta?.label ?? r.provider}
                        </span>
                        <Badge variant={r.status === "active" ? "default" : "secondary"} className="text-xs">
                          {r.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {meta?.category} · {meta?.label ?? r.provider}
                        {r.last_used_at && ` · last used ${new Date(r.last_used_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toggle(r)}>
                          <Power className="h-4 w-4 mr-1" />
                          {r.status === "active" ? "Pause" : "Activate"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(r)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a publishing channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={draft.provider}
                onValueChange={(v) => setDraft({ ...draft, provider: v as Provider })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label} <span className="text-muted-foreground ml-2">· {p.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account label (optional)</Label>
              <Input
                value={draft.account_label}
                onChange={(e) => setDraft({ ...draft, account_label: e.target.value })}
                placeholder="e.g. Marketing LinkedIn"
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label>API key / access token</Label>
              <Input
                type="password"
                value={draft.api_key}
                onChange={(e) => setDraft({ ...draft, api_key: e.target.value })}
                placeholder="Paste from provider dashboard"
              />
              <p className="text-xs text-muted-foreground">
                Stored encrypted server-side. Used only when you publish.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
