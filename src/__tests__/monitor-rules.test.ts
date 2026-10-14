import { describe, expect, it } from "vitest";
import { emailSenderAlerts, shouldApply, stripeAlert, unavailableAlert } from "../../supabase/functions/_shared/monitor-rules";

const NOW = Date.parse("2026-10-14T10:00:00Z");
const ago = (min: number) => new Date(NOW - min * 60000).toISOString();

describe("Stripe delivery alert", () => {
  it("quiet period with no deliveries is not critical", () => {
    const a = stripeAlert({ ok: true, value: [] });
    expect(a.triggered).toBe(false);
  });
  it("failures after the last success are critical", () => {
    const a = stripeAlert({ ok: true, value: [
      { status: "ok", created_at: ago(120) },
      { status: "error", created_at: ago(5), error_message: "boom" },
    ] });
    expect(a.triggered).toBe(true);
    expect(a.severity).toBe("critical");
  });
  it("a success after a failure clears it", () => {
    const a = stripeAlert({ ok: true, value: [
      { status: "error", created_at: ago(30) },
      { status: "ok", created_at: ago(5) },
    ] });
    expect(a.triggered).toBe(false);
  });
  it("failed check is unavailable and not applied", () => {
    const a = stripeAlert({ ok: false, error: "x" });
    expect(shouldApply(a)).toBe(false);
  });
});

describe("Email sender heartbeat", () => {
  it("missing heartbeat is critical", () => {
    const [stale] = emailSenderAlerts({ ok: true, value: null }, NOW);
    expect(stale.triggered).toBe(true);
  });
  it("recent idle run is healthy", () => {
    const [stale, failed] = emailSenderAlerts({ ok: true, value: { status: "ok", created_at: ago(10) } }, NOW);
    expect(stale.triggered).toBe(false);
    expect(failed.triggered).toBe(false);
  });
  it("recent failed run warns", () => {
    const [, failed] = emailSenderAlerts({ ok: true, value: { status: "error", created_at: ago(3), error_message: "no key" } }, NOW);
    expect(failed.triggered).toBe(true);
  });
  it("failed query changes nothing", () => {
    expect(emailSenderAlerts({ ok: false, error: "x" }, NOW)).toEqual([]);
  });
});

it("failed checks raise an unable-to-verify warning", () => {
  expect(unavailableAlert(["dlq"]).triggered).toBe(true);
  expect(unavailableAlert([]).triggered).toBe(false);
});
