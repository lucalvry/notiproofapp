import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGuidedSetup, dismissKey } from "./context";
import { useSetupStatus, stepDone, firstIncompleteStep } from "./useSetupStatus";
import { STEP_ORDER, STEP_LABELS, type StepKey } from "./types";
import { BusinessStep } from "./steps/BusinessStep";
import { ConnectStep } from "./steps/ConnectStep";
import { ProofStep } from "./steps/ProofStep";
import { WidgetStep } from "./steps/WidgetStep";
import { InstallStep } from "./steps/InstallStep";
import { DoneStep } from "./steps/DoneStep";

/** Mount once near the app shell. Renders the guided setup dialog and
 *  auto-opens it for the current business when setup is incomplete and the
 *  user hasn't dismissed it before. */
export function GuidedSetupDialog() {
  const { currentBusinessId } = useAuth();
  const { isOpen, step, mode, businessId, open, close, setStep } = useGuidedSetup();
  const effectiveBusinessId = businessId ?? (mode === "existing" ? currentBusinessId : null);
  const { counts, refresh } = useSetupStatus(effectiveBusinessId);
  const [createdWidgetId, setCreatedWidgetId] = useState<string | null>(null);

  // Auto-open for signed-in app pages (this component is mounted in AppLayout,
  // which is never rendered for /onboarding/* or /admin/*): once counts have
  // it's incomplete + not dismissed, open at the first incomplete step.
  const checkedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBusinessId || isOpen || !counts) return;
    if (checkedRef.current === currentBusinessId) return;
    checkedRef.current = currentBusinessId;
    const dismissed = localStorage.getItem(dismissKey(currentBusinessId)) === "1";
    if (dismissed) return;
    const incomplete = STEP_ORDER.slice(0, -1).some((k) => !stepDone(k, counts));
    if (incomplete) open(firstIncompleteStep(counts));
  }, [currentBusinessId, counts, isOpen, open]);

  const currentIndex = STEP_ORDER.indexOf(step);

  const goNext = (explicit?: StepKey) => {
    refresh();
    if (explicit) {
      setStep(explicit);
      return;
    }
    const next = STEP_ORDER[currentIndex + 1] ?? "done";
    setStep(next);
  };

  const goBack = () => {
    const prev = STEP_ORDER[Math.max(0, currentIndex - 1)];
    setStep(prev);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guided setup</DialogTitle>
          <DialogDescription>Finish the essentials to start collecting and displaying social proof.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-1">
          {STEP_ORDER.map((key, i) => {
            const done = key !== "done" && stepDone(key, counts);
            const isCurrent = key === step;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStep(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isCurrent ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                    done ? "bg-accent text-accent-foreground" : "bg-muted",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {STEP_LABELS[key]}
              </button>
            );
          })}
        </div>

        <div className="pt-2">
          {step === "business" && (
            <BusinessStep onSkip={() => goNext("connect")} onSaved={() => goNext("connect")} />
          )}
          {step === "connect" && (
            <ConnectStep
              businessId={effectiveBusinessId}
              onSkip={() => goNext("widget")}
              onConnected={() => goNext("widget")}
            />
          )}
          {step === "proof" && (
            <ProofStep businessId={effectiveBusinessId} onSkip={() => goNext("install")} onSent={() => goNext("install")} />
          )}
          {step === "widget" && (
            <WidgetStep
              businessId={effectiveBusinessId}
              onSkip={() => goNext("proof")}
              onCreated={(id) => {
                setCreatedWidgetId(id);
                goNext("proof");
              }}
            />
          )}
          {step === "install" && (
            <InstallStep
              businessId={effectiveBusinessId}
              widgetId={createdWidgetId}
              onSkip={() => goNext("done")}
              onVerified={() => goNext("done")}
            />
          )}
          {step === "done" && <DoneStep />}
        </div>

        {step !== "business" && step !== "done" && (
          <div className="flex justify-start pt-1">
            <button type="button" onClick={goBack} className="text-xs text-muted-foreground hover:text-foreground underline">
              Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
