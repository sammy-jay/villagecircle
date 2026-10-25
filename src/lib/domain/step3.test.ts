import { describe, it, expect } from "vitest";
import { completeness, promptDone, screenText, CONTINUE_AT, parseAnswers } from "./ask-answers";
import { validateOffers, joinState, attendanceAfterWait, canReschedule, minutesUntilOpen, isOffered } from "./scheduling";
import { canTransition } from "./ask-state";
import { composeMentorSummary, toMentorView } from "./mentor-summary";
import { toMentorCard, toParticipantCard, toParticipantAsk, stripInternal, shortName, firstName, mentorInboxItem } from "./views";
import { mentorEligibleForAsk } from "./permissions";
import { rankMentors } from "./ranking";

const long = "I'm a junior who wants to study medicine and need an honest picture of the road.";
describe("Ask wizard completeness (D2)", () => {
  it("one thin prompt gives 70% and blocks Continue", () => {
    const c = completeness({ q1: long, q2: long, q3: "Someone in medicine" });
    expect(c).toBe(70); expect(c).toBeLessThan(CONTINUE_AT);
  });
  it("all prompts give 100%", () => expect(completeness({ q1: long, q2: long, q3: long })).toBe(100));
  it("needs a few honest sentences", () => { expect(promptDone("Someone in medicine")).toBe(false); expect(promptDone(long)).toBe(true); });
  it("parses defaults", () => expect(parseAnswers(null).sessionLength).toBe(60));
});
describe("content screening (step B)", () => {
  it("flags contact details, advice, crisis, solicitation", () => {
    expect(screenText("call me on (713) 555 0182")).toContain("CONTACT_DETAILS");
    expect(screenText("Can I sue my landlord?")).toContain("LICENSED_ADVICE");
    expect(screenText("I want to hurt myself")).toContain("CRISIS");
    expect(screenText("send money to my cash app")).toContain("SOLICITATION");
    expect(screenText("What does a typical week look like for a nurse?")).toEqual([]);
  });
});
describe("scheduling rules", () => {
  const now = new Date("2026-10-12T10:00:00Z"); const h = (n: number) => new Date(now.getTime() + n * 3600_000);
  it("offers: 1 to 3, future, distinct", () => {
    expect(validateOffers([], now).ok).toBe(false);
    expect(validateOffers([h(0.2)], now).ok).toBe(false);
    expect(validateOffers([h(5), h(6), h(7), h(8)], now).ok).toBe(false);
    expect(validateOffers([h(5), h(5)], now).ok).toBe(false);
    const v = validateOffers([h(30), h(5)], now); expect(v.ok && v.times[0]).toEqual(h(5));
  });
  it("link opens 10 minutes early and closes after the call", () => {
    const s = h(1);
    expect(joinState(s, 60, now)).toBe("TOO_EARLY");
    expect(joinState(s, 60, new Date(s.getTime() - 9 * 60000))).toBe("OPEN");
    expect(joinState(s, 60, new Date(s.getTime() + 100 * 60000))).toBe("ENDED");
    expect(minutesUntilOpen(s, now)).toBe(50);
  });
  it("misses are recorded without blame wording", () => {
    const s = now; const late = new Date(s.getTime() + 16 * 60000);
    expect(attendanceAfterWait(s, { mentor: null, participant: s }, late)).toBe("MENTOR_ABSENT");
    expect(attendanceAfterWait(s, { mentor: s, participant: null }, late)).toBe("PARTICIPANT_ABSENT");
    expect(attendanceAfterWait(s, { mentor: null, participant: null }, late)).toBe("NEITHER");
    expect(attendanceAfterWait(s, { mentor: null, participant: s }, new Date(s.getTime() + 5 * 60000))).toBe("UNKNOWN");
  });
  it("one free reschedule, then the team steps in", () => { expect(canReschedule(0)).toBe(true); expect(canReschedule(1)).toBe(false); });
  it("only offered times can be chosen", () => { expect(isOffered([h(5)], h(5))).toBe(true); expect(isOffered([h(5)], h(6))).toBe(false); });
});
describe("lifecycle: Draft to Complete and exits", () => {
  const step = (from: never, to: never, actor: never, ctx: object = {}) => canTransition({ from, to, actor, ...ctx }).ok;
  it("a minor cannot skip the guardian", () => { expect(step("DRAFT" as never, "SUBMITTED" as never, "PARTICIPANT" as never, { isMinor: true })).toBe(false); expect(step("DRAFT" as never, "AWAITING_GUARDIAN" as never, "PARTICIPANT" as never, { isMinor: true })).toBe(true); });
  it("no mentor sees an Ask without a human release and approved summary", () => {
    expect(step("IN_TEAM_REVIEW" as never, "OPEN_TO_MENTORS" as never, "SYSTEM" as never, { reviewerReleased: true, summaryApproved: true })).toBe(false);
    expect(step("IN_TEAM_REVIEW" as never, "OPEN_TO_MENTORS" as never, "ADMIN" as never, { reviewerReleased: true })).toBe(false);
    expect(step("IN_TEAM_REVIEW" as never, "OPEN_TO_MENTORS" as never, "ADMIN" as never, { reviewerReleased: true, summaryApproved: true })).toBe(true);
  });
  it("a minor's conversation is scheduled only after the guardian approves mentor and time", () => {
    expect(step("CONNECTION_APPROVED" as never, "SCHEDULED" as never, "SYSTEM" as never, { isMinor: true })).toBe(false);
    expect(step("CONNECTION_APPROVED" as never, "SCHEDULED" as never, "SYSTEM" as never, { isMinor: true, guardianApprovedMentorAndTime: true })).toBe(true);
  });
  it("the full happy path is reachable", () => {
    const path = ["DRAFT", "AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE"] as const;
    const actors = ["PARTICIPANT", "GUARDIAN", "SYSTEM", "ADMIN", "MENTOR", "ADMIN", "SYSTEM", "SYSTEM", "MENTOR"] as const;
    for (let i = 0; i < path.length - 1; i++) expect(step(path[i] as never, path[i + 1] as never, actors[i] as never, { isMinor: true, guardianAuthorized: true, reviewerReleased: true, summaryApproved: true, guardianApprovedMentorAndTime: true })).toBe(true);
  });
  it("the team can take a handed-back conversation", () => expect(step("CONNECTION_APPROVED" as never, "IN_TEAM_REVIEW" as never, "SYSTEM" as never)).toBe(true));
  it("exit states are final", () => { for (const s of ["WITHDRAWN", "LAPSED", "REDIRECTED", "NOT_PROCEEDING", "GUARDIAN_DECLINED", "ANSWERED_BY_RESOURCE"]) expect(step(s as never, "IN_TEAM_REVIEW" as never, "ADMIN" as never)).toBe(false); });
  it("only the right people end an Ask", () => {
    expect(step("SCHEDULED" as never, "REDIRECTED" as never, "MENTOR" as never)).toBe(false);
    expect(step("IN_TEAM_REVIEW" as never, "REDIRECTED" as never, "ADMIN" as never)).toBe(true);
    expect(step("AWAITING_GUARDIAN" as never, "GUARDIAN_DECLINED" as never, "GUARDIAN" as never)).toBe(true);
    expect(step("AWAITING_GUARDIAN" as never, "GUARDIAN_DECLINED" as never, "PARTICIPANT" as never)).toBe(false);
  });
});

