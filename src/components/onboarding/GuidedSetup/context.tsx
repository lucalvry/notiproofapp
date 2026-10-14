import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { StepKey } from "./types";

export function dismissKey(businessId: string) {
  return `notiproof.guided_setup_dismissed.${businessId}`;
}

interface GuidedSetupContextValue {
  isOpen: boolean;
  step: StepKey;
  mode: "existing" | "new";
  /** Target business id. Null while mode === "new" and no business has been created yet. */
  businessId: string | null;
  open: (step?: StepKey | "business-new") => void;
  close: () => void;
  setStep: (s: StepKey) => void;
  setBusinessId: (id: string) => void;
}

const GuidedSetupContext = createContext<GuidedSetupContextValue | undefined>(undefined);

export function GuidedSetupProvider({ children }: { children: ReactNode }) {
  const { currentBusinessId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<StepKey>("business");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [businessId, setBusinessIdState] = useState<string | null>(null);

  const open = useCallback(
    (s?: StepKey | "business-new") => {
      if (s === "business-new") {
        setMode("new");
        setBusinessIdState(null);
        setStep("business");
        setIsOpen(true);
        return;
      }
      setMode("existing");
      setBusinessIdState(currentBusinessId);
      setStep(s ?? "business");
      setIsOpen(true);
    },
    [currentBusinessId],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    const id = businessId ?? currentBusinessId;
    if (id) localStorage.setItem(dismissKey(id), "1");
  }, [businessId, currentBusinessId]);

  const value = useMemo<GuidedSetupContextValue>(
    () => ({ isOpen, step, mode, businessId, open, close, setStep, setBusinessId: setBusinessIdState }),
    [isOpen, step, mode, businessId, open, close],
  );

  return <GuidedSetupContext.Provider value={value}>{children}</GuidedSetupContext.Provider>;
}

export function useGuidedSetup() {
  const ctx = useContext(GuidedSetupContext);
  if (!ctx) throw new Error("useGuidedSetup must be used within GuidedSetupProvider");
  return ctx;
}
