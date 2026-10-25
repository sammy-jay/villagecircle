import { db } from "./db";
import { notify } from "./notify";
import { moveAsk, type R } from "./asks";
import { toMentorView, type MentorFacingAsk } from "./domain/mentor-summary";
import { mentorEligibleForAsk } from "./domain/permissions";
import { validateOffers } from "./domain/scheduling";
import { ageBandLabel, mentorInboxItem } from "./domain/views";
import { isMinor } from "./domain/age";
import { expertiseLabel } from "./domain/expertise";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export async function mentorFor(userId: string) {
  const m = await db.mentorProfile.findUnique({ where: { userId }, include: { user: true } });
  return m;
}

/** BR-01 / BR-04 / BR-13: only a verified, oriented mentor sees Asks, and only ones the team released to them. */
async function releasedEntry(mentorId: string, askId: string) {
  return db.shortlistEntry.findFirst({ where: { askId, mentorId, releasedAt: { not: null } }, include: { ask: { include: { topic: true, participant: { include: { user: true } }, review: true } } } });
}
function summaryOf(e: NonNullable<Awaited<ReturnType<typeof releasedEntry>>>): MentorFacingAsk | null {
  const r = e.ask.review; if (!r?.summaryApprovedAt || !r.mentorSummary) return null;
  let s: { question: string; whatWouldHelp: string }; try { s = JSON.parse(r.mentorSummary); } catch { return null; }
  return toMentorView({ askId: e.askId, topic: e.ask.topic.name, question: s.question, whatWouldHelp: s.whatWouldHelp, ageBand: ageBandLabel(e.ask.participant.user.ageBand), sessionLength: (r.sessionLength === 60 ? 60 : 30) });
}

export async function mentorInbox(userId: string) {
  const m = await mentorFor(userId); if (!m) return null;
  const eligible = m.verification === "APPROVED" && !!m.codeOfConductAt && !!m.orientationDoneAt;
  const entries = eligible ? await db.shortlistEntry.findMany({ where: { mentorId: m.id, releasedAt: { not: null } }, include: { ask: { include: { topic: true, participant: { include: { user: true } }, review: true, connection: true } } }, orderBy: { releasedAt: "desc" } }) : [];
  const open = entries.filter((e) => e.ask.state === "OPEN_TO_MENTORS" && e.response === "NONE");
  const items = open.map((e) => { const s = summaryOf(e as never); return s ? mentorInboxItem(s, false, e.releasedAt) : null; }).filter(Boolean) as ReturnType<typeof mentorInboxItem>[];
  const mine = entries.filter((e) => e.ask.connection?.mentorId === m.id);
  const stepped = entries.filter((e) => e.response === "STEPPED_FORWARD" && e.ask.state === "MENTOR_STEPPED_FORWARD").length;
  const scheduled = mine.filter((e) => ["CONNECTION_APPROVED", "SCHEDULED"].includes(e.ask.state)).length;
  const completed = mine.filter((e) => ["HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"].includes(e.ask.state)).length;
  const hoursTotal = (await db.connection.aggregate({ where: { mentorId: m.id, hoursCounted: true }, _sum: { durationMinutes: true } }))._sum.durationMinutes ?? 0;
  return { name: m.user.name, eligible, monthlyHours: m.monthlyHours, hoursGiven: m.hoursGivenThisMonth, totalHours: Math.round(hoursTotal / 6) / 10, items, counts: { open: items.length, stepped, scheduled, completed }, expertise: [m.primaryExpertise, ...m.extraExpertise].map(expertiseLabel), clearedForMinors: m.clearedForMinors, orientationDone: !!m.orientationDoneAt };
}

