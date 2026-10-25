/** A1 / A32 / A6: the application lists and records the reviewer works from. Names are allowed here; they never reach mentors. */
import { db } from "./db";
import { reaffirmDates } from "./reaffirm";
import { minorsRequirements, type ScreeningState } from "./domain/mentor-application";
import { missingMinors } from "./domain/application-review";
import { expertiseLabel } from "./domain/expertise";
import { ageOn } from "./domain/age";
import { shortName } from "./domain/views";

export type MentorTab = "PENDING" | "MORE_INFO" | "APPROVED" | "DECLINED";
const screeningOf = (s: string | null | undefined): ScreeningState => (s === "CLEAR" ? "CLEAR" : s === "CONSIDER" ? "CONSIDER" : s ? "PENDING" : "NONE");
const tabOf = (a: { state: string; decision: string | null }): MentorTab | null =>
  a.state === "APPROVED" ? "APPROVED" : a.state === "DECLINED" || a.state === "WITHDRAWN" ? "DECLINED" : a.state === "IN_REVIEW" && a.decision === "V-EVIDENCE" ? "MORE_INFO" : ["SUBMITTED", "IN_REVIEW", "APPEALED", "SCREENING"].includes(a.state) ? "PENDING" : null;

export async function mentorApplications(tab: MentorTab) {
  const apps = await db.application.findMany({ where: { type: "MENTOR", state: { not: "DRAFT" } }, include: { applicant: { select: { name: true } } }, orderBy: { submittedAt: "asc" }, take: 500 });
  const profiles = await db.mentorProfile.findMany({ where: { userId: { in: apps.map((a) => a.applicantId) } }, select: { userId: true, primaryExpertise: true } });
  const rows = apps.map((a) => ({ id: a.id, name: shortName(a.applicant.name), headline: expertiseLabel(profiles.find((p) => p.userId === a.applicantId)?.primaryExpertise ?? ""), sent: a.submittedAt ?? a.createdAt, appeal: a.state === "APPEALED", tab: tabOf(a) }));
  const count = (t: MentorTab) => rows.filter((r) => r.tab === t).length;
  const shown = rows.filter((r) => r.tab === tab);
  return { counts: { PENDING: count("PENDING"), MORE_INFO: count("MORE_INFO"), APPROVED: count("APPROVED"), DECLINED: count("DECLINED") }, rows: tab === "PENDING" || tab === "MORE_INFO" ? shown : shown.reverse() };
}

