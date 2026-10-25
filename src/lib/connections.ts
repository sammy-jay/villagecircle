import type { Connection } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify, notifySafeguarding, appUrl } from "./notify";
import { moveAsk, guardianContext, type R } from "./asks";
import { sendEmail } from "./integrations/email";
import { buildIcs, googleCalendarLink } from "./integrations/calendar";
import { createRoom, createMeetingToken, deleteRoom } from "./integrations/video";
import { isMinor, ageOn } from "./domain/age";
import { isOffered, validateOffers, joinState, minutesUntilOpen, attendanceAfterWait, canReschedule, fmtWhen, MISSED_AFTER_MIN } from "./domain/scheduling";
import { toMentorCard, toParticipantCard, shortName, firstName } from "./domain/views";
import { expertiseLabel } from "./domain/expertise";
import { parseAnswers } from "./domain/ask-answers";
import { addHours, WINDOWS } from "./domain/service-windows";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
export type Role = "PARTICIPANT" | "MENTOR" | "GUARDIAN";

type Full = Awaited<ReturnType<typeof load>>;
async function load(askId: string) {
  return db.ask.findUnique({ where: { id: askId }, include: { topic: true, participant: { include: { user: true } }, connection: { include: { mentor: { include: { user: true } } } } } });
}

/** Resolves who the signed-in person is for THIS conversation. Anyone else gets nothing. */
export async function roleIn(userId: string, askId: string): Promise<{ role: Role; ask: NonNullable<Full>; conn: NonNullable<NonNullable<Full>["connection"]> | null } | null> {
  const ask = await load(askId); if (!ask) return null;
  const conn = ask.connection;
  if (ask.participant.userId === userId) return { role: "PARTICIPANT", ask, conn };
  if (conn?.mentor.userId === userId) return { role: "MENTOR", ask, conn };
  const g = await guardianContext(userId);
  if (g && g.links.some((l) => l.participantId === ask.participantId)) return { role: "GUARDIAN", ask, conn };
  return null;
}
const isMinorAsk = (ask: NonNullable<Full>) => !!ask.participant.user.dateOfBirth && isMinor(ask.participant.user.dateOfBirth);
const guardiansOf = async (participantId: string) => (await db.guardianLink.findMany({ where: { participantId, active: true }, include: { guardian: true } })).map((l) => l.guardian);

/** Mentor card for the participant and guardian. Never contact details. */
function mentorCardOf(conn: NonNullable<NonNullable<Full>["connection"]>) {
  const m = conn.mentor;
  return toMentorCard({ name: m.user.name, primaryExpertise: m.primaryExpertise, extraExpertise: m.extraExpertise, country: m.user.countryOfResidence, languages: m.languages, monthlyHours: m.monthlyHours, clearedForMinors: m.clearedForMinors, verified: m.verification === "APPROVED", headline: expertiseLabel(m.primaryExpertise) }, expertiseLabel);
}

// ───────── D3: the participant tracker ─────────
export async function trackerView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT") return null;
  const { ask, conn } = r; const minor = isMinorAsk(ask);
  const guardians = await guardiansOf(ask.participantId);
  const g = guardians[0] ? await db.user.findUnique({ where: { id: guardians[0].userId }, select: { name: true } }) : null;
  const history = await db.askStateChange.findMany({ where: { askId }, orderBy: { createdAt: "asc" } });
  const at = (to: string) => history.find((h) => h.to === to)?.createdAt ?? null;
  const notes = await db.notification.findMany({ where: { userId, event: { in: ["connection.confirmed", "ask.guardian_approved_time", "connection.reminder"] } }, orderBy: { createdAt: "desc" }, take: 3 });
  return {
    id: ask.id, state: ask.state, topic: ask.topic.name, answers: parseAnswers(ask.answers), minor, guardianName: g ? firstName(g.name) : null, minorsGuardianAttends: !!conn?.guardianAttends,
    marks: { submitted: ask.submittedAt, authorized: at("SUBMITTED"), reviewed: at("OPEN_TO_MENTORS"), stepped: at("MENTOR_STEPPED_FORWARD"), approved: at("CONNECTION_APPROVED") },
    mentor: conn && ["CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"].includes(ask.state) ? mentorCardOf(conn) : null,
    connection: conn ? { id: conn.id, status: conn.status, scheduledAt: conn.scheduledAt, offered: conn.offeredTimes, minutes: conn.durationMinutes, guardianTimeApprovedAt: conn.guardianTimeApprovedAt, rescheduleCount: conn.rescheduleCount, paused: conn.pausedByConcern, attendance: conn.attendance } : null,
    notes: notes.map((n) => ({ title: n.title, at: n.createdAt })), teamNote: ask.teamNote, redirectLinks: Array.isArray(ask.redirectLinks) ? (ask.redirectLinks as { title: string; note?: string; url?: string }[]) : [], reason: ask.reasonCode,
    handMatching: ask.reasonCode === "R_NOONE" || ask.reasonCode === "R_QUIET", exitedAt: ask.exitedAt, calendarUrl: conn?.scheduledAt ? googleCalendarLink({ uid: conn.id, title: `Village Circle: ${ask.topic.name}`, startsAt: conn.scheduledAt, minutes: conn.durationMinutes, description: "Join from your dashboard.", organizerEmail: "" }) : null,
  };
}

