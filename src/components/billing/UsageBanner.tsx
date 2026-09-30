import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlanUsage } from "@/lib/plan-helpers";
import { VideoBadgeLink } from "@/components/video/YouTubeEmbed";

/**
 * Shows a warning at >=80% usage and a blocker at 100% for either monthly
 * proofs or monthly widget views. Auto-hides on Scale (effectively unlimited).
 */
export function UsageBanner() {
  const { plan, usage, atProofLimit, atEventLimit } = usePlanUsage();
  if (!isFinite(plan.proofLimit) && !isFinite(plan.eventLimit)) return null;

  const proofPct = plan.proofLimit ? usage.proofs_mtd / plan.proofLimit : 0;
  const eventPct = plan.eventLimit ? usage.events_mtd / plan.eventLimit : 0;
  const blocked = atProofLimit || atEventLimit;
  const warn = !blocked && (proofPct >= 0.8 || eventPct >= 0.8);
  if (!blocked && !warn) return null;

  const messages: string[] = [];
  if (atProofLimit) messages.push(`You've hit your ${plan.name} plan limit of ${plan.proofLimit.toLocaleString()} proof items this month.`);
  else if (proofPct >= 0.8) messages.push(`You've used ${usage.proofs_mtd.toLocaleString()} of ${plan.proofLimit.toLocaleString()} proof items this month.`);
  if (atEventLimit) messages.push(`Widget views have reached this month's ${plan.eventLimit.toLocaleString()} cap — your widgets have stopped showing.`);
  else if (eventPct >= 0.8) messages.push(`You've used ${usage.events_mtd.toLocaleString()} of ${plan.eventLimit.toLocaleString()} widget views this month.`);

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${blocked ? "border-destructive/40 bg-destructive/5" : "border-amber-500/40 bg-amber-500/5"}`}>
      <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${blocked ? "text-destructive" : "text-amber-600"}`} />
      <div className="flex-1 space-y-1">
        {messages.map((m, i) => <p key={i} className="text-sm">{m}</p>)}
        {blocked && <VideoBadgeLink audience="marketer" label="See what you'll unlock (1:20)" className="text-xs" />}
      </div>
      <Button asChild size="sm" variant={blocked ? "default" : "outline"}>
        <Link to="/settings/billing">Upgrade</Link>
      </Button>
    </div>
  );
}
