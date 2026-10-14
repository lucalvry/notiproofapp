// Shared building blocks so every required form field across the app marks
// itself consistently: a red asterisk on the label, a short helper line
// under the control, and a way to jump focus to the first invalid field on
// submit. Keep this file dependency-light — it's imported from auth,
// widgets, campaigns and settings forms.
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  /** Set false for optional fields that still use this component for layout consistency. */
  required?: boolean;
}

/** A <Label> that renders a red asterisk when the field is required. */
export const RequiredLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  RequiredLabelProps
>(({ className, required = true, children, ...props }, ref) => (
  <Label ref={ref} className={cn("inline-flex items-center gap-0.5", className)} {...props}>
    {children}
    {required && (
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    )}
    {required && <span className="sr-only"> (required)</span>}
  </Label>
));
RequiredLabel.displayName = "RequiredLabel";

/** Muted helper text shown under a field explaining what's needed and why. */
export function FieldHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-xs text-muted-foreground", className)}>{children}</p>;
}

/**
 * Focuses the first missing/invalid field inside a form element.
 *
 * Looks for native validation failures first (HTML5 `required`/pattern
 * constraints), then falls back to any element flagged `aria-invalid="true"`
 * or carrying a `data-invalid="true"` attribute (used for fields validated
 * via zod rather than native HTML constraints). Returns true if a field was
 * found and focused.
 */
export function markFirstInvalid(formEl: HTMLFormElement | HTMLElement | null | undefined): boolean {
  if (!formEl) return false;
  const candidates = Array.from(
    formEl.querySelectorAll<HTMLElement>("input, select, textarea, button, [tabindex]"),
  );

  const isInvalid = (el: HTMLElement): boolean => {
    if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
      if (typeof el.checkValidity === "function" && !el.checkValidity()) return true;
    }
    if (el.getAttribute("aria-invalid") === "true") return true;
    if (el.getAttribute("data-invalid") === "true") return true;
    return false;
  };

  const target = candidates.find(isInvalid);
  if (!target) return false;

  target.focus({ preventScroll: false });
  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (typeof (target as HTMLInputElement).reportValidity === "function") {
    (target as HTMLInputElement).reportValidity();
  }
  return true;
}
