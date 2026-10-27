import { describe, it, expect } from "vitest";
import { ageGate, ageOn, eighteenthBirthday, guardianAuthorityActive } from "./age";
import { canTransition, isOpen } from "./ask-state";
import { canStartAsk } from "./limits";
import { detectContactDetails } from "./contact-detect";
import { composeMentorSummary, toMentorView } from "./mentor-summary";
import { mentorEligibleForAsk, canViewRecording, mentorCanReceiveAsks, requiresMfa, participantMayKnowPass } from "./permissions";
import { scoreMentor, rankMentors, WEIGHTS } from "./ranking";
import { addBusinessDays, reviewDue, atRisk } from "./service-windows";
import { assertAppendOnly } from "../append-only";

const d = (s: string) => new Date(s + "T00:00:00Z");

describe("age gate (BR-19, BR-20)", () => {
  const now = d("2026-10-10");
  it("blocks under 15 always", () => { expect(ageGate(d("2011-10-11"), now)).toEqual({ ok: false, reason: "UNDER_15" }); });
  it("admits exactly 15 as a minor", () => { const g = ageGate(d("2011-10-10"), now); expect(g.ok && g.minor && g.band).toBe("AGE_13_15"); });
  it("16-17 band", () => { const g = ageGate(d("2009-01-01"), now); expect(g.ok && g.band).toBe("AGE_16_17"); });
  it("adult", () => { const g = ageGate(d("2000-01-01"), now); expect(g.ok && !g.minor).toBe(true); });
  it("rejects future / absurd DOB", () => { expect(ageGate(d("2030-01-01"), now).ok).toBe(false); expect(ageGate(d("1800-01-01"), now).ok).toBe(false); });
  it("birthday boundary", () => { expect(ageOn(d("2008-10-11"), now)).toBe(17); expect(ageOn(d("2008-10-10"), now)).toBe(18); });
  it("guardian authority ends on 18th birthday", () => {
    const dob = d("2008-10-10");
    expect(eighteenthBirthday(dob).toISOString()).toContain("2026-10-10");
    expect(guardianAuthorityActive(dob, d("2026-10-09"))).toBe(true);
    expect(guardianAuthorityActive(dob, d("2026-10-10"))).toBe(false);
  });
});

