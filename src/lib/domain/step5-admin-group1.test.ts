import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  canChangeRoles, canSuspend, canDeleteData, canMoveIncident, nextIncidentState, incidentCountdown, incidentView, PERMISSIONS, TEAM_ROLES, teamRoleAllows, checkRoleChange, rolesForTeamRole,
  auditWhere, auditCsv, diffSummary, actionLabel, actorLabel, dataRequestStatus, canDeleteNow, dataPersonLabel, helpFromLabel, ago, looksLikeSafeguarding, SUSPEND_EFFECTS, rolesLabel, twoStepLabel, deleteNameMatches,
} from "./admin-safety-1";
import { assertAppendOnly } from "../append-only";

describe("who may do what (enforced by server functions, not only hidden)", () => {
  it("only ADMIN changes roles", () => { expect(canChangeRoles(["ADMIN"])).toBe(true); expect(canChangeRoles(["SAFEGUARDING_LEAD"])).toBe(false); expect(canChangeRoles(["MENTOR"])).toBe(false); });
  it("suspending a mentor is safeguarding-lead-only; other accounts admin or lead", () => {
    expect(canSuspend(["ADMIN"], ["MENTOR"])).toBe(false); expect(canSuspend(["ADMIN", "SAFEGUARDING_LEAD"], ["MENTOR"])).toBe(true);
    expect(canSuspend(["ADMIN"], ["PARTICIPANT"])).toBe(true); expect(canSuspend(["PARTICIPANT"], ["PARTICIPANT"])).toBe(false);
  });
  it("data deletion is safeguarding-lead-only", () => { expect(canDeleteData(["ADMIN"])).toBe(false); expect(canDeleteData(["SAFEGUARDING_LEAD"])).toBe(true); });
  it("a role change never targets yourself", () => { expect(checkRoleChange({ actorId: "a", targetId: "a", adminCount: 2, targetIsAdmin: true, newRole: "REVIEWER" }).ok).toBe(false); expect(checkRoleChange({ actorId: "a", targetId: "b", adminCount: 2, targetIsAdmin: true, newRole: "REVIEWER" }).ok).toBe(true); });
  it("the safeguarding-lead permission comes only with that team role", () => { expect(rolesForTeamRole("SAFEGUARDING_LEAD")).toContain("SAFEGUARDING_LEAD"); expect(rolesForTeamRole("PROGRAM_LEAD")).not.toContain("SAFEGUARDING_LEAD"); });
});

describe("permission matrix (A19)", () => {
  it("recordings are visible to the safeguarding lead only (NFR-05)", () => { for (const r of TEAM_ROLES) expect(teamRoleAllows(r, "See recordings")).toBe(r === "SAFEGUARDING_LEAD"); });
  it("only the program lead manages roles and edits configuration", () => { for (const p of ["Manage team roles", "Edit configuration and templates"]) expect(PERMISSIONS.find((x) => x.label === p)!.roles).toEqual(["PROGRAM_LEAD"]); });
  it("has the nine board rows", () => expect(PERMISSIONS).toHaveLength(9));
});

