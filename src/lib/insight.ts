/** Step 4 insight services: goals and notes, monthly review and check-in, mentor hours, impact, contributing a resource, settings. */
import type { Cohort, GoalProgress } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { notifyAdmins } from "./insight-admin";
import { participantFor } from "./asks";
import { listSavedResources } from "./village";
import { detectContactDetails } from "./domain/contact-detect";
import { expertiseLabel } from "./domain/expertise";
import { APP_TZ, fmtDayShort, fmtWhen, tzLabel } from "./domain/scheduling";
import { firstName, shortName } from "./domain/views";
import {
  MONTHS, PROGRESS_LABEL, PROGRESS_PCT, aggregateImpact, canRaiseHours, checkInDue, checkInDueAt, hoursAtCap, monthKey, monthName, monthStartUtc, monthlyHoursAfterReset,
  movedForward, nextMonthStartUtc, nextWindowTimes, parseAvailability, raiseHours, shouldResetMonth, isFirstBusinessDay, thanksAttribution, yearStartUtc, fmtHours, type Availability, type CheckInAnswer, CHECKIN_ANSWERS,
} from "./domain/insight";

export type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const oid = (s: string) => /^[0-9a-f]{24}$/i.test(s);
const dayMonth = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

// ───────── D17 Goals and notes ─────────
export async function goalsAndNotes(userId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const goals = await db.goal.findMany({ where: { participantId: p.profile.id }, orderBy: { createdAt: "desc" } });
  const now = new Date();
  const conns = await db.connection.findMany({ where: { participantId: p.profile.id, status: "HELD" }, include: { ask: { include: { topic: true } }, mentor: { include: { user: true } } }, orderBy: { endedAt: "desc" } });
  const steps = await db.setting.findMany({ where: { key: { in: conns.map((c) => `steps:${userId}:${c.askId}`) } } });
  const notes = conns.filter((c) => (c.notes ?? "").trim() || (c.nextSteps ?? "").trim()).map((c) => {
    const done = (steps.find((s) => s.key === `steps:${userId}:${c.askId}`)?.value ?? []) as number[];
    const lines = (c.nextSteps ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
    return { askId: c.askId, title: c.ask.topic.name, when: `${dayMonth(c.endedAt ?? c.updatedAt)} with ${shortName(c.mentor.user.name)}`, notes: (c.notes ?? "").trim(), steps: lines.map((t, i) => ({ text: t, done: Array.isArray(done) && done.includes(i) })) };
  });
  const saved = (await listSavedResources(userId)).map((r) => ({ id: r.id, title: r.title, meta: `${r.kind}. Reviewed ${r.reviewed}` }));
  return {
    goals: goals.map((g) => ({
      id: g.id, statement: g.statement, progress: g.progress as string, label: PROGRESS_LABEL[g.progress]!, pct: PROGRESS_PCT[g.progress]!,
      target: g.targetDate ? (g.targetDate.getUTCFullYear() === now.getUTCFullYear() ? MONTHS[g.targetDate.getUTCMonth()]! : `${MONTHS[g.targetDate.getUTCMonth()]} ${g.targetDate.getUTCFullYear()}`) : null,
      linked: g.linkedAskIds.length,
    })),
    notes, saved,
  };
}

export async function createGoal(userId: string, d: { statement: string; targetDate?: string; askId?: string }): Promise<Res<{ id: string }>> {
  const p = await participantFor(userId); if (!p) return fail("Not allowed.");
  const statement = d.statement.trim(); if (statement.length < 3) return fail("Write your goal in a few words.");
  if (statement.length > 200) return fail("Keep your goal under 200 characters.");
  let targetDate: Date | undefined;
  if (d.targetDate) { const t = new Date(d.targetDate); if (Number.isNaN(t.getTime())) return fail("Choose a valid date."); targetDate = t; }
  const linked: string[] = [];
  if (d.askId && oid(d.askId) && (await db.ask.findFirst({ where: { id: d.askId, participantId: p.profile.id } }))) linked.push(d.askId);
  const g = await db.goal.create({ data: { participantId: p.profile.id, statement, targetDate, linkedAskIds: linked } });
  return { ok: true, id: g.id };
}

export async function setGoalProgress(userId: string, goalId: string, progress: string): Promise<Res> {
  const p = await participantFor(userId); if (!p || !oid(goalId)) return fail("Not allowed.");
  if (!["NOT_STARTED", "IN_PROGRESS", "ACHIEVED", "PARKED"].includes(progress)) return fail("Choose a progress.");
  const g = await db.goal.findFirst({ where: { id: goalId, participantId: p.profile.id } }); if (!g) return fail("Goal not found.");
  if (g.progress === progress) return { ok: true };
  await db.goal.update({ where: { id: g.id }, data: { progress: progress as GoalProgress } });
  await db.goalEvent.create({ data: { goalId: g.id, userId, progress: progress as GoalProgress } });
  return { ok: true };
}
export async function deleteGoal(userId: string, goalId: string): Promise<Res> {
  const p = await participantFor(userId); if (!p || !oid(goalId)) return fail("Not allowed.");
  await db.goal.deleteMany({ where: { id: goalId, participantId: p.profile.id } }); return { ok: true };
}
export async function toggleStep(userId: string, askId: string, index: number, done: boolean): Promise<Res> {
  const p = await participantFor(userId); if (!p || !oid(askId)) return fail("Not allowed.");
  if (!(await db.connection.findFirst({ where: { askId, participantId: p.profile.id } }))) return fail("Not found.");
  const key = `steps:${userId}:${askId}`; const row = await db.setting.findUnique({ where: { key } });
  const cur = new Set(Array.isArray(row?.value) ? (row!.value as number[]) : []); if (done) cur.add(index); else cur.delete(index);
  const value = [...cur].sort((a, b) => a - b);
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  return { ok: true };
}

// ───────── EX18 Goals conversation offer ─────────
export async function offerFor(userId: string, askId: string) {
  const p = await participantFor(userId); if (!p || !oid(askId)) return null;
  const ask = await db.ask.findFirst({ where: { id: askId, participantId: p.profile.id }, include: { topic: true } });
  if (!ask || !["COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP", "HELD"].includes(ask.state)) return null;
  const recent = await db.ask.findMany({ where: { participantId: p.profile.id, state: { notIn: ["DRAFT", "WITHDRAWN"] } }, include: { topic: true }, orderBy: { updatedAt: "desc" }, take: 3 });
  return { topic: ask.topic.name, subject: ask.topic.name.toLowerCase(), minor: p.minor, recent: recent.map((a) => ({ id: a.id, title: a.topic.name, state: a.state as string })) };
}
/** Turns the next steps into a goal and tells the team. The ongoing-mentorship path is only ever a request: a guardian must authorize it and it is never automatic. */
export async function submitOffer(userId: string, askId: string, choice: "GOALS" | "ONGOING"): Promise<Res> {
  const o = await offerFor(userId, askId); if (!o) return fail("This is not available.");
  const key = `offer:${userId}:${askId}`;
  if (await db.setting.findUnique({ where: { key } })) return { ok: true };
  const p = (await participantFor(userId))!;
  const exists = await db.goal.findFirst({ where: { participantId: p.profile.id, linkedAskIds: { has: askId } } });
  if (!exists) await db.goal.create({ data: { participantId: p.profile.id, statement: `Make a plan for ${o.subject}`, linkedAskIds: [askId] } });
  await db.setting.create({ data: { key, value: { choice, at: new Date().toISOString() } } });
  await audit(userId, choice === "GOALS" ? "offer.goals_conversation" : "offer.ongoing_mentorship", "Ask", askId);
  await notifyAdmins("offer.requested", choice === "GOALS" ? "A participant asked for a goals conversation" : "A participant asked about ongoing mentorship", `Topic: ${o.topic}.${choice === "ONGOING" && o.minor ? " A guardian must authorize this." : ""}`, `/admin/asks/${askId}`);
  return { ok: true };
}

// ───────── D22 Monthly review and check-in ─────────
export async function monthlyReview(userId: string, now = new Date()) {
  const p = await participantFor(userId); if (!p) return null;
  const from = monthStartUtc(now);
  const asks = await db.ask.count({ where: { participantId: p.profile.id, submittedAt: { gte: from } } });
  const held = await db.connection.findMany({ where: { participantId: p.profile.id, status: "HELD", endedAt: { gte: from } }, include: { mentor: { include: { user: true } } } });
  const saved = (await db.savedItem.findMany({ where: { userId, createdAt: { gte: from } } }));
  const resources = saved.length ? await db.resource.findMany({ where: { id: { in: saved.map((s) => s.resourceId) } }, select: { title: true } }) : [];
  const events = await db.goalEvent.findMany({ where: { userId, createdAt: { gte: from } } });
  const forward = [...new Set(events.filter((e) => movedForward(e.progress)).map((e) => e.goalId))];
  const goals = forward.length ? await db.goal.findMany({ where: { id: { in: forward } } }) : [];
  const stepCount = held.reduce((n, c) => n + (c.nextSteps ?? "").split("\n").filter((x) => x.trim()).length, 0);
  const parts: string[] = [];
  if (resources.length) parts.push(`You saved ${resources.length === 1 ? resources[0]!.title : `${resources.length} resources`}${stepCount && held[0] ? ` and wrote ${stepCount} next step${stepCount === 1 ? "" : "s"} after speaking with ${firstName(held[0].mentor.user.name)}` : ""}.`);
  else if (stepCount && held[0]) parts.push(`You wrote ${stepCount} next step${stepCount === 1 ? "" : "s"} after speaking with ${firstName(held[0].mentor.user.name)}.`);
  for (const g of goals.slice(0, 2)) parts.push(`You moved "${g.statement}" to ${PROGRESS_LABEL[g.progress]!.toLowerCase()}.`);
  return { month: monthName(now), counts: { asks, held: held.length, saved: saved.length, goals: forward.length }, learned: parts.join(" ") || "Nothing is recorded yet this month. Your notes and goals will appear here as you use them." };
}

export async function dueCheckIn(userId: string, id?: string) {
  const row = await db.checkIn.findFirst({ where: { userId, answeredAt: null, dueAt: { lte: new Date() }, ...(id && oid(id) ? { id } : {}) }, orderBy: { dueAt: "asc" } });
  if (!row) return null;
  const c = await db.connection.findUnique({ where: { id: row.connectionId }, include: { mentor: { include: { user: true } } } });
  return { id: row.id, mentorFirst: c ? firstName(c.mentor.user.name) : "your mentor" };
}
export async function answerCheckIn(userId: string, id: string, answer: string, note: string): Promise<Res> {
  if (!oid(id) || !(CHECKIN_ANSWERS as readonly string[]).includes(answer)) return fail("Choose an answer.");
  const n = note.trim().slice(0, 1000);
  if (detectContactDetails(n).length) return fail("Please remove contact details. Everything stays on the platform.");
  const row = await db.checkIn.findFirst({ where: { id, userId, answeredAt: null } }); if (!row) return fail("This check-in is already answered.");
  await db.checkIn.update({ where: { id }, data: { answer: answer as CheckInAnswer, note: n || null, answeredAt: new Date() } });
  return { ok: true };
}
/** Cron: a check-in 30 days after each held conversation, once. */
export async function createDueCheckIns(now = new Date()) {
  const conns = await db.connection.findMany({ where: { status: "HELD", endedAt: { lte: new Date(now.getTime() - 30 * 86400_000), gte: new Date(now.getTime() - 120 * 86400_000) } }, include: { participant: true, mentor: { include: { user: true } } } });
  const have = new Set((await db.checkIn.findMany({ where: { connectionId: { in: conns.map((c) => c.id) } }, select: { connectionId: true } })).map((c) => c.connectionId));
  let n = 0;
  for (const c of conns) {
    if (!checkInDue({ endedAt: c.endedAt, status: c.status, participantOutcome: c.participantOutcome, hasCheckIn: have.has(c.id) }, now)) continue;
    try { await db.checkIn.create({ data: { connectionId: c.id, participantId: c.participantId, userId: c.participant.userId, dueAt: checkInDueAt(c.endedAt!) } }); } catch { continue; }
    await notify(c.participant.userId, "checkin.due", "A quick check-in", `A month ago you spoke with ${firstName(c.mentor.user.name)}. Did anything change?`, { link: "/goals/check-in", dedupeKey: `checkin:${c.id}`, email: false });
    { // NT2 "One month check-in", as edited on P05.
      const pu = await db.user.findUnique({ where: { id: c.participant.userId }, select: { email: true, name: true } });
      const ask = await db.ask.findUnique({ where: { id: c.askId }, include: { topic: true } });
      const { sendTemplated } = await import("./templates");
      if (pu) await sendTemplated("email.one_month_checkin", pu.email, { participant_first_name: pu.name, topic: ask?.topic.name.toLowerCase() ?? "your question" }, { link: `${process.env.APP_URL ?? ""}/goals/check-in` });
    }
    n++;
  }
  return n;
}
/** Cron (first business day): the monthly review for participants and the round-up for mentors. Counts only, never names. */
export async function sendMonthlyDigests(now = new Date()) {
  if (!isFirstBusinessDay(now)) return 0;
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)); const key = monthKey(prev); let n = 0;
  for (const u of await db.user.findMany({ where: { status: "ACTIVE", participant: { isNot: null } }, select: { id: true } })) {
    await notify(u.id, "review.monthly", `Your ${monthName(prev)}`, "What you asked, learned and did last month is ready.", { link: "/goals/check-in", dedupeKey: `monthly:${u.id}:${key}` }); n++;
  }
  const from = monthStartUtc(prev); const to = nextMonthStartUtc(prev);
  for (const m of await db.mentorProfile.findMany({ where: { verification: "APPROVED", user: { status: "ACTIVE" } } })) {
    const cs = await db.connection.findMany({ where: { mentorId: m.id, status: "HELD", hoursCounted: true, endedAt: { gte: from, lt: to } } });
    const hrs = cs.reduce((a, c) => a + c.durationMinutes, 0) / 60; const helped = cs.filter((c) => c.helpedNextStep === "YES").length;
    await notify(m.userId, "review.monthly", `Your ${monthName(prev)} round-up`, `You gave ${fmtHours(hrs)} hour${hrs === 1 ? "" : "s"} across ${cs.length} conversation${cs.length === 1 ? "" : "s"}. ${helped} helped someone with a next step. Thank you.`, { link: "/mentor/impact", dedupeKey: `monthly:${m.userId}:${key}` }); n++;
  }
  return n;
}

