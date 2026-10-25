import { db } from "./db";
import { audit } from "./audit";
import { notify, notifySafeguarding } from "./notify";
import { moveAsk, guardianContext, type R } from "./asks";
import { roleIn } from "./connections";
import { ageOn } from "./domain/age";
import { firstName, shortName } from "./domain/views";
import { fmtWhen, fmtDay, fmtTime } from "./domain/scheduling";
import { parseAnswers } from "./domain/ask-answers";
import { canViewRecording } from "./domain/permissions";
import { googleCalendarLink } from "./integrations/calendar";
import {
  concernPlan, pauseEffect, withdrawalEffect, turning18Plan, anonymisedUser, DELETE_GRACE_DAYS, deleteConfirmed, scrubOthers, toCsv,
  ongoingEndsOn, ONGOING_DECISIONS, type ConcernKind, type OngoingDecision,
} from "./domain/safety-user";
import type { Role } from "@prisma/client";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const OPEN_ASKS = ["AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED"] as const;

async function guardianUserIds(participantId: string): Promise<string[]> {
  const links = await db.guardianLink.findMany({ where: { participantId, active: true }, include: { guardian: true } });
  return links.map((l) => l.guardian.userId);
}

/** Cancels the booked conversation, tells the mentor kindly (no reason, no names), and puts the Ask back where it can be resumed. */
async function holdParticipantWork(participantUserId: string, why: string) {
  const prof = await db.participantProfile.findUnique({ where: { userId: participantUserId } }); if (!prof) return { open: 0, cancelled: 0 };
  const asks = await db.ask.findMany({ where: { participantId: prof.id, state: { in: [...OPEN_ASKS] } }, include: { connection: { include: { mentor: true } } } });
  let cancelled = 0;
  for (const a of asks) {
    const c = a.connection;
    if (c && !["HELD", "CANCELLED"].includes(c.status)) {
      await db.connection.update({ where: { id: c.id }, data: { status: "CANCELLED", pausedByConcern: true, scheduledAt: null, offeredTimes: [] } });
      if (a.state === "SCHEDULED") await moveAsk(a.id, "CONNECTION_APPROVED", "SYSTEM", { note: why });
      await notify(c.mentor.userId, "connection.cancelled", "A conversation was cancelled", "It was cancelled and is not your doing. Your hour isn't counted. Thank you for your understanding.", { link: "/mentor" });
      cancelled++;
    }
    await db.ask.update({ where: { id: a.id }, data: { pausedForCrisis: true } }); // held as they are until the team follows up
  }
  return { open: asks.length, cancelled };
}

// ───────── M16 Report a concern ─────────
export async function submitConcern(userId: string, d: { askId?: string; kind: ConcernKind; description?: string }): Promise<R<{ incidentId: string }>> {
  const plan = concernPlan(d.kind);
  let connectionId: string | undefined; let askId: string | undefined;
  if (d.askId) {
    const r = await roleIn(userId, d.askId); if (!r) return fail("Not available.");
    connectionId = r.conn?.id; askId = d.askId;
  }
  const text = (d.description ?? "").trim().slice(0, 2000);
  const inc = await db.incident.create({ data: { reporterId: userId, connectionId, category: plan.category, severity: plan.severity, description: text || "Concern raised, no details given", dueAt: plan.dueAt } });
  if (connectionId) { // pause now, review after (R-CONCERN). The other person is never told who reported.
    await db.connection.update({ where: { id: connectionId }, data: { pausedByConcern: true } });
    if (askId) await db.ask.update({ where: { id: askId }, data: { reasonCode: "R_CONCERN" } });
  }
  await audit(userId, "concern.reported", "Incident", inc.id, null, { category: plan.category, severity: plan.severity });
  await notifySafeguarding("incident.new", "A concern was reported", `${plan.severity === "HIGH" ? "High priority. " : ""}Respond within ${plan.hours} hours.`, `/admin/incidents/${inc.id}`);
  if (connectionId) { // NT2 "Safeguarding concern" text to each lead with a mobile number
    const leads = await db.user.findMany({ where: { roles: { has: "SAFEGUARDING_LEAD" }, phone: { not: null } }, select: { phone: true } });
    const { sendTemplated } = await import("./templates");
    for (const l of leads) await sendTemplated("sms.safeguarding_concern", l.phone!, { connection_ref: connectionId.slice(-4).toUpperCase() });
  }
  return { ok: true, incidentId: inc.id };
}

