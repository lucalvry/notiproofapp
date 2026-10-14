import { Button } from "@/components/ui/button";
import { Check, Circle, PartyPopper, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useGuidedSetup } from "../context";
import { useSetupStatus, stepDone } from "../useSetupStatus";
import type { StepKey } from "../types";

/** Only steps whose real data exists are ticked; skipped ones are shown as not done. */
const ITEMS: { key: StepKey; label: string }[] = [
  { key: "business", label: "Business + website added" },
  { key: "connect", label: "Proof source connected" },
  { key: "proof", label: "First proof collected" },
  { key: "widget", label: "First widget created" },
  { key: "install", label: "Script installed and verified on your site" },
];

export function DoneStep() {
  const { close, setStep, businessId } = useGuidedSetup();
  const { currentBusinessId } = useAuth();
  const { counts } = useSetupStatus(businessId ?? currentBusinessId);
  const results = ITEMS.map((i) => ({ ...i, done: stepDone(i.key, counts) }));
  const missing = results.filter((r) => !r.done).length;
  const allDone = counts !== null && missing === 0;

  return (
    <div className="space-y-5 text-center py-2">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
        {allDone ? <PartyPopper className="h-7 w-7" /> : <ListChecks className="h-7 w-7" />}
      </div>
      <h3 className="text-xl font-semibold">{allDone ? "You're all set!" : "Almost there"}</h3>
      <p className="text-sm text-muted-foreground">
        {allDone
          ? "Everything is set up."
          : `${missing} step${missing === 1 ? " is" : "s are"} still not done. You can finish ${missing === 1 ? "it" : "them"} now or later from the dashboard checklist.`}
      </p>
      <ul className="max-w-sm mx-auto text-left space-y-2">
        {results.map((r) => (
          <li
            key={r.key}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3 text-sm",
              r.done ? "bg-accent/5 border-accent/30" : "bg-muted/30 border-border",
            )}
          >
            {r.done ? (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Check className="h-3.5 w-3.5" />
              </span>
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Circle className="h-3.5 w-3.5" />
              </span>
            )}
            <span className={cn("flex-1", r.done ? "text-foreground" : "text-muted-foreground")}>
              {r.label}
              {!r.done && <span className="block text-xs">Not done yet</span>}
            </span>
            {!r.done && (
              <Button size="sm" variant="outline" onClick={() => setStep(r.key)}>
                Do it now
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Button onClick={close} className="mt-2">
        {allDone ? "Go to dashboard" : "Finish later"}
      </Button>
    </div>
  );
}