// ───────── Mentor hours, availability (D23, EX12, D7) ─────────
async function mine(userId: string) { return db.mentorProfile.findUnique({ where: { userId }, include: { user: true } }); }

export async function mentorHours(userId: string, now = new Date()) {
  const m = await mine(userId); if (!m) return null;
  const a = parseAvailability(m.availability);
  const from = monthStartUtc(now);
  const conns = await db.connection.findMany({ where: { mentorId: m.id }, select: { id: true, durationMinutes: true, hoursCounted: true, status: true, endedAt: true, helpedNextStep: true } });
  const impact = aggregateImpact(conns, 0, 0, now);
  const monthIds = conns.filter((c) => c.endedAt && c.endedAt >= from).map((c) => c.id);
  const thanksMonth = monthIds.length ? await db.thanks.count({ where: { connectionId: { in: monthIds }, moderation: { notIn: ["REJECTED", "REMOVED"] } } }) : 0;
  const times = nextWindowTimes(a.grid, now, APP_TZ(), 2).map((t) => fmtWhen(t).replace(/^(\w{3})\w*day /, "$1 "));
  return {
    name: m.user.name, monthlyHours: m.monthlyHours, given: m.hoursGivenThisMonth, length: m.conversationLength, atCap: hoursAtCap({ given: m.hoursGivenThisMonth, monthly: m.monthlyHours }),
    paused: a.paused, grid: a.grid, canRaise: canRaiseHours(a, now), month: monthName(now), nextMonth: `1 ${monthName(nextMonthStartUtc(now))}`,
    conversationsMonth: impact.conversationsThisMonth, thanksMonth, hoursYear: impact.hoursThisYear, tz: tzLabel(now), times,
    approved: m.verification === "APPROVED",
  };
}
export async function saveAvailability(userId: string, d: { monthlyHours: number; length: number; grid: string[]; paused: boolean }): Promise<Res> {
  const m = await mine(userId); if (!m) return fail("Not allowed.");
  if (!Number.isInteger(d.monthlyHours) || d.monthlyHours < 1 || d.monthlyHours > 20) return fail("Choose between 1 and 20 hours.");
  if (d.length !== 30 && d.length !== 60) return fail("Choose 30 or 60 minutes.");
  const a = parseAvailability(m.availability);
  const next: Availability = { ...a, paused: !!d.paused, grid: parseAvailability({ grid: d.grid }).grid };
  // A manual change replaces any one-time raise for this month.
  if (d.monthlyHours !== m.monthlyHours) next.raised = null;
  await db.mentorProfile.update({ where: { id: m.id }, data: { monthlyHours: d.monthlyHours, conversationLength: d.length, availability: next as never } });
  await audit(userId, "mentor.availability.saved", "MentorProfile", m.id, undefined, { monthlyHours: d.monthlyHours, paused: next.paused });
  return { ok: true };
}
export async function raiseOneHour(userId: string, now = new Date()): Promise<Res> {
  const m = await mine(userId); if (!m) return fail("Not allowed.");
  const r = raiseHours(parseAvailability(m.availability), m.monthlyHours, now); if (!r) return fail("You have already added an hour this month.");
  await db.mentorProfile.update({ where: { id: m.id }, data: { monthlyHours: r.monthly, availability: r.availability as never } });
  await audit(userId, "mentor.hours.raised", "MentorProfile", m.id, { monthlyHours: m.monthlyHours }, { monthlyHours: r.monthly });
  return { ok: true };
}
/** Called when an hour is logged: at the monthly hours the mentor is thanked and no further Asks reach them (BR-13). */
export async function afterHoursLogged(mentorId: string) {
  const m = await db.mentorProfile.findUnique({ where: { id: mentorId } }); if (!m || !hoursAtCap({ given: m.hoursGivenThisMonth, monthly: m.monthlyHours })) return;
  const now = new Date();
  await notify(m.userId, "hours.reached", `You have given your hours for ${monthName(now)}`, `Thank you. You will not receive new Asks until 1 ${monthName(nextMonthStartUtc(now))}.`, { link: "/mentor/availability", dedupeKey: `hours-reached:${m.id}:${monthKey(now)}-${m.monthlyHours}` });
}
/** Cron: once per calendar month, however often it runs. Also undoes last month's one-time raise. */
export async function resetMonthlyHours(now = new Date()) {
  const row = await db.setting.findUnique({ where: { key: "mentor-hours-reset" } });
  if (!shouldResetMonth(row?.value as string | undefined, now)) return 0;
  const ms = await db.mentorProfile.findMany({ select: { id: true, monthlyHours: true, availability: true } });
  for (const m of ms) {
    const r = monthlyHoursAfterReset(m.monthlyHours, parseAvailability(m.availability), now);
    await db.mentorProfile.update({ where: { id: m.id }, data: { hoursGivenThisMonth: 0, monthlyHours: r.monthly, ...(r.availability.raised !== parseAvailability(m.availability).raised ? { availability: r.availability as never } : {}) } });
  }
  await db.setting.upsert({ where: { key: "mentor-hours-reset" }, update: { value: monthKey(now) }, create: { key: "mentor-hours-reset", value: monthKey(now) } });
  return ms.length;
}

