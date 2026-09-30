import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Loader2, Plus, Send } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { UsageBanner } from "@/components/billing/UsageBanner";
import { usePlanUsage } from "@/lib/plan-helpers";
import { proofRequestSchema, parseOrError } from "@/lib/validation";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";

type RequestRow = Database["public"]["Tables"]["testimonial_requests"]["Row"] & {
  recipient_email?: string | null;
  recipient_name?: string | null;
  token?: string | null;
};
type ReqStatus = string;

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  responded: "default",
  completed: "default",
  opened: "secondary",
  sent: "secondary",
  scheduled: "outline",
  pending: "outline",
  expired: "destructive",
};

export default function ProofRequests() {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const { atProofLimit, plan } = usePlanUsage();
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", recipient_email: "" });
  const [campaignId, setCampaignId] = useState<string>("none");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    if (!currentBusinessId) return;
    setLoading(true);
    const { data, error } = await db.from("testimonial_requests").select("*").eq("business_id", currentBusinessId).order("created_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [currentBusinessId]);

  useEffect(() => {
    if (!currentBusinessId) return;
    db.from("campaigns")
      .select("id, name")
      .eq("business_id", currentBusinessId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => setCampaigns(data ?? []));
  }, [currentBusinessId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;
    const parsed = parseOrError(proofRequestSchema, {
      recipient_name: form.recipient_name || undefined,
      recipient_email: form.recipient_email,
    });
    if (parsed.error) {
      return toast({ title: "Check the request", description: parsed.error, variant: "destructive" });
    }
    setCreating(true);

    // Every testimonial_requests row must point to a proof_object. For manual
    // requests there's no purchase to attach to, so we create a placeholder
    // proof first and link it.
    const { data: placeholderId, error: phErr } = await db.rpc(
      "create_placeholder_proof_for_request",
      { _business_id: currentBusinessId },
    );
    if (phErr || !placeholderId) {
      setCreating(false);
      return toast({
        title: "Failed to create",
        description: phErr?.message ?? "Could not create placeholder proof",
        variant: "destructive",
      });
    }

    const { data: inserted, error } = await db
      .from("testimonial_requests")
      .insert({
        business_id: currentBusinessId,
        proof_object_id: placeholderId as string,
        recipient_email: parsed.data.recipient_email,
        recipient_name: parsed.data.recipient_name ?? null,
        status: "scheduled",
        campaign_id: campaignId !== "none" ? campaignId : null,
      })
      .select("id")
      .maybeSingle();
    if (error || !inserted) {
      setCreating(false);
      return toast({ title: "Failed to create", description: error?.message ?? "Unknown error", variant: "destructive" });
    }

    const { data: sendResp, error: sendErr } = await supabase.functions.invoke("send-testimonial-request", {
      body: { request_id: inserted.id, app_origin: window.location.origin },
    });
    setCreating(false);

    if (sendErr || !sendResp?.ok) {
      if (showRateLimitToastIf(sendErr ?? sendResp)) {
        setForm({ recipient_name: "", recipient_email: "" });
        setOpen(false);
        load();
        return;
      }
      toast({
        title: "Request created (email not sent)",
        description: sendErr?.message ?? sendResp?.error ?? "You can copy the link and share it manually.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Request sent", description: `Email delivered to ${form.recipient_email}.` });
    }
    setForm({ recipient_name: "", recipient_email: "" });
    setCampaignId("none");
    setOpen(false);
    load();
  };

  const collectUrl = (token: string) => `${window.location.origin}/collect/${token}`;
  const copyLink = (token: string) => { navigator.clipboard.writeText(collectUrl(token)); toast({ title: "Link copied" }); };

  const resend = async (request_id: string, recipient_email: string) => {
    const { data, error } = await supabase.functions.invoke("send-testimonial-request", {
      body: { request_id, app_origin: window.location.origin },
    });
    if (error || !data?.ok) {
      if (showRateLimitToastIf(error ?? data)) return;
      toast({ title: "Resend failed", description: error?.message ?? data?.error ?? "Unknown error", variant: "destructive" });
    } else {
      toast({ title: "Email resent", description: `Sent to ${recipient_email}.` });
      load();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/proof"><ArrowLeft className="h-4 w-4 mr-1" /> Back to library</Link></Button>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PROOF-03</div>
          <h1 className="text-3xl font-bold mt-1">Testimonial requests</h1>
          <p className="text-muted-foreground mt-1">Send a personal link asking customers to share their experience.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { if (o && atProofLimit) { toast({ title: "Plan limit reached", description: `You've hit your ${plan.name} plan limit of ${plan.proofLimit.toLocaleString()} proof items this month. Upgrade to send more.`, variant: "destructive" }); return; } setOpen(o); }}>
          <DialogTrigger asChild>
            <Button disabled={atProofLimit} title={atProofLimit ? "Monthly proof limit reached" : undefined}>
              <Plus className="h-4 w-4 mr-2" /> New request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={create}>
              <DialogHeader><DialogTitle>New testimonial request</DialogTitle><DialogDescription>We'll generate a unique collection link.</DialogDescription></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label htmlFor="r_name">Customer name (optional)</Label><Input id="r_name" maxLength={120} value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} /></div>
                <div className="space-y-2"><Label htmlFor="r_email">Customer email</Label><Input id="r_email" type="email" required maxLength={254} inputMode="email" autoComplete="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} /></div>
                {campaigns.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="r_campaign">Assign to campaign (optional)</Label>
                    <Select value={campaignId} onValueChange={setCampaignId}>
                      <SelectTrigger id="r_campaign"><SelectValue placeholder="No campaign" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No campaign</SelectItem>
                        {campaigns.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating}>{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <UsageBanner />

      <Card>
        <CardHeader><CardTitle className="text-base">All requests</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-3"><Send className="h-6 w-6" /></div>
              <h3 className="font-semibold">No requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first request to start collecting testimonials.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Link</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.recipient_name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.recipient_email}</div></TableCell>
                       <TableCell><Badge variant={statusVariant[r.status as string] ?? "outline"} className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.expires_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-2">
                         {(r.status as string) !== "responded" && r.status !== "completed" && (
                           <Button size="sm" variant="ghost" onClick={() => resend(r.id, (r as any).recipient_email)}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Resend
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => copyLink((r as any).token)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
