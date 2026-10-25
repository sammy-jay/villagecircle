/**
 * Step 4 village (participant side): directory, library, events, thanks wall, volunteering, moderation.
 * Every read goes through the whitelist projections in ./domain/village so nothing private rides along.
 *
 * STABLE EXPORTS for other agents (keep signatures):
 *   saveResource(userId, resourceId) / unsaveResource(userId, resourceId) / listSavedResources(userId)   -> notes page
 *   listPendingThanks() / listPendingPosts() / moderate(kind, id, state, actorId, note?)                 -> admin moderation screen (A10)
 *   upsertEventInfo(eventId, info) / setEventVolunteerRoles(eventId, roles)                              -> admin events screen (A14)
 *   setMentorListed(userId, listed)                                                                     -> mentor privacy settings (D7)
 *   thanksWall(limit)                                                                                    -> any screen that shows the wall
 */
import type { ModerationState } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { isMinor } from "./domain/age";
import { expertiseLabel } from "./domain/expertise";
import { shortName } from "./domain/views";
import { APP_TZ, fmtDay, fmtTime } from "./domain/scheduling";
import { startAsk, saveAnswers, participantFor, type R } from "./asks";
import {
  LISTED, mentorVisibleTo, toDirectoryCard, filterDirectory, resourceVisible, resourceKind, cohortLabel, monthYear, thanksVisible, toThanksCard, scrubText, postVisible,
  eventTypeLabel, canRegister, placesLeft, fillPercent, MONTH_ABBR, type DirectoryCard, type DirectoryFilter, type DirectoryMentorSource, type Audience, type ThanksCard,
} from "./domain/village";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const oid = (s: string) => /^[0-9a-f]{24}$/i.test(s);

// ───────── Directory (D4) and profile (D18) ─────────
/** Mentors who are approved, onboarded, active and listed. The raw row never leaves this function: only DirectoryCard does. */
async function listedMentors(viewer: { minor: boolean }) {
  const rows = await db.mentorProfile.findMany({
    where: { verification: "APPROVED", visibility: LISTED, codeOfConductAt: { not: null }, orientationDoneAt: { not: null }, user: { status: "ACTIVE" } },
    select: { id: true, userId: true, bio: true, primaryExpertise: true, extraExpertise: true, languages: true, verification: true, codeOfConductAt: true, orientationDoneAt: true, visibility: true, clearedForMinors: true, monthlyHours: true, user: { select: { name: true, countryOfOrigin: true, status: true } } },
  });
  const thanks = await approvedThanksRows();
  const count = new Map<string, number>();
  for (const t of thanks) { const m = rows.find((r) => r.id === t.connection.mentorId); if (m && t.authorId !== m.userId) count.set(m.id, (count.get(m.id) ?? 0) + 1); }
  return rows.map((m): DirectoryMentorSource => ({ id: m.id, name: m.user.name, bio: m.bio, primaryExpertise: m.primaryExpertise, extraExpertise: m.extraExpertise, languages: m.languages, countryOfOrigin: m.user.countryOfOrigin, verification: m.verification, codeOfConductAt: m.codeOfConductAt, orientationDoneAt: m.orientationDoneAt, visibility: m.visibility, clearedForMinors: m.clearedForMinors, monthlyHours: m.monthlyHours, userStatus: m.user.status, thanksCount: count.get(m.id) ?? 0 }))
    .filter((m) => mentorVisibleTo(m, viewer));
}

export async function directoryFor(userId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const cards = (await listedMentors({ minor: p.minor })).map((m) => toDirectoryCard(m, expertiseLabel)).sort((a, b) => b.thanks - a.thanks || a.name.localeCompare(b.name));
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
  return {
    cards,
    professions: uniq(cards.flatMap((c) => c.professions)).map((code) => ({ code, label: expertiseLabel(code) })),
    languages: uniq(cards.flatMap((c) => c.languages)), countries: uniq(cards.map((c) => c.country)),
  };
}
export { filterDirectory };
export type { DirectoryFilter, DirectoryCard };