// ───────── D14: pick a time ─────────
export async function pickTime(userId: string, askId: string, time: string): Promise<R<{ awaitingGuardian: boolean }>> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return fail("Not available.");
  const { ask, conn } = r;
  if (ask.state !== "CONNECTION_APPROVED") return fail("This conversation can't be scheduled right now.");
  const t = new Date(time); if (!isOffered(conn.offeredTimes, t)) return fail("Choose one of the times your mentor offered.");
  const minor = isMinorAsk(ask);
  await db.connection.update({ where: { id: conn.id }, data: { scheduledAt: t, status: minor ? "AWAITING_GUARDIAN" : "PROPOSED", ...(minor ? { guardianTimeApprovedAt: null } : {}) } });
  if (!minor) { const s = await schedule(conn.id); return s.ok ? { ok: true, awaitingGuardian: false } : s; }
  for (const g of await guardiansOf(ask.participantId)) await notify(g.userId, "ask.approve_time", "Approve the mentor and the time", "Your young person chose a time. Nothing is booked until you answer.", { link: `/guardian/approvals/${askId}`, dedupeKey: `appr-${conn.id}-${t.getTime()}-${g.id}` });
  return { ok: true, awaitingGuardian: true };
}

// ───────── G2 steps 2 and 3: the guardian approves mentor and time (BR-06) ─────────
export async function guardianApproveConnection(userId: string, askId: string, d: { approve: boolean; time?: string; attends?: boolean }): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN" || !r.conn) return fail("Not available.");
  const g = (await guardianContext(userId))!; const { ask, conn } = r;
  if (ask.state !== "CONNECTION_APPROVED") return fail("There's nothing to approve right now.");
  if (!d.approve) {
    await db.guardianAuthorization.create({ data: { guardianId: g.id, askId, kind: "MENTOR_AND_TIME", mentorId: conn.mentorId, approved: false } });
    await db.connection.update({ where: { id: conn.id }, data: { status: "CANCELLED", scheduledAt: null } });
    await moveAsk(askId, "IN_TEAM_REVIEW", "SYSTEM", { reason: "R_QUIET", note: "Guardian asked for a different mentor", data: { serviceWindowDue: addHours(new Date(), 72) } });
    await notify(ask.participant.userId, "ask.mentor_changed", "The team will suggest someone else", "Your guardian chose a different mentor. Your Ask stays open.", { link: `/asks/${askId}` });
    return { ok: true };
  }
  const t = d.time ? new Date(d.time) : conn.scheduledAt;
  if (!t || !isOffered(conn.offeredTimes, t)) return fail("Choose one of the offered times.");
  const now = new Date();
  await db.guardianAuthorization.create({ data: { guardianId: g.id, askId, kind: "MENTOR_AND_TIME", mentorId: conn.mentorId, scheduledAt: t, approved: true } });
  await db.connection.update({ where: { id: conn.id }, data: { scheduledAt: t, guardianMentorApprovedAt: now, guardianTimeApprovedAt: now, guardianApproved: true, guardianAttends: d.attends ?? conn.guardianAttends } });
  return schedule(conn.id);
}