// ─────────── Safeguarding: nothing leaks between people ───────────
const SECRET = { fullName: "Amara Okafor", school: "Lincoln High School", phone: "(713) 555 0182", email: "amara.okafor@example.com", guardian: "Ngozi Okafor", dob: "2010-03-04", mentorEmail: "kwame.mensah@clinic.example", mentorPhone: "+233 24 555 0101", mentorLast: "Mensah" };
const answers = { q1: `I'm Amara at ${SECRET.school}. Call ${SECRET.phone}`, q2: `Email ${SECRET.email}`, q3: "Help", sessionLength: 60, timeBound: false };
const dump = (o: unknown) => JSON.stringify(o);
describe("safeguarding: what a mentor can ever receive", () => {
  const summary = { askId: "a1", topic: "College guidance", question: "A high school junior asks what a realistic pre-med path looks like.", whatWouldHelp: "An honest picture of the road.", ageBand: "16-17" as const, sessionLength: 60 as const };
  it("the mentor view carries nothing but the approved summary fields", () => {
    const fat = { ...summary, participantName: SECRET.fullName, school: SECRET.school, email: SECRET.email, phone: SECRET.phone, dob: SECRET.dob, answers } as never;
    const view = toMentorView(fat); const s = dump(view);
    expect(Object.keys(view).sort()).toEqual(["ageBand", "askId", "question", "sessionLength", "topic", "whatWouldHelp"]);
    for (const v of Object.values(SECRET)) expect(s).not.toContain(v);
    expect(s).not.toContain("Amara");
  });
  it("the inbox item adds only guardian attendance and release time", () => {
    const item = mentorInboxItem(summary, true, new Date(0)); expect(Object.keys(item).sort()).toEqual(["ageBand", "askId", "guardianAttends", "question", "releasedAt", "sessionLength", "topic", "whatWouldHelp"]);
  });
  it("release is blocked when the summary leaks a phone, email, name or school", () => {
    const withheld = { names: [SECRET.fullName, "Amara", SECRET.guardian], schools: [SECRET.school], employers: [] };
    for (const leak of [`Call ${SECRET.phone}`, `mail ${SECRET.email}`, "Amara wants to know", `at ${SECRET.school}`, "WhatsApp me", "find her on instagram @amara_o", "seven one three five five five zero one eight two"]) {
      expect(composeMentorSummary({ ...summary, question: `${summary.question} ${leak}` }, withheld).ok).toBe(false);
    }
    expect(composeMentorSummary(summary, withheld).ok).toBe(true);
  });
  it("a mentor first sees only a first name and age, never a surname, school, email or DOB", () => {
    const card = toParticipantCard({ name: SECRET.fullName, age: 16, isMinor: true }, true); const s = dump(card);
    expect(card.firstName).toBe("Amara"); expect(s).not.toContain("Okafor"); expect(s).not.toContain(SECRET.school); expect(s).not.toContain(SECRET.dob);
  });
});
describe("safeguarding: what a participant or guardian can ever learn about a mentor", () => {
  const card = toMentorCard({ name: "Kwame Mensah", primaryExpertise: "EXP-HLT", extraExpertise: ["EXP-EDU"], country: "Ghana", languages: ["English", "Twi"], monthlyHours: 1, clearedForMinors: true, verified: true, headline: "Emergency physician", ...({ email: SECRET.mentorEmail, phone: SECRET.mentorPhone } as object) } as never, (c) => c);
  it("shows a short name and profile, never contact details or the surname", () => {
    const s = dump(card); expect(card.shortName).toBe("Kwame M."); expect(s).not.toContain(SECRET.mentorEmail); expect(s).not.toContain(SECRET.mentorPhone); expect(s).not.toContain(SECRET.mentorLast);
    expect(Object.keys(card).sort()).toEqual(["country", "expertise", "headline", "hoursLine", "languages", "shortName", "verifiedLine"]);
  });
  it("short names", () => { expect(shortName("Kwame Mensah")).toBe("Kwame M."); expect(firstName("Kwame Mensah")).toBe("Kwame"); expect(shortName("Cher")).toBe("Cher"); });
  it("the participant's Ask view hides the shortlist, scores, passes and reviewer notes", () => {
    const v = toParticipantAsk({ id: "a", state: "OPEN_TO_MENTORS", topicName: "College guidance", answers: { q1: "x", q2: "y", q3: "z", sessionLength: 60, timeBound: false }, completeness: 100, submittedAt: null, updatedAt: new Date(), returnedForDetail: false, ...({ shortlist: [{ mentorId: "m", score: 91, response: "PASSED" }], reviewNote: "internal", flags: ["CRISIS"], reviewerId: "r" } as object) } as never);
    const s = dump(v); for (const w of ["shortlist", "score", "PASSED", "internal", "flags", "reviewerId", "CRISIS"]) expect(s).not.toContain(w);
  });
  it("internal shortlist keys are stripped", () => {
    const row = stripInternal({ id: "1", score: 90, rank: 1, reason: "r", note: "n", suggestedColleague: "c", response: "PASSED", mentorId: "m", releasedAt: 1 });
    expect(Object.keys(row)).toEqual(["id", "releasedAt"]);
  });
});
describe("safeguarding: who can be shortlisted", () => {
  const base = { verification: "APPROVED" as const, codeOfConductAt: new Date(), orientationDoneAt: new Date(), clearedForMinors: true, monthlyHours: 2, hoursGivenThisMonth: 0 };
  it("excludes mentors not cleared for minors before scoring", () => {
    expect(mentorEligibleForAsk({ ...base, clearedForMinors: false }, true)).toBe(false);
    expect(mentorEligibleForAsk({ ...base, clearedForMinors: false }, false)).toBe(true);
    expect(mentorEligibleForAsk({ ...base, orientationDoneAt: null }, false)).toBe(false);
    expect(mentorEligibleForAsk({ ...base, hoursGivenThisMonth: 2 }, false)).toBe(false);
  });
  it("passing never lowers rank (responsiveness is not an input that a pass changes)", () => {
    const a = { mentorId: "a", fit: 1, hoursRemaining: 2, monthlyHours: 2, asksThisMonth: 0, maxAsksThisMonth: 4, affinity: 0, responsiveness: 0.5 };
    expect(rankMentors([a, { ...a, mentorId: "b" }]).map((r) => r.score)).toEqual([...new Set([rankMentors([a])[0]!.score])].concat(rankMentors([a])[0]!.score));
  });
});