// ───────── M24 / G4 Pause a connection (guardian) ─────────
export async function pauseView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN") return null;
  return { askId, participantFirst: firstName(r.ask.participant.user.name), mentorFirst: r.conn ? firstName(r.conn.mentor.user.name) : null, booked: !!r.conn?.scheduledAt, when: r.conn?.scheduledAt ? fmtWhen(r.conn.scheduledAt) : r.conn?.offeredTimes[0] ? fmtWhen(r.conn.offeredTimes[0]) : null };
}
export async function guardianPauseConnection(userId: string, askId: string, why?: string): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN" || !r.conn) return fail("Not available.");
  await db.connection.update({ where: { id: r.conn.id }, data: { pausedByConcern: true } });
  const fx = pauseEffect();
  await db.user.update({ where: { id: r.ask.participant.userId }, data: { status: fx.status } });
  await holdParticipantWork(r.ask.participant.userId, "Guardian paused the connection");
  const plan = concernPlan("unsafe");
  const inc = await db.incident.create({ data: { reporterId: userId, subjectId: undefined, connectionId: r.conn.id, category: plan.category, severity: plan.severity, description: `Guardian paused the connection.${why?.trim() ? ` Reason given: ${why.trim().slice(0, 1500)}` : ""}`, dueAt: plan.dueAt } });
  await audit(userId, "guardian.paused", "Connection", r.conn.id);
  await notify(r.ask.participant.userId, "account.paused", "Your account is paused", "Nothing has been deleted and you did nothing wrong.", { link: "/paused" });
  await notifySafeguarding("incident.new", "A guardian paused a connection", `Open Asks are on hold. Respond within ${plan.hours} hours.`);
  void inc;
  return { ok: true };
}

// ───────── G1 / G4 Withdraw consent ─────────
export async function withdrawView(userId: string, participantId?: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const link = g.links.find((l) => !participantId || l.participantId === participantId) ?? g.links[0]; if (!link) return null;
  const p = await db.participantProfile.findUnique({ where: { id: link.participantId }, include: { user: true } }); if (!p) return null;
  return { participantId: p.id, first: firstName(p.user.name) };
}
export async function withdrawConsent(userId: string, participantId: string, why?: string): Promise<R> {
  const g = await guardianContext(userId); if (!g) return fail("Not available.");
  const link = g.links.find((l) => l.participantId === participantId); if (!link) return fail("Not available.");
  const p = await db.participantProfile.findUnique({ where: { id: participantId }, include: { user: true } }); if (!p) return fail("Not available.");
  await db.consentRecord.create({ data: { userId, kind: "GUARDIAN_GUIDELINES", version: "withdrawn", granted: false } });
  await db.consentRecord.create({ data: { userId: p.userId, kind: "RECORDING", version: "withdrawn", granted: false } });
  const remaining = g.links.filter((l) => l.participantId !== participantId).length;
  if (!remaining) await db.guardian.update({ where: { id: g.id }, data: { consentState: "WITHDRAWN" } });
  await db.user.update({ where: { id: p.userId }, data: { status: withdrawalEffect().status } }); // ends account access until the team follows up
  await holdParticipantWork(p.userId, "Guardian withdrew consent");
  const plan = concernPlan("other");
  await db.incident.create({ data: { reporterId: userId, category: plan.category, severity: "MEDIUM", description: `Guardian withdrew consent.${why?.trim() ? ` Reason given: ${why.trim().slice(0, 1500)}` : ""}`, dueAt: plan.dueAt } });
  await audit(userId, "guardian.consent.withdrawn", "ParticipantProfile", participantId);
  await notifySafeguarding("consent.withdrawn", "A guardian withdrew consent", `${firstName(p.user.name)}'s account is suspended. A team member should follow up within ${plan.hours} hours.`);
  return { ok: true };
}

