import { db } from "./db";
import { parseAnswers } from "./domain/ask-answers";
import { isMinor } from "./domain/age";
import { firstName } from "./domain/views";
import { attentionReasons, isUpcoming, matchesFilter, STAGE_OF, type StageGroup, type TrackFilter } from "./domain/ask-tracking";

const band = (b: string | null) => (b === "AGE_13_15" ? "Age 13 to 15" : b === "AGE_16_17" ? "Age 16 to 17" : "Adult");

/** Every Ask the team can see, from submission to close. Read-only. Drafts are excluded (the participant has not sent them). */
export async function allAsks(filter: TrackFilter = "ALL", q = "") {
  const asks = await db.ask.findMany({
    where: { state: { not: "DRAFT" } },
    include: { topic: true, participant: { include: { user: true } }, connection: { include: { mentor: { include: { user: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });
  const now = new Date();
  const rows = asks.map((a) => {
    const u = a.participant.user;
    const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
    const t = { state: a.state, minor, serviceWindowDue: a.serviceWindowDue, scheduledAt: a.connection?.scheduledAt ?? null, connectionStatus: a.connection?.status ?? null, attendance: a.connection?.attendance ?? null, updatedAt: a.updatedAt };
    const answers = parseAnswers(a.answers);
    return { id: a.id, title: answers.q1.split(/[.?!]/)[0]?.trim() || a.topic.name, topic: a.topic.name, participant: firstName(u.name), ageLabel: band(u.ageBand), minor, state: a.state, stage: STAGE_OF[a.state] as StageGroup, mentor: a.connection?.mentor.user.name ?? null, scheduledAt: a.connection?.scheduledAt ?? null, updatedAt: a.updatedAt, submittedAt: a.submittedAt, attention: attentionReasons(t, now), upcoming: isUpcoming(t, now), t };
  });
  const needle = q.trim().toLowerCase();
  const kept = rows.filter((r) => matchesFilter(filter, r.t, now) && (!needle || [r.title, r.topic, r.participant, r.mentor ?? ""].some((s) => s.toLowerCase().includes(needle))));
  const count = (f: TrackFilter) => rows.filter((r) => matchesFilter(f, r.t, now)).length;
  const counts = { all: rows.length, attention: count("ATTENTION"), under18: count("UNDER18"), upcoming: count("UPCOMING"), review: count("REVIEW"), matching: count("MATCHING"), scheduled: count("SCHEDULED"), done: count("DONE"), closed: count("CLOSED") };
  return { counts, rows: kept.map(({ t: _t, ...r }) => r) };
}

/** One Ask's record and its full history (AskStateChange is append-only). */
export async function askRecord(id: string) {
  const a = await db.ask.findUnique({ where: { id }, include: { topic: true, participant: { include: { user: true } }, history: { orderBy: { createdAt: "asc" } }, connection: { include: { mentor: { include: { user: true } } } }, shortlist: true } });
  if (!a) return null;
  const u = a.participant.user;
  const actorIds = [...new Set(a.history.map((h) => h.actorId).filter(Boolean) as string[])];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  const c = a.connection;
  return {
    id: a.id, topic: a.topic.name, state: a.state, reason: a.reasonCode, teamNote: a.teamNote, answers: parseAnswers(a.answers), submittedAt: a.submittedAt, createdAt: a.createdAt, releaseRound: a.releaseRound,
    participant: { first: firstName(u.name), ageLabel: band(u.ageBand), minor: !!u.dateOfBirth && isMinor(u.dateOfBirth) },
    mentor: c ? { name: c.mentor.user.name } : null,
    connection: c ? { status: c.status, scheduledAt: c.scheduledAt, durationMinutes: c.durationMinutes, attendance: c.attendance, guardianAttends: c.guardianAttends, rescheduleCount: c.rescheduleCount, participantOutcome: c.participantOutcome, mentorOutcome: c.mentorOutcome, guardianOutcome: c.guardianOutcome, helpedNextStep: c.helpedNextStep, endedAt: c.endedAt, pausedByConcern: c.pausedByConcern } : null,
    shortlisted: a.shortlist.length,
    history: a.history.map((h) => ({ id: h.id, from: h.from, to: h.to, reason: h.reason, note: h.note, at: h.createdAt, actor: h.actorId ? actors.find((x) => x.id === h.actorId)?.name ?? "Team member" : "System" })),
  };
}
