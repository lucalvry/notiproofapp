import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlanKey = "free" | "starter" | "growth" | "agency" | string | null | undefined;

const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  free: {
    label: "Free",
    className: "bg-muted text-muted-foreground border-transparent",
  },
  starter: {
    label: "Starter",
    className:
      "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-transparent",
  },
  growth: {
    label: "Growth",
    className:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-transparent",
  },
  agency: {
    label: "Agency",
    className:
      "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-transparent",
  },
};

export function PlanBadge({ plan, className }: { plan: PlanKey; className?: string }) {
  const key = (plan ?? "free") as string;
  const style = PLAN_STYLES[key] ?? PLAN_STYLES.free;
  return (
    <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}