// ───────── G1 / M4 Guardian overview ─────────
export async function guardianOverview(userId: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const gUser = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  const link = g.links[0]; if (!link) return null;
  const p = await db.participantProfile.findUnique({ where: { id: link.participantId }, include: { user: true } }); if (!p) return null;
  const dob = p.user.dateOfBirth;
  const asks = await db.ask.findMany({ where: { participantId: p.id }, include: { topic: true, connection: { include: { mentor: { include: { user: true } } } } }, orderBy: { updatedAt: "desc" } });
  const title = (a: (typeof asks)[number]) => parseAnswers(a.answers).q1.split(/[.?!]/)[0]?.trim() || a.topic.name;
  type Waiting = { id: string; kind: "ASK" | "CONN"; title: string; sub: string; topic: string; quote?: string; submittedAt?: Date | null; mentor?: { short: string; headline: string; cleared: boolean; initials: string }; times?: { iso: string; label: string }[]; attends?: boolean };
  const waiting = asks.flatMap((a): Waiting[] => {
    if (a.state === "AWAITING_GUARDIAN") return [{ id: a.id, kind: "ASK" as const, title: "Authorize an Ask", sub: title(a), topic: a.topic.name, quote: parseAnswers(a.answers).q1, submittedAt: a.submittedAt }];
    if (a.state === "CONNECTION_APPROVED" && a.connection?.status === "AWAITING_GUARDIAN" && a.connection) {
      const c = a.connection; const times = c.offeredTimes.length ? c.offeredTimes : c.scheduledAt ? [c.scheduledAt] : [];
      return [{ id: a.id, kind: "CONN" as const, title: "Approve a mentor and time", sub: `${shortName(c.mentor.user.name)}${times[0] ? `, ${fmtWhen(times[0])}` : ""}`, topic: a.topic.name, mentor: { short: shortName(c.mentor.user.name), headline: c.mentor.bio.split(/[.]/)[0] ?? "", cleared: c.mentor.clearedForMinors, initials: shortName(c.mentor.user.name).split(" ").map((x) => x[0]).join("").slice(0, 2) }, times: times.map((t) => ({ iso: t.toISOString(), label: `${new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(t)} · ${fmtTime(t)} · ${c.durationMinutes} min` })), attends: c.guardianAttends }];
    }
    return [];
  });
  const now = new Date();
  const up = asks.find((a) => a.state === "SCHEDULED" && a.connection?.scheduledAt && a.connection.scheduledAt > now);
  const upc = up?.connection ? { askId: up.id, when: fmtWhen(up.connection.scheduledAt!), short: new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(up.connection.scheduledAt!) + " · " + fmtTime(up.connection.scheduledAt!), minutes: up.connection.durationMinutes, mentor: shortName(up.connection.mentor.user.name), topic: up.topic.name.toLowerCase(), attends: up.connection.guardianAttends, calendar: googleCalendarLink({ uid: up.id, title: `${firstName(p.user.name)}'s conversation`, startsAt: up.connection.scheduledAt!, minutes: up.connection.durationMinutes, description: `${up.topic.name} on The Village Circle`, organizerEmail: "" }) } : null;
  const ids = asks.map((a) => a.id);
  const changes = ids.length ? await db.askStateChange.findMany({ where: { askId: { in: ids }, to: { in: ["IN_TEAM_REVIEW", "MENTOR_STEPPED_FORWARD", "SCHEDULED"] } }, orderBy: { createdAt: "desc" }, take: 8 }) : [];
  const auths = ids.length ? await db.guardianAuthorization.findMany({ where: { guardianId: g.id, askId: { in: ids }, kind: "ASK", approved: true }, orderBy: { decidedAt: "desc" }, take: 4 }) : [];
  const gc = await db.consentRecord.findFirst({ where: { userId, kind: "GUARDIAN_GUIDELINES", granted: true }, orderBy: { createdAt: "asc" } });
  const byId = new Map(asks.map((a) => [a.id, a]));
  const f = firstName(p.user.name);
  const activity: { text: string; at: Date }[] = [
    ...changes.flatMap((c) => { const a = byId.get(c.askId); if (!a) return []; const mt = a.connection ? shortName(a.connection.mentor.user.name) : "A mentor";
      if (c.to === "IN_TEAM_REVIEW" && c.from !== "IN_TEAM_REVIEW") return [{ text: `${f} submitted an Ask in team review`, at: c.createdAt }];
      if (c.to === "MENTOR_STEPPED_FORWARD") return [{ text: `${mt} stepped forward for ${f}'s ${a.topic.name} Ask`, at: c.createdAt }];
      return []; }),
    ...auths.map((x) => ({ text: `You authorized "${byId.get(x.askId) ? title(byId.get(x.askId)!) : "an Ask"}"`, at: x.decidedAt })),
    ...(gc ? [{ text: "You accepted the family participation guidelines", at: gc.createdAt }] : []),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 4);
  const pref = g.attendancePref === "ATTEND" ? "I will attend each conversation" : "I will be reachable, not present";
  const endsOn = link.endsOn ?? (dob ? new Date(Date.UTC(dob.getUTCFullYear() + 18, dob.getUTCMonth(), dob.getUTCDate())) : null);
  const age = dob ? ageOn(dob) : null;
  return { guardianFirst: firstName(gUser?.name ?? ""), participantId: p.id, first: f, initials: (p.user.name.split(" ").map((x) => x[0]).join("").slice(0, 2)).toUpperCase(), short: shortName(p.user.name), age, status: p.user.status, endsOn, waiting, upcoming: upc, activity, pref, minorNow: age !== null && age < 18 };
}

