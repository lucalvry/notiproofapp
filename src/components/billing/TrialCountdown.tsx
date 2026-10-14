import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Timer, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrialGate } from "@/hooks/useTrialGate";
import { splitCountdown } from "@/lib/trial";
import { cn } from "@/lib/utils";

/** Free trial countdown. `compact` is the slim bar shown on every page. */
export function TrialCountdown({ compact = false }: { compact?: boolean }) {
  const { status } = useTrialGate(true);
  const { refresh } = useAuth();
  const waiting = status.state !== "running" && status.state !== "ended";

  // The trial starts when the first visitor sees the popup, which can happen
  // while the user is signed in. Re-read the business so the countdown appears
  // without a manual refresh.
  useEffect(() => {
    if (!compact) refresh();
    const onFocus = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onFocus);
    const id = waiting && !compact ? window.setInterval(() => refresh(), 60_000) : undefined;
    return () => {
      document.removeEventListener("visibilitychange", onFocus);
      if (id) window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, compact]);

  if (waiting) return null;

  if (status.state === "ended") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 text-foreground", compact ? "px-3 py-2 text-sm" : "p-4")}>
        <PauseCircle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Your free trial has ended — your proof is paused</div>
          {!compact && <div className="text-sm text-muted-foreground">Your account is view-only. Upgrade to switch your proof back on and keep making changes.</div>}
        </div>
        <Button asChild size="sm"><Link to="/settings/billing">Upgrade to resume</Link></Button>
      </div>
    );
  }

  const { days, hours, minutes, seconds } = splitCountdown(status.msLeft);
  const units = [
    { v: days, l: "days" },
    { v: hours, l: "hrs" },
    { v: minutes, l: "min" },
    { v: seconds, l: "sec" },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
        <Timer className="h-4 w-4 text-accent shrink-0" />
        <span className="flex-1 min-w-0">
          Free trial: your proof is live for{" "}
          <span className="font-semibold tabular-nums">
            {days}d {String(hours).padStart(2, "0")}h {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}s
          </span>{" "}
          more
        </span>
        <Button asChild size="sm" variant="outline"><Link to="/settings/billing">Upgrade</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-accent/30 bg-accent/5 p-5 text-foreground md:flex-row md:items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 font-semibold">
          <Timer className="h-5 w-5 text-accent" /> Your proof is live — free trial countdown has started
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When the timer hits zero, your popup pauses on your site. Upgrade to keep it running.
        </p>
      </div>
      <div className="flex items-center gap-2" aria-live="off">
        {units.map((u) => (
          <div key={u.l} className="min-w-[3.5rem] rounded-lg border border-border bg-background px-2 py-2 text-center">
            <div className="text-2xl font-bold tabular-nums">{String(u.v).padStart(2, "0")}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{u.l}</div>
          </div>
        ))}
      </div>
      <Button asChild><Link to="/settings/billing">Upgrade now</Link></Button>
    </div>
  );
}