export async function mentorProfileFor(userId: string, mentorId: string) {
  const p = await participantFor(userId); if (!p || !oid(mentorId)) return null;
  const m = (await listedMentors({ minor: p.minor })).find((x) => x.id === mentorId); if (!m) return null;
  const mp = await db.mentorProfile.findUnique({ where: { id: mentorId }, select: { userId: true } });
  const thanks = (await thanksWall(50, mentorId)).filter((t) => t.mentorUserId !== undefined);
  // D18 "Tips by": approved library items this mentor contributed, with how many people found each helpful.
  const tipRows = mp ? (await visibleResources("MEMBER")).filter((r) => r.contributorId === mp.userId).slice(0, 6) : [];
  const tips = await toCards(tipRows);
  const helped = tips.length ? await db.resourceHelped.groupBy({ by: ["resourceId"], where: { resourceId: { in: tips.map((t) => t.id) } }, _count: true }) : [];
  const similar = (await listedMentors({ minor: p.minor })).filter((x) => x.id !== mentorId && x.primaryExpertise === m.primaryExpertise).slice(0, 2).map((x) => toDirectoryCard(x, expertiseLabel));
  return {
    card: toDirectoryCard(m, expertiseLabel), minor: p.minor,
    thanks: thanks.map(({ id, quote, who, tag }) => ({ id, quote, who, tag })),
    tips: tips.map((t) => ({ ...t, helped: helped.find((h) => h.resourceId === t.id)?._count ?? 0 })),
    similar: similar.map((x) => ({ id: x.id, name: x.name, initials: x.initials, role: x.role, country: x.country })),
  };
}

/** D4 "Name in an Ask": starts a draft on the mentor's topic and records the preferred mentor as a short name only. The team still decides routing. */
export async function startAskNaming(userId: string, mentorId: string): Promise<R<{ id: string }>> {
  const p = await participantFor(userId); if (!p) return fail("Only participants can start an Ask.");
  if (!oid(mentorId)) return fail("That mentor isn't listed.");
  const m = (await listedMentors({ minor: p.minor })).find((x) => x.id === mentorId); if (!m) return fail("That mentor isn't listed.");
  const topics = await db.topic.findMany({ where: { active: true, later: false }, orderBy: { sortOrder: "asc" } });
  const topic = topics.find((t) => t.expertiseMap.includes(m.primaryExpertise)) ?? topics[0]; if (!topic) return fail("No topics are open yet.");
  const s = await startAsk(userId, topic.slug); if (!s.ok) return s;
  await saveAnswers(userId, s.id, { preferredMentorName: shortName(m.name) });
  return { ok: true, id: s.id };
}

/** Mentor-controlled: listing in the community directory (D7). Only approved, oriented mentors can be listed. */
export async function setMentorListed(userId: string, listed: boolean): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId } }); if (!m) return fail("Mentor profile not found.");
  if (listed && (m.verification !== "APPROVED" || !m.codeOfConductAt || !m.orientationDoneAt)) return fail("You can be listed once you are approved and have finished orientation.");
  await db.mentorProfile.update({ where: { id: m.id }, data: { visibility: listed ? LISTED : "PRIVATE" } });
  return { ok: true };
}

// ───────── Resources (D4, D19, P1) ─────────
async function topicNames() { return new Map((await db.topic.findMany({ select: { slug: true, name: true } })).map((t) => [t.slug, t.name])); }
async function creditFor(ids: (string | null)[]) {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  const users = uniq.length ? await db.user.findMany({ where: { id: { in: uniq } }, select: { id: true, name: true } }) : [];
  return new Map(users.map((u) => [u.id, shortName(u.name)]));
}
export interface ResourceCard { id: string; kind: string; title: string; topic: string; topicSlug: string; topics: string[]; cohort: string; cohorts: string[]; credit: string; reviewed: string }
async function toCards(rs: Awaited<ReturnType<typeof db.resource.findMany>>): Promise<ResourceCard[]> {
  const names = await topicNames(); const credit = await creditFor(rs.map((r) => r.contributorId));
  return rs.map((r) => ({ id: r.id, kind: resourceKind(r.type), title: r.title, topic: names.get(r.topics[0] ?? "") ?? "", topicSlug: r.topics[0] ?? "", topics: r.topics, cohort: r.cohorts[0] ? cohortLabel(r.cohorts[0]) : "", cohorts: r.cohorts, credit: (r.contributorId && credit.get(r.contributorId)) || "Village webinar", reviewed: monthYear(r.lastReviewed, true) }));
}
async function visibleResources(audience: Audience, q?: string) {
  const rs = await db.resource.findMany({ where: { moderation: "APPROVED", visibility: audience === "PUBLIC" ? "PUBLIC" : { in: ["PUBLIC", "MEMBERS"] } }, orderBy: { lastReviewed: "desc" } });
  const term = (q ?? "").trim().toLowerCase();
  return rs.filter((r) => resourceVisible(r, audience) && (!term || `${r.title} ${r.topics.join(" ")}`.toLowerCase().includes(term)));
}
export async function libraryFor(userId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const saved = await db.savedItem.findMany({ where: { userId } });
  const cards = await toCards(await visibleResources("MEMBER"));
  const ids = new Set(cards.map((c) => c.id));
  return { cards, saved: saved.map((s) => s.resourceId).filter((id) => ids.has(id)) };
}
export async function publicLibrary(q?: string) { return toCards(await visibleResources("PUBLIC", q)); }

