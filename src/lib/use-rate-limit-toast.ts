// Surfaces a friendly toast when an edge function returns 429.
// Pass it the error object from supabase.functions.invoke or a fetch Response.
import { toast } from "sonner";

interface MaybeRateLimited {
  status?: number;
  retry_after?: number;
  error?: string;
}

/**
 * Show a friendly "too many requests" toast if the supplied response/error
 * indicates a 429. Returns true if it handled the error.
 */
export function showRateLimitToastIf(
  err: unknown,
  fallbackMessage = "Too many requests, please slow down.",
): boolean {
  if (!err) return false;
  const obj = err as MaybeRateLimited & Record<string, unknown>;
  const status = (obj.status as number | undefined) ?? (obj as { code?: number }).code;
  const retryAfter =
    (obj.retry_after as number | undefined) ?? (obj as { retryAfter?: number }).retryAfter;

  const looks429 =
    status === 429 ||
    obj.error === "rate_limited" ||
    /rate.?limit|too many/i.test(String((obj as { message?: string }).message ?? ""));

  if (!looks429) return false;

  const seconds = Number.isFinite(retryAfter) ? Math.ceil(Number(retryAfter)) : 0;
  toast.error(
    seconds > 0
      ? `Too many requests — please try again in ${seconds}s.`
      : fallbackMessage,
  );
  return true;
}
