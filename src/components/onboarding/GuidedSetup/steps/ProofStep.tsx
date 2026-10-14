import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send } from "lucide-react";
import { proofRequestSchema, parseOrError } from "@/lib/validation";
import { showRateLimitToastIf } from "@/lib/use-rate-limit-toast";
import { useGuidedSetup } from "../context";

const db = supabase as any;

interface Props {
  businessId: string | null;
  onSkip: () => void;
  onSent: () => void;
}

/** Sends a testimonial request using the exact same RPC + edge function flow
 *  as src/pages/proof/ProofRequests.tsx. */
export function ProofStep({ businessId, onSkip, onSent }: Props) {
  const { toast } = useToast();
  const { close } = useGuidedSetup();
  const navigate = useNavigate();
  const [form, setForm] = useState({ recipient_name: "", recipient_email: "" });
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!businessId) return;
    const parsed = parseOrError(proofRequestSchema, {
      recipient_name: form.recipient_name || undefined,
      recipient_email: form.recipient_email,
    });
    if (parsed.error) {
      toast({ title: "Check the request", description: parsed.error, variant: "destructive" });
      return;
    }
    setCreating(true);

    const { data: placeholderId, error: phErr } = await db.rpc("create_placeholder_proof_for_request", {
      _business_id: businessId,
    });
    if (phErr || !placeholderId) {
      setCreating(false);
      toast({ title: "Failed to create", description: phErr?.message ?? "Could not create placeholder proof", variant: "destructive" });
      return;
    }

    const { data: inserted, error } = await db
      .from("testimonial_requests")
      .insert({
        business_id: businessId,
        proof_object_id: placeholderId as string,
        recipient_email: parsed.data.recipient_email,
        recipient_name: parsed.data.recipient_name ?? null,
        status: "scheduled",
      })
      .select("id")
      .maybeSingle();
    if (error || !inserted) {
      setCreating(false);
      toast({ title: "Failed to create", description: error?.message ?? "Unknown error", variant: "destructive" });
      return;
    }

    const { data: sendResp, error: sendErr } = await supabase.functions.invoke("send-testimonial-request", {
      body: { request_id: inserted.id, app_origin: window.location.origin },
    });
    setCreating(false);

    if (sendErr || !sendResp?.ok) {
      if (!showRateLimitToastIf(sendErr ?? sendResp)) {
        toast({
          title: "Request created (email not sent)",
          description: sendErr?.message ?? sendResp?.error ?? "You can resend from Proof → Requests.",
          variant: "destructive",
        });
      }
    } else {
      toast({ title: "Request sent", description: `Email delivered to ${form.recipient_email}.` });
    }
    setForm({ recipient_name: "", recipient_email: "" });
    onSent();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Send a personal link asking a customer to share their experience — or add a testimonial manually.
      </p>
      <div className="space-y-2">
        <Label htmlFor="gs-proof-name">Customer name (optional)</Label>
        <Input id="gs-proof-name" value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gs-proof-email">Customer email</Label>
        <Input
          id="gs-proof-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.recipient_email}
          onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
        />
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              close();
              navigate("/proof");
            }}
          >
            Add manually
          </Button>
          <Button onClick={create} disabled={creating || !form.recipient_email.trim() || !businessId}>
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send request
          </Button>
        </div>
      </div>
    </div>
  );
}
