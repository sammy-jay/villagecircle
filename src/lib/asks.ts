import type { Ask, AskState, ReasonCode } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { canTransition, type Actor } from "./domain/ask-state";
import { canStartAsk } from "./domain/limits";
import { isMinor } from "./domain/age";
import { askAnswersSchema, parseAnswers, completeness, CONTINUE_AT, screenText, askText, missingPrompts, type AskAnswers } from "./domain/ask-answers";
import { reviewDue, addHours, WINDOWS } from "./domain/service-windows";
import { toParticipantAsk, shortName } from "./domain/views";

export type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** The single place an Ask changes state: validates the move, writes the append-only history. */
export async function moveAsk(askId: string, to: AskState, actor: Actor, o: { actorId?: string; reason?: ReasonCode; note?: string; data?: Record<string, unknown>; ctx?: Partial<Parameters<typeof canTransition>[0]> } = {}): Promise<R<{ ask: Ask }>> {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { participant: { include: { user: true } } } });
  if (!ask) return fail("Ask not found.");
  const minor = !!ask.participant.user.dateOfBirth && isMinor(ask.participant.user.dateOfBirth);
  const v = canTransition({ from: ask.state, to, actor, isMinor: minor, ...o.ctx });
  if (!v.ok) return fail(v.error);
  const exit = ["WITHDRAWN", "ANSWERED_BY_RESOURCE", "REDIRECTED", "NOT_PROCEEDING", "GUARDIAN_DECLINED", "LAPSED"].includes(to);
  const updated = await db.ask.update({ where: { id: askId }, data: { state: to, reasonCode: o.reason ?? null, ...(exit ? { exitedAt: new Date() } : {}), ...(o.data as object) } });
  await db.askStateChange.create({ data: { askId, from: ask.state, to, actorId: o.actorId, reason: o.reason, note: o.note } });
  return { ok: true, ask: updated };
}

export async function participantFor(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { participant: true } });
  if (!user?.participant) return null;
  return { user, profile: user.participant, minor: !!user.dateOfBirth && isMinor(user.dateOfBirth) };
}

async function ownAsk(userId: string, askId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const ask = await db.ask.findFirst({ where: { id: askId, participantId: p.profile.id }, include: { topic: true } });
  return ask ? { ...p, ask } : null;
}

export async function listTopics() { return db.topic.findMany({ orderBy: { sortOrder: "asc" } }); }

export async function startAsk(userId: string, topicSlug: string): Promise<R<{ id: string }>> {
  const p = await participantFor(userId); if (!p) return fail("Only participants can start an Ask.");
  if (p.user.status !== "ACTIVE") return fail("Your account isn't open yet.");
  const topic = await db.topic.findUnique({ where: { slug: topicSlug } });
  if (!topic || !topic.active || topic.later) return fail("That topic isn't available yet.");
  const states = (await db.ask.findMany({ where: { participantId: p.profile.id }, select: { state: true } })).map((a) => a.state);
  const cap = canStartAsk(states); if (!cap.ok) return fail(cap.error!);
  const a = await db.ask.create({ data: { participantId: p.profile.id, submittedById: userId, topicId: topic.id, answers: askAnswersSchema.parse({}) as never, completeness: completeness({}, true) } });
  await db.askStateChange.create({ data: { askId: a.id, to: "DRAFT", actorId: userId } });
  return { ok: true, id: a.id };
}

export async function changeTopic(userId: string, askId: string, topicSlug: string): Promise<R> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (o.ask.state !== "DRAFT") return fail("The topic can only be changed while this is a draft.");
  const t = await db.topic.findUnique({ where: { slug: topicSlug } }); if (!t || !t.active || t.later) return fail("That topic isn't available yet.");
  await db.ask.update({ where: { id: askId }, data: { topicId: t.id } });
  return { ok: true };
}

/** Saves wizard answers. Allowed on a draft, or when the team returned the Ask for more detail (EX5). */
export async function saveAnswers(userId: string, askId: string, patch: unknown): Promise<R<{ completeness: number }>> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  const returned = o.ask.state === "IN_TEAM_REVIEW" && o.ask.reasonCode === "R_THIN";
  if (o.ask.state !== "DRAFT" && !returned) return fail("This Ask can no longer be edited.");
  const cur = parseAnswers(o.ask.answers);
  const parsed = askAnswersSchema.safeParse({ ...cur, ...(patch as object) });
  if (!parsed.success) return fail("Check your answers and try again.");
  const c = completeness(parsed.data, true);
  await db.ask.update({ where: { id: askId }, data: { answers: parsed.data as never, completeness: c } });
  return { ok: true, completeness: c };
}

