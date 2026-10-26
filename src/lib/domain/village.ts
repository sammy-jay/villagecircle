import { matchesAll } from "./search";
/**
 * Step 4 village: what the community may see (directory, library, thanks wall, events).
 * Pure functions only, so the safeguarding rules are easy to test:
 *  - mentors appear only when approved, onboarded and listed, as a short name (Kwame M.) with expertise, never contact details;
 *  - only team-approved resources, thanks and posts are visible;
 *  - thanks never carry names: they use a descriptor ("A college student");
 *  - under-18s never see other participants' content beyond approved thanks.
 */
import { shortName } from "./views";
import { detectContactDetails } from "./contact-detect";

// ───────── Mentor directory (D4, D18) ─────────
export interface DirectoryMentorSource {
  id: string; name: string; bio: string; primaryExpertise: string; extraExpertise: string[]; languages: string[]; countryOfOrigin: string | null;
  verification: string; codeOfConductAt: Date | null; orientationDoneAt: Date | null; visibility: string; clearedForMinors: boolean; monthlyHours: number;
  userStatus: string; thanksCount: number;
  [extra: string]: unknown; // email, phone, DOB, school etc. may be present on the raw row: they are never copied out
}
export const LISTED = "LISTED";
/** Approved by the team, finished onboarding, account open, and the mentor chose to be listed. */
export function mentorListable(m: Pick<DirectoryMentorSource, "verification" | "codeOfConductAt" | "orientationDoneAt" | "visibility" | "userStatus">): boolean {
  return m.verification === "APPROVED" && !!m.codeOfConductAt && !!m.orientationDoneAt && m.visibility === LISTED && m.userStatus === "ACTIVE";
}
/** Under-18s only see mentors cleared for young people (BR-04). */
export const mentorVisibleTo = (m: Pick<DirectoryMentorSource, "clearedForMinors"> & Parameters<typeof mentorListable>[0], viewer: { minor: boolean }) => mentorListable(m) && (!viewer.minor || m.clearedForMinors);

/** Mentor-written bio with any contact detail removed, so the public card can never leak one. */
export function scrubText(t: string): string {
  let out = t;
  for (const h of detectContactDetails(t)) out = out.split(h.match).join("");
  return out.replace(/\s{2,}/g, " ").trim();
}
const initials = (n: string) => { const p = n.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1]![0]! : "")).toUpperCase(); };

/** The only mentor shape any directory or profile screen receives. Keys are fixed and tested. */
export interface DirectoryCard { id: string; name: string; initials: string; role: string; bio: string; area: string; expertise: string[]; professions: string[]; languages: string[]; country: string; gives: string; thanks: number; verified: boolean; clearedForYoung: boolean }
export function toDirectoryCard(m: DirectoryMentorSource, label: (code: string) => string): DirectoryCard {
  const short = shortName(m.name);
  const expertise = [m.primaryExpertise, ...m.extraExpertise].map(label);
  return {
    id: m.id, name: short, initials: initials(short.replace(".", "")), role: expertise[0] ?? "", bio: scrubText(m.bio), area: expertise[0] ?? "", expertise, professions: [m.primaryExpertise, ...m.extraExpertise],
    languages: m.languages, country: m.countryOfOrigin ?? "", gives: m.monthlyHours === 1 ? "One hour a month" : `${m.monthlyHours} hours a month`, thanks: m.thanksCount, verified: m.verification === "APPROVED", clearedForYoung: m.clearedForMinors,
  };
}
export const DIRECTORY_KEYS = ["area", "bio", "clearedForYoung", "country", "expertise", "gives", "id", "initials", "languages", "name", "professions", "role", "thanks", "verified"] as const;

export interface DirectoryFilter { q?: string; profession?: string; language?: string; country?: string }
export function filterDirectory(cards: DirectoryCard[], f: DirectoryFilter): DirectoryCard[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return cards.filter((c) =>
    (!q || matchesAll([c.name, c.role, c.bio, ...c.expertise].join(" "), q)) &&
    (!f.profession || c.professions.includes(f.profession)) &&
    (!f.language || c.languages.some((l) => l.toLowerCase() === f.language!.toLowerCase())) &&
    (!f.country || c.country.toLowerCase() === f.country.toLowerCase()));
}