// ───────── G3 Conversations and recordings ─────────
export async function guardianRecordings(userId: string) {
  const g = await guardianContext(userId); if (!g) return null;
  const pids = g.links.map((l) => l.participantId);
  const p = pids[0] ? await db.participantProfile.findUnique({ where: { id: pids[0] }, include: { user: true } }) : null;
  const conns = await db.connection.findMany({ where: { participantId: { in: pids }, status: { in: ["CONFIRMED", "HELD"] } }, include: { ask: { include: { topic: true } }, mentor: { include: { user: true } } }, orderBy: { scheduledAt: "desc" } });
  const now = Date.now();
  return {
    first: p ? firstName(p.user.name) : "your young person",
    items: conns.filter((c) => c.scheduledAt).map((c) => {
      const end = c.endedAt ?? new Date(c.scheduledAt!.getTime() + c.durationMinutes * 60_000);
      const ready = !!c.recordingKey && end.getTime() <= now; const expires = new Date(end.getTime() + 90 * 86400_000);
      return { id: c.id, dateLabel: new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(c.scheduledAt!), topic: c.ask.topic.name, mentor: shortName(c.mentor.user.name), attended: c.guardianAttends ? "You attended" : "You were reachable", upcoming: c.scheduledAt!.getTime() > now, ready: ready && expires.getTime() > now, expired: !!c.recordingKey && expires.getTime() <= now, nextSteps: c.nextSteps ?? "" };
    }),
  };
}
export async function recordingAccess(userId: string, roles: Role[], connectionId: string): Promise<{ key: string } | null> {
  const c = await db.connection.findUnique({ where: { id: connectionId }, include: { participant: true, mentor: true } });
  if (!c?.recordingKey) return null;
  const gids = await guardianUserIds(c.participantId);
  if (!canViewRecording({ userId, roles }, { participantUserId: c.participant.userId, mentorUserId: c.mentor.userId, guardianUserIds: gids })) return null;
  if (c.endedAt && Date.now() - c.endedAt.getTime() > 90 * 86400_000) return null;
  await audit(userId, "recording.viewed", "Connection", c.id);
  return { key: c.recordingKey };
}
export async function requestRecording(userId: string, connectionId: string): Promise<R> {
  const c = await db.connection.findUnique({ where: { id: connectionId }, include: { participant: true } }); if (!c) return fail("Not available.");
  if (!(await guardianUserIds(c.participantId)).includes(userId)) return fail("Not available.");
  await audit(userId, "recording.requested", "Connection", c.id);
  await notify(userId, "recording.requested", "We have your request", "We'll tell you as soon as the recording is ready.", { link: "/guardian/recordings", dedupeKey: `rec-req-${c.id}-${userId}` });
  return { ok: true };
}
export async function guardianDataRequest(userId: string, participantId: string, kind: "EXPORT" | "DELETE"): Promise<R> {
  const g = await guardianContext(userId); if (!g || !g.links.some((l) => l.participantId === participantId)) return fail("Not available.");
  await db.guardianDataRequest.create({ data: { guardianId: g.id, participantId, kind } });
  await audit(userId, `guardian.data.${kind.toLowerCase()}`, "ParticipantProfile", participantId);
  await notifySafeguarding("data.request", kind === "EXPORT" ? "A guardian asked for a copy of a young person's data" : "A guardian asked to delete a young person's account", "Handle within 30 days. Confirm identity first.", "/admin");
  await notify(userId, "data.request", "We have your request", "A member of the team will confirm it with you before anything changes.", { link: "/guardian/recordings", email: false });
  return { ok: true };
}