/** Creates the room and the invites, then moves the Ask to Scheduled. For a minor this only runs once the guardian approved this mentor AND this time. */
export async function schedule(connectionId: string): Promise<R> {
  const conn = await db.connection.findUnique({ where: { id: connectionId }, include: { ask: { include: { topic: true, participant: { include: { user: true } } } }, mentor: { include: { user: true } } } });
  if (!conn?.scheduledAt) return fail("No time chosen.");
  const minor = !!conn.ask.participant.user.dateOfBirth && isMinor(conn.ask.participant.user.dateOfBirth);
  if (minor && !(conn.guardianMentorApprovedAt && conn.guardianTimeApprovedAt)) return fail("The guardian must approve this mentor and time.");
  const m = await moveAsk(conn.askId, "SCHEDULED", "SYSTEM", { ctx: { guardianApprovedMentorAndTime: !!(conn.guardianMentorApprovedAt && conn.guardianTimeApprovedAt) } }); if (!m.ok) return m;
  const roomName = conn.roomName ?? `vc-${conn.id}`;
  const room = await createRoom({ name: roomName, startsAt: conn.scheduledAt, durationMinutes: conn.durationMinutes, record: minor }); // BR-07: minors are recorded
  await db.connection.update({ where: { id: conn.id }, data: { status: "CONFIRMED", roomName: room.name } });
  const title = `Village Circle: ${conn.ask.topic.name}`;
  const send = async (userId: string, who: string) => {
    const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } }); if (!u) return;
    const ics = buildIcs({ uid: `${conn.id}@villagecircle`, title, startsAt: conn.scheduledAt!, minutes: conn.durationMinutes, description: `Conversation with ${who}. Join from your dashboard: ${appUrl("/")}`, organizerEmail: "noreply@villagecircle.org" });
    await notify(userId, "connection.confirmed", "Your conversation is confirmed", `${fmtWhen(conn.scheduledAt!)}. The link opens 10 minutes before. This conversation is recorded when the participant is under 18.`, { link: "/", attachments: [{ filename: "conversation.ics", content: ics }] });
  };
  // NT2 "Conversation confirmed" goes to the participant (with the calendar file); the in-app note stays as it was.
  {
    const p = conn.ask.participant.user; const g = (await guardiansOf(conn.participantId)).length > 0;
    const ics = buildIcs({ uid: `${conn.id}@villagecircle`, title, startsAt: conn.scheduledAt!, minutes: conn.durationMinutes, description: `Conversation with ${shortName(conn.mentor.user.name)}. Join from your dashboard: ${appUrl("/")}`, organizerEmail: "noreply@villagecircle.org" });
    await notify(p.id, "connection.confirmed", "Your conversation is confirmed", `${fmtWhen(conn.scheduledAt!)}. The link opens 10 minutes before.`, { link: `/asks/${conn.askId}`, email: false });
    const { sendTemplated } = await import("./templates");
    await sendTemplated("email.session_confirmed", p.email, { participant_first_name: p.name, mentor_first_name: conn.mentor.user.name, when: fmtWhen(conn.scheduledAt!), topic: conn.ask.topic.name.toLowerCase(), minutes: String(conn.durationMinutes), guardian_sentence: minor && g && conn.guardianAttends ? "Your guardian will attend." : "" }, { link: appUrl(`/asks/${conn.askId}`), attachments: [{ filename: "conversation.ics", content: ics }] });
  }
  await send(conn.mentor.userId, "a participant");
  for (const g of await guardiansOf(conn.participantId)) await send(g.userId, shortName(conn.mentor.user.name));
  return { ok: true };
}