describe("incident state machine (A11)", () => {
  const sg = ["ADMIN", "SAFEGUARDING_LEAD"] as const; const adm = ["ADMIN"] as const;
  it("walks REPORTED, TRIAGED, INVESTIGATING, ACTIONED, CLOSED", () => { expect(nextIncidentState("REPORTED")).toBe("TRIAGED"); expect(nextIncidentState("TRIAGED")).toBe("INVESTIGATING"); expect(nextIncidentState("INVESTIGATING")).toBe("ACTIONED"); expect(nextIncidentState("ACTIONED")).toBe("CLOSED"); expect(nextIncidentState("CLOSED")).toBeNull(); });
  it("cannot skip a step", () => expect(canMoveIncident("REPORTED", "INVESTIGATING", [...sg]).ok).toBe(false));
  it("only the safeguarding lead moves or closes an incident", () => { expect(canMoveIncident("REPORTED", "TRIAGED", [...adm]).ok).toBe(false); expect(canMoveIncident("ACTIONED", "CLOSED", [...adm], "a long enough resolution note").ok).toBe(false); });
  it("closing needs a resolution note", () => { expect(canMoveIncident("ACTIONED", "CLOSED", [...sg], "short").ok).toBe(false); expect(canMoveIncident("ACTIONED", "CLOSED", [...sg], "Mentor warned and re-briefed.").ok).toBe(true); });
  it("a closed incident cannot move", () => expect(canMoveIncident("CLOSED", "TRIAGED", [...sg]).ok).toBe(false));
  it("countdown: 31 hours left of 48, overdue, none when closed", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(incidentCountdown(new Date(now.getTime() + 31 * 3600_000), 48, false, now)?.label).toBe("31 hours left of 48");
    expect(incidentCountdown(new Date(now.getTime() - 2 * 3600_000), 24, false, now)).toMatchObject({ overdue: true, label: "Overdue by 2 hours" });
    expect(incidentCountdown(new Date(now.getTime() + 3600_000), 48, true, now)).toBeNull();
  });
  it("others see that an incident exists, not what it says", () => {
    const v = incidentView({ description: "secret", resolution: "x" }, ["ADMIN"]); expect(v.description).toBeNull(); expect(v.resolution).toBeNull();
    expect(incidentView({ description: "secret", resolution: null }, ["SAFEGUARDING_LEAD"]).description).toBe("secret");
  });
});

describe("suspension", () => {
  it("has the four non-optional effects from the board", () => { expect(SUSPEND_EFFECTS).toHaveLength(4); expect(SUSPEND_EFFECTS.join(" ")).toMatch(/Asks to the team/); expect(SUSPEND_EFFECTS.join(" ")).toMatch(/guardians/); expect(SUSPEND_EFFECTS.join(" ")).toMatch(/24 hours/); });
});

// ───────── service tests with a mocked database ─────────
const m = vi.hoisted(() => {
  const fn = () => vi.fn(async (..._a: unknown[]) => null as unknown);
  return {
    audit: vi.fn(async (..._a: unknown[]) => undefined),
    db: {
      user: { findUnique: fn(), update: fn(), count: fn(), create: fn() }, accountSuspension: { create: fn(), updateMany: fn() }, eligibilityHold: { upsert: fn(), updateMany: fn() },
      deletionRequest: { upsert: fn() }, connection: { findMany: fn(), update: fn() }, shortlistEntry: { findMany: vi.fn(async () => []), update: fn() }, guardianLink: { findMany: vi.fn(async () => []) },
      teamMember: { findUnique: fn(), upsert: fn(), create: fn() }, incident: { findUnique: fn(), update: fn(), count: fn() }, incidentEvent: { create: fn() },
    },
  };
});
vi.mock("../db", () => ({ db: m.db }));
vi.mock("../audit", () => ({ audit: m.audit }));
vi.mock("../notify", () => ({ notify: vi.fn(async () => undefined), notifySafeguarding: vi.fn(async () => undefined) }));
vi.mock("../asks", () => ({ moveAsk: vi.fn(async () => ({ ok: true })) }));
vi.mock("../account", () => ({ sendResetEmail: vi.fn(async () => undefined), esc: (s: string) => s }));

const OID = "a".repeat(24); const OID2 = "b".repeat(24);
beforeEach(() => { vi.clearAllMocks(); });

