/** Step 5 admin group 2 server functions: taxonomy, broadcast, queue health, search, bulk actions, playbook. Every mutation writes an AuditEvent. */
import type { AskState, Prisma, Role } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { getConfig } from "./config";
import { isMinor, ageOn } from "./domain/age";
import { addBusinessDays, addHours, WINDOWS } from "./domain/service-windows";
import { EXPERTISE_CODES } from "./domain/expertise";
import { parseAnswers } from "./domain/ask-answers";
import { shortName } from "./domain/views";
import { STATUS_VIEW, rolesLabel, actionLabel, actorLabel, fmtStamp } from "./domain/admin-safety-1";
import {
  cleanTopic, slugify, type TopicInput, type Audience, audienceRoles, validateBroadcast, canSendBroadcast, queueStatus, durationLabel, windowEndsLabel, breachingSoon, loadWidth,
  maskEmail, canRevealContact, canSeeIncidentDetail, type SearchScope, showScope, planBulk, BULK_MAX, type BulkAction, type BulkItem, HEALTH_LABEL, REVIEW_STEPS, currentStep, PLAYBOOK,
} from "./domain/admin-ops";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const subKey = (slug: string) => `taxonomy:sub:${slug}`;

/* ───────── Taxonomy (A12) ───────── */
export async function taxonomyList() {
  const topics = await db.topic.findMany({ orderBy: { sortOrder: "asc" } });
  return topics.map((t) => ({ slug: t.slug, name: t.name, active: t.active }));
}
export async function topicDetail(slug: string) {
  const t = await db.topic.findUnique({ where: { slug } }); if (!t) return null;
  const sub = await db.setting.findUnique({ where: { key: subKey(slug) } });
  return { slug: t.slug, name: t.name, active: t.active, guidedPrompts: t.guidedPrompts, expertiseMap: t.expertiseMap, subTopics: Array.isArray(sub?.value) ? (sub!.value as string[]) : [] };
}
/** Creates (slug null) or updates a topic. Topics are deactivated, never deleted, so old Asks keep their topic. */
export async function saveTopic(actorId: string, slug: string | null, input: TopicInput): Promise<R<{ slug: string }>> {
  const c = cleanTopic(input); if (!c.ok) return fail(c.error);
  const v = c.value;
  if (slug) {
    const before = await topicDetail(slug); if (!before) return fail("Topic not found.");
    await db.topic.update({ where: { slug }, data: { name: v.name, guidedPrompts: v.guidedPrompts, expertiseMap: v.expertiseMap, active: v.active } });
    await db.setting.upsert({ where: { key: subKey(slug) }, update: { value: v.subTopics }, create: { key: subKey(slug), value: v.subTopics } });
    await audit(actorId, "taxonomy.topic.save", "Topic", slug, before, v);
    return { ok: true, slug };
  }
  let s = slugify(v.name); if (await db.topic.findUnique({ where: { slug: s } })) s = `${s}-${Date.now().toString(36).slice(-4)}`;
  const last = await db.topic.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await db.topic.create({ data: { slug: s, name: v.name, guidedPrompts: v.guidedPrompts, expertiseMap: v.expertiseMap, active: v.active, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  await db.setting.upsert({ where: { key: subKey(s) }, update: { value: v.subTopics }, create: { key: subKey(s), value: v.subTopics } });
  await audit(actorId, "taxonomy.topic.create", "Topic", s, null, v);
  return { ok: true, slug: s };
}

/* ───────── Broadcast (A17) ───────── */
const activeWhere = (a: Audience) => ({ status: "ACTIVE" as const, roles: { hasSome: audienceRoles(a) as Role[] } });
export async function audienceCount(a: Audience) { return db.user.count({ where: activeWhere(a) }); }
export async function audienceCounts(): Promise<Record<Audience, number>> {
  const [EVERYONE, MENTORS, PARTICIPANTS, GUARDIANS] = await Promise.all((["EVERYONE", "MENTORS", "PARTICIPANTS", "GUARDIANS"] as const).map(audienceCount));
  return { EVERYONE: EVERYONE!, MENTORS: MENTORS!, PARTICIPANTS: PARTICIPANTS!, GUARDIANS: GUARDIANS! };
}
export async function recentBroadcasts() {
  const rows = await db.broadcast.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  return rows.map((b) => ({ id: b.id, subject: b.subject, audience: b.audience as Audience, status: b.status, recipientCount: b.recipientCount, at: b.sentAt ?? b.scheduledFor ?? b.createdAt }));
}
export interface BroadcastInput { id?: string; audience: Audience; subject: string; body: string; scheduledFor?: Date | null }

export async function saveBroadcastDraft(actorId: string, i: BroadcastInput): Promise<R<{ id: string }>> {
  const errs = validateBroadcast({ ...i, scheduledFor: null }); if (errs.length) return fail(errs[0]!);
  const data = { audience: i.audience, subject: i.subject.trim(), body: i.body.trim(), status: "DRAFT", scheduledFor: i.scheduledFor ?? null };
  if (i.id) {
    const cur = await db.broadcast.findUnique({ where: { id: i.id } }); if (!cur) return fail("Draft not found."); if (cur.status === "SENT") return fail("This announcement has already been sent.");
    await db.broadcast.update({ where: { id: i.id }, data }); await audit(actorId, "broadcast.draft", "Broadcast", i.id, { subject: cur.subject, audience: cur.audience }, { subject: data.subject, audience: data.audience });
    return { ok: true, id: i.id };
  }
  const b = await db.broadcast.create({ data: { ...data, createdById: actorId } });
  await audit(actorId, "broadcast.draft", "Broadcast", b.id, null, { subject: data.subject, audience: data.audience });
  return { ok: true, id: b.id };
}

async function deliver(broadcastId: string, actorId: string): Promise<number> {
  const b = await db.broadcast.findUnique({ where: { id: broadcastId } }); if (!b) return 0;
  const claim = await db.broadcast.updateMany({ where: { id: broadcastId, status: { not: "SENT" } }, data: { status: "SENT", sentAt: new Date() } });
  if (claim.count === 0) return 0; // already sent: never send twice
  const users = await db.user.findMany({ where: activeWhere(b.audience as Audience), select: { id: true } });
  for (const u of users) await notify(u.id, "broadcast.announcement", b.subject, b.body, { link: "/", dedupeKey: `broadcast:${b.id}:${u.id}` });
  await db.broadcast.update({ where: { id: b.id }, data: { recipientCount: users.length } });
  await audit(actorId, "broadcast.send", "Broadcast", b.id, null, { audience: b.audience, subject: b.subject, recipients: users.length });
  return users.length;
}

/** Sends now, or schedules. The caller must pass the recipient count they saw; it has to match the live audience. */
export async function sendBroadcast(actorId: string, i: BroadcastInput & { confirmCount?: number }): Promise<R<{ id: string; recipients: number; scheduled: boolean }>> {
  const errs = validateBroadcast(i); if (errs.length) return fail(errs[0]!);
  const live = await audienceCount(i.audience);
  const gate = canSendBroadcast(i.confirmCount, live); if (!gate.ok) return fail(gate.error);
  const saved = await saveBroadcastDraft(actorId, { ...i, scheduledFor: null }); if (!saved.ok) return saved;
  if (i.scheduledFor) {
    await db.broadcast.update({ where: { id: saved.id }, data: { status: "SCHEDULED", scheduledFor: i.scheduledFor, recipientCount: live } });
    await audit(actorId, "broadcast.schedule", "Broadcast", saved.id, null, { audience: i.audience, recipients: live, scheduledFor: i.scheduledFor.toISOString() });
    return { ok: true, id: saved.id, recipients: live, scheduled: true };
  }
  const n = await deliver(saved.id, actorId);
  return { ok: true, id: saved.id, recipients: n, scheduled: false };
}
/** Sends scheduled announcements that are due. Called whenever the broadcast screen loads. */
export async function sendDueBroadcasts() {
  const due = await db.broadcast.findMany({ where: { status: "SCHEDULED", scheduledFor: { lte: new Date() } } });
  for (const b of due) await deliver(b.id, b.createdById);
  return due.length;
}

/* ───────── Queue health (A20) ───────── */
interface QItem { id: string; queue: string; title: string; href: string; start: Date; due: Date; owner: string | null; ownerId?: string | null }
export async function queueHealth(now: Date = new Date()) {
  const cfg = await getConfig();
  const [asks, apps, incidents] = await Promise.all([
    db.ask.findMany({ where: { state: { in: ["SUBMITTED", "IN_TEAM_REVIEW"] } }, include: { topic: true, review: true, participant: { include: { user: true } } } }),
    db.application.findMany({ where: { state: { in: ["SUBMITTED", "IN_REVIEW", "APPEALED"] } }, select: { id: true, type: true, submittedAt: true, createdAt: true } }),
    db.incident.findMany({ where: { state: { not: "CLOSED" } }, select: { id: true, createdAt: true, dueAt: true, actionedById: true } }),
  ]);
  const reviewerIds = asks.map((a) => a.review?.reviewerId).filter(Boolean) as string[];
  const people = await db.user.findMany({ where: { id: { in: [...reviewerIds, ...incidents.map((i) => i.actionedById).filter(Boolean) as string[]] } }, select: { id: true, name: true } });
  const nameOf = new Map(people.map((p) => [p.id, shortName(p.name)]));
  const items: QItem[] = [];
  for (const a of asks) {
    const start = a.submittedAt ?? a.createdAt; const noone = a.reasonCode === "R_NOONE";
    const due = noone ? addHours(start, cfg.windows.mentorReplyDays * 24) : (a.serviceWindowDue ?? addBusinessDays(start, cfg.windows.reviewBusinessDays));
    const age = a.participant.user.dateOfBirth ? ageOn(a.participant.user.dateOfBirth) : null;
    const rid = a.review?.reviewerId ?? null;
    items.push({ id: a.id, queue: noone ? "HAND" : "ASK", title: `Ask · ${a.topic.name}${age != null ? (age < 18 ? `, ${age >= 16 ? "16 to 17" : "15"}` : ", 18+") : ""}`, href: `/admin/asks/${a.id}`, start, due, owner: rid ? nameOf.get(rid) ?? null : null, ownerId: rid });
  }
  for (const p of apps) { const start = p.submittedAt ?? p.createdAt; const g = p.type === "GUARDIAN"; items.push({ id: p.id, queue: g ? "GUARD" : "MENTOR", title: g ? "Guardian authorization" : "Mentor application", href: g ? "/admin/guardians" : "/admin/mentors", start, due: addBusinessDays(start, g ? 2 : WINDOWS.mentorApplicationBusinessDays), owner: null }); }
  for (const i of incidents) items.push({ id: i.id, queue: "CONCERN", title: "Incident", href: `/admin/incidents/${i.id}`, start: i.createdAt, due: i.dueAt ?? addHours(i.createdAt, cfg.windows.incidentOutcomeHours), owner: i.actionedById ? nameOf.get(i.actionedById) ?? null : null });
  const defs: [string, string, string][] = [["ASK", "Ask review", `${cfg.windows.reviewBusinessDays} days`], ["MENTOR", "Mentor applications", `${WINDOWS.mentorApplicationBusinessDays} days`], ["GUARD", "Guardian spot checks", "2 days"], ["CONCERN", "Concerns", `${cfg.windows.incidentOutcomeHours} hours`], ["HAND", "Hand-matching", `${cfg.windows.mentorReplyDays} days`]];
  const cards = defs.map(([key, label, windowLabel]) => {
    const mine = items.filter((i) => i.queue === key).sort((a, b) => a.due.getTime() - b.due.getTime());
    const first = mine[0]; const s = queueStatus({ count: mine.length, oldestAt: first?.start ?? null, windowMs: first ? first.due.getTime() - first.start.getTime() : 0, now });
    return { key, label, count: mine.length, status: s.status, statusLabel: HEALTH_LABEL[s.status], pct: s.pct, oldest: mine.length ? durationLabel(s.oldestMs) : "none", windowLabel };
  });
  const labelOf = new Map(defs.map(([k, l]) => [k, l]));
  const soon = breachingSoon(items, now).map((i) => ({ id: i.id, item: i.title, queue: labelOf.get(i.queue) ?? "", owner: i.owner ?? "Unassigned", ends: windowEndsLabel(i.due, now), overdue: i.due <= now, href: i.href, assigned: !!i.owner }));
  const load = new Map<string, number>(); for (const a of asks) if (a.review?.reviewerId) load.set(a.review.reviewerId, (load.get(a.review.reviewerId) ?? 0) + 1);
  const reviewers = [...load.entries()].map(([id, n]) => ({ id, name: nameOf.get(id) ?? "Reviewer", n, width: loadWidth(n) })).sort((a, b) => b.n - a.n);
  return { cards, soon, reviewers, unassigned: asks.filter((a) => !a.review?.reviewerId).length };
}

/* ───────── Search (A21) ───────── */
export async function globalSearch(actor: { id: string; roles: Role[] }, q: string, scope: SearchScope) {
  // Every word must match somewhere (A21), so "Okafor Amara" finds Amara Okafor.
  const words = q.split(/s+/).filter((w) => w.length > 1).slice(0, 6);
  const has = (w: string) => ({ contains: w, mode: "insensitive" as const });
  const ws = words.length ? words : [q];
  const userWhere: Prisma.UserWhereInput = { AND: ws.map((w) => ({ OR: [{ name: has(w) }, { email: has(w) }] })) };
  const askWhere: Prisma.AskWhereInput = { deletedAt: { isSet: false }, AND: ws.map((w) => ({ OR: [{ topic: { name: has(w) } }, { participant: { user: { name: has(w) } } }] })) };
  const incidentWhere: Prisma.IncidentWhereInput = { AND: ws.map((w) => ({ description: has(w) })) };
  const people = showScope(scope, "people") || showScope(scope, "mentors") || showScope(scope, "guardians")
    ? await db.user.findMany({
      where: { ...userWhere, ...(scope === "mentors" ? { roles: { has: "MENTOR" as const } } : scope === "guardians" ? { roles: { has: "GUARDIAN" as const } } : {}) }, take: 10,
      include: { guardian: { include: { links: { where: { active: true }, include: { participant: { include: { user: { select: { name: true } } } } } } } } },
    }) : [];
  const asks = showScope(scope, "asks")
    ? await db.ask.findMany({ where: askWhere, take: 10, orderBy: { updatedAt: "desc" }, include: { topic: true, participant: { include: { user: { select: { name: true } } } } } }) : [];
  const incidents = showScope(scope, "incidents") && canSeeIncidentDetail(actor.roles)
    ? await db.incident.findMany({ where: incidentWhere, take: 10, orderBy: { createdAt: "desc" } }).catch(() => []) : [];
  const out = {
    people: people.map((u) => {
      const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth); const age = u.dateOfBirth ? ageOn(u.dateOfBirth) : null;
      const kids = u.guardian?.links.map((l) => shortName(l.participant.user.name).split(" ")[0]) ?? [];
      const role = u.roles.includes("GUARDIAN") && kids.length ? `Guardian of ${kids.join(", ")}` : u.roles.includes("PARTICIPANT") && age != null ? `Participant, ${age}` : rolesLabel(u.roles);
      return { id: u.id, name: u.name, role, status: STATUS_VIEW[u.status], masked: maskEmail(u.email), minor, canReveal: canRevealContact(actor.roles, { minor }), mentor: u.roles.includes("MENTOR"), guardian: u.roles.includes("GUARDIAN") };
    }),
    asks: asks.map((a) => ({ id: a.id, title: a.topic.name, participant: shortName(a.participant.user.name), state: a.state as AskState, window: a.serviceWindowDue ? windowEndsLabel(a.serviceWindowDue) : "—" })),
    incidents: incidents.map((i) => ({ id: i.id, title: `${i.category.toLowerCase().replace(/_/g, " ")}, ${i.severity.toLowerCase()}`, state: i.state, created: i.createdAt })),
    hiddenIncidents: showScope(scope, "incidents") && !canSeeIncidentDetail(actor.roles),
  };
  // Every search is written to the audit log: who looked for what, and how many results they got.
  const total = out.people.length + out.asks.length + out.incidents.length;
  await audit(actor.id, "search.query", "Search", undefined, undefined, { q, scope, results: total });
  return { ...out, total };
}

/** Full contact details: an extra click, logged. */
export async function revealContact(actor: { id: string; roles: Role[] }, userId: string): Promise<R<{ email: string; phone: string | null }>> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { email: true, phone: true, dateOfBirth: true } }); if (!u) return fail("Person not found.");
  const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  if (!canRevealContact(actor.roles, { minor })) return fail(minor ? "A young person's contact details are for the safeguarding lead only." : "Your role can't see contact details.");
  await audit(actor.id, "search.reveal_contact", "User", userId, undefined, { fields: ["email", ...(u.phone ? ["phone"] : [])] });
  return { ok: true, email: u.email, phone: u.phone };
}

