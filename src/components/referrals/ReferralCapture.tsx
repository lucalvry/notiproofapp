import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { saveReferralCode } from "@/lib/referrals";

/** Remembers ?ref=CODE from any page for 60 days and counts the click. */
export function ReferralCapture() {
  const { search } = useLocation();
  useEffect(() => {
    const code = new URLSearchParams(search).get("ref");
    if (!code) return;
    saveReferralCode(code);
    supabase.rpc("track_referral_click" as never, { _code: code } as never).then(() => {});
  }, [search]);
  return null;
}
