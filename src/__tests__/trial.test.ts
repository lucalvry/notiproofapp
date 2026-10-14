import { describe, expect, it } from "vitest";
import { canMakeChanges, trialEmailDue, trialStatus, TRIAL_DURATION_MS } from "@/lib/trial";
import * as server from "../../supabase/functions/_shared/trial";

const NOW = Date.parse("2026-10-14T10:00:00Z");
const iso = (ms: number) => new Date(NOW + ms).toISOString();
const H = 3600_000;

describe("free trial", () => {
  it("does not start at sign-up (no first impression yet)", () => {
    expect(trialStatus({ plan: "free", trial_ends_at: null }, NOW).state).toBe("not_started");
    expect(canMakeChanges({ plan: "free", trial_ends_at: null }, NOW)).toBe(true);
  });
  it("lasts 3 days from the first impression", () => {
    expect(TRIAL_DURATION_MS).toBe(3 * 24 * H);
    expect(trialStatus({ plan: "free", trial_ends_at: iso(H) }, NOW).state).toBe("running");
  });
  it("blocks changes after the trial on Free", () => {
    expect(canMakeChanges({ plan: "free", trial_ends_at: iso(-1) }, NOW)).toBe(false);
  });
  it("paid plans and admins are never blocked", () => {
    expect(canMakeChanges({ plan: "starter", trial_ends_at: iso(-1) }, NOW)).toBe(true);
    expect(canMakeChanges({ plan: "free", trial_ends_at: iso(-1), unlimited: true }, NOW)).toBe(true);
  });
  it("emails follow the countdown and stop after upgrading", () => {
    expect(trialEmailDue({ plan: "free", trial_ends_at: iso(TRIAL_DURATION_MS - H) }, NOW)).toBe("trial_live");
    expect(trialEmailDue({ plan: "free", trial_ends_at: iso(TRIAL_DURATION_MS - 25 * H) }, NOW)).toBe("trial_day2");
    expect(trialEmailDue({ plan: "free", trial_ends_at: iso(TRIAL_DURATION_MS - 49 * H) }, NOW)).toBe("trial_day3");
    expect(trialEmailDue({ plan: "free", trial_ends_at: iso(-1) }, NOW)).toBe("trial_paused");
    expect(trialEmailDue({ plan: "growth", trial_ends_at: iso(-1) }, NOW)).toBe(null);
  });
  it("server copy matches the app rules", () => {
    const cases = [null, iso(H), iso(-1), iso(TRIAL_DURATION_MS - 30 * H)];
    for (const t of cases) {
      expect(server.trialEmailDue({ plan: "free", trial_ends_at: t }, NOW)).toBe(trialEmailDue({ plan: "free", trial_ends_at: t }, NOW));
      expect(server.trialStatus({ plan: "free", trial_ends_at: t }, NOW).state).toBe(trialStatus({ plan: "free", trial_ends_at: t }, NOW).state);
    }
    expect(server.TRIAL_DURATION_MS).toBe(TRIAL_DURATION_MS);
  });
});