export async function resourceDetail(audience: Audience, id: string) {
  if (!oid(id)) return null;
  const r = await db.resource.findUnique({ where: { id } }); if (!r || !resourceVisible(r, audience)) return null;
  const [card] = await toCards([r]);
  const related = (await visibleResources(audience)).filter((x) => x.id !== id && x.topics.some((t) => r.topics.includes(t))).slice(0, 2);
  return { card, body: r.body ?? "", related: related.map((x) => ({ id: x.id, title: x.title })), reviewedLong: monthYear(r.lastReviewed) };
}
export async function savedState(userId: string, resourceId: string) {
  if (!oid(resourceId)) return { saved: false, helped: false };
  const [s, h] = await Promise.all([db.savedItem.findUnique({ where: { userId_resourceId: { userId, resourceId } } }), db.resourceHelped.findUnique({ where: { userId_resourceId: { userId, resourceId } } })]);
  return { saved: !!s, helped: !!h };
}
/** "Save to my notes". Only a visible resource can be saved. Idempotent. */
export async function saveResource(userId: string, resourceId: string): Promise<R> {
  if (!oid(resourceId)) return fail("Resource not found.");
  const r = await db.resource.findUnique({ where: { id: resourceId } }); if (!r || !resourceVisible(r, "MEMBER")) return fail("Resource not found.");
  await db.savedItem.upsert({ where: { userId_resourceId: { userId, resourceId } }, update: {}, create: { userId, resourceId } });
  return { ok: true };
}
export async function unsaveResource(userId: string, resourceId: string): Promise<R> {
  if (!oid(resourceId)) return fail("Resource not found.");
  await db.savedItem.deleteMany({ where: { userId, resourceId } }); return { ok: true };
}
/** For the notes page: the person's saved resources, newest first, visible ones only. */
export async function listSavedResources(userId: string): Promise<(ResourceCard & { savedAt: Date })[]> {
  const items = await db.savedItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }); if (!items.length) return [];
  const rs = await db.resource.findMany({ where: { id: { in: items.map((i) => i.resourceId) } } });
  const cards = await toCards(rs.filter((r) => resourceVisible(r, "MEMBER")));
  return items.flatMap((i) => { const c = cards.find((x) => x.id === i.resourceId); return c ? [{ ...c, savedAt: i.createdAt }] : []; });
}
export async function markHelped(userId: string, resourceId: string): Promise<R> {
  if (!oid(resourceId)) return fail("Resource not found.");
  const r = await db.resource.findUnique({ where: { id: resourceId } }); if (!r || !resourceVisible(r, "MEMBER")) return fail("Resource not found.");
  await db.resourceHelped.upsert({ where: { userId_resourceId: { userId, resourceId } }, update: {}, create: { userId, resourceId } });
  return { ok: true };
}

// ───────── Thanks wall (D9, D18) ─────────
function approvedThanksRows() {
  return db.thanks.findMany({
    where: { moderation: "APPROVED", sharePublicly: true }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { id: true, name: true, roles: true, participant: { select: { cohort: true } } } }, connection: { select: { mentorId: true, ask: { select: { topic: { select: { name: true } } } }, mentor: { select: { userId: true, user: { select: { name: true } } } } } } },
  });
}
/** Approved + shared thanks only, as quote / descriptor / topic. No names, no ids of people. Optionally for one mentor. */
export async function thanksWall(limit = 12, mentorId?: string): Promise<(ThanksCard & { mentorUserId?: string })[]> {
  const rows = (await approvedThanksRows()).filter((t) => thanksVisible(t) && (!mentorId || t.connection.mentorId === mentorId) && t.authorId !== t.connection.mentor.userId);
  return rows.slice(0, limit).map((t) => ({ ...toThanksCard({ id: t.id, body: t.body, topic: t.connection.ask.topic.name, author: { roles: t.author.roles, cohort: t.author.participant?.cohort ?? null, name: t.author.name }, mentorName: t.connection.mentor.user.name }), mentorUserId: t.connection.mentor.userId }));
}