/* ───────── Bulk actions (A22) ───────── */
export async function bulkQueue(now: Date = new Date()) {
  const asks = await db.ask.findMany({ where: { state: { in: ["SUBMITTED", "IN_TEAM_REVIEW", "AWAITING_GUARDIAN"] } }, include: { topic: true, review: true, participant: { include: { user: true } } }, orderBy: { submittedAt: "asc" } });
  const open = await db.incident.findMany({ where: { state: { not: "CLOSED" }, subjectId: { not: null } }, select: { subjectId: true } });
  const flagged = new Set(open.map((i) => i.subjectId));
  const reviewers = await db.user.findMany({ where: { roles: { hasSome: ["ADMIN", "SAFEGUARDING_LEAD"] } }, select: { id: true, name: true } });
  const nameOf = new Map(reviewers.map((r) => [r.id, shortName(r.name)]));
  return {
    reviewers: reviewers.map((r) => ({ id: r.id, name: shortName(r.name) })),
    rows: asks.map((a) => {
      const item: BulkItem = { state: a.state, reason: a.reasonCode, flags: a.review?.flags ?? [], minor: !!a.participant.user.dateOfBirth && isMinor(a.participant.user.dateOfBirth), pausedForCrisis: a.pausedForCrisis, hasIncident: flagged.has(a.participant.userId) };
      const age = a.participant.user.dateOfBirth ? ageOn(a.participant.user.dateOfBirth) : null;
      const title = (parseAnswers(a.answers).q1.split(/[.?!]/)[0]?.trim() || a.topic.name);
      return { id: a.id, title: `${a.topic.name}${age != null ? (age < 18 ? `, ${age >= 16 ? "16 to 17" : "15"}` : ", 18+") : ""}`, sub: title, reason: a.reasonCode ? a.reasonCode.replace("_", "-") : "R-NEW", waiting: durationLabel(now.getTime() - (a.submittedAt ?? a.createdAt).getTime()), reviewer: a.review?.reviewerId ? nameOf.get(a.review.reviewerId) ?? "Reviewer" : "Unassigned", locked: !planBulk("ASSIGN", [{ id: a.id, ...item }]).eligible.length, safeguarding: item.pausedForCrisis || item.hasIncident || a.reasonCode === "R_FLAG" || a.reasonCode === "R_CONCERN" || item.flags.some((f) => f !== "CONTACT_DETAILS"), tone: (a.reasonCode === "R_TIME" ? "warn" : a.reasonCode === "R_THIN" || a.reasonCode === "R_FLAG" || a.reasonCode === "R_CONCERN" ? "bad" : "neutral") as "warn" | "bad" | "neutral" };
    }),
  };
}