// ───────── D25 Impact ─────────
export async function mentorImpact(userId: string, now = new Date()) {
  const m = await mine(userId); if (!m) return null;
  const conns = await db.connection.findMany({ where: { mentorId: m.id }, select: { id: true, durationMinutes: true, hoursCounted: true, status: true, endedAt: true, helpedNextStep: true } });
  const thanks = conns.length ? await db.thanks.findMany({ where: { connectionId: { in: conns.map((c) => c.id) }, moderation: { notIn: ["REJECTED", "REMOVED"] } }, orderBy: { createdAt: "desc" } }) : [];
  const resources = await db.resource.count({ where: { contributorId: userId, moderation: "APPROVED" } });
  const agg = aggregateImpact(conns, thanks.length, resources, now);
  const authors = thanks.length ? await db.user.findMany({ where: { id: { in: thanks.slice(0, 5).map((t) => t.authorId) } }, select: { id: true, ageBand: true, roles: true } }) : [];
  const quotes = thanks.slice(0, 5).map((t) => { const a = authors.find((x) => x.id === t.authorId); return { id: t.id, body: t.body, from: thanksAttribution({ ageBand: a?.ageBand ?? null, isGuardian: !!a?.roles.includes("GUARDIAN") }) }; });
  // D25 "Hours by month": the last five calendar months, counted hours only.
  const byMonth = [4, 3, 2, 1, 0].map((back) => {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)); const to = nextMonthStartUtc(from);
    const mins = conns.filter((c) => c.hoursCounted && c.status === "HELD" && c.endedAt && c.endedAt >= from && c.endedAt < to).reduce((n, c) => n + c.durationMinutes, 0);
    return { label: MONTHS[from.getUTCMonth()]!.slice(0, 3), hours: Math.round(mins / 6) / 10 };
  });
  return { ...agg, quotes, byMonth, month: monthName(now), nextMonth: monthName(nextMonthStartUtc(now)) };
}