// ───────── G6 Ongoing mentorship ─────────
/** The participant asks; the team approves explicitly; then the guardian decides. Never automatic. */
export async function openOngoingRequest(askId: string) { await db.ongoingMentorship.upsert({ where: { askId }, update: {}, create: { askId } }); }
export async function ongoingView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN" || !r.conn) return null;
  const o = await db.ongoingMentorship.findUnique({ where: { askId } });
  if (!o && !["COMPLETE", "ONGOING_MENTORSHIP", "FOLLOW_UP_REQUESTED"].includes(r.ask.state)) return null;
  return { askId, participantFirst: firstName(r.ask.participant.user.name), mentorFirst: firstName(r.conn.mentor.user.name), mentorShort: shortName(r.conn.mentor.user.name), cleared: r.conn.mentor.clearedForMinors, topic: r.ask.topic.name, decided: o?.decision ?? null, askState: r.ask.state };
}
export async function decideOngoing(userId: string, askId: string, decision: OngoingDecision): Promise<R> {
  if (!ONGOING_DECISIONS.includes(decision)) return fail("Choose one of the options.");
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN" || !r.conn) return fail("Not available.");
  const cur = await db.ongoingMentorship.findUnique({ where: { askId } }); if (cur?.decision) return fail("You have already decided.");
  await db.ongoingMentorship.upsert({ where: { askId }, update: { decision, decidedBy: userId, decidedAt: new Date(), endsOn: ongoingEndsOn(decision) }, create: { askId, decision, decidedBy: userId, decidedAt: new Date(), endsOn: ongoingEndsOn(decision) } });
  const p = r.ask.participant.userId; const mentor = r.conn.mentor.userId; const f = firstName(r.ask.participant.user.name);
  if (decision === "NOT_NOW") { await notify(p, "ongoing.declined", "Your guardian is not ready yet", "Nothing changes for now. You can talk about it together.", { link: `/asks/${askId}/after` }); await audit(userId, "ongoing.declined", "Ask", askId); return { ok: true }; }
  if (decision === "THREE_MONTHS" && r.ask.state === "COMPLETE") { const m = await moveAsk(askId, "ONGOING_MENTORSHIP", "GUARDIAN", { actorId: userId }); if (!m.ok) return m; }
  if (decision === "ONE_MORE" && r.ask.state === "COMPLETE") { const m = await moveAsk(askId, "FOLLOW_UP_REQUESTED", "GUARDIAN", { actorId: userId }); if (!m.ok) return m; }
  await notify(p, "ongoing.authorized", "Your guardian said yes", decision === "THREE_MONTHS" ? "You can keep meeting for three months. Each time still needs your guardian's approval." : "One more conversation was authorized.", { link: `/asks/${askId}/after` });
  await notify(mentor, "ongoing.authorized", "A guardian authorized more time", `${f}'s family agreed. The team will arrange the next conversation.`, { link: "/mentor" });
  await audit(userId, "ongoing.authorized", "Ask", askId, null, { decision });
  return { ok: true };
}
export async function askTeamAboutOngoing(userId: string, askId: string, question: string): Promise<R> {
  const r = await roleIn(userId, askId); if (!r || r.role !== "GUARDIAN") return fail("Not available.");
  await notifySafeguarding("ongoing.question", "A guardian has a question about ongoing mentorship", (question || "No question text").trim().slice(0, 300), `/admin/asks/${askId}`);
  return { ok: true };
}

// ───────── M17 Turning 18 ─────────
export async function turning18View(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } }); if (!u?.participant || !u.dateOfBirth) return null;
  const done = await db.setting.findUnique({ where: { key: `turning18:${userId}` } });
  const plan = turning18Plan(u.dateOfBirth, !!done);
  return { birthday: plan.birthday, adultNow: plan.adultNow, confirmed: !!done, minor: u.ageBand !== "ADULT" };
}
export async function confirmTurning18(userId: string): Promise<R<{ applied: boolean }>> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } }); if (!u?.participant || !u.dateOfBirth) return fail("Not available.");
  const plan = turning18Plan(u.dateOfBirth, true);
  await db.setting.upsert({ where: { key: `turning18:${userId}` }, update: { value: { at: new Date().toISOString() } }, create: { key: `turning18:${userId}`, value: { at: new Date().toISOString() } } });
  const gids = await guardianUserIds(u.participant.id);
  if (plan.apply) {
    await db.user.update({ where: { id: userId }, data: { ageBand: "ADULT" } });
    await db.guardianLink.updateMany({ where: { participantId: u.participant.id }, data: { active: false } }); // the guardian keeps nothing private: no view of new content
    for (const g of gids) await notify(g, "participant.adult", `${firstName(u.name)} is now 18`, "Your role as guardian has ended. You no longer see new Asks or conversations.", { link: "/guardian" });
    await audit(userId, "participant.turned18", "User", userId);
  } else {
    for (const g of gids) await notify(g, "participant.turning18", `${firstName(u.name)} is turning 18`, "Authority ends automatically on the birthday. You don't need to do anything.", { link: "/guardian", dedupeKey: `turning18-${userId}` });
  }
  return { ok: true, applied: plan.apply };
}