export async function getOwnAsk(userId: string, askId: string) {
  const o = await ownAsk(userId, askId); if (!o) return null;
  const review = await db.review.findUnique({ where: { askId } });
  return { minor: o.minor, ask: toParticipantAsk({ id: o.ask.id, state: o.ask.state, topicName: o.ask.topic.name, answers: parseAnswers(o.ask.answers), completeness: o.ask.completeness, submittedAt: o.ask.submittedAt, updatedAt: o.ask.updatedAt, teamNote: o.ask.teamNote, returnedForDetail: o.ask.state === "IN_TEAM_REVIEW" && o.ask.reasonCode === "R_THIN" && review?.decision === "RETURN_FOR_INFO", redirectLinks: o.ask.redirectLinks }), topicSlug: o.ask.topic.slug, returnedAt: review?.decidedAt ?? null };
}

/** Wizard step 4. Minors go to their guardian first (BR-05). Adults go straight to the team. */
export async function submitAsk(userId: string, askId: string): Promise<R<{ next: "GUARDIAN" | "TEAM" | "CRISIS" }>> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  const answers = parseAnswers(o.ask.answers);
  const returned = o.ask.state === "IN_TEAM_REVIEW" && o.ask.reasonCode === "R_THIN";
  if (o.ask.state !== "DRAFT" && !returned) return fail("This Ask has already been sent.");
  const c = completeness(answers, true);
  if (c < CONTINUE_AT) return fail("A few answers need a little more before you can send this.");
  const flags = screenText(askText(answers));
  const crisis = flags.includes("CRISIS");
  if (returned) { // EX5: small edits don't need the guardian again
    await db.review.update({ where: { askId }, data: { decision: "PENDING", flags } });
    await db.ask.update({ where: { id: askId }, data: { reasonCode: "R_NEW", serviceWindowDue: reviewDue(new Date()), completeness: c, pausedForCrisis: crisis } });
    await db.askStateChange.create({ data: { askId, from: "IN_TEAM_REVIEW", to: "IN_TEAM_REVIEW", actorId: userId, reason: "R_NEW", note: "Participant updated the Ask" } });
    return { ok: true, next: crisis ? "CRISIS" : "TEAM" };
  }
  await db.ask.update({ where: { id: askId }, data: { completeness: c, submittedAt: new Date(), pausedForCrisis: crisis } });
  if (o.minor) {
    const m = await moveAsk(askId, "AWAITING_GUARDIAN", "PARTICIPANT", { actorId: userId, reason: "R_CONSENT" }); if (!m.ok) return m;
    await notifyGuardiansOfAsk(o.profile.id, askId, o.user.name);
    if (crisis) await queueForReview(askId, flags); // the team still sees a crisis flag at once
    return { ok: true, next: crisis ? "CRISIS" : "GUARDIAN" };
  }
  const m = await moveAsk(askId, "SUBMITTED", "PARTICIPANT", { actorId: userId }); if (!m.ok) return m;
  await queueForReview(askId, flags);
  return { ok: true, next: crisis ? "CRISIS" : "TEAM" };
}

/** SUBMITTED to IN_TEAM_REVIEW, with its review record, window and reason code (R-NEW / R-FLAG / R-TIME). */
export async function queueForReview(askId: string, flags?: string[]) {
  const ask = await db.ask.findUnique({ where: { id: askId } }); if (!ask) return;
  const answers = parseAnswers(ask.answers);
  const f = flags ?? screenText(askText(answers));
  const flagged = f.some((x) => x !== "CONTACT_DETAILS");
  const reason: ReasonCode = flagged ? "R_FLAG" : answers.timeBound ? "R_TIME" : "R_NEW";
  const now = new Date();
  const moved = ask.state === "SUBMITTED" ? await moveAsk(askId, "IN_TEAM_REVIEW", "SYSTEM", { reason, data: { serviceWindowDue: flagged ? addHours(now, WINDOWS.flaggedHours) : reviewDue(now) } }) : null;
  if (ask.state === "SUBMITTED" && moved && !moved.ok) return;
  await db.review.upsert({ where: { askId }, update: { flags: f }, create: { askId, flags: f, sessionLength: answers.sessionLength } });
}

