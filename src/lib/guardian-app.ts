import { db } from "./db";
import { audit } from "./audit";
import { guardianContext, type R } from "./asks";
import { roleIn } from "./connections";
import { firstName, shortName } from "./domain/views";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** G1 "Change to reachable, not present" (or back) for one booked conversation. */
export async function setAttendance(userId: string, askId: string, attends: boolean): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN" || !r.conn) return fail("Not available.");
  if (!["SCHEDULED", "CONNECTION_APPROVED"].includes(r.ask.state)) return fail("This conversation is not booked.");
  await db.connection.update({ where: { id: r.conn.id }, data: { guardianAttends: attends } });
  await audit(userId, "guardian.attendance", "Connection", r.conn.id, null, { attends });
  return { ok: true };
}

/** G1 Family settings: the default for future conversations (ATTEND or REACHABLE). */
export async function setAttendancePref(userId: string, pref: "ATTEND" | "REACHABLE"): Promise<R> {
  const g = await guardianContext(userId); if (!g) return fail("Not available.");
  await db.guardian.update({ where: { id: g.id }, data: { attendancePref: pref } });
  return { ok: true };
}

/** Authorizations page: every decision this guardian has made, newest first, plus the family settings. */
export async function guardianAuthorizations(userId: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const rows = await db.guardianAuthorization.findMany({ where: { guardianId: g.id }, include: { ask: { include: { topic: true, participant: { include: { user: true } } } } }, orderBy: { decidedAt: "desc" }, take: 50 });
  const mentorIds = [...new Set(rows.map((r) => r.mentorId).filter((x): x is string => !!x))];
  const mentors = mentorIds.length ? await db.mentorProfile.findMany({ where: { id: { in: mentorIds } }, include: { user: true } }) : [];
  return {
    pref: g.attendancePref === "ATTEND" ? "ATTEND" as const : "REACHABLE" as const,
    rows: rows.map((r) => ({
      id: r.id, kind: r.kind, approved: r.approved, at: r.decidedAt, askId: r.askId, topic: r.ask.topic.name, first: firstName(r.ask.participant.user.name),
      mentor: r.mentorId ? (() => { const m = mentors.find((x) => x.id === r.mentorId); return m ? shortName(m.user.name) : null; })() : null, scheduledAt: r.scheduledAt,
    })),
  };
}