// ───────── D24 Contribute a resource ─────────
export const TYPES = [{ v: "ARTICLE", label: "Answer", hint: "A written answer to a common question" }, { v: "TEMPLATE", label: "Template", hint: "A checklist, résumé or outline" }, { v: "VIDEO", label: "Recording", hint: "A short audio or video" }] as const;
export const AUDIENCES: { v: Cohort; label: string }[] = [{ v: "HIGH_SCHOOL", label: "High school" }, { v: "COLLEGE", label: "College" }, { v: "GRADUATE", label: "Graduate" }, { v: "EARLY_CAREER", label: "Early career" }];
export async function contributeContext(userId: string) {
  const m = await mine(userId); if (!m) return null;
  const topics = (await db.topic.findMany({ where: { active: true, later: false }, orderBy: { sortOrder: "asc" } })).map((t) => ({ slug: t.slug, name: t.name }));
  const conns = await db.connection.findMany({ where: { mentorId: m.id, status: "HELD", notes: { not: null } }, include: { ask: { include: { topic: true } } }, orderBy: { endedAt: "desc" }, take: 20 });
  const draft = (await db.setting.findUnique({ where: { key: `resource-draft:${userId}` } }))?.value ?? null;
  const sent = await db.resource.count({ where: { contributorId: userId } });
  return { topics, conversations: conns.filter((c) => (c.notes ?? "").trim()).map((c) => ({ askId: c.askId, label: `${c.ask.topic.name} (${dayMonth(c.endedAt ?? c.updatedAt)})`, notes: (c.notes ?? "").trim() })), first: firstName(m.user.name), full: shortName(m.user.name), draft: draft as Draft | null, sent };
}
export interface Draft { type: string; title: string; body: string; topic: string; cohort: string; credit: string; askId: string }
export async function saveResourceDraft(userId: string, d: Draft): Promise<Res> {
  if (!(await mine(userId))) return fail("Not allowed.");
  const value = { ...d, title: String(d.title ?? "").slice(0, 200), body: String(d.body ?? "").slice(0, 8000) } as never;
  await db.setting.upsert({ where: { key: `resource-draft:${userId}` }, update: { value }, create: { key: `resource-draft:${userId}`, value } });
  return { ok: true };
}
export async function submitResource(userId: string, d: Draft): Promise<Res<{ id: string }>> {
  const m = await mine(userId); if (!m) return fail("Not allowed.");
  const title = d.title.trim(); const body = d.body.trim();
  if (title.length < 5) return fail("Add a title.");
  if (body.length < 40) return fail("Add a little more to your answer.");
  if (!TYPES.some((t) => t.v === d.type)) return fail("Choose what you are sharing.");
  if (!AUDIENCES.some((a) => a.v === d.cohort)) return fail("Choose who it is for.");
  const topic = await db.topic.findUnique({ where: { slug: d.topic } }); if (!topic) return fail("Choose a topic.");
  if (detectContactDetails(`${title}\n${body}`).length) return fail("Please remove contact details. Everything stays on the platform.");
  const mode = ["FULL", "FIRST", "ANON"].includes(d.credit) ? d.credit : "FULL";
  const r = await db.resource.create({ data: { title, body, type: d.type as never, topics: [topic.slug], cohorts: [d.cohort as Cohort], contributorId: userId, moderation: "PENDING", visibility: "PUBLIC" } });
  await db.resourceCredit.create({ data: { resourceId: r.id, mode } });
  await db.setting.deleteMany({ where: { key: `resource-draft:${userId}` } });
  await audit(userId, "resource.contributed", "Resource", r.id);
  await notifyAdmins("resource.pending", "A resource is waiting for review", `New: ${title}`, "/admin/moderation");
  return { ok: true, id: r.id };
}