// ───────── EX1 / EX2: change or cancel ─────────
export async function requestChange(userId: string, askId: string, d: { kind: "RESCHEDULE" | "CANCEL"; reason?: string; note?: string }): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return fail("Not available.");
  const { ask, conn } = r; if (ask.state !== "SCHEDULED") return fail("This conversation isn't booked.");
  const reason = [d.reason, d.note].filter(Boolean).join(": ").slice(0, 400);
  if (d.kind === "CANCEL") {
    await db.connection.update({ where: { id: conn.id }, data: { status: "CANCELLED", changeRequestedBy: "PARTICIPANT", changeReason: reason } });
    if (conn.roomName) await deleteRoom(conn.roomName);
    await moveAsk(askId, "WITHDRAWN", "PARTICIPANT", { actorId: userId, note: "Cancelled the conversation" });
    await notify(conn.mentor.userId, "connection.cancelled", "A conversation was cancelled", "No reason is shared. Your hour isn't counted.", { link: "/mentor" });
    return { ok: true };
  }
  if (!canReschedule(conn.rescheduleCount)) { // second move: a team member steps in
    await moveAsk(askId, "CONNECTION_APPROVED", "SYSTEM", { reason: "R_MISS", note: "Second change request" });
    await db.connection.update({ where: { id: conn.id }, data: { status: "PROPOSED", changeRequestedBy: "PARTICIPANT", changeReason: reason, scheduledAt: null, offeredTimes: [] } });
    await db.ask.update({ where: { id: askId }, data: { reasonCode: "R_MISS" } });
    await notifyTeam(askId, "A conversation needs rescheduling again", "A team member should step in.");
    return { ok: true };
  }
  await moveAsk(askId, "CONNECTION_APPROVED", "SYSTEM", { reason: "R_MISS", note: "Participant asked to move" });
  await db.connection.update({ where: { id: conn.id }, data: { status: "PROPOSED", rescheduleCount: { increment: 1 }, changeRequestedBy: "PARTICIPANT", changeReason: reason, guardianTimeApprovedAt: null, scheduledAt: null, offeredTimes: [] } });
  if (conn.roomName) await deleteRoom(conn.roomName);
  await notify(conn.mentor.userId, "connection.change_requested", "A participant asked to move your conversation", "No reason is shared. Please offer new times.", { link: `/mentor/conversations/${askId}/change` });
  for (const g of await guardiansOf(conn.participantId)) await notify(g.userId, "connection.change_requested", "A change was requested", "A new time needs your approval before it is booked.", { link: `/guardian/approvals/${askId}` });
  return { ok: true };
}

/** EX2: the mentor offers other times, or hands the conversation back to the team. */
export async function mentorChangeTime(userId: string, askId: string, d: { action: "OFFER" | "HAND_BACK"; times?: string[]; note?: string }): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "MENTOR" || !r.conn) return fail("Not available.");
  const { ask, conn } = r; if (!["SCHEDULED", "CONNECTION_APPROVED"].includes(ask.state)) return fail("There's nothing to change.");
  if (d.action === "HAND_BACK") {
    if (ask.state === "SCHEDULED") await moveAsk(askId, "CONNECTION_APPROVED", "SYSTEM", { reason: "R_MISS" });
    await moveAsk(askId, "IN_TEAM_REVIEW", "SYSTEM", { reason: "R_QUIET", note: "Mentor handed the conversation back", data: { serviceWindowDue: addHours(new Date(), 72) } });
    await db.connection.update({ where: { id: conn.id }, data: { status: "CANCELLED", changeRequestedBy: "MENTOR", changeReason: d.note?.slice(0, 400) } });
    if (conn.roomName) await deleteRoom(conn.roomName);
    await notify(ask.participant.userId, "connection.handed_back", "The team is finding another mentor", "Nothing you did caused this. Your Ask stays open.", { link: `/asks/${askId}` });
    return { ok: true };
  }
  const v = validateOffers((d.times ?? []).map((t) => new Date(t))); if (!v.ok) return fail(v.error);
  if (ask.state === "SCHEDULED") await moveAsk(askId, "CONNECTION_APPROVED", "SYSTEM", { reason: "R_MISS" });
  await db.connection.update({ where: { id: conn.id }, data: { offeredTimes: v.times, scheduledAt: null, status: "PROPOSED", changeRequestedBy: "MENTOR", changeReason: d.note?.slice(0, 400), guardianTimeApprovedAt: null } });
  if (conn.roomName) await deleteRoom(conn.roomName);
  await notify(ask.participant.userId, "connection.new_times", "New times to choose from", "Your mentor needs to move your conversation. Pick a new time.", { link: `/asks/${askId}/time` });
  for (const g of await guardiansOf(conn.participantId)) await notify(g.userId, "connection.new_times", "A new time needs your approval", "Nothing is booked until you answer.", { link: `/guardian/approvals/${askId}` });
  return { ok: true };
}

