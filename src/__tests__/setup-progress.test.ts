import { describe, it, expect } from "vitest";
import { businessStepDone } from "@/lib/setup-progress";

describe("businessStepDone", () => {
  it("is done with a website", () => expect(businessStepDone({ website_url: "https://a.com" })).toBe(true));
  it("is done with a domain only", () => expect(businessStepDone({ website_url: null, domainCount: 1 })).toBe(true));
  it("is not done with neither", () => expect(businessStepDone({ website_url: " ", domainCount: 0 })).toBe(false));
});
