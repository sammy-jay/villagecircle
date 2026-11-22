import { describe, expect, it } from "vitest";
import { reviewSteps } from "./review-steps";

const review = (o: Partial<NonNullable<Parameters<typeof reviewSteps>[0]["review"]>> = {}) => ({ stepsDone: [], decision: "PENDING", expertiseNeeded: [], summaryApprovedAt: null, withheld: [], ...o });

describe("review steps", () => {
  it("starts at Step A with nothing done", () => {
    expect(reviewSteps({ state: "IN_TEAM_REVIEW", review: review() })).toMatchObject({ done: [], current: "A" });
    expect(reviewSteps({ state: "IN_TEAM_REVIEW", review: null }).current).toBe("A");
  });
  it("marks every step done once the Ask is released, ticked or not", () => {
    const s = reviewSteps({ state: "OPEN_TO_MENTORS", review: review({ decision: "RELEASE", summaryApprovedAt: new Date() }) });
    expect(s.done).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(s.current).toBeNull();
    expect(s.why.F).toBe("Released to mentors");
  });
  it("counts the work: an approved summary completes A to E and leaves F current", () => {
    const s = reviewSteps({ state: "IN_TEAM_REVIEW", review: review({ summaryApprovedAt: new Date() }) });
    expect(s.done).toEqual(["A", "B", "C", "D", "E"]);
    expect(s.current).toBe("F");
  });
  it("saved expertise completes A to D", () => {
    expect(reviewSteps({ state: "IN_TEAM_REVIEW", review: review({ expertiseNeeded: ["EXP-TEC"] }) }).current).toBe("E");
  });
  it("keeps manual ticks, which stay undoable, apart from steps the work completed", () => {
    const s = reviewSteps({ state: "IN_TEAM_REVIEW", review: review({ stepsDone: ["A", "C"], withheld: ["Lincoln High"] }) });
    expect(s.done).toEqual(["A", "B", "C"]);
    expect(s.automatic).toEqual(["A", "B"]);
    expect(s.current).toBe("D");
  });
  it("asks for a new release when an Ask comes back to the team after an earlier round", () => {
    const s = reviewSteps({ state: "IN_TEAM_REVIEW", review: review({ decision: "RELEASE", summaryApprovedAt: new Date(), expertiseNeeded: ["EXP-TEC"] }) });
    expect(s.current).toBe("F");
  });
});