export async function mentorApplication(id: string) {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  const app = await db.application.findUnique({ where: { id }, include: { applicant: true, attestation: true } });
  if (!app || app.type !== "MENTOR") return null;
  const m = await db.mentorProfile.findUnique({ where: { userId: app.applicantId } });
  const d = await reaffirmDates(app.applicantId);
  const sc = screeningOf(app.screeningState);
  const attestationCurrent = !!d.nextDueAt && d.nextDueAt.getTime() > Date.now();
  const minorsInput = m ? { optedForMinors: m.optedForMinors, screening: sc, orientationDone: !!m.orientationDoneAt, codeOfConduct: !!m.codeOfConductAt, attestationCurrent } : null;
  const pl = (app.payload ?? {}) as { step1?: Record<string, unknown>; step2?: Record<string, unknown>; appeal?: { kind: string; note: string; at: string }; infoReplies?: { body: string; at: string }[] };
  const people = await db.user.findMany({ where: { id: { in: [app.decidedById, m?.bioClearedById].filter(Boolean) as string[] } }, select: { id: true, name: true } });
  const nameOf = (x?: string | null) => (x ? shortName(people.find((p) => p.id === x)?.name ?? "A team member") : null);
  const log = await db.auditEvent.findMany({ where: { objectId: id, action: { startsWith: "application." } }, orderBy: { createdAt: "desc" }, take: 20 });
  const actors = await db.user.findMany({ where: { id: { in: log.map((l) => l.actorId).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  return {
    id: app.id, state: app.state, decision: app.decision, decisionNote: app.decisionNote, decidedAt: app.decidedAt, decidedBy: nameOf(app.decidedById), submittedAt: app.submittedAt, tab: tabOf(app),
    person: { id: app.applicantId, name: app.applicant.name, short: shortName(app.applicant.name), email: app.applicant.email, country: app.applicant.countryOfResidence ?? (pl.step1?.country as string | undefined) ?? "", languages: m?.languages ?? [], age: app.applicant.dateOfBirth ? ageOn(app.applicant.dateOfBirth) : null },
    profile: m ? {
      bio: m.bio, bioCleared: m.bioClearedAt, bioClearedBy: nameOf(m.bioClearedById), expertise: [m.primaryExpertise, ...m.extraExpertise].map(expertiseLabel), expertiseOther: m.expertiseOther,
      areas: (pl.step2?.areas as string[] | undefined) ?? [], seniority: (pl.step2?.seniority as string | undefined) ?? null, experience: (pl.step1?.experience as string | undefined) ?? null,
      monthlyHours: m.monthlyHours, length: m.conversationLength, linkedin: m.linkedinUrl, resumeKey: m.resumeKey, optedForMinors: m.optedForMinors, cleared: m.clearedForMinors, requested: m.minorsRequestedAt,
      orientationDone: m.orientationDoneAt, codeOfConduct: m.codeOfConductAt,
    } : null,
    attestation: app.attestation ? { name: app.attestation.typedLegalName, version: app.attestation.statementVersion, signedAt: app.attestation.signedAt, nextDue: d.nextDueAt } : null,
    screening: sc, screeningRef: app.screeningRef, checklist: (app.checklist ?? {}) as Record<string, boolean>,
    minors: minorsInput ? { ...minorsRequirements(minorsInput), missing: missingMinors(minorsInput) } : null,
    appeal: pl.appeal ?? null, infoReplies: pl.infoReplies ?? [],
    log: log.map((l) => ({ id: l.id, action: l.action, at: l.createdAt, actor: l.actorId ? shortName(actors.find((a) => a.id === l.actorId)?.name ?? "Team member") : "System" })),
  };
}

export type GuardianTab = "WAITING" | "VERIFIED" | "NO_RESPONSE";

/** A6: guardian authorizations waiting for a spot check, those already verified, and invite links with no answer after 14 days. */
export async function guardianQueue(tab: GuardianTab) {
  const [apps, invites] = await Promise.all([
    db.application.findMany({ where: { type: "GUARDIAN" }, include: { applicant: { select: { name: true, dateOfBirth: true } } }, orderBy: { submittedAt: "asc" }, take: 300 }),
    db.guardianInvite.findMany({ where: { state: "SENT", createdAt: { lte: new Date(Date.now() - 14 * 86400_000) } }, orderBy: { createdAt: "asc" }, take: 100 }),
  ]);
  const gIds = apps.map((a) => (a.payload as { guardianUserId?: string } | null)?.guardianUserId).filter(Boolean) as string[];
  const gs = gIds.length ? await db.user.findMany({ where: { id: { in: gIds } }, select: { id: true, name: true } }) : [];
  const row = (a: (typeof apps)[number]) => {
    const pl = (a.payload ?? {}) as { guardianUserId?: string };
    return { id: a.id, guardian: shortName(gs.find((g) => g.id === pl.guardianUserId)?.name ?? "Guardian"), young: shortName(a.applicant.name), at: a.submittedAt ?? a.createdAt, state: a.state };
  };
  const waiting = apps.filter((a) => ["SUBMITTED", "IN_REVIEW"].includes(a.state)).map(row);
  const verified = apps.filter((a) => a.state === "APPROVED").map(row).reverse();
  const kids = invites.length ? await db.participantProfile.findMany({ where: { id: { in: invites.map((i) => i.participantId) } }, select: { id: true, user: { select: { name: true } } } }) : [];
  const quiet = invites.map((i) => ({ id: i.id, guardian: shortName(i.guardianName), young: shortName(kids.find((k) => k.id === i.participantId)?.user.name ?? "A young person"), at: i.createdAt, state: "NO_RESPONSE" }));
  return { counts: { WAITING: waiting.length, VERIFIED: verified.length, NO_RESPONSE: quiet.length }, rows: tab === "WAITING" ? waiting : tab === "VERIFIED" ? verified : quiet };
}

export async function guardianApplication(id: string) {
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  const app = await db.application.findUnique({ where: { id }, include: { applicant: true } });
  if (!app || app.type !== "GUARDIAN") return null;
  const pl = (app.payload ?? {}) as { guardianUserId?: string; relationship?: string; method?: string; preference?: string };
  const g = pl.guardianUserId ? await db.user.findUnique({ where: { id: pl.guardianUserId }, select: { name: true, email: true } }) : null;
  const consent = pl.guardianUserId ? await db.consentRecord.findFirst({ where: { userId: pl.guardianUserId, kind: "GUARDIAN_GUIDELINES" }, orderBy: { createdAt: "desc" } }) : null;
  return {
    id: app.id, state: app.state, decisionNote: app.decisionNote, submittedAt: app.submittedAt ?? app.createdAt, checklist: (app.checklist ?? {}) as Record<string, boolean>,
    guardian: g ? { name: g.name, email: g.email } : null, young: { name: app.applicant.name, age: app.applicant.dateOfBirth ? ageOn(app.applicant.dateOfBirth) : null },
    relationship: pl.relationship ?? "Guardian", method: pl.method ?? "Single-use link", preference: pl.preference === "ATTEND" ? "Will attend each conversation" : "Reachable, not present",
    guidelines: consent ? `Family participation guidelines v${consent.version}` : "Not recorded",
  };
}