// ───────── D7 Settings ─────────
export async function mentorSettings(userId: string, now = new Date()) {
  const m = await mine(userId); if (!m) return null;
  const a = parseAvailability(m.availability);
  const att = await db.attestation.findFirst({ where: { application: { applicantId: userId } }, orderBy: { signedAt: "desc" } });
  const re = await db.consentRecord.findFirst({ where: { userId, kind: "SAFEGUARDING_ATTESTATION", version: { startsWith: "reaffirm-" }, granted: true }, orderBy: { createdAt: "desc" } });
  const base = re ? new Date(Math.max(re.createdAt.getTime(), att?.signedAt.getTime() ?? 0)) : att?.signedAt;
  const due = base ? new Date(Date.UTC(base.getUTCFullYear() + 1, base.getUTCMonth(), base.getUTCDate())) : (att?.nextDueAt ?? null);
  const hours = (await db.connection.aggregate({ where: { mentorId: m.id, hoursCounted: true, status: "HELD", endedAt: { gte: yearStartUtc(now) } }, _sum: { durationMinutes: true } }))._sum.durationMinutes ?? 0;
  return {
    name: m.user.name, monthlyHours: m.monthlyHours, length: m.conversationLength, grid: a.grid, paused: a.paused, tz: tzLabel(now), listed: m.visibility === "LISTED", approved: m.verification === "APPROVED" && !!m.codeOfConductAt && !!m.orientationDoneAt,
    lastSaved: m.updatedAt, hoursYear: Math.round(hours / 6) / 10, due: due ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(due) : null,
  };
}
export async function reaffirmSafeguarding(userId: string, ip: string): Promise<Res> {
  if (!(await mine(userId))) return fail("Not allowed.");
  const v = `reaffirm-${new Date().toISOString().slice(0, 10)}`;
  await db.consentRecord.create({ data: { userId, kind: "SAFEGUARDING_ATTESTATION", version: v, granted: true, ipAddress: ip } });
  await audit(userId, "mentor.safeguarding.reaffirmed", "User", userId);
  return { ok: true };
}
export { expertiseLabel, fmtDayShort };