describe("Ask state machine", () => {
  it("minor cannot skip guardian authorization (BR-05)", () => {
    expect(canTransition({ from: "DRAFT", to: "SUBMITTED", actor: "PARTICIPANT", isMinor: true }).ok).toBe(false);
    expect(canTransition({ from: "DRAFT", to: "AWAITING_GUARDIAN", actor: "PARTICIPANT", isMinor: true }).ok).toBe(true);
    expect(canTransition({ from: "AWAITING_GUARDIAN", to: "SUBMITTED", actor: "PARTICIPANT", isMinor: true }).ok).toBe(false);
    expect(canTransition({ from: "AWAITING_GUARDIAN", to: "SUBMITTED", actor: "GUARDIAN", guardianAuthorized: true }).ok).toBe(true);
  });
  it("only the team rebooks a call that did not happen with the same mentor", () => {
    expect(canTransition({ from: "IN_TEAM_REVIEW", to: "CONNECTION_APPROVED", actor: "ADMIN" }).ok).toBe(true);
    for (const actor of ["PARTICIPANT", "MENTOR", "GUARDIAN", "SYSTEM"] as const) expect(canTransition({ from: "IN_TEAM_REVIEW", to: "CONNECTION_APPROVED", actor }).ok).toBe(false);
  });
  it("adult goes straight to submitted", () => {
    expect(canTransition({ from: "DRAFT", to: "SUBMITTED", actor: "PARTICIPANT" }).ok).toBe(true);
    expect(canTransition({ from: "DRAFT", to: "AWAITING_GUARDIAN", actor: "PARTICIPANT" }).ok).toBe(false);
  });
  it("no path from submission to mentors without a reviewer (BR-08)", () => {
    expect(canTransition({ from: "SUBMITTED", to: "OPEN_TO_MENTORS", actor: "ADMIN", reviewerReleased: true, summaryApproved: true }).ok).toBe(false);
    expect(canTransition({ from: "IN_TEAM_REVIEW", to: "OPEN_TO_MENTORS", actor: "SYSTEM", reviewerReleased: true, summaryApproved: true }).ok).toBe(false);
    expect(canTransition({ from: "IN_TEAM_REVIEW", to: "OPEN_TO_MENTORS", actor: "ADMIN", reviewerReleased: true }).ok).toBe(false);
    expect(canTransition({ from: "IN_TEAM_REVIEW", to: "OPEN_TO_MENTORS", actor: "ADMIN", reviewerReleased: true, summaryApproved: true }).ok).toBe(true);
  });
  it("a minor's scheduling needs guardian approval of mentor and time (BR-06)", () => {
    expect(canTransition({ from: "CONNECTION_APPROVED", to: "SCHEDULED", actor: "ADMIN", isMinor: true }).ok).toBe(false);
    expect(canTransition({ from: "CONNECTION_APPROVED", to: "SCHEDULED", actor: "ADMIN", isMinor: true, guardianApprovedMentorAndTime: true }).ok).toBe(true);
  });
  it("mentors cannot confirm the connection", () => {
    expect(canTransition({ from: "MENTOR_STEPPED_FORWARD", to: "CONNECTION_APPROVED", actor: "MENTOR" }).ok).toBe(false);
  });
  it("exit states are final and role-scoped", () => {
    expect(canTransition({ from: "WITHDRAWN", to: "SUBMITTED", actor: "ADMIN" }).ok).toBe(false);
    expect(canTransition({ from: "OPEN_TO_MENTORS", to: "WITHDRAWN", actor: "PARTICIPANT" }).ok).toBe(true);
    expect(canTransition({ from: "OPEN_TO_MENTORS", to: "WITHDRAWN", actor: "MENTOR" }).ok).toBe(false);
    expect(canTransition({ from: "AWAITING_GUARDIAN", to: "GUARDIAN_DECLINED", actor: "GUARDIAN" }).ok).toBe(true);
    expect(canTransition({ from: "COMPLETE", to: "WITHDRAWN", actor: "PARTICIPANT" }).ok).toBe(false);
  });
  it("unanswered Ask returns to the team, not silently lapsing (BR-15)", () => {
    expect(canTransition({ from: "OPEN_TO_MENTORS", to: "IN_TEAM_REVIEW", actor: "SYSTEM" }).ok).toBe(true);
  });
  it("holds three open Asks at most (BR-14)", () => {
    expect(canStartAsk(["DRAFT", "OPEN_TO_MENTORS", "SCHEDULED"]).ok).toBe(false);
    expect(canStartAsk(["DRAFT", "OPEN_TO_MENTORS", "WITHDRAWN", "COMPLETE"]).ok).toBe(true);
    expect(isOpen("LAPSED")).toBe(false);
  });
});

describe("contact detection (BR-10)", () => {
  it.each([
    "email me at sam@gmail.com", "sam (at) gmail (dot) com", "call 0803 123 4567", "+234 803 123 4567",
    "my number is zero eight zero three one two three four five six seven", "find me on instagram @sam_k",
    "https://linkedin.com/in/sam", "whatsapp me", "dm me",
  ])("flags %s", (t) => { expect(detectContactDetails(t).length).toBeGreaterThan(0); });
  it.each(["I want to study nursing in 2027", "I have 3 interviews and 12 applications", "Help with my résumé for a software role"])("allows %s", (t) => {
    expect(detectContactDetails(t)).toEqual([]);
  });
});

describe("mentor-facing summary (BR-09)", () => {
  const draft = { askId: "a1", topic: "Career conversations", question: "How do I move into data roles?", whatWouldHelp: "A 30 minute chat about skills", ageBand: "16-17" as const, sessionLength: 30 as const };
  const withheld = { names: ["Amara Okafor"], schools: ["Greenfield High"], employers: ["Acme Ltd"] };
  it("passes a clean summary", () => { expect(composeMentorSummary(draft, withheld).ok).toBe(true); });
  it("blocks contact details", () => { expect(composeMentorSummary({ ...draft, question: "write to me at a@b.com" }, withheld).ok).toBe(false); });
  it("blocks withheld identifiers", () => {
    const r = composeMentorSummary({ ...draft, whatWouldHelp: "I attend Greenfield High" }, withheld);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.blocked.identifiers).toContain("Greenfield High");
  });
  it("projection exposes only whitelisted fields", () => {
    const fat = { ...draft, participantName: "Amara", school: "X", email: "a@b.com" } as never;
    expect(Object.keys(toMentorView(fat)).sort()).toEqual(["ageBand", "askId", "question", "sessionLength", "topic", "whatWouldHelp"]);
  });
});