export interface BulkParams { reviewerId?: string; expertise?: string[] }
/** Runs one organising action over many Asks. Each Ask is checked on its own, skipped Asks say why, and every change is audited. */
export async function runBulk(actor: { id: string; roles: Role[] }, action: Exclude<BulkAction, "CLOSE">, askIds: string[], p: BulkParams): Promise<R<{ done: number; skipped: { id: string; why: string }[] }>> {
  const ids = Array.from(new Set(askIds)); if (!ids.length) return fail("Select at least one Ask."); if (ids.length > BULK_MAX) return fail(`Select at most ${BULK_MAX} Asks at a time.`);
  if (!actor.roles.includes("ADMIN") && !actor.roles.includes("SAFEGUARDING_LEAD")) return fail("Not allowed.");
  if (action === "ASSIGN") { const r = p.reviewerId ? await db.user.findFirst({ where: { id: p.reviewerId, roles: { hasSome: ["ADMIN", "SAFEGUARDING_LEAD"] } } }) : null; if (!r) return fail("Choose a reviewer."); }
  const codes = new Set<string>(EXPERTISE_CODES);
  if (action === "SET_EXPERTISE" && (!p.expertise?.length || p.expertise.length > 3 || p.expertise.some((c) => !codes.has(c)))) return fail("Choose one to three areas of expertise.");
  const asks = await db.ask.findMany({ where: { id: { in: ids } }, include: { topic: true, review: true, participant: { include: { user: true } } } });
  const open = await db.incident.findMany({ where: { state: { not: "CLOSED" }, subjectId: { not: null } }, select: { subjectId: true } }); const flagged = new Set(open.map((i) => i.subjectId));
  const items = asks.map((a) => ({ id: a.id, state: a.state as string, reason: a.reasonCode as string | null, flags: a.review?.flags ?? [], minor: !!a.participant.user.dateOfBirth && isMinor(a.participant.user.dateOfBirth), pausedForCrisis: a.pausedForCrisis, hasIncident: flagged.has(a.participant.userId) }));
  const plan = planBulk(action, items);
  for (const id of ids) if (!asks.find((a) => a.id === id)) plan.skipped.push({ id, why: "Not found." });
  let done = 0;
  for (const it of plan.eligible) {
    const a = asks.find((x) => x.id === it.id)!;
    if (action === "ASSIGN") {
      await db.review.upsert({ where: { askId: a.id }, update: { reviewerId: p.reviewerId! }, create: { askId: a.id, reviewerId: p.reviewerId! } });
      await audit(actor.id, "bulk.assign", "Ask", a.id, { reviewerId: a.review?.reviewerId ?? null }, { reviewerId: p.reviewerId });
    } else if (action === "SET_EXPERTISE") {
      await db.review.upsert({ where: { askId: a.id }, update: { expertiseNeeded: p.expertise! }, create: { askId: a.id, expertiseNeeded: p.expertise! } });
      await audit(actor.id, "bulk.set_expertise", "Ask", a.id, { expertiseNeeded: a.review?.expertiseNeeded ?? [] }, { expertiseNeeded: p.expertise });
    } else {
      await notify(a.participant.userId, "ask.reminder", "Your Ask is with the team", "The team is still working on your Ask. There is nothing you need to do. We will write again when something changes.", { link: "/home", dedupeKey: `bulk-remind:${a.id}:${new Date().toISOString().slice(0, 10)}` });
      await audit(actor.id, "bulk.remind", "Ask", a.id, undefined, { to: "participant" });
    }
    done += 1;
  }
  await audit(actor.id, `bulk.${action.toLowerCase()}.run`, "Ask", undefined, undefined, { requested: ids.length, done, skipped: plan.skipped });
  return { ok: true, done, skipped: plan.skipped };
}

