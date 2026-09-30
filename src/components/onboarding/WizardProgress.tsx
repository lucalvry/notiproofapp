import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { num: 1, label: "Connect" },
  { num: 2, label: "Import" },
  { num: 3, label: "Widget" },
  { num: 4, label: "Install" },
];

export function WizardProgress({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isDone = step.num < current;
          const isActive = step.num === current;
          return (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    isDone && "bg-accent border-accent text-accent-foreground",
                    isActive && "bg-primary border-primary text-primary-foreground",
                    !isDone && !isActive && "bg-card border-border text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-5 w-5" /> : step.num}
                </div>
                <span className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-2 mb-6 transition-colors", step.num < current ? "bg-accent" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
