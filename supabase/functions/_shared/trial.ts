// Server copy of src/lib/trial.ts — change both together.
// The countdown starts at the first widget impression on the customer's site, not at sign-up.

export const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

export type TrialState = "paid" | "not_started" | "running" | "ended";

export interface TrialInput {
  plan?: string | null;
  trial_ends_at?: string | null;
  unlimited?: boolean;
}

export interface TrialStatus {
  state: TrialState;
  msLeft: number;
  endsAt: string | null;
}

export function isFreePlan(plan?: string | null): boolean {
  return !plan || plan === "free";
}

export function trialStatus(input: TrialInput, now = Date.now()): TrialStatus {
  if (input.unlimited || !isFreePlan(input.plan)) return { state: "paid", msLeft: 0, endsAt: null };
  if (!input.trial_ends_at) return { state: "not_started", msLeft: 0, endsAt: null };
  const msLeft = new Date(input.trial_ends_at).getTime() - now;
  return msLeft > 0
    ? { state: "running", msLeft, endsAt: input.trial_ends_at }
    : { state: "ended", msLeft: 0, endsAt: input.trial_ends_at };
}

/** Changes are blocked only once a Free trial has ended. */
export function canMakeChanges(input: TrialInput, now = Date.now()): boolean {
  return trialStatus(input, now).state !== "ended";
}

export type TrialEmail = "trial_live" | "trial_day2" | "trial_day3" | "trial_paused";

/** Which countdown email is due right now (the mailer sends each at most once). */
export function trialEmailDue(input: TrialInput, now = Date.now()): TrialEmail | null {
  const s = trialStatus(input, now);
  if (s.state === "ended") return "trial_paused";
  if (s.state !== "running") return null;
  const elapsed = TRIAL_DURATION_MS - s.msLeft;
  const day = 24 * 60 * 60 * 1000;
  if (elapsed >= 2 * day) return "trial_day3";
  if (elapsed >= day) return "trial_day2";
  return "trial_live";
}

export function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
