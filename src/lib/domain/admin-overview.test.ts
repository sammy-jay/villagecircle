import { describe, it, expect } from "vitest";
import { buildActions, dailyBuckets, greeting, actionText, type OverviewCounts } from "./admin-overview";
const zero: OverviewCounts = { overdueIncidents: 0, openIncidents: 0, atRiskAsks: 0, attentionAsks: 0, awaitingGuardian: 0, mentorApps: 0, guardianApps: 0, asksToReview: 0, unmet: 0, help: 0, moderation: 0, upcomingMinor: 0 };
describe("admin overview", () => {
  it("is empty when nothing needs doing", () => expect(buildActions(zero)).toEqual([]));
  it("puts safety before queues", () => {
    const a = buildActions({ ...zero, mentorApps: 3, asksToReview: 2, openIncidents: 2, overdueIncidents: 1, atRiskAsks: 1 });
    expect(a[0]!.key).toBe("inc-overdue");
    expect(a.map((x) => x.key).indexOf("inc-open")).toBeLessThan(a.map((x) => x.key).indexOf("asks-review"));
    expect(a.at(-1)!.key).toBe("mentors");
  });
  it("splits overdue from in-window incidents and pluralises", () => {
    const a = buildActions({ ...zero, openIncidents: 3, overdueIncidents: 1 });
    expect(a.find((x) => x.key === "inc-overdue")!.title).toBe("1 incident is past its window");
    expect(a.find((x) => x.key === "inc-open")!.n).toBe(2);
  });
  it("buckets by day and ignores dates outside the range", () => {
    const now = new Date("2026-10-18T12:00:00Z");
    const b = dailyBuckets([new Date("2026-10-18T01:00:00Z"), new Date("2026-10-18T20:00:00Z"), new Date("2026-10-17T05:00:00Z"), new Date("2026-09-01T00:00:00Z")], 14, now);
    expect(b).toHaveLength(14); expect(b.at(-1)).toEqual({ day: "2026-10-18", n: 2 }); expect(b.at(-2)!.n).toBe(1); expect(b.reduce((t, x) => t + x.n, 0)).toBe(3);
  });
  it("greets by time and humanises audit actions", () => { expect(greeting(8)).toBe("Good morning"); expect(greeting(13)).toBe("Good afternoon"); expect(greeting(20)).toBe("Good evening"); expect(actionText("application.approve")).toBe("Application approve"); });
});
