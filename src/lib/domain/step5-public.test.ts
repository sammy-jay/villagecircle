import { describe, it, expect } from "vitest";
import { maintenanceDecision, maintenanceOn, maintenanceCopy } from "../maintenance";
import { analyticsAllowed, parseConsent } from "../consent";
import { FAQ, POLICIES, filterFaq, policyBySlug } from "../public-content";

describe("maintenance mode (HP7, NFR-01)", () => {
  it("reads the env flag", () => { expect(maintenanceOn("1")).toBe(true); expect(maintenanceOn("true")).toBe(true); expect(maintenanceOn("")).toBe(false); expect(maintenanceOn(undefined)).toBe(false); expect(maintenanceOn("0")).toBe(false); });
  it("does nothing when off", () => { for (const p of ["/", "/home", "/api/asks"]) expect(maintenanceDecision(p, false)).toBe("pass"); });
  it("shows the maintenance page for pages and 503 for APIs", () => { expect(maintenanceDecision("/home", true)).toBe("page"); expect(maintenanceDecision("/api/asks", true)).toBe("api503"); expect(maintenanceDecision("/api/auth/session", true)).toBe("api503"); });
  it("keeps health, cron, webhooks, the page itself and safety routes reachable", () => {
    for (const p of ["/api/health", "/api/cron/daily", "/api/webhooks/daily"]) expect(maintenanceDecision(p, true)).toBe("pass");
    for (const p of ["/maintenance", "/crisis", "/help/report"]) expect(maintenanceDecision(p, true)).toBe("pass");
  });
  it("has board defaults for the window copy", () => { expect(maintenanceCopy({}).backBy).toBe("4:00 am, Saturday 17 October"); expect(maintenanceCopy({ MAINTENANCE_BACK_BY: "5 pm" }).backBy).toBe("5 pm"); });
});
describe("cookie consent (HP5)", () => {
  it("analytics run only after an explicit yes", () => { expect(analyticsAllowed(null)).toBe(false); expect(analyticsAllowed("needed")).toBe(false); expect(analyticsAllowed("analytics")).toBe(true); });
  it("ignores junk stored values", () => { expect(parseConsent("yes")).toBeNull(); expect(parseConsent("needed")).toBe("needed"); });
});
describe("public content", () => {
  it("has eight FAQ answers and every chip returns something", () => { expect(FAQ).toHaveLength(8); for (const a of ["all", "young", "parents", "mentors", "safety"]) expect(filterFaq(FAQ, { aud: a }).length).toBeGreaterThan(0); });
  it("filters by search and topic", () => { expect(filterFaq(FAQ, { q: "recorded" }).map((f) => f.q)).toContain("Is the conversation recorded?"); expect(filterFaq(FAQ, { topic: "privacy" }).length).toBe(2); expect(filterFaq(FAQ, { q: "zzzz" })).toHaveLength(0); });
  it("never promises contact details or money", () => { const all = FAQ.map((f) => f.a).join(" "); expect(all).toMatch(/no phone numbers or emails/i); expect(all).toMatch(/No money changes hands/); });
  it("has five versioned policies with unique slugs", () => { expect(POLICIES).toHaveLength(5); expect(new Set(POLICIES.map((p) => p.slug)).size).toBe(5); expect(policyBySlug("code-of-conduct")?.version).toBe("1.2"); expect(policyBySlug("nope")).toBeUndefined(); });
});