// ───────── Events (D9, D20) ─────────
const wd = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long" }).format(d);
const parts = (d: Date) => { const f = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "numeric" }).formatToParts(d); return { day: f.find((x) => x.type === "day")!.value.padStart(2, "0"), month: MONTH_ABBR[Number(f.find((x) => x.type === "month")!.value) - 1]! }; };
const tzWord = (d: Date) => (APP_TZ() === "America/Chicago" ? "Central" : new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ(), timeZoneName: "short" }).formatToParts(d).find((x) => x.type === "timeZoneName")?.value ?? "");
const tzAbbr = (d: Date) => (APP_TZ() === "America/Chicago" ? "CT" : tzWord(d));
export const dayMonthShort = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short" }).format(d);
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function hostsPhrase(host: string) { const n = host.split(",").map((x) => x.trim()).filter(Boolean).length; return n >= 2 ? `hosted by ${NUM[n] ?? n} mentors` : host ? `hosted by ${scrubText(host)}` : ""; }

export interface EventRow { id: string; month: string; day: string; title: string; meta: string; registered: boolean }
export async function upcomingEvents(userId: string | null, limit = 5): Promise<EventRow[]> {
  const evs = await db.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: limit });
  const info = evs.length ? await db.eventInfo.findMany({ where: { eventId: { in: evs.map((e) => e.id) } } }) : [];
  return evs.map((e) => {
    const i = info.find((x) => x.eventId === e.id); const pt = parts(e.startsAt); const left = placesLeft(e.capacity, e.registrations.length);
    const where = !i?.location || /^online/i.test(i.location) ? "online" : scrubText(i.location);
    const tail = e.capacity != null && left != null && left <= Math.ceil(e.capacity * 0.25) ? "limited places" : hostsPhrase(e.host);
    return { id: e.id, month: pt.month, day: pt.day, title: `${i?.formatLabel ?? eventTypeLabel(e.type)}: ${e.title}`.replace(/^(\w[\w ]*): \1: /, "$1: "), meta: [`${wd(e.startsAt)}, ${fmtTime(e.startsAt)} ${tzAbbr(e.startsAt)}`, where, tail].filter(Boolean).join(" · "), registered: !!userId && e.registrations.includes(userId) };
  });
}
export async function eventDetail(userId: string, id: string) {
  if (!oid(id)) return null;
  const e = await db.event.findUnique({ where: { id } }); if (!e) return null;
  const i = await db.eventInfo.findUnique({ where: { eventId: id } });
  const taken = e.registrations.length;
  return {
    id: e.id, title: e.title, format: i?.formatLabel ?? eventTypeLabel(e.type), topicTag: i?.topicTag ?? "", audience: i?.audience ?? "", description: scrubText(i?.description ?? ""),
    when: `${fmtDay(e.startsAt)}, ${fmtTime(e.startsAt)} ${tzWord(e.startsAt)}`, hosts: scrubText(e.host), where: i?.location ? scrubText(i.location) : "Online, link sent when you register",
    recording: e.recordingKey ? "Available in the library" : "Added to the library afterwards", taken, capacity: e.capacity, percent: fillPercent(e.capacity, taken),
    past: e.startsAt.getTime() < Date.now(), registered: e.registrations.includes(userId), full: e.capacity != null && taken >= e.capacity,
  };
}
export async function registerForEvent(userId: string, eventId: string, register: boolean): Promise<R> {
  if (!oid(eventId)) return fail("Event not found.");
  const e = await db.event.findUnique({ where: { id: eventId } }); if (!e) return fail("Event not found.");
  if (!register) {
    if (!e.registrations.includes(userId)) return { ok: true };
    await db.event.update({ where: { id: eventId }, data: { registrations: e.registrations.filter((x) => x !== userId) } }); return { ok: true };
  }
  const v = canRegister(e, userId); if (!v.ok) return v;
  await db.event.update({ where: { id: eventId }, data: { registrations: { push: userId } } });
  const fresh = await db.event.findUnique({ where: { id: eventId }, select: { registrations: true } }); // capacity race: back out if we overshot
  if (e.capacity != null && fresh && fresh.registrations.length > e.capacity) { await db.event.update({ where: { id: eventId }, data: { registrations: fresh.registrations.filter((x) => x !== userId) } }); return fail("This event is full."); }
  const p = await participantFor(userId);
  if (p?.minor) { // D20: "Under 18? Your guardian is told you registered."
    const links = await db.guardianLink.findMany({ where: { participantId: p.profile.id, active: true }, include: { guardian: true } });
    for (const l of links) await notify(l.guardian.userId, "event.registered", `${p.user.name.split(" ")[0]} registered for an event`, `They registered for "${e.title}".`, { link: "/guardian", dedupeKey: `evt-reg-${eventId}-${userId}-${l.guardianId}` });
  }
  return { ok: true };
}