// ───────── Resources (D4, D19, P1) ─────────
export type Audience = "PUBLIC" | "MEMBER";
export interface ResourceGate { moderation: string; visibility: string }
/** Only team-approved resources. Signed-out visitors see PUBLIC ones only; members also see MEMBERS ones. MENTORS-only never reaches participants. */
export function resourceVisible(r: ResourceGate, audience: Audience): boolean {
  if (r.moderation !== "APPROVED") return false;
  return audience === "PUBLIC" ? r.visibility === "PUBLIC" : r.visibility === "PUBLIC" || r.visibility === "MEMBERS";
}
export const RESOURCE_KIND: Record<string, string> = { TEMPLATE: "Template", ARTICLE: "Answer", GUIDE: "Answer", VIDEO: "Recording", EVENT_RECORDING: "Recording" };
export const resourceKind = (t: string) => RESOURCE_KIND[t] ?? "Answer";
export const COHORT_LABEL: Record<string, string> = { HIGH_SCHOOL: "High school", COLLEGE: "College", GRADUATE: "Graduate", EARLY_CAREER: "Early career" };
export const cohortLabel = (c: string) => COHORT_LABEL[c] ?? c;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "September 2026" / "Sept 2026" style line used under a resource. */
export const monthYear = (d: Date | null | undefined, short = false) => (d ? `${short ? (d.getUTCMonth() === 8 ? "Sept" : MONTHS[d.getUTCMonth()]!.slice(0, 3)) : MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : "Not yet reviewed");
/** Resources are reviewed every 12 months; past that they are not shown (D19: "Out-of-date advice is taken down"). */
export const REVIEW_MONTHS = 12;
export const resourceFresh = (lastReviewed: Date | null, now = new Date()) => !!lastReviewed && now.getTime() - lastReviewed.getTime() < REVIEW_MONTHS * 31 * 86_400_000;

export type CohortChip = "all" | "HIGH_SCHOOL" | "COLLEGE" | "EARLY_CAREER" | "leadership" | "saved";
export const COHORT_CHIPS: [CohortChip, string][] = [["all", "All"], ["HIGH_SCHOOL", "High school"], ["COLLEGE", "College"], ["EARLY_CAREER", "Early career"], ["leadership", "Leadership"]];
export function libraryFilter<T extends { id: string; cohorts: string[]; topics: string[] }>(items: T[], chip: CohortChip, saved: Set<string>): T[] {
  if (chip === "all") return items;
  if (chip === "saved") return items.filter((r) => saved.has(r.id));
  if (chip === "leadership") return items.filter((r) => r.topics.includes("leadership-development"));
  return items.filter((r) => r.cohorts.includes(chip));
}
export const parseChip = (v: unknown): CohortChip => (["HIGH_SCHOOL", "COLLEGE", "EARLY_CAREER", "leadership", "saved"].includes(String(v)) ? (String(v) as CohortChip) : "all");

// ───────── Thanks wall (D9, D18) ─────────
/** A thanks is visible only once the team approved it AND its author chose to share it. */
export const thanksVisible = (t: { moderation: string; sharePublicly: boolean }) => t.moderation === "APPROVED" && t.sharePublicly;

/** "A college student" style descriptor. Never a name, school, age or town. */
export function thanksDescriptor(a: { roles: string[]; cohort: string | null }): string {
  if (a.roles.includes("MENTOR") && !a.roles.includes("PARTICIPANT")) return "A mentor";
  if (a.roles.includes("GUARDIAN") && !a.roles.includes("PARTICIPANT")) return "A parent";
  switch (a.cohort) {
    case "HIGH_SCHOOL": return "A high school student";
    case "COLLEGE": return "A college student";
    case "GRADUATE": return "A graduate student";
    case "EARLY_CAREER": return "An early-career professional";
    default: return "A member of the village";
  }
}
/** Names the author may have typed into the note are removed: any contact detail, plus the author's own and mentor's name parts. */
export function scrubThanks(body: string, names: string[] = []): string {
  let out = scrubText(body);
  for (const n of names.flatMap((x) => x.split(/\s+/)).filter((x) => x.length > 2)) out = out.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "").replace(/\s{2,}/g, " ").trim();
  return out;
}
export interface ThanksCard { id: string; quote: string; who: string; tag: string }
export const THANKS_KEYS = ["id", "quote", "tag", "who"] as const;
export function toThanksCard(t: { id: string; body: string; topic: string; author: { roles: string[]; cohort: string | null; name?: string }; mentorName?: string }): ThanksCard {
  const q = scrubThanks(t.body, [t.author.name ?? "", t.mentorName ?? ""]);
  return { id: t.id, quote: `"${q.replace(/^"|"$/g, "")}"`, who: thanksDescriptor(t.author), tag: t.topic };
}

// ───────── Posts (leadership corner) ─────────
/** Approved posts only. Under-18s never see another participant's post; mentor stories are fine. */
export function postVisible(p: { moderation: string; authorIsMentor: boolean }, viewer: { minor: boolean }): boolean {
  if (p.moderation !== "APPROVED") return false;
  return p.authorIsMentor || !viewer.minor;
}

// ───────── Events (D9, D20, D26) ─────────
export const EVENT_TYPE_LABEL: Record<string, string> = { WORKSHOP: "Workshop", PANEL: "Panel", OFFICE_HOURS: "Office hours", ORIENTATION: "Orientation" };
export const eventTypeLabel = (t: string) => EVENT_TYPE_LABEL[t] ?? t;
export const placesLeft = (capacity: number | null, registered: number) => (capacity == null ? null : Math.max(0, capacity - registered));
export const eventFull = (capacity: number | null, registered: number) => capacity != null && registered >= capacity;
export const fillPercent = (capacity: number | null, registered: number) => (capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 0);
export const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export type Reg = { ok: true } | { ok: false; error: string };
/** Registering rules: not past, not full, not already registered. */
export function canRegister(e: { startsAt: Date; capacity: number | null; registrations: string[] }, userId: string, now = new Date()): Reg {
  if (e.startsAt.getTime() < now.getTime()) return { ok: false, error: "This event has already taken place." };
  if (e.registrations.includes(userId)) return { ok: false, error: "You are already registered." };
  if (eventFull(e.capacity, e.registrations.length)) return { ok: false, error: "This event is full." };
  return { ok: true };
}

// ───────── Resource body (D19) ─────────
/** Paragraphs split on blank lines; a multi-line paragraph's first line is its heading ("Before the semester"). */
export function formatBody(body: string): { heading?: string; lines: string[] }[] {
  return body.replace(/\r/g, "").split(/\n\s*\n/).map((p) => p.split("\n").map((l) => l.trim()).filter(Boolean)).filter((l) => l.length)
    .map((l) => (l.length > 1 ? { heading: l[0], lines: l.slice(1) } : { lines: l }));
}
export const thanksCountLabel = (n: number) => (n === 0 ? "No thank-you notes yet" : n === 1 ? "1 thank-you note" : `${n} thank-you notes`);