// ───────── M18 Recommend a young person ─────────
export async function recommend(d: { name: string; role: string; email: string; first: string; guardianEmail: string; why?: string }): Promise<R> {
  const recent = await db.recommendation.count({ where: { recommenderEmail: d.email.toLowerCase(), createdAt: { gt: new Date(Date.now() - 86400_000) } } });
  if (recent >= 5) return fail("You have sent several already today. Please try again tomorrow.");
  await db.recommendation.create({ data: { recommenderName: d.name.trim(), recommenderRole: d.role.trim(), recommenderEmail: d.email.toLowerCase().trim(), youngFirstName: d.first.trim(), guardianEmail: d.guardianEmail.toLowerCase().trim(), why: d.why?.trim() || null } });
  const { sendEmail } = await import("./integrations/email"); const { esc } = await import("./account"); const { appUrl } = await import("./notify");
  await sendEmail({ to: d.guardianEmail, subject: `${d.name.split(" ")[0]} thinks ${d.first} might enjoy The Village Circle`, html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D1914"><h2 style="font-family:Georgia,serif">A recommendation for ${esc(d.first)}</h2><p>${esc(d.name)} (${esc(d.role)}) thought ${esc(d.first)} might benefit from talking with a professional in the community.${d.why?.trim() ? ` They wrote: "${esc(d.why.trim().slice(0, 500))}"` : ""}</p><p>Nothing happens unless you choose to begin. We have not contacted ${esc(d.first)}.</p><p><a href="${appUrl("/register")}" style="background:#1F4D36;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Learn more and start</a></p></div>` }).catch(() => undefined);
  return { ok: true };
}

// ───────── D21 Settings and privacy ─────────
export const VISIBILITY = ["DIRECTORY", "COMMUNITY", "PRIVATE"] as const;
export async function settingsData(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: { include: { links: { include: { guardian: true } } } }, mentor: true, guardian: { include: { links: true } } } }); if (!u) return null;
  const pw = await db.auditEvent.findFirst({ where: { actorId: userId, action: "password.reset" }, orderBy: { createdAt: "desc" } });
  const pending = await db.deletionRequest.findUnique({ where: { userId } });
  let family: { name: string; relationship: string; authorized: Date; endsOn: Date | null } | null = null;
  const active = u.participant?.links.find((l) => l.active);
  if (active) { const gu = await db.user.findUnique({ where: { id: active.guardian.userId }, select: { name: true } }); family = { name: gu ? shortName(gu.name) : "Your guardian", relationship: active.guardian.relationship, authorized: active.createdAt, endsOn: active.endsOn }; }
  const kids = u.guardian ? await db.participantProfile.findMany({ where: { id: { in: u.guardian.links.filter((l) => l.active).map((l) => l.participantId) } }, include: { user: true } }) : [];
  return {
    name: u.name, email: u.email, verified: !!u.emailVerified, roles: u.roles, passwordChanged: pw?.createdAt ?? null, minor: !!u.dateOfBirth && ageOn(u.dateOfBirth) < 18,
    visibility: u.participant?.visibility === "DIRECTORY" || u.participant?.visibility === "COMMUNITY" ? u.participant.visibility : "PRIVATE",
    mentorListed: u.mentor?.visibility === "LISTED", language: u.languages[0] ?? "English", family, kids: kids.map((k) => ({ id: k.id, first: firstName(k.user.name) })),
    deletionPending: pending && !pending.cancelledAt && !pending.completedAt ? pending.purgeAfter : null,
  };
}
export async function setVisibility(userId: string, v: string): Promise<R> {
  if (!(VISIBILITY as readonly string[]).includes(v)) return fail("Choose one of the options.");
  const p = await db.participantProfile.findUnique({ where: { userId } }); if (!p) return fail("Not available.");
  await db.participantProfile.update({ where: { id: p.id }, data: { visibility: v } });
  await audit(userId, "privacy.visibility", "ParticipantProfile", p.id, { was: p.visibility }, { now: v });
  return { ok: true };
}

