// Modal launched from the Proof Library "Request testimonial" button.
// Mirrors the inline form on /proof/request: creates a placeholder proof,
// inserts a testimonial_requests row, and triggers the send-testimonial-request
// edge function. On success calls onSent so the parent can refresh its list.
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { proofRequestSchema, parseOrError } from "@/lib/validation";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import { usePlanUsage } from "@/lib/plan-helpers";

const db = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}

export function RequestTestimonialModal({ open, onOpenChange, onSent }: Props) {
  const { currentBusinessId } = useAuth();
  const { toast } = useToast();
  const { atProofLimit, plan } = usePlanUsage();
  const [form, setForm] = useState({ recipient_name: "", recipient_email: "" });
  const [campaignId, setCampaignId] = useState<string>("none");
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm({ recipient_name: "", recipient_email: "" });
    setCampaignId("none");
  };

  useEffect(() => {
    if (!open || !currentBusinessId) return;
    db.from("campaigns")
      .select("id, name")
      .eq("business_id", currentBusinessId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }: any) => setCampaigns(data ?? []));
  }, [open, currentBusinessId]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusinessId) return;

    const parsed = parseOrError(proofRequestSchema, {
      recipient_name: form.recipient_name || undefined,
      recipient_email: form.recipient_email,
    });
    if (parsed.error) {
      return toast({
        title: "Check the request",
        description: parsed.error,
        variant: "destructive",
      });
    }

    setSubmitting(true);

    // Placeholder proof so the testimonial_requests FK is satisfied.
    const { data: placeholderId, error: phErr } = await db.rpc(
      "create_placeholder_proof_for_request",
      { _business_id: currentBusinessId },
    );
    if (phErr || !placeholderId) {
      setSubmitting(false);
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
      setSubmitting(false);
      return toast({
        title: "Failed to create",
        description: error?.message ?? "Unknown error",
        variant: "destructive",
      });
    }

    const { data: sendResp, error: sendErr } = await supabase.functions.invoke(
      "send-testimonial-request",
      { body: { request_id: inserted.id, app_origin: window.location.origin } },
    );
    setSubmitting(false);

    if (sendErr || !sendResp?.ok) {
      if (showRateLimitToastIf(sendErr ?? sendResp)) {
        reset();
        onOpenChange(false);
        onSent?.();
        return;
      }
      toast({
        title: "Request created (email not sent)",
        description:
          sendErr?.message ??
          sendResp?.error ??
          "You can resend it from the Requests tab.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request sent",
        description: `Email delivered to ${form.recipient_email}.`,
      });
    }

    reset();
    onOpenChange(false);
    onSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a testimonial</DialogTitle>
          <DialogDescription>
            We'll email a personalised collection link your customer can use to
            record a video, audio clip or written response.
          </DialogDescription>
        </DialogHeader>

        {atProofLimit ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            You've hit your <strong>{plan.name}</strong> plan's monthly proof
            limit. Upgrade in Settings → Billing to send more requests.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rt-name">Customer name (optional)</Label>
              <Input
                id="rt-name"
                value={form.recipient_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_name: e.target.value }))
                }
                placeholder="Jane Doe"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rt-email">Customer email</Label>
              <Input
                id="rt-email"
                type="email"
                value={form.recipient_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recipient_email: e.target.value }))
                }
                placeholder="jane@example.com"
                required
                maxLength={255}
              />
            </div>

            {campaigns.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="rt-campaign">Assign to campaign (optional)</Label>
                <Select value={campaignId} onValueChange={setCampaignId}>
                  <SelectTrigger id="rt-campaign">
                    <SelectValue placeholder="No campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No campaign</SelectItem>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