async function notifyGuardiansOfAsk(participantId: string, askId: string, name: string) {
  const links = await db.guardianLink.findMany({ where: { participantId, active: true }, include: { guardian: true } });
  for (const l of links) await notify(l.guardian.userId, "ask.authorize", `${name.split(" ")[0]} sent an Ask for your authorization`, "Please read it and decide. Nothing moves forward until you answer.", { link: `/guardian/approvals/${askId}`, dedupeKey: `ask-auth-${askId}-${l.guardianId}` });
}

export async function withdrawAsk(userId: string, askId: string, reason?: string): Promise<R> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (["HELD", "COMPLETE", "ONGOING_MENTORSHIP", "FOLLOW_UP_REQUESTED"].includes(o.ask.state)) return fail("This conversation has already happened.");
  const m = await moveAsk(askId, "WITHDRAWN", "PARTICIPANT", { actorId: userId, note: reason }); if (!m.ok) return m;
  await cancelConnectionFor(askId, "Participant withdrew the Ask");
  await audit(userId, "ask.withdrawn", "Ask", askId);
  return { ok: true };
}

async function cancelConnectionFor(askId: string, why: string) {
  const c = await db.connection.findUnique({ where: { askId } });
  if (c && !["HELD", "CANCELLED"].includes(c.status)) {
    await db.connection.update({ where: { id: c.id }, data: { status: "CANCELLED" } });
    const mentor = await db.mentorProfile.findUnique({ where: { id: c.mentorId } });
    if (mentor) await notify(mentor.userId, "connection.cancelled", "A conversation was cancelled", "The participant closed their Ask. Your hour isn't counted.", { link: "/mentor" });
    void why;
  }
}

/** D11: "Yes, close my Ask as answered". No mentor time is used. */
export async function closeAsAnswered(userId: string, askId: string): Promise<R> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (o.ask.state !== "DRAFT") return fail("This Ask has already been sent.");
  const m = await moveAsk(askId, "ANSWERED_BY_RESOURCE", "PARTICIPANT", { actorId: userId }); return m.ok ? { ok: true } : m;
}

/** Delete a draft for good. Only drafts: once an Ask is sent it has a history that the team keeps. */
export async function deleteDraft(userId: string, askId: string): Promise<R> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (o.ask.state !== "DRAFT") return fail("Only drafts can be deleted. You can withdraw an Ask that was sent.");
  await db.$transaction([
    db.askStateChange.deleteMany({ where: { askId } }),
    db.askMessage.deleteMany({ where: { askId } }),
    db.review.deleteMany({ where: { askId } }),
    db.shortlistEntry.deleteMany({ where: { askId } }),
    db.guardianAuthorization.deleteMany({ where: { askId } }),
    db.ask.delete({ where: { id: askId } }),
  ]);
  return { ok: true };
}

/** "Reopen with the same answers": a fresh draft, because ended Asks never come back to life. */
export async function reopenAsk(userId: string, askId: string): Promise<R<{ id: string }>> {
  const o = await ownAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (!["ANSWERED_BY_RESOURCE", "LAPSED", "GUARDIAN_DECLINED", "NOT_PROCEEDING", "WITHDRAWN"].includes(o.ask.state)) return fail("This Ask is still open.");
  const s = await startAsk(userId, o.ask.topic.slug); if (!s.ok) return s;
  await db.ask.update({ where: { id: s.id }, data: { answers: o.ask.answers as never, completeness: o.ask.completeness } });
  return s;
}

export async function listOwnAsks(userId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const asks = await db.ask.findMany({ where: { participantId: p.profile.id }, include: { topic: true, connection: { include: { mentor: { include: { user: true } } } }, review: true }, orderBy: { updatedAt: "desc" } });
  return { minor: p.minor, name: p.user.name, asks: asks.map((a) => ({ id: a.id, state: a.state, topic: a.topic.name, title: parseAnswers(a.answers).q1.split(/[.?!]/)[0]?.trim() || "Untitled draft", submittedAt: a.submittedAt, updatedAt: a.updatedAt, exitedAt: a.exitedAt, reasonCode: a.reasonCode, returned: a.state === "IN_TEAM_REVIEW" && a.review?.decision === "RETURN_FOR_INFO", scheduledAt: a.connection?.scheduledAt ?? null, guardianApprovedAt: a.connection?.guardianTimeApprovedAt ?? null, mentorShort: a.connection ? shortName(a.connection.mentor.user.name) : null, connectionStatus: a.connection?.status ?? null, handMatching: a.reasonCode === "R_NOONE" || a.reasonCode === "R_QUIET", sessionLength: parseAnswers(a.answers).sessionLength })) };
}