async function notifyTeam(askId: string, title: string, body: string) {
  for (const a of await db.user.findMany({ where: { roles: { has: "ADMIN" } }, select: { id: true } })) await notify(a.id, "team.attention", title, body, { link: `/admin/asks/${askId}`, email: false });
}

// ───────── CL1 / CL4 / CL3: before and during the call ─────────
export async function preJoinView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || !r.conn?.scheduledAt || !["SCHEDULED", "HELD"].includes(r.ask.state)) return null;
  const { role, ask, conn } = r; const minor = isMinorAsk(ask); const start = conn.scheduledAt!;
  const gs = await guardiansOf(ask.participantId); const gUser = gs[0] ? await db.user.findUnique({ where: { id: gs[0].userId }, select: { name: true } }) : null;
  const answers = parseAnswers(ask.answers);
  const base = { role, minutes: conn.durationMinutes, start, state: joinState(start, conn.durationMinutes), opensIn: minutesUntilOpen(start), recorded: minor, topic: ask.topic.name, paused: conn.pausedByConcern, guardianAttends: conn.guardianAttends, askText: answers.q1 };
  if (role === "MENTOR") return { ...base, other: toParticipantCard({ name: ask.participant.user.name, age: ask.participant.user.dateOfBirth ? ageOn(ask.participant.user.dateOfBirth) : 0, isMinor: minor }, conn.guardianAttends), mentorCard: null as null, guardianName: null as null };
  return { ...base, other: null as null, mentorCard: mentorCardOf(conn), guardianName: gUser ? firstName(gUser.name) : null };
}

/** Joining: paused or concern-flagged conversations cannot be joined. Guardians observe. Each person's presence is recorded, nothing else. */
export async function joinCall(userId: string, askId: string): Promise<R<{ url: string; token: string; simulated: boolean; role: Role }>> {
  const r = await roleIn(userId, askId); if (!r || !r.conn?.scheduledAt || r.ask.state !== "SCHEDULED") return fail("This conversation can't be joined.");
  const { role, conn, ask } = r;
  if (conn.pausedByConcern) return fail("This conversation is paused.");
  const js = joinState(conn.scheduledAt!, conn.durationMinutes);
  if (js === "TOO_EARLY") return fail("The link opens 10 minutes before the start.");
  if (js === "ENDED") return fail("This conversation has ended.");
  const u = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const display = role === "MENTOR" ? shortName(u!.name) : role === "GUARDIAN" ? `${firstName(u!.name)}, observing` : firstName(u!.name);
  const name = conn.roomName ?? `vc-${conn.id}`;
  const tok = await createMeetingToken({ room: name, userName: display, ttlMinutes: conn.durationMinutes + 40 });
  const field = role === "MENTOR" ? "mentorJoinedAt" : role === "GUARDIAN" ? "guardianJoinedAt" : "participantJoinedAt";
  if (!(conn as Connection)[field]) await db.connection.update({ where: { id: conn.id }, data: { [field]: new Date() } });
  void ask;
  const domain = process.env.DAILY_DOMAIN;
  return { ok: true, role, url: domain ? `https://${domain}.daily.co/${name}` : `/call/${name}?dev=1`, token: tok.token, simulated: tok.simulated };
}

export async function callView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r?.conn?.scheduledAt) return null;
  const { role, ask, conn } = r; const minor = isMinorAsk(ask);
  return { role, topic: ask.topic.name, mentorShort: shortName(conn.mentor.user.name), participantFirst: firstName(ask.participant.user.name), minutes: conn.durationMinutes, start: conn.scheduledAt, recorded: minor, paused: conn.pausedByConcern, guardianFirst: null as string | null };
}

// ───────── Safety: one press (CL2 / CL3 / D3 "Report a concern") ─────────
export async function reportConcern(userId: string, askId: string, description: string, kind: "contact" | "outside" | "unsafe" | "other" = "unsafe"): Promise<R> {
  const m = await import("./safety-user"); // one implementation: Incident (HIGH + 24h for safeguarding), pause now, review after
  const r = await m.submitConcern(userId, { askId, kind, description }); return r.ok ? { ok: true } : r;
}

