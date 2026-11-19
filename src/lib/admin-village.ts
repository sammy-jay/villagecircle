import type { Cohort, EventType, ResourceType } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { moderate, upsertEventInfo } from "./village";
import { detectContactDetails } from "./domain/contact-detect";
import { disallowedLinks, LINK_RULE, linksIn, resourceContactHits } from "./domain/rich-text";
import { cycleMonths, dueDate, cycleState, daysUntil, type CycleState } from "./domain/review-cycle";
import { shortName } from "./domain/views";
import { expertiseLabel, EXPERTISE } from "./domain/expertise";

export type Res = { ok: true; [k: string]: unknown } | { ok: false; error: string };
const fail = (error: string): Res => ({ ok: false, error });
const OID = /^[a-f0-9]{24}$/i;
export const NOTE_MIN = 10;

/* ───────── Moderation (A10) ───────── */
export type ModItem = { kind: "THANKS" | "POST" | "RESOURCE"; id: string; label: string; preview: string; tag: string; createdAt: Date };
export interface ModDetail { kind: "THANKS" | "POST" | "RESOURCE"; id: string; eyebrow: string; body: string; title?: string; rows: [string, string][]; flags: string[]; canSelfEdit: boolean; canAnonymise: boolean }

function namesIn(text: string, names: string[]) {
  const toks = names.flatMap((n) => n.split(/\s+/)).filter((t) => t.length > 2);
  return toks.filter((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
}
export async function moderationQueue() {
  const [thanks, posts, resources] = await Promise.all([
    db.thanks.findMany({ where: { moderation: "PENDING", sharePublicly: true }, orderBy: { createdAt: "asc" } }),
    db.post.findMany({ where: { moderation: "PENDING" }, orderBy: { createdAt: "asc" } }),
    db.resource.findMany({ where: { moderation: "PENDING" }, orderBy: { createdAt: "asc" } }),
  ]);
  const items: ModItem[] = [
    ...thanks.map((t) => ({ kind: "THANKS" as const, id: t.id, label: "Thanks", preview: `"${t.body.slice(0, 120)}"`, tag: "Names removed", createdAt: t.createdAt })),
    ...posts.map((p) => ({ kind: "POST" as const, id: p.id, label: "Community feed", preview: p.body.slice(0, 120), tag: "Anonymised", createdAt: p.createdAt })),
    ...resources.map((r) => ({ kind: "RESOURCE" as const, id: r.id, label: "Resource", preview: r.title, tag: r.contributorId ? "Contributed" : "New", createdAt: r.createdAt })),
  ];
  return { items, counts: { thanks: thanks.length, posts: posts.length, resources: resources.length, events: 0 } };
}
export async function moderationDetail(kind: string, id: string): Promise<ModDetail | null> {
  if (!OID.test(id)) return null;
  if (kind === "THANKS") {
    const t = await db.thanks.findUnique({ where: { id }, include: { connection: { include: { mentor: { include: { user: { select: { name: true } } } }, participant: { include: { user: { select: { name: true, ageBand: true } } } } } }, author: { select: { name: true, ageBand: true } } } });
    if (!t || t.moderation !== "PENDING") return null;
    const minor = !!t.author.ageBand && t.author.ageBand !== "ADULT";
    const names = namesIn(t.body, [t.connection.mentor.user.name, t.connection.participant.user.name, t.author.name]);
    const contacts = detectContactDetails(t.body);
    const flags = [...(contacts.length ? ["Possible contact details found"] : []), ...(names.length ? ["A name is still in the text"] : [])];
    return { kind, id, eyebrow: `Thanks note · for ${shortName(t.connection.mentor.user.name)} · from a participant${minor ? " under 18" : ""}`, body: t.body, flags, canSelfEdit: true, canAnonymise: true,
      rows: [["Public as", minor ? "A participant under 18 and their guardian" : "A participant"], ["Contains", flags.length ? flags.join(", ") : "No names, no school, no contact details"], ["Consent", minor ? "Participant agreed to publish. Guardian consent applies to participants under 18" : "Participant agreed to publish"]] };
  }
  if (kind === "POST") {
    const p = await db.post.findUnique({ where: { id } }); if (!p || p.moderation !== "PENDING") return null;
    const a = await db.user.findUnique({ where: { id: p.authorId }, select: { name: true } });
    const contacts = detectContactDetails(p.body); const names = a ? namesIn(p.body, [a.name]) : [];
    const flags = [...(contacts.length ? ["Possible contact details found"] : []), ...(names.length ? ["The author's name is in the text"] : [])];
    return { kind, id, eyebrow: "Community feed post · shown without the author's name", body: p.body, flags, canSelfEdit: true, canAnonymise: true,
      rows: [["Public as", "Anonymous member"], ["Contains", flags.length ? flags.join(", ") : "No names, no contact details"]] };
  }
  if (kind === "RESOURCE") {
    const r = await db.resource.findUnique({ where: { id } }); if (!r || r.moderation !== "PENDING") return null;
    const c = r.contributorId ? await db.user.findUnique({ where: { id: r.contributorId }, select: { name: true } }) : null;
    // The whole resource, so the reviewer reads exactly what will be published (the page renders it formatted).
    const text = `${r.title}\n${r.body ?? ""}`;
    const contacts = resourceContactHits(text); const bad = disallowedLinks(text); const links = linksIn(r.body ?? "");
    const flags = [...(contacts.length ? ["Possible contact details found"] : []), ...(bad.length ? ["Link to a site that is not allowed"] : [])];
    return { kind, id, eyebrow: `Resource · ${TYPE_LABEL[r.type]} · from ${c ? shortName(c.name) : "the Village team"}`, title: r.title, body: r.body ?? "", flags, canSelfEdit: false, canAnonymise: false,
      rows: [["Topics", r.topics.join(", ") || "None set"], ["Contributor credit", c ? shortName(c.name) : "Village team"], ["Links", links.length ? links.join(", ") : "None"], ["Contains", flags.length ? flags.join(", ") : "No contact details found"]] };
  }
  return null;
}
export async function recentlyPublished() {
  const [thanks, posts, resources] = await Promise.all([
    db.thanks.findMany({ where: { moderation: "APPROVED", sharePublicly: true }, orderBy: { publishedAt: "desc" }, take: 5 }),
    db.post.findMany({ where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.resource.findMany({ where: { moderation: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  return [
    ...thanks.map((t) => ({ kind: "THANKS" as const, id: t.id, label: "Thanks", text: t.body.slice(0, 100) })),
    ...posts.map((p) => ({ kind: "POST" as const, id: p.id, label: "Community feed", text: p.body.slice(0, 100) })),
    ...resources.map((r) => ({ kind: "RESOURCE" as const, id: r.id, label: "Resource", text: r.title })),
  ];
}
const SCRUB = (text: string, names: string[]) => {
  let t = text;
  for (const h of detectContactDetails(text)) t = t.split(h.match).join("[contact removed]");
  for (const n of namesIn(t, names)) t = t.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[name removed]");
  return t;
};
async function currentBody(kind: string, id: string) {
  if (kind === "THANKS") { const t = await db.thanks.findUnique({ where: { id }, include: { connection: { include: { mentor: { include: { user: { select: { name: true } } } }, participant: { include: { user: { select: { name: true } } } } } }, author: { select: { name: true } } } }); return t ? { body: t.body, moderation: t.moderation, names: [t.connection.mentor.user.name, t.connection.participant.user.name, t.author.name] } : null; }
  if (kind === "POST") { const p = await db.post.findUnique({ where: { id } }); const a = p ? await db.user.findUnique({ where: { id: p.authorId }, select: { name: true } }) : null; return p ? { body: p.body, moderation: p.moderation, names: a ? [a.name] : [] } : null; }
  return null;
}
export type ModAction = "APPROVE" | "REJECT" | "REMOVE" | "EDIT" | "ANONYMISE";
export async function moderateItem(kind: string, id: string, action: ModAction, actorId: string, o: { note?: string; body?: string } = {}): Promise<Res> {
  if (!OID.test(id)) return fail("Item not found.");
  const note = o.note?.trim();
  if ((action === "REJECT" || action === "REMOVE") && (!note || note.length < NOTE_MIN)) return fail(`Add a note of at least ${NOTE_MIN} characters explaining the decision.`);
  if (kind === "THANKS" || kind === "POST") {
    const cur = await currentBody(kind, id); if (!cur) return fail("Item not found.");
    if (action === "EDIT" || action === "ANONYMISE") {
      if (cur.moderation !== "PENDING") return fail("Only items waiting for review can be edited.");
      const next = action === "ANONYMISE" ? SCRUB(cur.body, cur.names) : (o.body ?? "").trim();
      if (next.length < 2) return fail("The text cannot be empty.");
      if (kind === "THANKS") await db.thanks.update({ where: { id }, data: { body: next } }); else await db.post.update({ where: { id }, data: { body: next } });
      await audit(actorId, action === "EDIT" ? "moderation.edit" : "moderation.anonymise", kind === "THANKS" ? "Thanks" : "Post", id, { body: cur.body }, { body: next });
      return { ok: true, body: next };
    }
    if (action === "APPROVE") {
      if (cur.moderation !== "PENDING") return fail("This item is no longer waiting for review.");
      if (detectContactDetails(cur.body).length) return fail("Remove the contact details before approving.");
      if (namesIn(cur.body, cur.names).length) return fail("Remove the names before approving.");
    }
    const r = await moderate(kind, id, action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "REMOVED", actorId, note);
    return r.ok ? { ok: true } : fail(r.error);
  }
  if (kind === "RESOURCE") {
    const r = await db.resource.findUnique({ where: { id } }); if (!r) return fail("Item not found.");
    if (action === "EDIT" || action === "ANONYMISE") return fail("Edit resources in the library.");
    const state = action === "APPROVE" ? "APPROVED" : action === "REJECT" ? "REJECTED" : "REMOVED";
    if (action === "APPROVE" && r.moderation !== "PENDING") return fail("This item is no longer waiting for review.");
    if (action === "APPROVE" && disallowedLinks(`${r.title}\n${r.body ?? ""}`).length) return fail(`Remove the link to a site that is not allowed before approving. ${LINK_RULE}`);
    if (action === "APPROVE" && resourceContactHits(`${r.title}\n${r.body ?? ""}`).length) return fail("Remove the contact details before approving.");
    await db.resource.update({ where: { id }, data: { moderation: state, ...(action === "APPROVE" ? { lastReviewed: new Date() } : null) } });
    await db.villageModeration.create({ data: { kind: "RESOURCE", itemId: id, state, actorId, note: note?.slice(0, 500) } });
    await audit(actorId, `moderation.${state.toLowerCase()}`, "Resource", id, { moderation: r.moderation }, { moderation: state, note });
    if (r.contributorId && action !== "APPROVE") await notify(r.contributorId, "resource.not_published", "Your resource was not published", `"${r.title}" was not published to the library. The team can tell you more.`, { link: "/mentor", email: false });
    if (r.contributorId && action === "APPROVE") await notify(r.contributorId, "resource.published", "Your resource is live", `"${r.title}" is now in the library. Thank you.`, { link: "/library", email: false });
    return { ok: true };
  }
  return fail("Item not found.");
}

/* ───────── Library (A13) and review cycle (A27) ───────── */
export const TYPE_LABEL: Record<ResourceType, string> = { ARTICLE: "Article", GUIDE: "Guide", TEMPLATE: "Template", VIDEO: "Video", EVENT_RECORDING: "Recording" };
export const COHORT_LABEL: Record<Cohort, string> = { HIGH_SCHOOL: "High school", COLLEGE: "College", GRADUATE: "Graduate", EARLY_CAREER: "Early career" };
const monthYear = (d: Date | null) => (d ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).replace("Sep ", "Sept ") : null);

async function reviewOverrides(): Promise<Record<string, number>> {
  const s = await db.setting.findUnique({ where: { key: "resource-review-months" } });
  return s && typeof s.value === "object" && s.value ? (s.value as Record<string, number>) : {};
}
export interface LibRow { id: string; title: string; type: ResourceType; typeLabel: string; topics: string[]; cohorts: Cohort[]; body: string; fileKey: string; contributorId: string; contributor: string; lastReviewed: string | null; lastReviewedISO: string | null; status: "LIVE" | "REVIEW_DUE" | "AWAITING" | "ARCHIVED"; cycle: CycleState; dueISO: string; dueInDays: number }
export async function libraryRows(): Promise<{ rows: LibRow[]; mentors: { id: string; name: string }[]; dueCount: number; earliestDue: Date | null }> {
  const [res, ov, mentors] = await Promise.all([
    db.resource.findMany({ orderBy: { createdAt: "desc" } }), reviewOverrides(),
    db.user.findMany({ where: { roles: { has: "MENTOR" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const names = new Map((await db.user.findMany({ where: { id: { in: res.map((r) => r.contributorId).filter((x): x is string => !!x) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const now = new Date();
  const rows = res.map((r): LibRow => {
    const due = dueDate(r.lastReviewed, r.createdAt, cycleMonths(r.topics, ov)); const cycle = cycleState(due, now);
    const status = r.moderation === "PENDING" ? "AWAITING" : r.moderation === "APPROVED" ? (cycle === "CURRENT" ? "LIVE" : "REVIEW_DUE") : "ARCHIVED";
    return { id: r.id, title: r.title, type: r.type, typeLabel: TYPE_LABEL[r.type], topics: r.topics, cohorts: r.cohorts, body: r.body ?? "", fileKey: r.fileKey ?? "", contributorId: r.contributorId ?? "", contributor: r.contributorId && names.get(r.contributorId) ? shortName(names.get(r.contributorId)!) : "Village team", lastReviewed: monthYear(r.lastReviewed), lastReviewedISO: r.lastReviewed?.toISOString() ?? null, status, cycle, dueISO: due.toISOString(), dueInDays: daysUntil(due, now) };
  });
  const due = rows.filter((r) => r.status === "REVIEW_DUE");
  return { rows, mentors: mentors.map((m) => ({ id: m.id, name: shortName(m.name) })), dueCount: due.length, earliestDue: due.length ? new Date(Math.min(...due.map((d) => +new Date(d.dueISO)))) : null };
}
export async function reviewCycleRows() {
  const { rows } = await libraryRows();
  return rows.filter((r) => r.status === "LIVE" || r.status === "REVIEW_DUE").sort((a, b) => +new Date(a.dueISO) - +new Date(b.dueISO)).slice(0, 60);
}
const TYPES = ["ARTICLE", "GUIDE", "TEMPLATE", "VIDEO", "EVENT_RECORDING"] as const;
export interface ResourceInput { id?: string; title: string; type: string; topics: string[]; cohorts: string[]; body?: string; fileKey?: string; contributorId?: string }
export async function saveResourceAdmin(actorId: string, i: ResourceInput, publish: boolean): Promise<Res> {
  const title = i.title?.trim(); if (!title || title.length < 3) return fail("Add a title of at least 3 characters.");
  if (!(TYPES as readonly string[]).includes(i.type)) return fail("Choose a type.");
  const topics = [...new Set(i.topics.map((t) => t.trim()).filter(Boolean))].slice(0, 8);
  if (!topics.length) return fail("Add at least one topic tag.");
  const cohorts = i.cohorts.filter((c): c is Cohort => c in COHORT_LABEL);
  const body = i.body?.trim() || null; const fileKey = i.fileKey?.trim() || null;
  if (!body && !fileKey) return fail("Add the text or a file key.");
  if (disallowedLinks(`${title}\n${body ?? ""}`).length) return fail(`Remove the link to a site that is not allowed. ${LINK_RULE}`);
  if (resourceContactHits(`${title}\n${body ?? ""}`).length) return fail("Remove the contact details from the title and text.");
  const contributorId = i.contributorId && OID.test(i.contributorId) ? i.contributorId : null;
  const data = { title, type: i.type as ResourceType, topics, cohorts, body, fileKey, contributorId };
  if (i.id) {
    if (!OID.test(i.id)) return fail("Resource not found.");
    const before = await db.resource.findUnique({ where: { id: i.id } }); if (!before) return fail("Resource not found.");
    await db.resource.update({ where: { id: i.id }, data: { ...data, ...(publish ? { moderation: "APPROVED", lastReviewed: new Date() } : null) } });
    await audit(actorId, publish ? "library.publish" : "library.edit", "Resource", i.id, { title: before.title, moderation: before.moderation }, { ...data, moderation: publish ? "APPROVED" : before.moderation });
    return { ok: true, id: i.id };
  }
  const c = await db.resource.create({ data: { ...data, moderation: publish ? "APPROVED" : "PENDING", lastReviewed: publish ? new Date() : null } });
  await audit(actorId, publish ? "library.publish" : "library.create", "Resource", c.id, undefined, data);
  return { ok: true, id: c.id };
}
/** Reviewer actions: REVIEWED resets the clock, ARCHIVE hides it and keeps the record (needs a note). */
export async function resourceReviewAction(actorId: string, id: string, action: "REVIEWED" | "ARCHIVE", note?: string): Promise<Res> {
  if (!OID.test(id)) return fail("Resource not found.");
  const r = await db.resource.findUnique({ where: { id } }); if (!r) return fail("Resource not found.");
  if (action === "ARCHIVE") {
    if (!note || note.trim().length < NOTE_MIN) return fail(`Add a note of at least ${NOTE_MIN} characters explaining why.`);
    await db.resource.update({ where: { id }, data: { moderation: "REMOVED" } });
    await db.villageModeration.create({ data: { kind: "RESOURCE", itemId: id, state: "REMOVED", actorId, note: note.trim().slice(0, 500) } });
    await audit(actorId, "library.archive", "Resource", id, { moderation: r.moderation }, { moderation: "REMOVED", note: note.trim() });
    return { ok: true };
  }
  if (r.moderation !== "APPROVED") return fail("Only live resources can be marked as reviewed.");
  await db.resource.update({ where: { id }, data: { lastReviewed: new Date() } });
  await audit(actorId, "library.reviewed", "Resource", id, { lastReviewed: r.lastReviewed }, { lastReviewed: new Date() });
  return { ok: true };
}

/* ───────── Events (A14) ───────── */
export const EVENT_TYPE_LABEL: Record<EventType, string> = { WORKSHOP: "Workshop", PANEL: "Panel", OFFICE_HOURS: "Office hours", ORIENTATION: "Orientation" };
export interface EventRowA { id: string; title: string; type: EventType; startsAtISO: string; dateLabel: string; host: string; capacity: number | null; registered: number; recordingKey: string; description: string; location: string; status: "OPEN" | "FULL" | "HELD"; recording: "NONE" | "PENDING" | "LIVE" }
export async function eventRows(): Promise<EventRowA[]> {
  const evs = await db.event.findMany({ orderBy: { startsAt: "desc" }, take: 60 });
  const keys = evs.map((e) => e.recordingKey).filter((k): k is string => !!k);
  const recs = keys.length ? await db.resource.findMany({ where: { type: "EVENT_RECORDING", fileKey: { in: keys } }, select: { fileKey: true, moderation: true } }) : [];
  const infos = await db.eventInfo.findMany({ where: { eventId: { in: evs.map((e) => e.id) } } });
  const now = Date.now();
  return evs.map((e) => {
    const info = infos.find((x) => x.eventId === e.id);
    const held = e.startsAt.getTime() < now; const full = e.capacity != null && e.registrations.length >= e.capacity;
    const rec = e.recordingKey ? (recs.some((r) => r.fileKey === e.recordingKey && r.moderation === "APPROVED") ? "LIVE" : "PENDING") : "NONE";
    return { id: e.id, title: e.title, type: e.type, startsAtISO: e.startsAt.toISOString(), dateLabel: e.startsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), host: e.host, capacity: e.capacity, registered: e.registrations.length, recordingKey: e.recordingKey ?? "", description: info?.description ?? "", location: info?.location ?? "", status: held ? "HELD" : full ? "FULL" : "OPEN", recording: rec };
  });
}
export async function saveEventAdmin(actorId: string, i: { id?: string; title: string; startsAt: string; type: string; capacity?: number | null; host: string; recordingKey?: string; description?: string; location?: string }): Promise<Res> {
  const title = i.title?.trim(); if (!title || title.length < 3) return fail("Add a title of at least 3 characters.");
  const startsAt = new Date(i.startsAt); if (isNaN(+startsAt)) return fail("Choose a date and time.");
  if (!(i.type in EVENT_TYPE_LABEL)) return fail("Choose a type.");
  const host = i.host?.trim(); if (!host) return fail("Add at least one host.");
  const capacity = i.capacity == null || Number.isNaN(i.capacity) ? null : Math.floor(i.capacity);
  if (capacity !== null && capacity < 1) return fail("Capacity must be 1 or more.");
  if (detectContactDetails(`${title} ${host}`).length) return fail("Remove the contact details from the title and hosts.");
  const recordingKey = i.recordingKey?.trim() || null;
  const data = { title, startsAt, type: i.type as EventType, host, capacity, recordingKey };
  let id = i.id;
  if (id) {
    if (!OID.test(id)) return fail("Event not found.");
    const b = await db.event.findUnique({ where: { id } }); if (!b) return fail("Event not found.");
    if (capacity !== null && capacity < b.registrations.length) return fail(`${b.registrations.length} people have registered. Capacity cannot go below that.`);
    await db.event.update({ where: { id }, data }); await audit(actorId, "event.edit", "Event", id, { title: b.title, startsAt: b.startsAt, capacity: b.capacity }, data);
  } else { id = (await db.event.create({ data })).id; await audit(actorId, "event.create", "Event", id, undefined, data); }
  if (detectContactDetails(`${i.description ?? ""} ${i.location ?? ""}`).length) return fail("Remove the contact details from the description and location.");
  await upsertEventInfo(id!, { description: i.description?.trim() || undefined, location: i.location?.trim() || undefined });
  // The recording goes to the library as a PENDING resource: a person reads it before it is public.
  if (recordingKey && !(await db.resource.findFirst({ where: { type: "EVENT_RECORDING", fileKey: recordingKey } }))) {
    const r = await db.resource.create({ data: { title, type: "EVENT_RECORDING", fileKey: recordingKey, topics: ["Village events"], cohorts: [], moderation: "PENDING" } });
    await audit(actorId, "library.create", "Resource", r.id, undefined, { fromEvent: id });
  }
  return { ok: true, id };
}