describe("eligibility and visibility", () => {
  const ok = { verification: "APPROVED" as const, codeOfConductAt: new Date(), orientationDoneAt: new Date(), clearedForMinors: false, monthlyHours: 2, hoursGivenThisMonth: 0 };
  it("BR-01", () => {
    expect(mentorCanReceiveAsks(ok)).toBe(true);
    expect(mentorCanReceiveAsks({ ...ok, verification: "PENDING" })).toBe(false);
    expect(mentorCanReceiveAsks({ ...ok, orientationDoneAt: null })).toBe(false);
    expect(mentorCanReceiveAsks({ ...ok, codeOfConductAt: null })).toBe(false);
  });
  it("BR-04 minors only see cleared mentors", () => {
    expect(mentorEligibleForAsk(ok, true)).toBe(false);
    expect(mentorEligibleForAsk({ ...ok, clearedForMinors: true }, true)).toBe(true);
    expect(mentorEligibleForAsk(ok, false)).toBe(true);
  });
  it("BR-13 monthly hours", () => { expect(mentorEligibleForAsk({ ...ok, hoursGivenThisMonth: 2 }, false)).toBe(false); });
  it("recordings only for parties, guardian, safeguarding lead", () => {
    const c = { participantUserId: "p", mentorUserId: "m", guardianUserIds: ["g"] };
    expect(canViewRecording({ userId: "g", roles: ["GUARDIAN"] }, c)).toBe(true);
    expect(canViewRecording({ userId: "s", roles: ["SAFEGUARDING_LEAD"] }, c)).toBe(true);
    expect(canViewRecording({ userId: "x", roles: ["ADMIN"] }, c)).toBe(false);
    expect(canViewRecording({ userId: "other", roles: ["MENTOR"] }, c)).toBe(false);
  });
  it("passing is never visible; admins need MFA", () => {
    expect(participantMayKnowPass()).toBe(false);
    expect(requiresMfa(["ADMIN"])).toBe(true);
    expect(requiresMfa(["PARTICIPANT"])).toBe(false);
  });
});

describe("ranking", () => {
  it("weights sum to 100", () => { expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100); });
  it("perfect score is 100, worst is low", () => {
    expect(scoreMentor({ mentorId: "a", fit: 1, hoursRemaining: 2, monthlyHours: 2, asksThisMonth: 0, maxAsksThisMonth: 4, affinity: 1, responsiveness: 1 })).toBe(100);
    expect(scoreMentor({ mentorId: "a", fit: 0, hoursRemaining: 0, monthlyHours: 2, asksThisMonth: 4, maxAsksThisMonth: 4, affinity: 0, responsiveness: 0 })).toBe(0);
  });
  it("ranks deterministically with a limit", () => {
    const base = { fit: 0.5, hoursRemaining: 1, monthlyHours: 2, asksThisMonth: 1, maxAsksThisMonth: 4, affinity: 0.5, responsiveness: 0.5 };
    const r = rankMentors([{ ...base, mentorId: "b" }, { ...base, mentorId: "a", fit: 0.9 }, { ...base, mentorId: "c" }], 2);
    expect(r.map((x) => x.mentorId)).toEqual(["a", "b"]);
    expect(r[0].rank).toBe(1);
  });
});

describe("service windows", () => {
  it("skips weekends", () => {
    expect(addBusinessDays(d("2026-10-09"), 2).toISOString().slice(0, 10)).toBe("2026-10-13"); // Fri → Tue
    expect(reviewDue(d("2026-10-12")).toISOString().slice(0, 10)).toBe("2026-10-14");
  });
  it("at-risk 4h before due", () => {
    const due = new Date("2026-10-10T12:00:00Z");
    expect(atRisk(due, new Date("2026-10-10T08:30:00Z"))).toBe(true);
    expect(atRisk(due, new Date("2026-10-10T07:00:00Z"))).toBe(false);
  });
});

describe("append-only collections", () => {
  it("blocks update/delete on audit, consent, attestation, state history", () => {
    for (const m of ["AuditEvent", "Attestation", "ConsentRecord", "AskStateChange"])
      for (const op of ["update", "updateMany", "upsert", "delete", "deleteMany"]) expect(() => assertAppendOnly(m, op)).toThrow();
    expect(() => assertAppendOnly("AuditEvent", "create")).not.toThrow();
    expect(() => assertAppendOnly("Ask", "update")).not.toThrow();
  });
});
