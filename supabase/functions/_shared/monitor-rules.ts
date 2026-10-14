// Pure alert rules shared by platform-monitor and tests. No Deno or network APIs here.

export type AlertSeverity = "critical" | "warning" | "info";

export interface AlertResult {
  key: string;
  triggered: boolean;
  severity: AlertSeverity;
  domain: string;
  link_tab?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/** A check value that may be unavailable because its query failed. */
export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

export const HEARTBEAT_STALE_MS = 25 * 60 * 1000;

export interface InvocationRow {
  status: string; // "success" | "error"
  created_at: string;
  error_message?: string | null;
}

/**
 * Stripe delivery is judged by evidence, never by silence: a quiet sales
 * period is not an outage. Critical only when verified deliveries failed to
 * process and nothing has succeeded since.
 */
export function stripeAlert(rows: Checked<InvocationRow[]>): AlertResult {
  const base = { key: "stripe_webhook_silent", domain: "revenue", link_tab: "revenue" };
  if (!rows.ok) {
    return { ...base, triggered: false, severity: "info", message: "Stripe delivery could not be checked", metadata: { unavailable: true } };
  }
  const sorted = [...rows.value].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const lastOk = sorted.find((r) => r.status !== "error")?.created_at ?? null;
  const failuresSinceOk = sorted.filter((r) => r.status === "error" && (!lastOk || r.created_at > lastOk));
  if (failuresSinceOk.length > 0) {
    return {
      ...base,
      triggered: true,
      severity: "critical",
      message: `${failuresSinceOk.length} Stripe webhook deliveries failed to process since the last success`,
      metadata: { last_verified_at: lastOk, failures: failuresSinceOk.length, last_error: failuresSinceOk[0].error_message ?? null },
    };
  }
  return {
    ...base,
    triggered: false,
    severity: "info",
    message: lastOk ? "Stripe deliveries are processing" : "No verified Stripe delivery recorded yet",
    metadata: { last_verified_at: lastOk },
  };
}

/** Scheduled email sender: stale heartbeat is critical; a failing run is a warning with its reason. */
export function emailSenderAlerts(last: Checked<InvocationRow | null>, now = Date.now()): AlertResult[] {
  const stale = { key: "ef04_cron_stale", domain: "ai", link_tab: "ai", severity: "critical" as const };
  const failing = { key: "ef04_run_failed", domain: "ai", link_tab: "ai", severity: "warning" as const };
  if (!last.ok) {
    // Unknown is not healthy and not an outage: leave existing alerts untouched.
    return [];
  }
  const row = last.value;
  const isStale = !row || new Date(row.created_at).getTime() < now - HEARTBEAT_STALE_MS;
  return [
    {
      ...stale,
      triggered: isStale,
      message: "Scheduled email sender has not completed a run in the last 25 minutes",
      metadata: { last_run_at: row?.created_at ?? null },
    },
    {
      ...failing,
      triggered: !isStale && row?.status === "error",
      message: `Scheduled email sender's last run failed: ${row?.error_message ?? "unknown reason"}`,
      metadata: { last_run_at: row?.created_at ?? null },
    },
  ];
}

/** Reports any check that could not run, so failures never read as healthy zeros. */
export function unavailableAlert(failedChecks: string[]): AlertResult {
  return {
    key: "monitor_check_unavailable",
    triggered: failedChecks.length > 0,
    severity: "warning",
    domain: "ai",
    link_tab: "ai",
    message: failedChecks.length > 0 ? `Unable to verify: ${failedChecks.join(", ")}` : "All monitoring checks ran",
    metadata: { checks: failedChecks },
  };
}

/** Keys whose active alert must be left as-is because the check behind it did not run. */
export function shouldApply(a: AlertResult): boolean {
  return !(a.metadata && (a.metadata as Record<string, unknown>).unavailable === true);
}