describe("service enforcement", () => {
  it("an admin who is not the safeguarding lead cannot suspend a mentor, and nothing is written", async () => {
    const { suspendAccount } = await import("../admin-accounts");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, roles: ["MENTOR"], status: "ACTIVE", mentor: { id: "m1" } });
    const r = await suspendAccount({ id: OID, roles: ["ADMIN"] }, OID2, { reason: "V-DISCLOSE", note: "x" });
    expect(r.ok).toBe(false); expect(m.db.user.update).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
  it("suspending a mentor as the safeguarding lead sets PAUSED (never deletes), records it and audits", async () => {
    const { suspendAccount } = await import("../admin-accounts");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, roles: ["MENTOR"], status: "ACTIVE", mentor: { id: "m1" } });
    m.db.connection.findMany.mockResolvedValue([]);
    const r = await suspendAccount({ id: OID, roles: ["ADMIN", "SAFEGUARDING_LEAD"] }, OID2, { reason: "V-DISCLOSE", note: "n" });
    expect(r.ok).toBe(true);
    expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: OID2 }, data: { status: "PAUSED" } });
    expect(m.audit).toHaveBeenCalledWith(OID, "mentor.suspend", "User", OID2, expect.anything(), expect.objectContaining({ reason: "V-DISCLOSE" }));
  });
  it("suspension returns open Asks to the team and notifies guardians of a booked conversation", async () => {
    const { suspendAccount } = await import("../admin-accounts"); const { notify } = await import("../notify"); const { moveAsk } = await import("../asks");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, roles: ["MENTOR"], status: "ACTIVE", mentor: { id: "m1" } });
    m.db.connection.findMany.mockResolvedValue([{ id: "c1", askId: "k1", participantId: "p1", ask: { state: "SCHEDULED" }, participant: { user: { dateOfBirth: new Date(Date.now() - 15 * 365 * 86400_000) } } }]);
    (m.db.guardianLink.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ guardian: { userId: "g1" } }]);
    const r = await suspendAccount({ id: OID, roles: ["ADMIN", "SAFEGUARDING_LEAD"] }, OID2, { reason: "V-CONDUCT" });
    expect(r).toMatchObject({ ok: true, returnedAsks: 1, guardiansNotified: 1 });
    expect(moveAsk).toHaveBeenLastCalledWith("k1", "IN_TEAM_REVIEW", "SYSTEM", expect.anything());
    expect(m.db.connection.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: expect.objectContaining({ status: "CANCELLED" }) });
    expect(notify).toHaveBeenCalledWith("g1", "connection.cancelled", expect.any(String), expect.not.stringMatching(/@|\d{6,}/), expect.anything());
  });
  it("reinstating is reversible: status returns to ACTIVE, hold resolved, audit written", async () => {
    const { restoreAccount } = await import("../admin-accounts");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, roles: ["MENTOR"], status: "PAUSED" });
    expect((await restoreAccount({ id: OID, roles: ["ADMIN"] }, OID2)).ok).toBe(false);
    const r = await restoreAccount({ id: OID, roles: ["ADMIN", "SAFEGUARDING_LEAD"] }, OID2);
    expect(r.ok).toBe(true); expect(m.db.user.update).toHaveBeenCalledWith({ where: { id: OID2 }, data: { status: "ACTIVE" } }); expect(m.audit).toHaveBeenCalledWith(OID, "mentor.reinstate", "User", OID2, expect.anything(), expect.anything());
  });
  it("deleting an account is refused for non-leads and needs the typed name", async () => {
    const { deleteAccount } = await import("../admin-accounts");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, name: "Tomi Adeyemi", roles: ["PARTICIPANT"], status: "ACTIVE" });
    expect((await deleteAccount({ id: OID, roles: ["ADMIN"] }, OID2, "Tomi Adeyemi")).ok).toBe(false);
    expect((await deleteAccount({ id: OID, roles: ["SAFEGUARDING_LEAD"] }, OID2, "Tomi")).ok).toBe(false);
    expect(m.db.deletionRequest.upsert).not.toHaveBeenCalled();
    expect((await deleteAccount({ id: OID, roles: ["SAFEGUARDING_LEAD"] }, OID2, " tomi adeyemi ")).ok).toBe(true);
    expect(m.audit).toHaveBeenCalledWith(OID, "account.delete.scheduled", "User", OID2, expect.anything(), expect.anything());
  });
  it("a safeguarding lead who is not an admin cannot change roles", async () => {
    const { changeTeamRole, inviteTeamMember } = await import("../admin-accounts");
    expect((await changeTeamRole({ id: OID, roles: ["SAFEGUARDING_LEAD"] }, OID2, "REVIEWER")).ok).toBe(false);
    expect((await inviteTeamMember({ id: OID, roles: ["SAFEGUARDING_LEAD"] }, { name: "A B", email: "a@b.co", teamRole: "REVIEWER" })).ok).toBe(false);
    expect(m.db.user.update).not.toHaveBeenCalled();
  });
  it("an admin's role change is audited with before and after", async () => {
    const { changeTeamRole } = await import("../admin-accounts");
    m.db.user.findUnique.mockResolvedValue({ id: OID2, roles: ["ADMIN"] }); m.db.user.count.mockResolvedValue(2);
    expect((await changeTeamRole({ id: OID, roles: ["ADMIN"] }, OID2, "SAFEGUARDING_LEAD")).ok).toBe(true);
    expect(m.audit).toHaveBeenCalledWith(OID, "team.role.change", "User", OID2, expect.objectContaining({ roles: ["ADMIN"] }), expect.objectContaining({ teamRole: "SAFEGUARDING_LEAD" }));
  });
  it("incident closure by a non-lead writes nothing; by the lead it audits each step", async () => {
    const { resolveIncident } = await import("../admin-incidents");
    m.db.incident.findUnique.mockResolvedValue({ id: OID2, state: "ACTIONED", severity: "MEDIUM", reporterId: "r1" });
    expect((await resolveIncident(OID2, { id: OID, roles: ["ADMIN"] }, { outcome: "No further action needed", severity: "LOW", note: "Nothing further to do here." })).ok).toBe(false);
    expect(m.db.incident.update).not.toHaveBeenCalled();
    const r = await resolveIncident(OID2, { id: OID, roles: ["ADMIN", "SAFEGUARDING_LEAD"] }, { outcome: "No further action needed", severity: "LOW", note: "Nothing further to do here." });
    expect(r.ok).toBe(true); expect(m.audit).toHaveBeenCalledWith(OID, "incident.move", "Incident", OID2, { state: "ACTIONED" }, { state: "CLOSED" }); expect(m.audit).toHaveBeenCalledWith(OID, "incident.resolve", "Incident", OID2, expect.anything(), expect.anything());
  });
});

