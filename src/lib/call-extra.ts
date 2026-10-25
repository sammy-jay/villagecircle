import { db } from "./db";
import { guardianAskView, guardianContext } from "./asks";
import { roleIn } from "./connections";
import { toMentorCard, firstName } from "./domain/views";
import { expertiseLabel } from "./domain/expertise";

/** G2: everything the guardian approval page shows, behind the same link check as guardianAskView. */
export async function guardianApprovalView(userId: string, askId: string) {
  const v = await guardianAskView(userId, askId); if (!v) return null;
  const conn = await db.connection.findUnique({ where: { askId }, include: { mentor: { include: { user: true } } } });
  const auth = await db.guardianAuthorization.findFirst({ where: { askId, kind: "ASK", approved: true }, orderBy: { decidedAt: "desc" } });
  const m = conn?.mentor;
  const mentor = m ? {
    card: toMentorCard({ name: m.user.name, primaryExpertise: m.primaryExpertise, extraExpertise: m.extraExpertise, country: m.user.countryOfResidence, languages: m.languages, monthlyHours: m.monthlyHours, clearedForMinors: m.clearedForMinors, verified: m.verification === "APPROVED", headline: expertiseLabel(m.primaryExpertise) }, expertiseLabel),
    first: firstName(m.user.name), verified: m.verification === "APPROVED", cleared: m.clearedForMinors, oriented: !!m.orientationDoneAt,
  } : null;
  return { ...v, mentor, authorizedAt: auth?.decidedAt ?? null, guardianAttends: !!conn?.guardianAttends, paused: !!conn?.pausedByConcern };
}

/** Header and nav data for the guardian shell. */
export async function guardianShellData(userId: string) {
  const g = await guardianContext(userId);
  if (!g) return { kids: [] as string[], needs: 0 };
  const ps = await db.participantProfile.findMany({ where: { id: { in: g.links.map((l) => l.participantId) } }, include: { user: true } });
  const needs = await db.ask.count({ where: { participantId: { in: g.links.map((l) => l.participantId) }, OR: [{ state: "AWAITING_GUARDIAN" }, { state: "CONNECTION_APPROVED", connection: { is: { status: "AWAITING_GUARDIAN" } } }] } });
  return { kids: ps.map((p) => firstName(p.user.name)), needs };
}

/** EX4: has the mentor already joined? Only ever returned to someone in the conversation. */
export async function mentorIsInRoom(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r?.conn) return false;
  return !!r.conn.mentorJoinedAt;
}