/** CL3 / M24: a guardian pauses the connection: cancels the booking, pauses the young person's account and Asks, alerts the lead. */
export async function guardianPause(userId: string, askId: string, why?: string): Promise<R> {
  const m = await import("./safety-user"); return m.guardianPauseConnection(userId, askId, why);
}

// ───────── EX3 / EX4: missed conversations and trouble ─────────
export async function recordMiss(connectionId: string): Promise<R<{ attendance: string }>> {
  const c = await db.connection.findUnique({ where: { id: connectionId }, include: { ask: { include: { participant: true } }, mentor: true } });
  if (!c?.scheduledAt || c.ask.state !== "SCHEDULED") return fail("Nothing to record.");
  const att = attendanceAfterWait(c.scheduledAt, { mentor: c.mentorJoinedAt, participant: c.participantJoinedAt });
  if (att === "BOTH" || att === "UNKNOWN") return fail("Nothing missed.");
  await db.connection.update({ where: { id: c.id }, data: { status: "MISSED", attendance: att, hoursCounted: false } });
  const mv = await moveAsk(c.askId, "CONNECTION_APPROVED", "SYSTEM", { reason: "R_MISS", note: `Missed: ${att}` }); if (!mv.ok) return mv;
  await db.connection.update({ where: { id: c.id }, data: { scheduledAt: null, offeredTimes: [] } });
  if (c.roomName) await deleteRoom(c.roomName);
  const second = c.rescheduleCount >= 1 || att === "NEITHER";
  await db.connection.update({ where: { id: c.id }, data: { rescheduleCount: { increment: 1 } } });
  if (second) await notifyTeam(c.askId, "A second missed conversation", "A team member should step in (R-MISS).");
  for (const g of await guardiansOf(c.participantId)) await notify(g.userId, "connection.missed", "The conversation did not happen", "You'll be told the next steps. Nobody is blamed.", { link: `/guardian/approvals/${c.askId}` });
  await notify(c.ask.participant.userId, "connection.missed", "The conversation did not happen", "You can pick a new time or ask the team to find someone else.", { link: `/asks/${c.askId}/missed` });
  if (att !== "MENTOR_ABSENT") await notify(c.mentor.userId, "connection.missed", "The conversation did not happen", "A team member will follow up. Your hour isn't counted.", { link: "/mentor" });
  return { ok: true, attendance: att };
}
export async function missedView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return null;
  const c = r.conn; const guardians = await guardiansOf(r.ask.participantId);
  const gUser = guardians[0] ? await db.user.findUnique({ where: { id: guardians[0].userId }, select: { name: true } }) : null;
  return { variant: c.attendance === "MENTOR_ABSENT" ? ("MENTOR" as const) : ("PARTICIPANT" as const), mentorFirst: firstName(r.conn.mentor.user.name), guardianFirst: gUser ? firstName(gUser.name) : null, minor: isMinorAsk(r.ask), canRebook: c.rescheduleCount <= 1, waitedMin: MISSED_AFTER_MIN };
}
/** "Pick a new time" / "Rebook": the mentor is asked to offer new times (they never see why). */
export async function requestNewTimes(userId: string, askId: string): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return fail("Not available.");
  await notify(r.conn.mentor.userId, "connection.new_times_needed", "Please offer new times", "A conversation needs a new time.", { link: `/mentor/conversations/${askId}/change` });
  return { ok: true };
}
export async function askTeamForDifferentMentor(userId: string, askId: string): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return fail("Not available.");
  if (r.ask.state !== "CONNECTION_APPROVED") return fail("Not available right now.");
  await db.connection.update({ where: { id: r.conn.id }, data: { status: "CANCELLED" } });
  await moveAsk(askId, "IN_TEAM_REVIEW", "SYSTEM", { reason: "R_MISS", data: { serviceWindowDue: addHours(new Date(), 72) } });
  return { ok: true };
}
export async function stuckReport(userId: string, askId: string): Promise<R> {
  const r = await roleIn(userId, askId); if (!r?.conn) return fail("Not available.");
  await notifyTeam(askId, "Someone cannot connect", "Help them within 10 minutes or reschedule at no cost.");
  return { ok: true };
}

