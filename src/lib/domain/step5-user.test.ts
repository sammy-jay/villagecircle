import { describe, it, expect } from "vitest";
import { concernPlan, reportedPartyView, withdrawalEffect, pauseEffect, turning18Plan, turning18Visible, scrubOthers, anonymisedUser, deleteConfirmed, KEEP_ON_DELETE, reaffirmDue, reaffirmLapsed, fmtCountdown, toCsv, IDLE_LIMIT_MS, IDLE_WARN_MS, ongoingEndsOn } from "./safety-user";
import { canViewRecording } from "./permissions";

describe("concern reports", () => {
  const now = new Date("2026-10-01T10:00:00Z");
  it("safeguarding is HIGH with a 24 hour window", () => { const p = concernPlan("unsafe", now); expect(p.category).toBe("SAFEGUARDING"); expect(p.severity).toBe("HIGH"); expect(p.dueAt.getTime() - now.getTime()).toBe(24 * 3600_000); });
  it("everything else is answered within 48 hours", () => { for (const k of ["contact", "outside", "other"] as const) { const p = concernPlan(k, now); expect(p.severity).not.toBe("HIGH"); expect(p.dueAt.getTime() - now.getTime()).toBe(48 * 3600_000); } });
  it("the person reported never sees the report", () => expect(reportedPartyView()).toBeNull());
});

describe("pausing and withdrawing", () => {
  it("withdrawing consent ends account access; a guardian pause keeps a calm paused page", () => {
    expect(withdrawalEffect()).toMatchObject({ status: "SUSPENDED", holdOpenAsks: true, cancelBooked: true });
    expect(pauseEffect()).toMatchObject({ status: "PAUSED", holdOpenAsks: true, cancelBooked: true });
  });
});

describe("turning 18", () => {
  const dob = new Date("2008-03-12T00:00:00Z");
  it("changes nothing before the birthday, even if confirmed", () => { const p = turning18Plan(dob, true, new Date("2026-03-01T00:00:00Z")); expect(p.apply).toBe(false); expect(p.band).toBeNull(); expect(p.guardianAccessEnds).toBe(false); });
  it("on the birthday it still waits for the participant to confirm", () => { const p = turning18Plan(dob, false, new Date("2026-03-13T00:00:00Z")); expect(p.adultNow).toBe(true); expect(p.apply).toBe(false); });
  it("after confirming on or after the birthday: adult band and guardian access ends", () => { const p = turning18Plan(dob, true, new Date("2026-03-13T00:00:00Z")); expect(p.apply).toBe(true); expect(p.band).toBe("ADULT"); expect(p.guardianAccessEnds).toBe(true); });
  it("the notice appears 60 days before and stops once confirmed", () => {
    expect(turning18Visible(dob, false, new Date("2026-02-01T00:00:00Z"))).toBe(true);
    expect(turning18Visible(dob, false, new Date("2025-06-01T00:00:00Z"))).toBe(false);
    expect(turning18Visible(dob, true, new Date("2026-02-01T00:00:00Z"))).toBe(false);
  });
});

describe("data export holds only the person's own data", () => {
  it("strips other people's contact details and secrets at any depth", () => {
    const out = scrubOthers({ account: { name: "A", emailAddress: "me@x.org" }, conversations: [{ mentorFirstName: "Kwame", email: "k@x.org", phone: "+234", mentor: { mobile: "1", guardianEmail: "g@x.org" } }], passwordHash: "h" });
    const s = JSON.stringify(out);
    expect(s).toContain("me@x.org"); expect(s).toContain("Kwame");
    for (const bad of ["k@x.org", "+234", "g@x.org", "\"h\"", "mobile"]) expect(s).not.toContain(bad);
  });
  it("CSV cells cannot run as formulas", () => expect(toCsv([{ a: "=SUM(1)", b: "plain, text" }])).toBe("a,b\n\"'=SUM(1)\",\"plain, text\""));
});

describe("account deletion", () => {
  it("anonymises personal fields and closes the account", () => {
    const a = anonymisedUser("abc");
    expect(a).toMatchObject({ name: "Former member", passwordHash: null, dateOfBirth: null, phone: null, status: "CLOSED", mfaSecret: null });
    expect(a.email).toBe("deleted-abc@deleted.invalid");
  });
  it("keeps the audit log and safeguarding records (legal hold)", () => { for (const m of ["AuditEvent", "Incident", "ConsentRecord", "Attestation"]) expect(KEEP_ON_DELETE).toContain(m); });
  it("needs the email typed again", () => { expect(deleteConfirmed(" Me@X.org ", "me@x.org")).toBe(true); expect(deleteConfirmed("", "me@x.org")).toBe(false); expect(deleteConfirmed("other@x.org", "me@x.org")).toBe(false); });
});

describe("recordings", () => {
  const c = { participantUserId: "p", mentorUserId: "m", guardianUserIds: ["g1", "g2"] };
  it("are viewable by the participant, mentor and the participant's guardians", () => { for (const id of ["p", "m", "g1", "g2"]) expect(canViewRecording({ userId: id, roles: [] }, c)).toBe(true); });
  it("are not viewable by admins, other mentors or other guardians", () => {
    expect(canViewRecording({ userId: "a", roles: ["ADMIN"] }, c)).toBe(false);
    expect(canViewRecording({ userId: "m2", roles: ["MENTOR"] }, c)).toBe(false);
    expect(canViewRecording({ userId: "g3", roles: ["GUARDIAN"] }, c)).toBe(false);
  });
});

describe("annual re-affirmation, session timeout, ongoing mentorship", () => {
  it("is due a year after signing and lapses on the day", () => { const d = reaffirmDue(new Date("2025-10-16T09:00:00Z")); expect(d.toISOString().slice(0, 10)).toBe("2026-10-16"); expect(reaffirmLapsed(d, new Date("2026-10-15T00:00:00Z"))).toBe(false); expect(reaffirmLapsed(d, new Date("2026-10-16T00:00:00Z"))).toBe(true); });
  it("warns two minutes before the 30 minute limit", () => { expect(IDLE_LIMIT_MS - IDLE_WARN_MS).toBe(120_000); expect(fmtCountdown(120_000)).toBe("2:00"); expect(fmtCountdown(61_500)).toBe("1:02"); expect(fmtCountdown(-5)).toBe("0:00"); });
  it("three months is the only decision with an end date", () => { const n = new Date("2026-10-16T00:00:00Z"); expect(ongoingEndsOn("THREE_MONTHS", n)?.toISOString().slice(0, 10)).toBe("2027-01-16"); expect(ongoingEndsOn("ONE_MORE", n)).toBeNull(); expect(ongoingEndsOn("NOT_NOW", n)).toBeNull(); });
});
