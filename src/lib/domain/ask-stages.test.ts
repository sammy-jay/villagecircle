import { describe, expect, it } from "vitest";
import { ASK_STAGES, journeyRows, stageNow, stagesDone, statusLabel, type JourneyInput } from "./ask-stages";

const base: JourneyInput = { state: "IN_TEAM_REVIEW", minor: false, guardianName: null, marks: { submitted: new Date("2026-11-01T15:00:00Z"), authorized: null, reviewed: null, stepped: null, approved: null }, mentor: null, connection: null };

describe("ask stages", () => {
  it("are the five agreed stages, in order", () => {
    expect(ASK_STAGES.map((s) => s.label)).toEqual(["Submitted", "Under review", "Finding your mentor", "Ready to schedule", "Completed"]);
  });
  it("place every live state on the trail, and nothing for drafts or closed Asks", () => {
    expect(["AWAITING_GUARDIAN", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "CONNECTION_APPROVED", "SCHEDULED", "COMPLETE"].map(stageNow)).toEqual([0, 1, 2, 3, 4, 4]);
    expect(stagesDone("SCHEDULED")).toBe(4);
    expect([stageNow("DRAFT"), stageNow("WITHDRAWN"), stageNow("LAPSED")]).toEqual([null, null, null]);
  });
  it("keeps a mentor stepping forward hidden until the team confirms (FR-R04)", () => {
    expect(statusLabel("MENTOR_STEPPED_FORWARD")).toBe("Finding your mentor");
  });
  it("says Mentor confirmed once the mentor is confirmed, booked or not", () => {
    expect([statusLabel("CONNECTION_APPROVED"), statusLabel("SCHEDULED")]).toEqual(["Mentor confirmed", "Mentor confirmed"]);
    expect(statusLabel("AWAITING_GUARDIAN")).toBe("Waiting for guardian");
    expect(statusLabel("COMPLETE")).toBe("Completed");
  });
});

describe("journeyRows", () => {
  it("marks the stages done, current and next", () => {
    expect(journeyRows(base).map((r) => r.state)).toEqual(["done", "current", "next", "next", "next"]);
    expect(journeyRows({ ...base, state: "COMPLETE" }).every((r) => r.state === "done")).toBe(true);
  });
  it("tells a minor who they are waiting for", () => {
    const rows = journeyRows({ ...base, state: "AWAITING_GUARDIAN", minor: true, guardianName: "Karen" });
    expect(rows[0]!.state).toBe("current");
    expect(rows[0]!.sub).toContain("Waiting for Karen to approve it");
  });
  it("waits on the guardian for a picked time, and shows the booking once made", () => {
    const at = new Date("2026-11-20T00:00:00Z");
    const picking = journeyRows({ ...base, state: "CONNECTION_APPROVED", minor: true, guardianName: "Karen", mentor: { shortName: "Marcus B." }, connection: { scheduledAt: at, minutes: 30, guardianTimeApprovedAt: null } });
    expect(picking[3]!.sub).toMatch(/Waiting for Karen to approve it/);
    const booked = journeyRows({ ...base, state: "SCHEDULED", mentor: { shortName: "Marcus B." }, connection: { scheduledAt: at, minutes: 30 } });
    expect(booked[3]!.sub).toMatch(/^Booked for /);
    expect(booked[4]!.state).toBe("current");
  });
});