/* ───────── Reviewer playbook (A24) ───────── */
export async function playbookContext(askId: string | undefined, asked?: string) {
  const ask = askId ? await db.ask.findUnique({ where: { id: askId }, include: { topic: true, review: true } }) : null;
  const done = ask?.review?.stepsDone ?? [];
  const step = currentStep(done, asked);
  const q = ask ? parseAnswers(ask.answers).q1 : "";
  return {
    ask: ask ? { id: ask.id, title: ask.topic.name, question: q, reason: ask.reasonCode ? ask.reasonCode.replace("_", "-") : "R-NEW" } : null,
    steps: REVIEW_STEPS.map(([letter, label]) => ({ letter, label, state: done.includes(letter) ? ("done" as const) : letter === step ? ("now" as const) : ("todo" as const) })),
    step, guide: PLAYBOOK[step]!,
  };
}

/* ───────── Configuration audit trail (A5) ───────── */
export async function configAudit(take = 4) {
  const ev = await db.auditEvent.findMany({ where: { OR: [{ action: { startsWith: "config." } }, { action: { startsWith: "taxonomy." } }, { action: { startsWith: "template." } }] }, orderBy: { createdAt: "desc" }, take });
  const users = await db.user.findMany({ where: { id: { in: ev.map((e) => e.actorId).filter(Boolean) as string[] } }, select: { id: true, name: true, roles: true } });
  return ev.map((e) => ({ id: e.id, who: actorLabel(e.actorId ? users.find((u) => u.id === e.actorId) ?? { name: "Former member", roles: [] } : null), what: `${actionLabel(e.action).toLowerCase()}${e.objectId ? ` (${e.objectId})` : ""}`, when: fmtStamp(e.createdAt) }));
}
