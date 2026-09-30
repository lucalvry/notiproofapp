import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { isViewer } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, Copy, Loader2, Mail, Send, Sparkles, Star, Trash2, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { proofEditSchema, proofRequestSchema, fieldErrors } from "@/lib/validation";
import { ProofProductSection } from "@/components/proof/ProofProductSection";

type ProofRow = Database["public"]["Tables"]["proof_objects"]["Row"] & {
  status?: string | null;
  type?: string | null;
  proof_type?: string | null;
  source?: string | null;
  verified?: boolean | null;
  author_email?: string | null;
  outcome_claim?: string | null;
  transcript?: string | null;
  highlight_phrase?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
};
type ProofStatus = string;
type RequestRow = Database["public"]["Tables"]["testimonial_requests"]["Row"] & {
  recipient_email?: string | null;
  recipient_name?: string | null;
  responded_at?: string | null;
  token?: string | null;
};
const db = supabase as any;

export default function ProofDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentBusinessId, currentBusinessRole } = useAuth();
  const canEdit = !isViewer(currentBusinessRole);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proof, setProof] = useState<ProofRow | null>(null);
  const [linkedRequests, setLinkedRequests] = useState<RequestRow[]>([]);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [requestForm, setRequestForm] = useState({ recipient_name: "", recipient_email: "" });

  const loadRequests = async (proofId: string) => {
    const { data } = await supabase
      .from("testimonial_requests")
      .select("*")
      .eq("proof_object_id", proofId)
      .order("created_at", { ascending: false });
    setLinkedRequests(data ?? []);
  };

  useEffect(() => {
    if (!id || !currentBusinessId) return;
    setLoading(true);
    db.from("proof_objects").select("*").eq("id", id).eq("business_id", currentBusinessId).maybeSingle()
      .then(({ data, error }) => {
        if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
        setProof(data as any);
        setLoading(false);
        if (data?.id) {
          loadRequests(data.id);
          setRequestForm({
            recipient_name: data.author_name ?? "",
            recipient_email: data.author_email ?? "",
          });
        }
      });
  }, [id, currentBusinessId, toast]);

  const setStatus = async (status: ProofStatus) => {
    if (!proof) return;
    setSaving(true);
    const { error } = await db.from("proof_objects").update({ status }).eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setProof({ ...proof, status } as any);
    toast({ title: status === "approved" ? "Approved" : status });
  };

  const saveEdits = async () => {
    if (!proof) return;
    const highlight = ((proof as ProofRow & { highlight_phrase?: string | null }).highlight_phrase ?? "").trim();
    const outcome = (proof.outcome_claim ?? "").trim();
    const parsed = fieldErrors(proofEditSchema, {
      author_name: proof.author_name ?? "",
      content: proof.content ?? "",
      highlight_phrase: highlight,
      cta_label: (proof as ProofRow & { cta_label?: string | null }).cta_label ?? "",
      cta_url: (proof as ProofRow & { cta_url?: string | null }).cta_url ?? "",
      transcript: proof.transcript ?? "",
    });
    if (!parsed.ok) {
      const first = Object.values(parsed.errors)[0] ?? "Check the highlighted fields";
      return toast({ title: "Check your edits", description: first, variant: "destructive" });
    }
    setSaving(true);
    const { error } = await db.from("proof_objects").update({
      author_name: proof.author_name,
      content: proof.content,
      rating: proof.rating,
      media_url: proof.media_url,
      verified: proof.verified,
      highlight_phrase: highlight ? highlight : null,
      outcome_claim: outcome ? outcome : null,
    }).eq("id", proof.id);
    setSaving(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Changes saved" });
  };

  const remove = async () => {
    if (!proof) return;
    const { error } = await supabase.from("proof_objects").delete().eq("id", proof.id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "Proof deleted" });
    navigate("/proof");
  };

  const collectUrl = (token: string) => `${window.location.origin}/collect/${token}`;
  const copyLink = (token: string) => {
    navigator.clipboard.writeText(collectUrl(token));
    toast({ title: "Link copied" });
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proof || !currentBusinessId) return;
    const parsed = fieldErrors(proofRequestSchema, {
      recipient_name: requestForm.recipient_name,
      recipient_email: requestForm.recipient_email,
      requested_type: "testimonial",
    });
    if (!parsed.ok) {
      const first = Object.values(parsed.errors)[0] ?? "Email required";
      return toast({ title: "Check the form", description: first, variant: "destructive" });
    }
    const email = parsed.data.recipient_email;
    setRequestSending(true);

    const { data: inserted, error } = await db
      .from("testimonial_requests")
      .insert({
        business_id: currentBusinessId,
        proof_object_id: proof.id,
        recipient_email: email,
        recipient_name: parsed.data.recipient_name ?? null,
        status: "scheduled",
      })
      .select("id")
      .maybeSingle();

    if (error || !inserted) {
      setRequestSending(false);
      return toast({
        title: "Couldn't create request",
        description: error?.message ?? "Unknown error",
        variant: "destructive",
      });
    }

    // Persist email back to the proof so future re-sends prefill correctly.
    if (!proof.author_email && email) {
      await db.from("proof_objects").update({ author_email: email }).eq("id", proof.id);
    }

    const { data: sendResp, error: sendErr } = await supabase.functions.invoke(
      "send-testimonial-request",
      { body: { request_id: inserted.id, app_origin: window.location.origin } },
    );
    setRequestSending(false);

    if (sendErr || !sendResp?.ok) {
      toast({
        title: "Request created (email not sent)",
        description: sendErr?.message ?? sendResp?.error ?? "Copy the link below and share it manually.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Request sent", description: `Email delivered to ${email}.` });
    }
    setRequestOpen(false);
    loadRequests(proof.id);
  };

  const resend = async (requestId: string) => {
    const { data, error } = await supabase.functions.invoke("send-testimonial-request", {
      body: { request_id: requestId, app_origin: window.location.origin },
    });
    if (error || !data?.ok) {
      return toast({
        title: "Couldn't send",
        description: error?.message ?? data?.error,
        variant: "destructive",
      });
    }
    toast({ title: "Email sent" });
    if (proof?.id) loadRequests(proof.id);
  };

  if (loading) return <div className="space-y-4 max-w-3xl"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!proof) return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild><Link to="/proof"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      <Card><CardContent className="py-16 text-center text-muted-foreground">Proof not found.</CardContent></Card>
    </div>
  );

  const isApproved = proof.status === "approved";
  const isPurchase = proof.type === "purchase" || proof.proof_type === "purchase";
  const hasOpenRequest = linkedRequests.some((r) =>
    ["scheduled", "pending", "sent", "opened"].includes(r.status as string),
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2"><Link to="/proof"><ArrowLeft className="h-4 w-4 mr-1" /> Back to library</Link></Button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-mono">PROOF-02</div>
            <h1 className="text-3xl font-bold mt-1">Proof detail</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isApproved ? "default" : "secondary"} className="capitalize">{proof.status}</Badge>
              <span className="text-sm text-muted-foreground capitalize">{proof.source ?? proof.type}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isApproved && canEdit && (
              <Button size="sm" variant="secondary" asChild>
                <Link to={`/content/generate/${proof.id}`}>
                  <Sparkles className="h-4 w-4 mr-1" /> Generate content
                </Link>
              </Button>
            )}
            {canEdit && isPurchase && !hasOpenRequest && (
              <Button size="sm" variant="secondary" onClick={() => setRequestOpen(true)}>
                <Mail className="h-4 w-4 mr-1" /> Request testimonial
              </Button>
            )}
            {!isApproved ? (
              <Button size="sm" onClick={() => setStatus("approved")} disabled={saving}><Check className="h-4 w-4 mr-1" /> Approve</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setStatus("pending_review")} disabled={saving}><X className="h-4 w-4 mr-1" /> Unapprove</Button>
            )}
          </div>
        </div>
      </div>

      {linkedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Testimonial requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedRequests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                    <span className="text-sm truncate">{r.recipient_email}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.sent_at ? `Sent ${new Date(r.sent_at).toLocaleString()}` : `Scheduled ${new Date(r.created_at).toLocaleString()}`}
                    {r.opened_at ? ` · Opened ${new Date(r.opened_at).toLocaleString()}` : ""}
                    {r.responded_at ? ` · Responded ${new Date(r.responded_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(r.token)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy link
                  </Button>
                  {canEdit && !["responded", "completed", "expired"].includes(r.status as string) && (
                    <Button size="sm" variant="ghost" onClick={() => resend(r.id)}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Send again
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {currentBusinessId && (
        <ProofProductSection
          proofId={proof.id}
          businessId={currentBusinessId}
          canEdit={canEdit}
        />
      )}



      <Card>
        <CardHeader><CardTitle>Edit content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Author name</Label><Input value={proof.author_name ?? ""} onChange={(e) => setProof({ ...proof, author_name: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Verification</Label>
            <Select value={proof.verified ? "verified" : "unverified"} onValueChange={(v) => setProof({ ...proof, verified: v === "verified" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((n) => (
                <button key={n} type="button" onClick={() => setProof({ ...proof, rating: n })} className="p-1">
                  <Star className={`h-5 w-5 ${n <= (proof.rating ?? 0) ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
              {proof.rating && <button type="button" onClick={() => setProof({ ...proof, rating: null })} className="ml-2 text-xs text-muted-foreground hover:text-foreground">clear</button>}
            </div>
          </div>
          <div className="space-y-2"><Label>Content</Label><Textarea rows={5} value={proof.content ?? ""} onChange={(e) => setProof({ ...proof, content: e.target.value })} disabled={!canEdit} /></div>
          {(() => {
            const isCustomerSubmitted = proof.source === "testimonial_request";
            const highlight = (proof as ProofRow & { highlight_phrase?: string | null }).highlight_phrase ?? "";
            const contentText = proof.content ?? "";
            const trimmedHighlight = highlight.trim();
            const notFound = trimmedHighlight.length > 0 && !contentText.toLowerCase().includes(trimmedHighlight.toLowerCase());
            return (
              <>
                <div className="space-y-2">
                  <Label>Outcome claim <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    maxLength={160}
                    placeholder="e.g. Increased signups by 38%"
                    value={proof.outcome_claim ?? ""}
                    onChange={(e) => setProof({ ...proof, outcome_claim: e.target.value })}
                    disabled={!canEdit || isCustomerSubmitted}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isCustomerSubmitted
                      ? "Provided by the customer — read-only to preserve authenticity."
                      : "A short, measurable result attributed to your product. Surfaces in widgets that support outcome chips."}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Highlight key phrase <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    maxLength={120}
                    placeholder="e.g. doubled our conversions in two weeks"
                    value={highlight}
                    onChange={(e) => setProof({ ...proof, highlight_phrase: e.target.value } as ProofRow)}
                    disabled={isCustomerSubmitted}
                  />
                  <p className="text-xs text-muted-foreground">
                    {isCustomerSubmitted
                      ? "Provided by the customer — read-only to preserve authenticity."
                      : "This phrase will be visually emphasized inside the widget. Must appear in the testimonial content."}
                  </p>
                  {notFound && (
                    <p className="text-xs text-amber-600">
                      Heads up — this phrase wasn't found in the content above. It won't be highlighted until it matches.
                    </p>
                  )}
                </div>
              </>
            );
          })()}
          <div className="space-y-2"><Label>Media URL</Label><Input type="url" value={proof.media_url ?? ""} onChange={(e) => setProof({ ...proof, media_url: e.target.value })} /></div>
          {proof.media_url && (
            <div className="rounded-md border bg-muted/30 p-2">
              <img src={proof.media_url} alt="media preview" className="max-h-48 rounded mx-auto" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete this proof?</AlertDialogTitle><AlertDialogDescription>This action can't be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={saveEdits} disabled={saving || !canEdit}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent>
          <form onSubmit={submitRequest} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Request a testimonial</DialogTitle>
              <DialogDescription>
                We'll email this customer a private link to share their experience. The submitted
                testimonial will be linked to this purchase.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="rt-name">Customer name</Label>
              <Input
                id="rt-name"
                value={requestForm.recipient_name}
                onChange={(e) => setRequestForm((f) => ({ ...f, recipient_name: e.target.value }))}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-email">Customer email</Label>
              <Input
                id="rt-email"
                type="email"
                required
                value={requestForm.recipient_email}
                onChange={(e) => setRequestForm((f) => ({ ...f, recipient_email: e.target.value }))}
                placeholder="jane@example.com"
              />
              {!proof.author_email && (
                <p className="text-xs text-muted-foreground">
                  No email is on file for this proof — enter one to send the request.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRequestOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={requestSending}>
                {requestSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
