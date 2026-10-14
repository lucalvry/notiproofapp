import { createElement } from "react";
import { ToastAction, type ToastActionElement } from "@/components/ui/toast";
import { supabase } from "@/integrations/supabase/client";
import type { useToast } from "@/hooks/use-toast";

/** Normalizes a business website into https://host form, or returns null if invalid.
 *  Mirrors the validation used in AppLayout's business-creation dialog. */
export function normalizeWebsite(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)) return null;
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1)/i.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Shown when every AI provider failed. Lets the user send the exact failure to the admin. */
export function showAiFailureToast(
  toast: ReturnType<typeof useToast>["toast"],
  failureId: string | null | undefined,
  what = "your brand voice",
) {
  toast({
    title: `We couldn't extract ${what}`,
    description: "This isn't your fault — something went wrong on our side. Send it to our team and we'll fix it and re-run it for you.",
    variant: "destructive",
    duration: 20000,
    action: failureId
      ? createElement(
          ToastAction,
          {
            altText: "Notify the admin",
            onClick: async () => {
              const { error } = await supabase.rpc("report_ai_failure" as never, { _id: failureId } as never);
              toast(error
                ? { title: "Couldn't send the report", description: error.message, variant: "destructive" }
                : { title: "Sent to our team", description: "We'll re-run it automatically once it's fixed." });
            },
          },
          "Notify admin",
        ) as unknown as ToastActionElement
      : undefined,
  });
}

/** Asks the AI to analyze the business's website (favicon + brand DNA). Used by
 *  the guided setup, the add-business box and Settings → Business. */
export async function triggerSiteAnalysis(
  businessId: string,
  websiteUrl: string,
  toast: ReturnType<typeof useToast>["toast"],
) {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-business-site", {
      body: { business_id: businessId, url: websiteUrl },
    });
    if (error) throw error;
    const d = data as { error?: string; failure_id?: string | null } | null;
    if (d?.error === "ai_unavailable") return showAiFailureToast(toast, d.failure_id);
    if (d?.error) throw new Error(d.error);
  } catch {
    toast({
      title: "Couldn't read your website",
      description: "Check the website address, then use \"Analyze website\" in Settings → Business to try again.",
      variant: "destructive",
    });
  }
}