/** Resources that may already answer the Ask (D11). Only approved library items. */
export async function resourcesForTopic(topicSlug: string) {
  const topic = await db.topic.findUnique({ where: { slug: topicSlug } });
  const rs = await db.resource.findMany({ where: { moderation: "APPROVED", visibility: "PUBLIC", ...(topic ? { topics: { has: topic.slug } } : {}) }, take: 3, orderBy: { lastReviewed: "desc" } });
  return rs.map((r) => ({ id: r.id, title: r.title, type: r.type, reviewed: r.lastReviewed }));
}

// ───────── Guardian decisions on the Ask itself (G2 step 1) ─────────
export async function guardianContext(userId: string) {
  const g = await db.guardian.findUnique({ where: { userId }, include: { links: { where: { active: true } } } });
  return g && g.verified ? g : null;
}
async function guardianAsk(userId: string, askId: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { participant: { include: { user: true } }, topic: true } });
  if (!ask || !g.links.some((l) => l.participantId === ask.participantId)) return null; // only linked young people
  return { g, ask };
}
export async function guardianAskView(userId: string, askId: string) {
  const o = await guardianAsk(userId, askId); if (!o) return null;
  const conn = await db.connection.findUnique({ where: { askId }, include: { mentor: { include: { user: true } } } });
  return { askId, state: o.ask.state, participantFirst: o.ask.participant.user.name.split(" ")[0]!, topic: o.ask.topic.name, answers: parseAnswers(o.ask.answers), submittedAt: o.ask.submittedAt, connection: conn ? { id: conn.id, status: conn.status, status2: conn.status, scheduledAt: conn.scheduledAt, offered: conn.offeredTimes, durationMinutes: conn.durationMinutes, guardianMentorApprovedAt: conn.guardianMentorApprovedAt, guardianTimeApprovedAt: conn.guardianTimeApprovedAt } : null, mentorUserId: conn?.mentor.userId ?? null };
}
export async function guardianDecideAsk(userId: string, askId: string, approve: boolean): Promise<R> {
  const o = await guardianAsk(userId, askId); if (!o) return fail("Ask not found.");
  if (o.ask.state !== "AWAITING_GUARDIAN") return fail("This Ask isn't waiting for you.");
  await db.guardianAuthorization.create({ data: { guardianId: o.g.id, askId, kind: "ASK", approved: approve } });
  if (!approve) { const m = await moveAsk(askId, "GUARDIAN_DECLINED", "GUARDIAN", { actorId: userId }); if (!m.ok) return m; await notify(o.ask.participant.userId, "ask.guardian_declined", "Your guardian did not authorize this Ask", "You can talk it through together, then edit and send it again.", { link: "/asks" }); return { ok: true }; }
  const m = await moveAsk(askId, "SUBMITTED", "GUARDIAN", { actorId: userId, ctx: { guardianAuthorized: true } }); if (!m.ok) return m;
  await queueForReview(askId);
  await notify(o.ask.participant.userId, "ask.authorized", "Your guardian authorized your Ask", "A team member will read it next. Usually within 2 business days.", { link: `/asks/${askId}` });
  return { ok: true };
}
export async function listGuardianApprovals(userId: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const asks = await db.ask.findMany({ where: { participantId: { in: g.links.map((l) => l.participantId) }, state: { in: ["AWAITING_GUARDIAN", "CONNECTION_APPROVED", "SCHEDULED"] } }, include: { participant: { include: { user: true } }, topic: true, connection: true }, orderBy: { updatedAt: "desc" } });
  return asks.map((a) => ({ id: a.id, first: a.participant.user.name.split(" ")[0]!, topic: a.topic.name, state: a.state, needsYou: a.state === "AWAITING_GUARDIAN" || a.connection?.status === "AWAITING_GUARDIAN" }));
}
/** Edit and send again after a guardian declined: returns a fresh draft with the same answers. */
export async function declinedToDraft(userId: string, askId: string) { return reopenAsk(userId, askId); }
export { missingPrompts };
