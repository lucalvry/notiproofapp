import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { glossary, type GlossaryKey } from "@/lib/glossary";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface InfoTipProps {
  /** A key from the shared glossary. */
  term?: GlossaryKey;
  /** A custom explanation, used instead of (or when there's no) glossary term. */
  text?: string;
  className?: string;
  /** Optional accessible label override, e.g. "About verification tier". */
  label?: string;
}

/**
 * A small muted help icon that shows a plain-English explanation on hover/focus
 * (desktop) and on tap (touch devices, via a popover).
 */
export function InfoTip({ term, text, className, label }: InfoTipProps) {
  const content = text ?? (term ? glossary[term] : undefined);
  if (!content) return null;

  const ariaLabel = label ?? "More info";

  return (
    <>
      {/* Hover/focus tooltip for pointer & keyboard users */}
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "hidden sm:inline-flex items-center justify-center align-middle text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full",
              className,
            )}
            onClick={(e) => e.preventDefault()}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[260px] text-xs">{content}</TooltipContent>
      </Tooltip>

      {/* Tap-friendly popover for touch devices */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className={cn(
              "sm:hidden inline-flex items-center justify-center align-middle text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-full",
              className,
            )}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="max-w-[260px] w-auto text-xs p-3">{content}</PopoverContent>
      </Popover>
    </>
  );
}

interface LabelWithTipProps {
  label: React.ReactNode;
  term?: GlossaryKey;
  text?: string;
  className?: string;
}

/** Convenience wrapper for table headers / form labels: label text + InfoTip. */
export function LabelWithTip({ label, term, text, className }: LabelWithTipProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span>{label}</span>
      <InfoTip term={term} text={text} label={typeof label === "string" ? `About ${label}` : "More info"} />
    </span>
  );
}