export async function mentorAskDetail(userId: string, askId: string) {
  const m = await mentorFor(userId); if (!m) return null;
  const e = await releasedEntry(m.id, askId); if (!e) return null; // not released to this mentor: indistinguishable from not existing
  if (!["OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED"].includes(e.ask.state)) return null;
  const s = summaryOf(e); if (!s) return null;
  const minor = !!e.ask.participant.user.dateOfBirth && isMinor(e.ask.participant.user.dateOfBirth);
  const guardian = minor ? (await db.guardianLink.findFirst({ where: { participantId: e.ask.participantId, active: true }, include: { guardian: true } }))?.guardian : null;
  const hasCapacity = m.hoursGivenThisMonth < m.monthlyHours;
  return { summary: s, response: e.response, minor, guardianAttends: !!guardian && guardian.attendancePref === "ATTEND", hoursGiven: m.hoursGivenThisMonth, monthlyHours: m.monthlyHours, hasCapacity, whyThought: [`Profession match: ${expertiseLabel(m.primaryExpertise)}`, `Topic experience: ${e.ask.topic.name.toLowerCase()}`, ...(minor && m.clearedForMinors ? ["Cleared for minors"] : [])], answerable: e.ask.state === "OPEN_TO_MENTORS" && e.response === "NONE", offered: e.offeredTimes };
}

export type MentorResponse = { action: "STEP_FORWARD"; times: string[] } | { action: "PASS" } | { action: "REFER_ON"; note: string; colleague?: string; reason?: string };

export async function mentorRespond(userId: string, askId: string, r: MentorResponse): Promise<R> {
  const m = await mentorFor(userId); if (!m) return fail("Not allowed.");
  const e = await releasedEntry(m.id, askId); if (!e) return fail("This Ask isn't available.");
  if (e.ask.state !== "OPEN_TO_MENTORS" && !(e.ask.state === "MENTOR_STEPPED_FORWARD" && r.action === "STEP_FORWARD")) return fail("This Ask is no longer open.");
  if (e.response !== "NONE") return fail("You've already responded.");
  const minor = !!e.ask.participant.user.dateOfBirth && isMinor(e.ask.participant.user.dateOfBirth);
  if (!mentorEligibleForAsk({ verification: m.verification, codeOfConductAt: m.codeOfConductAt, orientationDoneAt: m.orientationDoneAt, clearedForMinors: m.clearedForMinors, monthlyHours: m.monthlyHours, hoursGivenThisMonth: 0 }, minor)) return fail("You can't take this Ask.");
  const now = new Date();
  if (r.action === "STEP_FORWARD") {
    const v = validateOffers(r.times.map((t) => new Date(t))); if (!v.ok) return fail(v.error);
    await db.shortlistEntry.update({ where: { id: e.id }, data: { response: "STEPPED_FORWARD", respondedAt: now, offeredTimes: v.times, lengthMinutes: e.ask.review?.sessionLength ?? 30 } });
    if (e.ask.state === "OPEN_TO_MENTORS") { const mv = await moveAsk(askId, "MENTOR_STEPPED_FORWARD", "MENTOR", { actorId: userId }); if (!mv.ok) return mv; }
    await db.mentorProfile.update({ where: { id: m.id }, data: { lastAskAt: now } });
    const admins = await db.user.findMany({ where: { roles: { has: "ADMIN" } }, select: { id: true } });
    for (const a of admins) await notify(a.id, "ask.stepped_forward", "A mentor stepped forward", "An Ask is waiting for you to confirm who takes it.", { link: `/admin/asks/${askId}`, email: false, dedupeKey: `step-${askId}-${m.id}-${a.id}` });
    return { ok: true };
  }
  // Passing is never shown to the participant and never lowers standing: only the response flag changes (BR-12).
  await db.shortlistEntry.update({ where: { id: e.id }, data: r.action === "PASS" ? { response: "PASSED", respondedAt: now } : { response: "REFERRED_ON", respondedAt: now, note: r.note.trim().slice(0, 500), suggestedColleague: r.colleague?.trim().slice(0, 120), reason: r.reason?.trim().slice(0, 80) } });
  await returnIfNobodyLeft(askId);
  return { ok: true };
}

/** If every released mentor has passed, the Ask goes back to the team (R-NOONE) rather than waiting in silence. */
export async function returnIfNobodyLeft(askId: string) {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { shortlist: true } });
  if (!ask || ask.state !== "OPEN_TO_MENTORS") return;
  const live = ask.shortlist.filter((s) => s.releasedAt && ["NONE", "STEPPED_FORWARD"].includes(s.response));
  if (live.length === 0) await moveAsk(askId, "IN_TEAM_REVIEW", "SYSTEM", { reason: "R_NOONE", note: "Everyone released to has passed", data: { serviceWindowDue: new Date(Date.now() + 5 * 86400_000) } });
}
