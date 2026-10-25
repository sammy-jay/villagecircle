import { describe, expect, it } from "vitest";
import { can, permForPath, teamRoleOf } from "./admin-perms";

describe("team permissions (A19)", () => {
  it("keeps recordings with the safeguarding lead only (NFR-05)", () => {
    expect(can("SAFEGUARDING_LEAD", "recordings")).toBe(true);
    for (const r of ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "READ_ONLY"] as const) expect(can(r, "recordings")).toBe(false);
  });
  it("lets read-only see reports and export them, and nothing about people or Asks", () => {
    expect(can("READ_ONLY", "reports.view")).toBe(true);
    expect(can("READ_ONLY", "reports.export")).toBe(true);
    for (const p of ["asks.view", "applications.view", "accounts.view", "safety.view", "help", "audit"] as const) expect(can("READ_ONLY", p)).toBe(false);
  });
  it("lets volunteer reviewers triage but not release or confirm", () => {
    expect(can("VOLUNTEER_REVIEWER", "asks.triage")).toBe(true);
    expect(can("VOLUNTEER_REVIEWER", "asks.release")).toBe(false);
    expect(can("VOLUNTEER_REVIEWER", "applications.decide")).toBe(false);
  });
  it("gives team roles and configuration to the program lead only", () => {
    for (const r of ["REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD", "READ_ONLY"] as const) { expect(can(r, "team")).toBe(false); expect(can(r, "config")).toBe(false); }
    expect(can("PROGRAM_LEAD", "team")).toBe(true);
  });
  it("matches the longest page prefix", () => {
    expect(permForPath("/admin")).toBe("overview");
    expect(permForPath("/admin/asks/abc/compose")).toBe("asks.view");
    expect(permForPath("/admin/roles")).toBe("team");
    expect(permForPath("/admin/incidents/1")).toBe("safety.view");
  });
  it("falls back to a default team role", () => {
    expect(teamRoleOf(["ADMIN"])).toBe("PROGRAM_LEAD");
    expect(teamRoleOf(["ADMIN", "SAFEGUARDING_LEAD"])).toBe("SAFEGUARDING_LEAD");
    expect(teamRoleOf(["ADMIN"], "READ_ONLY")).toBe("READ_ONLY");
    expect(teamRoleOf(["ADMIN"], "nonsense")).toBe("PROGRAM_LEAD");
  });
});

describe("A19 matrix", () => {
  it("matches the board's published table for the rows it shares", async () => {
    const { MATRIX } = await import("./admin-perms");
    const { PERMISSIONS } = await import("./admin-safety-1");
    for (const p of PERMISSIONS) {
      const row = MATRIX.find(([l]) => l === p.label); if (!row) continue;
      for (const r of ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD", "READ_ONLY"] as const) expect([p.label, r, can(r, row[1])]).toEqual([p.label, r, p.roles.includes(r)]);
    }
  });
});

describe("safeguarding lead grant", () => {
  it("adds the lead's permissions to a program lead who holds the grant", async () => {
    const { allows } = await import("./admin-perms");
    expect(allows("PROGRAM_LEAD", ["ADMIN", "SAFEGUARDING_LEAD"], "recordings")).toBe(true);
    expect(allows("PROGRAM_LEAD", ["ADMIN", "SAFEGUARDING_LEAD"], "team")).toBe(true);
    expect(allows("PROGRAM_LEAD", ["ADMIN"], "recordings")).toBe(false);
    expect(allows("REVIEWER", ["ADMIN"], "config")).toBe(false);
  });
});
