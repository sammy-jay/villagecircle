import { describe, it, expect } from "vitest";
import { acceptingAsks, aggregateImpact, canRaiseHours, challengeDots, checkInDue, checkInDueAt, countsTowardHours, hoursAtCap, isFirstBusinessDay, monthlyHoursAfterReset, nextWindowTimes, parseAvailability, raiseHours, relativeTime, safeBody, shouldResetMonth, thanksAttribution, toggleChip, WINDOW_CHIPS, chipOn } from "./insight";
import { mentorEligibleForAsk, mentorHasCapacity } from "./permissions";

const m = { verification: "APPROVED" as const, codeOfConductAt: new Date(), orientationDoneAt: new Date(), clearedForMinors: true, monthlyHours: 4, hoursGivenThisMonth: 0 };

describe("mentor hours (BR-13)", () => {
  it("hits the cap exactly at the monthly hours", () => { expect(hoursAtCap({ given: 3.5, monthly: 4 })).toBe(false); expect(hoursAtCap({ given: 4, monthly: 4 })).toBe(true); });
  it("a mentor at the cap gets no Asks; a paused mentor gets none either", () => {
    expect(mentorHasCapacity({ ...m, hoursGivenThisMonth: 4 })).toBe(false);
    expect(mentorEligibleForAsk({ ...m, hoursGivenThisMonth: 4 }, false)).toBe(false);
    expect(mentorEligibleForAsk({ ...m, paused: true }, false)).toBe(false);
    expect(mentorEligibleForAsk(m, true)).toBe(true);
    expect(acceptingAsks({ paused: false }, { given: 1, monthly: 4 })).toBe(true);
  });
  it("only held conversations count", () => { expect(countsTowardHours({ hoursCounted: true, status: "HELD" })).toBe(true); expect(countsTowardHours({ hoursCounted: true, status: "MISSED" })).toBe(false); expect(countsTowardHours({ hoursCounted: false, status: "HELD" })).toBe(false); });
  it("resets once per calendar month", () => { expect(shouldResetMonth("2026-09", new Date("2026-10-01T05:00:00Z"))).toBe(true); expect(shouldResetMonth("2026-10", new Date("2026-10-03T05:00:00Z"))).toBe(false); expect(shouldResetMonth(null, new Date())).toBe(true); });
  it("raising hours works once a month and is undone at the next reset", () => {
    const now = new Date("2026-10-10T10:00:00Z"); const a = parseAvailability(null);
    const r = raiseHours(a, 4, now)!; expect(r.monthly).toBe(5); expect(canRaiseHours(r.availability, now)).toBe(false); expect(raiseHours(r.availability, 5, now)).toBeNull();
    expect(monthlyHoursAfterReset(5, r.availability, new Date("2026-11-01T00:00:00Z")).monthly).toBe(4);
    expect(monthlyHoursAfterReset(5, r.availability, now).monthly).toBe(5);
  });
  it("first business day", () => { expect(isFirstBusinessDay(new Date("2026-10-01T08:00:00Z"))).toBe(true); expect(isFirstBusinessDay(new Date("2026-11-01T08:00:00Z"))).toBe(false); expect(isFirstBusinessDay(new Date("2026-11-02T08:00:00Z"))).toBe(true); expect(isFirstBusinessDay(new Date("2026-10-02T08:00:00Z"))).toBe(false); });
});

describe("availability", () => {
  it("ignores unknown cells", () => expect(parseAvailability({ grid: ["Mon-8", "Foo-1"], paused: true }).grid).toEqual(["Mon-8"]));
  it("chips map onto the grid", () => { const g = toggleChip([], WINDOW_CHIPS[2]!.cells); expect(chipOn(g, WINDOW_CHIPS[2]!.cells)).toBe(true); expect(toggleChip(g, WINDOW_CHIPS[2]!.cells)).toEqual([]); });
  it("finds the next window times", () => {
    const t = nextWindowTimes(["Sat-8"], new Date("2026-10-14T12:00:00Z"), "America/Chicago", 1); expect(t).toHaveLength(1);
    expect(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", hourCycle: "h23" }).format(t[0]!)).toContain("Sat");
  });
});

describe("check-ins", () => {
  const ended = new Date("2026-09-10T18:00:00Z");
  it("is due 30 days after", () => { expect(checkInDueAt(ended).toISOString()).toBe("2026-10-10T18:00:00.000Z"); });
  const base = { endedAt: ended, status: "HELD", participantOutcome: "HAPPENED", hasCheckIn: false };
  it("due only once the 30 days have passed, once, and not after a problem", () => {
    expect(checkInDue(base, new Date("2026-10-09T00:00:00Z"))).toBe(false);
    expect(checkInDue(base, new Date("2026-10-11T00:00:00Z"))).toBe(true);
    expect(checkInDue({ ...base, hasCheckIn: true }, new Date("2026-10-11T00:00:00Z"))).toBe(false);
    expect(checkInDue({ ...base, participantOutcome: "PROBLEM" }, new Date("2026-10-11T00:00:00Z"))).toBe(false);
    expect(checkInDue({ ...base, status: "MISSED" }, new Date("2026-10-11T00:00:00Z"))).toBe(false);
  });
});

describe("impact is counts only", () => {
  const now = new Date("2026-10-14T10:00:00Z");
  const conns = [
    { durationMinutes: 60, hoursCounted: true, status: "HELD", endedAt: new Date("2026-10-02T10:00:00Z"), helpedNextStep: "YES" },
    { durationMinutes: 30, hoursCounted: true, status: "HELD", endedAt: new Date("2026-03-02T10:00:00Z"), helpedNextStep: "LITTLE" },
    { durationMinutes: 60, hoursCounted: false, status: "MISSED", endedAt: null, helpedNextStep: null },
  ];
  it("aggregates hours, conversations and tallies", () => {
    const a = aggregateImpact(conns, 3, 2, now);
    expect(a).toMatchObject({ hoursThisYear: 1.5, conversationsHeld: 2, conversationsThisMonth: 1, thanks: 3, resources: 2, helpedNextStep: { yes: 1, little: 1, notReally: 0 } });
    expect(JSON.stringify(a)).not.toMatch(/name|email/i);
  });
  it("challenge dots are whole hours up to twelve", () => { expect(challengeDots(7.9)).toBe(7); expect(challengeDots(30)).toBe(12); });
  it("thanks are never attributed by name", () => { expect(thanksAttribution({ ageBand: "AGE_16_17", isGuardian: false })).toBe("A high school student"); expect(thanksAttribution({ ageBand: null, isGuardian: true })).toBe("A parent or guardian"); });
  it("notification bodies drop contact details", () => expect(safeBody("Call 713 555 0182 or a@b.com")).not.toMatch(/@|555/));
});

describe("relative time", () => {
  const now = new Date("2026-10-14T12:00:00Z");
  it("reads naturally", () => { expect(relativeTime(new Date("2026-10-14T10:00:00Z"), now)).toBe("2 hours ago"); expect(relativeTime(new Date("2026-10-13T09:00:00Z"), now)).toBe("Yesterday"); expect(relativeTime(new Date("2026-10-03T09:00:00Z"), now)).toBe("3 Oct"); });
});