/** Admin screens (A14): optional display details and volunteer slots. */
export async function upsertEventInfo(eventId: string, info: { description?: string; audience?: string; topicTag?: string; formatLabel?: string; location?: string }) {
  await db.eventInfo.upsert({ where: { eventId }, update: info, create: { eventId, ...info } });
}
export async function setEventVolunteerRoles(eventId: string, roles: { role: string; places: number }[]) {
  await db.eventVolunteerRole.deleteMany({ where: { eventId } });
  for (const r of roles) await db.eventVolunteerRole.create({ data: { eventId, role: r.role, places: Math.max(1, r.places) } });
}

// ───────── Community (D9) ─────────
const digestKey = (userId: string) => `digest:${userId}`;
export async function digestOn(userId: string) { const s = await db.setting.findUnique({ where: { key: digestKey(userId) } }); return s ? (s.value as { on?: boolean }).on !== false : true; }
export async function setDigest(userId: string, on: boolean) { await db.setting.upsert({ where: { key: digestKey(userId) }, update: { value: { on } }, create: { key: digestKey(userId), value: { on } } }); }
export const digestTitle = (d = new Date()) => `The Village Notes, ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), month: "long" }).format(d)}`;

/** Leadership corner: latest approved post. Under-18s see mentor stories only. */
export async function latestPosts(viewer: { minor: boolean }, limit = 3) {
  const rows = await db.post.findMany({ where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 30 });
  const authors = await db.user.findMany({ where: { id: { in: rows.map((r) => r.authorId) } }, select: { id: true, roles: true } });
  return rows.filter((r) => postVisible({ moderation: r.moderation, authorIsMentor: !!authors.find((a) => a.id === r.authorId)?.roles.includes("MENTOR") }, viewer)).slice(0, limit).map((r) => ({ id: r.id, body: scrubText(r.body), createdAt: r.createdAt }));
}

