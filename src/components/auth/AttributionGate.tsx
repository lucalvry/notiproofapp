import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttributionFields } from "@/components/auth/AttributionFields";
import {
  attributionError,
  clearPendingAttribution,
  emptyAttribution,
  getPendingAttribution,
  type AttributionAnswers,
} from "@/lib/attribution";
import { clearReferralCode, getReferralCode } from "@/lib/referrals";

async function record(a: AttributionAnswers, referralCode: string | null) {
  const { error } = await supabase.rpc("record_signup_attribution" as never, {
    _reason: a.reason,
    _reason_other: a.reasonOther || null,
    _source: a.source,
    _source_detail: a.sourceDetail || null,
    _referral_code: referralCode,
  } as never);
  if (!error) {
    clearPendingAttribution();
    clearReferralCode();
  }
  return !error;
}

/** Saves answers captured before the account existed (form, or sign-up metadata). */
export async function submitPendingAttribution(metadata?: Record<string, unknown>): Promise<boolean> {
  const fromMeta = metadata?.signup_attribution as (AttributionAnswers & { referralCode?: string | null }) | undefined;
  const pending = getPendingAttribution() ?? fromMeta ?? null;
  if (!pending || attributionError(pending)) return false;
  return record(pending, getReferralCode() ?? fromMeta?.referralCode ?? null);
}

/**
 * Ensures every signed-in user has answered the two sign-up questions.
 * Records saved answers automatically; otherwise asks once in a required dialog.
 */
export function AttributionGate() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<AttributionAnswers>(emptyAttribution);
  const [saving, setSaving] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  useEffect(() => {
    if (!user || profile?.is_admin) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("signup_attribution" as never).select("id").eq("user_id", user.id).maybeSingle();
      if (cancelled || data) return;
      if (await submitPendingAttribution(user.user_metadata)) return;
      const code = getReferralCode();
      if (code) {
        const { data: name } = await supabase.rpc("referrer_display_name" as never, { _code: code } as never);
        if (typeof name === "string" && name) {
          setReferredBy(name);
          setAnswers((a) => ({ ...a, source: "referral", sourceDetail: `Referral link (${name})` }));
        }
      }
      if (!cancelled) setOpen(true);
    })();
    return () => { cancelled = true; };
  }, [user, profile?.is_admin]);

  const missing = attributionError(answers);
  const save = async () => {
    if (missing) return;
    setSaving(true);
    const ok = await record(answers, getReferralCode());
    setSaving(false);
    if (ok) setOpen(false);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="[&>button]:hidden" onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Two quick questions</DialogTitle>
          <DialogDescription>This helps us build what you need and thank the people who sent you.</DialogDescription>
        </DialogHeader>
        <AttributionFields value={answers} onChange={setAnswers} referredBy={referredBy} />
        <Button onClick={save} disabled={!!missing || saving} className="w-full">
          {saving ? "Saving..." : "Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