// ───────── D16 / D8: after the conversation ─────────
export async function reportOutcome(userId: string, askId: string, outcome: "HAPPENED" | "PROBLEM"): Promise<R> {
  const r = await roleIn(userId, askId); if (!r?.conn) return fail("Not available.");
  const f = r.role === "MENTOR" ? "mentorOutcome" : r.role === "GUARDIAN" ? "guardianOutcome" : "participantOutcome";
  await db.connection.update({ where: { id: r.conn.id }, data: { [f]: outcome, endedAt: r.conn.endedAt ?? new Date() } });
  if (outcome === "HAPPENED" && r.ask.state === "SCHEDULED") await moveAsk(askId, "HELD", "SYSTEM", { note: `Confirmed by ${r.role.toLowerCase()}` });
  if (outcome === "PROBLEM") await notifyTeam(askId, "A conversation did not go as planned", "Someone reported a problem.");
  return { ok: true };
}

export async function afterParticipantView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn || !["HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP", "SCHEDULED"].includes(r.ask.state)) return null;
  const guardians = await guardiansOf(r.ask.participantId); const gUser = guardians[0] ? await db.user.findUnique({ where: { id: guardians[0].userId }, select: { name: true } }) : null;
  const thanks = await db.thanks.findFirst({ where: { connectionId: r.conn.id, authorId: userId } });
  return { askId, state: r.ask.state, mentorFirst: firstName(r.conn.mentor.user.name), mentorShort: shortName(r.conn.mentor.user.name), minor: isMinorAsk(r.ask), guardianFirst: gUser ? firstName(gUser.name) : null, endedAt: r.conn.endedAt, outcome: r.conn.participantOutcome, thanked: !!thanks, helped: r.conn.helpedNextStep, nextSteps: r.conn.nextSteps ? r.conn.nextSteps.split("\n").filter(Boolean) : [], followUp: r.ask.state === "FOLLOW_UP_REQUESTED" };
}
export async function submitThanks(userId: string, askId: string, d: { body: string; share: boolean; helped?: "YES" | "LITTLE" | "NOT_REALLY"; tags?: string[] }): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT" || !r.conn) return fail("Not available.");
  if (!["HELD", "COMPLETE"].includes(r.ask.state)) return fail("You can say thanks after the conversation.");
  if (d.helped) await db.connection.update({ where: { id: r.conn.id }, data: { helpedNextStep: d.helped } });
  const body = d.body.trim().slice(0, 600);
  const tags = (d.tags ?? []).map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 3);
  if (body || tags.length) { // BR-17: no star ratings; thanks are text, moderated before they appear anywhere public
    await db.thanks.create({ data: { connectionId: r.conn.id, authorId: userId, body, tags, sharePublicly: d.share && !!body } });
    await notify(r.conn.mentor.userId, "thanks.received", "Someone said thanks", "You'll see it in your impact page once the team has read it.", { link: "/mentor" });
  }
  return { ok: true };
}
export async function requestFollowUp(userId: string, askId: string, kind: "FOLLOW_UP" | "ONGOING"): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "PARTICIPANT") return fail("Not available.");
  if (r.ask.state !== "COMPLETE") return fail("Available once the conversation is complete.");
  const to = kind === "FOLLOW_UP" ? "FOLLOW_UP_REQUESTED" : "ONGOING_MENTORSHIP";
  if (kind === "ONGOING") { await (await import("./safety-user")).openOngoingRequest(askId); await notifyTeam(askId, "Ongoing mentorship requested", "Both sides must agree and the guardian must authorize."); return { ok: true }; } // never the default; the team approves explicitly
  const m = await moveAsk(askId, to, "PARTICIPANT", { actorId: userId }); if (!m.ok) return m;
  if (r.conn) await notify(r.conn.mentor.userId, "followup.requested", "A follow-up was requested", "A short second conversation, if you're willing.", { link: "/mentor" });
  return { ok: true };
}