// ───────── EX14 Data export: the requesting user's own data only ─────────
export async function buildExport(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true, mentor: true, guardian: true } }); if (!u) return null;
  const out: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    account: { name: u.name, emailAddress: u.email, phoneNumber: u.phone, dateOfBirth: u.dateOfBirth, roles: u.roles, languages: u.languages, countryOfOrigin: u.countryOfOrigin, countryOfResidence: u.countryOfResidence, createdAt: u.createdAt },
    consents: (await db.consentRecord.findMany({ where: { userId } })).map((c) => ({ kind: c.kind, version: c.version, granted: c.granted, at: c.createdAt })),
    notifications: (await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 500 })).map((n) => ({ title: n.title, body: n.body, at: n.createdAt })),
    savedResources: (await db.savedItem.findMany({ where: { userId } })).map((s) => ({ resourceId: s.resourceId, at: s.createdAt })),
    thanksWritten: (await db.thanks.findMany({ where: { authorId: userId } })).map((t) => ({ body: t.body, at: t.createdAt })),
  };
  if (u.participant) {
    const p = u.participant;
    const asks = await db.ask.findMany({ where: { participantId: p.id }, include: { topic: true, connection: { include: { mentor: { include: { user: true } } } } } });
    out.profile = { cohort: p.cohort, interests: p.interests, goals: p.goalsText, visibility: p.visibility, communityBackground: p.communityBackground };
    out.goals = (await db.goal.findMany({ where: { participantId: p.id } })).map((g) => ({ statement: g.statement, targetDate: g.targetDate, progress: g.progress }));
    out.asks = asks.map((a) => ({ topic: a.topic.name, state: a.state, answers: a.answers, submittedAt: a.submittedAt, note: a.teamNote }));
    out.conversations = asks.filter((a) => a.connection).map((a) => ({ topic: a.topic.name, date: a.connection!.scheduledAt, mentorFirstName: firstName(a.connection!.mentor.user.name), outcome: a.connection!.participantOutcome, nextSteps: a.connection!.nextSteps, recording: "Summary only. Recordings stay with your guardian and the team." }));
  }
  if (u.mentor) {
    const conns = await db.connection.findMany({ where: { mentorId: u.mentor.id }, include: { ask: { include: { topic: true } }, participant: { include: { user: true } } } });
    out.mentorProfile = { bio: u.mentor.bio, primaryExpertise: u.mentor.primaryExpertise, extraExpertise: u.mentor.extraExpertise, languages: u.mentor.languages, monthlyHours: u.mentor.monthlyHours, linkedinUrl: u.mentor.linkedinUrl };
    out.mentoringConversations = conns.map((c) => ({ topic: c.ask.topic.name, date: c.scheduledAt, participantFirstName: firstName(c.participant.user.name), minutes: c.durationMinutes, status: c.status }));
    out.attestations = (await db.mentorReaffirmation.findMany({ where: { userId } })).map((r) => ({ version: r.statementVersion, signedAt: r.signedAt }));
  }
  if (u.guardian) {
    const links = await db.guardianLink.findMany({ where: { guardianId: u.guardian.id } });
    out.guardian = { relationship: u.guardian.relationship, attendancePreference: u.guardian.attendancePref, authorizedYoungPeopleCount: links.length };
    out.authorizations = (await db.guardianAuthorization.findMany({ where: { guardianId: u.guardian.id } })).map((a) => ({ kind: a.kind, approved: a.approved, at: a.decidedAt }));
  }
  return scrubOthers(out); // no one else's email, phone or password data can ride along
}
export async function requestExport(userId: string): Promise<R<{ id: string }>> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } }); if (!u) return fail("Not available.");
  const rec = await db.dataExport.create({ data: { userId, expiresAt: new Date(Date.now() + 7 * 86400_000) } });
  await audit(userId, "data.export.requested", "User", userId);
  if (u.participant && u.dateOfBirth && ageOn(u.dateOfBirth) < 18) {
    const data = await buildExport(userId);
    for (const g of await guardianUserIds(u.participant.id)) await notify(g, "data.export", `${firstName(u.name)} requested a copy of their data`, "The file is attached for you too.", { link: "/guardian", attachments: [{ filename: "village-circle-export.json", content: JSON.stringify(data, null, 2) }] });
  }
  return { ok: true, id: rec.id };
}
export async function exportStatus(userId: string) {
  const last = await db.dataExport.findFirst({ where: { userId, expiresAt: { gt: new Date() } }, orderBy: { requestedAt: "desc" } });
  if (!last) return null;
  const u = await db.user.findUnique({ where: { id: userId }, select: { roles: true, dateOfBirth: true } });
  const data = await buildExport(userId); const bytes = Buffer.byteLength(JSON.stringify(data ?? {}));
  return { requestedAt: last.requestedAt, expiresAt: last.expiresAt, bytes, roles: u?.roles ?? [], minor: !!u?.dateOfBirth && ageOn(u.dateOfBirth) < 18 };
}
export async function exportFile(userId: string, format: "json" | "csv") {
  const last = await db.dataExport.findFirst({ where: { userId, expiresAt: { gt: new Date() } } }); if (!last) return null;
  const data = await buildExport(userId); if (!data) return null;
  await audit(userId, "data.export.downloaded", "User", userId);
  if (format === "json") return { body: JSON.stringify(data, null, 2), type: "application/json", name: "village-circle-export.json" };
  const rows: Record<string, unknown>[] = Object.entries(data).flatMap(([section, v]) => Array.isArray(v) ? v.map((x) => ({ section, ...(x as object) })) : [{ section, ...(typeof v === "object" && v ? (v as object) : { value: v }) }]);
  return { body: toCsv(rows), type: "text/csv", name: "village-circle-export.csv" };
}

