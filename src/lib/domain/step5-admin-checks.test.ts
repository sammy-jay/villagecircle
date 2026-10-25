import { describe, expect, it } from "vitest";
import { canCheck } from "./application-review";

const app = (state: string, type: "MENTOR" | "GUARDIAN" = "MENTOR") => ({ type, state, applicantId: "applicant" });
const ready = { optedForMinors: true, screening: "CLEAR" as const, orientationDone: true, codeOfConduct: true, attestationCurrent: true };

describe("reviewer checklist after approval", () => {
  it("lets the reviewer tick the bio on an approved mentor", () => {
    expect(canCheck(app("APPROVED"), "bio", true, "r1").ok).toBe(true);
    expect(canCheck(app("APPROVED"), "bio", false, "r1").ok).toBe(true);
  });
  it("clears a mentor for under 18 only when approved and every condition is met", () => {
    expect(canCheck(app("APPROVED"), "minors", true, "r1", ready).ok).toBe(true);
    expect(canCheck(app("IN_REVIEW"), "minors", true, "r1", ready).ok).toBe(false);
    expect(canCheck(app("APPROVED"), "minors", true, "r1", { ...ready, screening: "CONSIDER" }).ok).toBe(false);
    expect(canCheck(app("APPROVED"), "minors", true, "r1", { ...ready, optedForMinors: false }).ok).toBe(false);
    expect(canCheck(app("APPROVED"), "minors", true, "r1", { ...ready, orientationDone: false }).ok).toBe(false);
  });
  it("lets the reviewer withdraw the clearance without re-checking the conditions", () => {
    expect(canCheck(app("APPROVED"), "minors", false, "r1", { ...ready, screening: "CONSIDER" }).ok).toBe(true);
  });
  it("never lets someone review their own application", () => {
    expect(canCheck(app("APPROVED"), "bio", true, "applicant").ok).toBe(false);
  });
  it("keeps guardian checklist ticks editable after activation, and rejects mentor items there", () => {
    expect(canCheck(app("APPROVED", "GUARDIAN"), "g1", true, "r1").ok).toBe(true);
    expect(canCheck(app("APPROVED", "GUARDIAN"), "bio", true, "r1").ok).toBe(false);
    expect(canCheck(app("DRAFT", "GUARDIAN"), "g0", true, "r1").ok).toBe(false);
  });
});

import { minorsRequirements } from "./mentor-application";
describe("mentor under-18 requirements (mentor side)", () => {
  const all = { optedForMinors: true, screening: "CLEAR" as const, orientationDone: true, codeOfConduct: true, attestationCurrent: true };
  it("is ready only when all five steps are done", () => {
    expect(minorsRequirements(all).ready).toBe(true);
    expect(minorsRequirements(all).items.every((i) => i.done)).toBe(true);
    for (const k of ["optedForMinors", "orientationDone", "codeOfConduct", "attestationCurrent"] as const) expect(minorsRequirements({ ...all, [k]: false }).ready).toBe(false);
    expect(minorsRequirements({ ...all, screening: "PENDING" }).ready).toBe(false);
    expect(minorsRequirements({ ...all, screening: "CONSIDER" }).ready).toBe(false);
  });
  it("lists the steps in the order the mentor does them", () => {
    expect(minorsRequirements(all).items.map((i) => i.key)).toEqual(["optIn", "screening", "orientation", "conduct", "attestation"]);
  });
});

import { missingMinors } from "./application-review";
describe("clear message when the under-18 tick is refused", () => {
  const all = { optedForMinors: true, screening: "CLEAR" as const, orientationDone: true, codeOfConduct: true, attestationCurrent: true };
  it("names what is still missing", () => {
    expect(missingMinors({ ...all, screening: "PENDING", orientationDone: false })).toBe("Still needed before clearing for under 18: clear enhanced screening, safeguarding orientation.");
    expect(missingMinors({ ...all, optedForMinors: false, codeOfConduct: false })).toContain("the mentor's opt-in, the Code of Conduct");
    expect(missingMinors(all)).toBe("Ready to clear.");
  });
});
