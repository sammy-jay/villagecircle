import type { Role, VerificationStatus } from "@prisma/client";

export interface MentorEligibility {
  verification: VerificationStatus; codeOfConductAt: Date | null; orientationDoneAt: Date | null;
  clearedForMinors: boolean; monthlyHours: number; hoursGivenThisMonth: number;
  suspended?: boolean; paused?: boolean; // paused: the mentor turned off routing (D7/D23)
}

/** BR-01: no Asks until verified, Code of Conduct accepted and orientation done. */
export function mentorCanReceiveAsks(m: MentorEligibility): boolean {
  return !m.suspended && m.verification === "APPROVED" && !!m.codeOfConductAt && !!m.orientationDoneAt;
}

/** BR-13: a mentor at their declared monthly hours receives no further Asks that month. */
export function mentorHasCapacity(m: MentorEligibility): boolean {
  return !m.paused && m.hoursGivenThisMonth < m.monthlyHours;
}

/** BR-04: only cleared-for-minors mentors can be shortlisted for / see a minor's Ask. */
export function mentorEligibleForAsk(m: MentorEligibility, participantIsMinor: boolean): boolean {
  if (!mentorCanReceiveAsks(m) || !mentorHasCapacity(m)) return false;
  return participantIsMinor ? m.clearedForMinors : true;
}

export interface Viewer { userId: string; roles: Role[] }

/** Recordings: only guardian, the parties, and the safeguarding lead. Admins and other mentors cannot. */
export function canViewRecording(v: Viewer, c: { participantUserId: string; mentorUserId: string; guardianUserIds: string[] }): boolean {
  if (v.roles.includes("SAFEGUARDING_LEAD")) return true;
  return v.userId === c.participantUserId || v.userId === c.mentorUserId || c.guardianUserIds.includes(v.userId);
}

/** BR-12: passing is never visible to the participant. */
export function participantMayKnowPass(): false { return false; }

/** Admin / safeguarding access requires a passed second factor. */
export function requiresMfa(roles: Role[]): boolean {
  return roles.includes("ADMIN") || roles.includes("SAFEGUARDING_LEAD");
}

export function roleHome(roles: Role[]): string {
  if (roles.includes("ADMIN") || roles.includes("SAFEGUARDING_LEAD")) return "/admin";
  if (roles.includes("MENTOR")) return "/mentor";
  if (roles.includes("GUARDIAN")) return "/guardian";
  return "/home";
}