// ───────── EX15 Delete my account ─────────
export async function requestDeletion(userId: string, d: { word: string; email: string }): Promise<R<{ purgeAfter: Date }>> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true, mentor: true } }); if (!u) return fail("Not available.");
  if (d.word.trim() !== "DELETE") return fail("Type DELETE to confirm.");
  if (!deleteConfirmed(d.email, u.email)) return fail("Type your account email exactly to confirm.");
  const purgeAfter = new Date(Date.now() + DELETE_GRACE_DAYS * 86400_000);
  await db.deletionRequest.upsert({ where: { userId }, update: { requestedAt: new Date(), purgeAfter, cancelledAt: null, completedAt: null }, create: { userId, purgeAfter } });
  if (u.participant) { // open Asks and bookings end now; mentors are told kindly
    const asks = await db.ask.findMany({ where: { participantId: u.participant.id, state: { in: [...OPEN_ASKS] } }, include: { connection: { include: { mentor: true } } } });
    for (const a of asks) {
      if (a.connection && !["HELD", "CANCELLED"].includes(a.connection.status)) { await db.connection.update({ where: { id: a.connection.id }, data: { status: "CANCELLED" } }); await notify(a.connection.mentor.userId, "connection.cancelled", "A conversation was cancelled", "The participant closed their account. Your hour isn't counted.", { link: "/mentor" }); }
      await moveAsk(a.id, "WITHDRAWN", "PARTICIPANT", { actorId: userId, note: "Account deletion requested" });
    }
    if (u.dateOfBirth && ageOn(u.dateOfBirth) < 18) for (const g of await guardianUserIds(u.participant.id)) await notify(g, "account.deletion", `${firstName(u.name)} asked to delete their account`, "They have 30 days to change their mind.", { link: "/guardian" });
  }
  await audit(userId, "account.deletion.requested", "User", userId);
  return { ok: true, purgeAfter };
}
export async function cancelDeletion(userId: string): Promise<R> {
  const r = await db.deletionRequest.findUnique({ where: { userId } }); if (!r || r.cancelledAt || r.completedAt) return fail("Nothing to cancel.");
  await db.deletionRequest.update({ where: { userId }, data: { cancelledAt: new Date() } });
  await audit(userId, "account.deletion.cancelled", "User", userId);
  return { ok: true };
}
/** Anonymises personal fields. The audit log, incidents, consent records and attestations are legal hold and never touched. */
export async function anonymiseUser(userId: string): Promise<R> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true, mentor: true, guardian: true } }); if (!u) return fail("Not found.");
  await db.user.update({ where: { id: userId }, data: anonymisedUser(userId) });
  await db.account.deleteMany({ where: { userId } }); await db.session.deleteMany({ where: { userId } });
  await db.notification.deleteMany({ where: { userId } }); await db.savedItem.deleteMany({ where: { userId } });
  await db.setting.deleteMany({ where: { key: { in: [`notify-prefs:${userId}`, `turning18:${userId}`, `resource-draft:${userId}`] } } });
  if (u.participant) {
    await db.participantProfile.update({ where: { id: u.participant.id }, data: { interests: [], goalsText: [], communityBackground: null, visibility: "PRIVATE" } });
    await db.goal.deleteMany({ where: { participantId: u.participant.id } });
    await db.ask.updateMany({ where: { participantId: u.participant.id }, data: { answers: {} } });
    await db.guardianLink.updateMany({ where: { participantId: u.participant.id }, data: { active: false } });
  }
  if (u.mentor) await db.mentorProfile.update({ where: { id: u.mentor.id }, data: { bio: "", linkedinUrl: null, resumeKey: null, visibility: "PRIVATE", languages: [], expertiseOther: null } });
  if (u.guardian) await db.guardian.update({ where: { id: u.guardian.id }, data: { mobile: null } });
  await db.deletionRequest.updateMany({ where: { userId }, data: { completedAt: new Date() } });
  await audit(null, "account.anonymised", "User", userId);
  return { ok: true };
}
/** Cron: anonymise accounts whose 30 days are over. */
export async function sweepDeletions(now: Date = new Date()) {
  const due = await db.deletionRequest.findMany({ where: { purgeAfter: { lte: now }, cancelledAt: null, completedAt: null } });
  let n = 0; for (const d of due) { const r = await anonymiseUser(d.userId); if (r.ok) n++; }
  return n;
}
export { fmtDay };
