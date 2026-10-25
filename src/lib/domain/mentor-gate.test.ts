import { describe, expect, it } from "vitest";
import { gateFor, mentorHome } from "./mentor-gate";

const ok = { verification: "APPROVED", codeOfConductAt: new Date(), orientationDoneAt: new Date() };

describe("mentor gate", () => {
  it("sends a new or drafting mentor to apply", () => {
    expect(gateFor(null, null)).toBe("APPLY");
    expect(gateFor({ state: "DRAFT" }, null)).toBe("APPLY");
  });
  it("keeps anyone not yet approved on the status page", () => {
    for (const state of ["SUBMITTED", "IN_REVIEW", "SCREENING", "APPEALED", "DECLINED", "WITHDRAWN"]) expect(gateFor({ state }, { ...ok, verification: "PENDING" })).toBe("STATUS");
    expect(gateFor({ state: "APPROVED" }, { ...ok, verification: "PENDING" })).toBe("STATUS");
  });
  it("needs the Code of Conduct and orientation before Asks (BR-01)", () => {
    expect(gateFor({ state: "APPROVED" }, { ...ok, codeOfConductAt: null })).toBe("ORIENTATION");
    expect(gateFor({ state: "APPROVED" }, { ...ok, orientationDoneAt: null })).toBe("ORIENTATION");
    expect(gateFor({ state: "APPROVED" }, ok)).toBe("ACTIVE");
  });
  it("maps each gate to its page", () => {
    expect(mentorHome("APPLY")).toBe("/mentor/apply");
    expect(mentorHome("ACTIVE")).toBe("/mentor");
  });
});