// ───────── Volunteering (D26) and give back (EX17) ─────────
export async function volunteerBoard(userId: string) {
  const evs = await db.event.findMany({ where: { startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 20 });
  const roles = evs.length ? await db.eventVolunteerRole.findMany({ where: { eventId: { in: evs.map((e) => e.id) } } }) : [];
  const interests = await db.volunteerInterest.findMany({ where: { kind: "EVENT", eventId: { in: evs.map((e) => e.id) } } });
  const info = evs.length ? await db.eventInfo.findMany({ where: { eventId: { in: evs.map((e) => e.id) } } }) : [];
  return evs.flatMap((e) => roles.filter((r) => r.eventId === e.id).map((r) => {
    const taken = interests.filter((i) => i.eventId === e.id && i.role === r.role);
    const i = info.find((x) => x.eventId === e.id);
    return { eventId: e.id, role: r.role, title: `${i?.formatLabel ?? eventTypeLabel(e.type)}: ${e.title}`.replace(/^(\w[\w ]*): \1: /, "$1: "), when: `${dayMonthShort(e.startsAt)}, ${fmtTime(e.startsAt)}`, left: Math.max(0, r.places - taken.length), mine: taken.some((x) => x.userId === userId) };
  }));
}
export async function volunteerForEvent(userId: string, eventId: string, role: string): Promise<R> {
  if (!oid(eventId)) return fail("Event not found.");
  const r = await db.eventVolunteerRole.findFirst({ where: { eventId, role } }); if (!r) return fail("That role is not open.");
  const taken = await db.volunteerInterest.findMany({ where: { kind: "EVENT", eventId, role } });
  if (taken.some((t) => t.userId === userId)) return { ok: true };
  if (taken.length >= r.places) return fail("That role is full.");
  await db.volunteerInterest.create({ data: { userId, kind: "EVENT", eventId, role } });
  await audit(userId, "volunteer.event", "Event", eventId, undefined, { role });
  return { ok: true };
}
export async function proposeTalk(userId: string, note: string): Promise<R> {
  const n = scrubText(note).slice(0, 1000); if (n.length < 10) return fail("Tell us a little about the talk you have in mind.");
  await db.volunteerInterest.create({ data: { userId, kind: "TALK", note: n } }); return { ok: true };
}
/** EX17: only after a completed conversation (BRD 16.1). */
export async function canGiveBack(userId: string) {
  const p = await participantFor(userId); if (!p) return null;
  const done = await db.ask.count({ where: { participantId: p.profile.id, state: { in: ["HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"] } } });
  return { eligible: done > 0, minor: p.minor, name: p.user.name, existing: await db.volunteerInterest.findFirst({ where: { userId, kind: "GIVE_BACK" } }).then((x) => !!x) };
}
export async function giveBackInterest(userId: string, topics: string[], note: string): Promise<R> {
  const g = await canGiveBack(userId); if (!g) return fail("Only participants can do this.");
  if (!g.eligible) return fail("This opens after your first conversation.");
  const valid = new Set((await db.topic.findMany({ where: { active: true, later: false }, select: { name: true } })).map((t) => t.name));
  const t = [...new Set(topics)].filter((x) => valid.has(x)).slice(0, 8); if (!t.length && !note.trim()) return fail("Pick at least one thing you could help with.");
  await db.volunteerInterest.create({ data: { userId, kind: "GIVE_BACK", topics: t, note: scrubText(note).slice(0, 500) || null } });
  await audit(userId, "giveback.interest", "User", userId);
  return { ok: true };
}

// ───────── Moderation (A10) ─────────
export type ModKind = "THANKS" | "POST";
/** Thanks waiting for the team that the author asked to share. Admin-facing: includes the author's name, never sent to participants. */
export async function listPendingThanks() {
  const rows = await db.thanks.findMany({ where: { moderation: "PENDING", sharePublicly: true }, orderBy: { createdAt: "asc" }, include: { author: { select: { name: true, roles: true, participant: { select: { cohort: true } } } }, connection: { select: { ask: { select: { topic: { select: { name: true } } } }, mentor: { select: { user: { select: { name: true } } } } } } } });
  return rows.map((t) => ({ id: t.id, body: t.body, preview: toThanksCard({ id: t.id, body: t.body, topic: t.connection.ask.topic.name, author: { roles: t.author.roles, cohort: t.author.participant?.cohort ?? null, name: t.author.name }, mentorName: t.connection.mentor.user.name }), authorName: t.author.name, mentorName: t.connection.mentor.user.name, topic: t.connection.ask.topic.name, createdAt: t.createdAt }));
}
export async function listPendingPosts() {
  const rows = await db.post.findMany({ where: { moderation: "PENDING" }, orderBy: { createdAt: "asc" } });
  const authors = await db.user.findMany({ where: { id: { in: rows.map((r) => r.authorId) } }, select: { id: true, name: true, roles: true } });
  return rows.map((p) => { const a = authors.find((x) => x.id === p.authorId); return { id: p.id, body: p.body, authorName: a?.name ?? "", authorIsMentor: !!a?.roles.includes("MENTOR"), createdAt: p.createdAt }; });
}
/** Sets the moderation state, logs who and why. Approving a Thanks stamps publishedAt; it still shows only if the author chose to share it. */
export async function moderate(kind: ModKind, id: string, state: ModerationState, actorId: string, note?: string): Promise<R> {
  if (!oid(id)) return fail("Item not found.");
  if (kind === "THANKS") {
    const t = await db.thanks.findUnique({ where: { id } }); if (!t) return fail("Item not found.");
    await db.thanks.update({ where: { id }, data: { moderation: state, publishedAt: state === "APPROVED" ? new Date() : null } });
  } else {
    const p = await db.post.findUnique({ where: { id } }); if (!p) return fail("Item not found.");
    await db.post.update({ where: { id }, data: { moderation: state } });
  }
  await db.villageModeration.create({ data: { kind, itemId: id, state, actorId, note: note?.slice(0, 500) } });
  await audit(actorId, `moderation.${state.toLowerCase()}`, kind === "THANKS" ? "Thanks" : "Post", id, undefined, { note });
  return { ok: true };
}
void isMinor;