export async function mentorAfterView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "MENTOR" || !r.conn) return null;
  if (!["SCHEDULED", "HELD", "COMPLETE"].includes(r.ask.state)) return null;
  const thanks = await db.thanks.findFirst({ where: { connectionId: r.conn.id }, orderBy: { createdAt: "desc" } });
  const participantFirst = firstName(r.ask.participant.user.name);
  return { state: r.ask.state, notes: r.conn.notes ?? "", nextSteps: r.conn.nextSteps ?? "", hours: r.conn.durationMinutes / 60, topic: r.ask.topic.name, thanks: thanks && thanks.sharePublicly !== undefined ? { from: `${participantFirst}${isMinorAsk(r.ask) ? "" : ""}`, body: thanks.body, share: thanks.sharePublicly } : null, minor: isMinorAsk(r.ask) };
}
/** One click: logs the hour and closes the Ask. Contact details are never accepted in the notes. */
export async function completeConversation(userId: string, askId: string, d: { notes?: string; nextSteps?: string; feedback?: number; minutes?: number; next?: "END" | "FOLLOW_UP" | "ONGOING" }): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "MENTOR" || !r.conn) return fail("Not available.");
  const { detectContactDetails } = await import("./domain/contact-detect");
  const notes = (d.notes ?? "").trim().slice(0, 2000); const next = (d.nextSteps ?? "").trim().slice(0, 1000);
  if (detectContactDetails(`${notes}\n${next}`).length) return fail("Please remove contact details from your notes. Everything stays on the platform.");
  if (r.ask.state === "SCHEDULED") { const h = await moveAsk(askId, "HELD", "SYSTEM", { note: "Completed by the mentor" }); if (!h.ok) return h; }
  const m = await moveAsk(askId, "COMPLETE", "MENTOR", { actorId: userId }); if (!m.ok) return m;
  // D8 "Time to log": the mentor can correct the length if the call ran shorter or longer (15 to 120 minutes).
  const minutes = d.minutes && Number.isFinite(d.minutes) ? Math.min(120, Math.max(15, Math.round(d.minutes))) : r.conn.durationMinutes;
  await db.connection.update({ where: { id: r.conn.id }, data: { durationMinutes: minutes, notes, nextSteps: next, mentorOutcome: "HAPPENED", endedAt: r.conn.endedAt ?? new Date(), hoursCounted: true, status: "HELD", mentorFeedback: d.feedback && d.feedback >= 1 && d.feedback <= 5 ? d.feedback : null, attendance: r.conn.attendance === "UNKNOWN" ? "BOTH" : r.conn.attendance } });
  await db.mentorProfile.update({ where: { id: r.conn.mentorId }, data: { hoursGivenThisMonth: { increment: minutes / 60 } } });
  await (await import("./insight")).afterHoursLogged(r.conn.mentorId);
  // A follow-up or ongoing mentorship is only ever an offer: the team arranges it, and a guardian approves for a minor.
  if (d.next === "FOLLOW_UP" || d.next === "ONGOING") await notifyTeam(askId, d.next === "FOLLOW_UP" ? "A mentor is open to one follow-up" : "A mentor is open to ongoing mentorship", "Check with the participant (and guardian for a minor) before arranging anything.");
  await notify(r.ask.participant.userId, "conversation.complete", "How did it go?", "Three small things, all optional except the first.", { link: `/asks/${askId}/after` });
  for (const g of await guardiansOf(r.conn.participantId)) await notify(g.userId, "conversation.complete", "The conversation is complete", "Notes were shared with your young person and you.", { link: "/guardian" });
  return { ok: true };
}

/** Cron: record misses fifteen minutes after the start. */
export async function sweepMisses() {
  const cutoff = new Date(Date.now() - MISSED_AFTER_MIN * 60_000);
  const due = await db.connection.findMany({ where: { status: "CONFIRMED", scheduledAt: { lte: cutoff }, ask: { state: "SCHEDULED" } }, select: { id: true, mentorJoinedAt: true, participantJoinedAt: true } });
  let n = 0;
  for (const c of due) { if (c.mentorJoinedAt && c.participantJoinedAt) continue; const r = await recordMiss(c.id); if (r.ok) n++; }
  return n;
}
void sendEmail;