describe("audit log (A15)", () => {
  it("is append-only: update and delete are blocked at the data layer", () => { for (const op of ["update", "updateMany", "upsert", "delete", "deleteMany"]) expect(() => assertAppendOnly("AuditEvent", op)).toThrow(); expect(() => assertAppendOnly("AuditEvent", "create")).not.toThrow(); });
  it("filters by actor, object and a whole-day date range", () => {
    expect(auditWhere({ actor: "SYSTEM" })).toEqual({ actorId: null }); expect(auditWhere({ actor: "nope" })).toEqual({});
    const w = auditWhere({ object: "Ask", from: "2026-10-01", to: "2026-10-08" }) as { createdAt: { gte: Date; lte: Date } };
    expect(w.createdAt.gte.toISOString()).toBe("2026-10-01T00:00:00.000Z"); expect(w.createdAt.lte.toISOString()).toBe("2026-10-08T23:59:59.999Z");
  });
  it("CSV escapes quotes and neutralises spreadsheet formulas", () => {
    const csv = auditCsv([{ actor: "=HYPERLINK(1)", action: 'Said "hi"', object: "Ask #1", change: "a, b", when: new Date("2026-10-07T16:12:00Z") }]).split("\n")[1]!;
    expect(csv).toContain("'=HYPERLINK(1)"); expect(csv).toContain('"Said ""hi"""'); expect(csv).toContain('"a, b"');
  });
  it("before and after never carry contact details", () => { const s = diffSummary({ state: "A", email: "x@y.z", phone: "123" }, { state: "B", email: "q@y.z" }); expect(s).toBe("state: A → B"); expect(s).not.toMatch(/@/); });
  it("labels actors: team by short name, others by role only (no names of minors), null as System", () => {
    expect(actorLabel(null)).toBe("System"); expect(actorLabel({ name: "Maya Rivers", roles: ["ADMIN"] })).toBe("Maya R."); expect(actorLabel({ name: "Amara Okafor", roles: ["PARTICIPANT"] })).toBe("Participant"); expect(actorLabel({ name: "N O", roles: ["GUARDIAN"] })).toBe("Guardian");
  });
  it("turns action codes into words", () => { expect(actionLabel("template.save")).toBe("Edited template"); expect(actionLabel("data.export.requested")).toBe("Data export requested"); });
});

