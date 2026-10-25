/**
 * Who may see what. Every screen gets data ONLY through these whitelist projections, so nothing extra can ride along
 * (BR-09, BR-10, BR-12). Plain objects in, plain objects out: no database, easy to test for leaks.
 */
import type { MentorFacingAsk } from "./mentor-summary";
import { toMentorView } from "./mentor-summary";

export const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";
/** "Kwame Mensah" becomes "Kwame M." */
export const shortName = (n: string) => { const p = n.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1]![0]!.toUpperCase()}.` : p[0] ?? ""; };

export interface MentorSource { name: string; headline?: string | null; primaryExpertise: string; extraExpertise: string[]; country?: string | null; languages: string[]; monthlyHours: number; clearedForMinors: boolean; verified: boolean }
/** What a participant (and their guardian) may know about a mentor. No email, phone, last name, resume, or internal scores. */
export interface MentorCard { shortName: string; headline: string; expertise: string[]; country: string; languages: string[]; hoursLine: string; verifiedLine: string }
export function toMentorCard(m: MentorSource, label: (code: string) => string): MentorCard {
  return {
    shortName: shortName(m.name), headline: m.headline ?? "", expertise: [m.primaryExpertise, ...m.extraExpertise].map(label), country: m.country ?? "", languages: m.languages,
    hoursLine: `${m.monthlyHours} hour${m.monthlyHours === 1 ? "" : "s"} a month`, verifiedLine: m.verified ? (m.clearedForMinors ? "Verified · cleared for minors" : "Verified") : "",
  };
}

/** What a mentor may know about a participant: first name only, and only after step-forward + approval. Never the school, DOB, email or last name. */
export interface ParticipantCard { firstName: string; ageLabel: string; guardianWillAttend: boolean }
export function toParticipantCard(p: { name: string; age: number; isMinor: boolean }, guardianAttends: boolean): ParticipantCard {
  return { firstName: firstName(p.name), ageLabel: p.isMinor ? `${p.age}` : "adult", guardianWillAttend: p.isMinor && guardianAttends };
}

export const ageBandLabel = (b: "AGE_13_15" | "AGE_16_17" | "ADULT" | null | undefined): MentorFacingAsk["ageBand"] => (b === "AGE_13_15" ? "15" : b === "AGE_16_17" ? "16-17" : "18+");

/** The one object a mentor sees before stepping forward (BR-09). */
export function mentorInboxItem(s: MentorFacingAsk, guardianAttends: boolean, releasedAt: Date | null) {
  return { ...toMentorView(s), guardianAttends, releasedAt };
}

/** Participant view of an Ask: their own words and status. Never shortlist, scores, passes, reviewer notes or flags. */
export interface ParticipantAskSource { id: string; state: string; topicName: string; answers: { q1: string; q2: string; q3: string; sessionLength: number; timeBound: boolean; preferredMentorName?: string; stage?: string; soon?: string; soonMore?: string; mentorType?: string; mentorTypeMore?: string; bestDays?: string; bestDaysMore?: string }; completeness: number; submittedAt: Date | null; updatedAt: Date; teamNote?: string | null; returnedForDetail: boolean; redirectLinks?: unknown }
export function toParticipantAsk(a: ParticipantAskSource) {
  return {
    id: a.id, state: a.state, topic: a.topicName, answers: { q1: a.answers.q1, q2: a.answers.q2, q3: a.answers.q3, sessionLength: a.answers.sessionLength, timeBound: a.answers.timeBound, preferredMentorName: a.answers.preferredMentorName, stage: a.answers.stage, soon: a.answers.soon, soonMore: a.answers.soonMore, mentorType: a.answers.mentorType, mentorTypeMore: a.answers.mentorTypeMore, bestDays: a.answers.bestDays, bestDaysMore: a.answers.bestDaysMore },
    completeness: a.completeness, submittedAt: a.submittedAt, updatedAt: a.updatedAt, teamNote: a.teamNote ?? null, returnedForDetail: a.returnedForDetail, redirectLinks: Array.isArray(a.redirectLinks) ? a.redirectLinks : [],
  };
}

/** Shortlist rows are internal: the participant never learns who was asked, who passed, or why. */
export const SHORTLIST_INTERNAL_KEYS = ["score", "rank", "reason", "note", "suggestedColleague", "response", "mentorId"] as const;
export function stripInternal<T extends Record<string, unknown>>(o: T): Omit<T, (typeof SHORTLIST_INTERNAL_KEYS)[number]> {
  const c = { ...o } as Record<string, unknown>; for (const k of SHORTLIST_INTERNAL_KEYS) delete c[k]; return c as never;
}