describe("data requests (A28) and legal hold", () => {
  it("shows the board's statuses", () => {
    expect(dataRequestStatus({ kind: "EXPORT", minor: true }).label).toBe("Ready · guardian told");
    expect(dataRequestStatus({ kind: "EXPORT", minor: false, exportExpired: true }).label).toBe("Complete");
    expect(dataRequestStatus({ kind: "DELETE", minor: false }).label).toBe("30-day wait");
    expect(dataRequestStatus({ kind: "DELETE", minor: true })).toMatchObject({ label: "Needs guardian confirmation", needsAction: true });
    expect(dataRequestStatus({ kind: "DELETE", minor: true, teamState: "CONFIRMED" }).label).toBe("30-day wait");
  });
  it("deleting now: lead only, guardian confirmation for minors, blocked by an open incident or a hold", () => {
    const base = { roles: ["SAFEGUARDING_LEAD"] as never, minor: false, guardianConfirmed: false, openIncidents: 0, onHold: false };
    expect(canDeleteNow(base).ok).toBe(true); expect(canDeleteNow({ ...base, roles: ["ADMIN"] }).ok).toBe(false); expect(canDeleteNow({ ...base, minor: true }).ok).toBe(false); expect(canDeleteNow({ ...base, minor: true, guardianConfirmed: true }).ok).toBe(true);
    expect(canDeleteNow({ ...base, openIncidents: 1 }).ok).toBe(false); expect(canDeleteNow({ ...base, onHold: true }).ok).toBe(false);
  });
  it("names a minor with age; adults by initial; deleted people anonymously", () => { expect(dataPersonLabel({ name: "Amara Okafor", minor: true, age: 16, anonymised: false })).toBe("Amara Okafor (16)"); expect(dataPersonLabel({ name: "Tomi Adeyemi", minor: false, age: 30, anonymised: false })).toBe("T. Adeyemi"); expect(dataPersonLabel({ name: "Former member", minor: false, age: null, anonymised: true })).toBe("Former member"); });
  it("name confirmation is exact apart from case and spaces", () => { expect(deleteNameMatches(" tomi adeyemi", "Tomi Adeyemi")).toBe(true); expect(deleteNameMatches("Tomi", "Tomi Adeyemi")).toBe(false); });
});

describe("accounts (A16) and help (A29)", () => {
  it("labels", () => { expect(rolesLabel(["MENTOR", "PARTICIPANT"])).toBe("Mentor, participant"); expect(rolesLabel(["SAFEGUARDING_LEAD", "ADMIN"])).toBe("Admin, safeguarding lead"); });
  it("two-step: required for team, dash for minors, No otherwise", () => { expect(twoStepLabel({ roles: ["ADMIN"], mfaEnabled: true, minor: false })).toBe("Required, on"); expect(twoStepLabel({ roles: ["PARTICIPANT"], mfaEnabled: false, minor: true })).toBe("—"); expect(twoStepLabel({ roles: ["MENTOR"], mfaEnabled: false, minor: false })).toBe("No"); });
  it("a young person is never named in the help queue", () => { expect(helpFromLabel({ fromName: "Amara", fromRole: "PARTICIPANT", minor: true }, 17)).toBe("Participant, 17"); expect(helpFromLabel({ fromName: "Ngozi Okafor", fromRole: "GUARDIAN", minor: false })).toBe("Ngozi Okafor (guardian)"); });
  it("relative times", () => { const n = new Date("2026-10-08T12:00:00Z"); expect(ago(new Date(n.getTime() - 3600_000), n)).toBe("1h ago"); expect(ago(new Date(n.getTime() - 30 * 3600_000), n)).toBe("Yesterday"); expect(ago(new Date(n.getTime() - 50 * 3600_000), n)).toBe("2 days ago"); });
  it("safeguarding wording skips the help queue", () => { expect(looksLikeSafeguarding("I feel unsafe with my mentor")).toBe(true); expect(looksLikeSafeguarding("Change my hours")).toBe(false); });
});
