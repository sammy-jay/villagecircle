/** Pure rules for Step 5 admin group 2: taxonomy, config, broadcast, queue health, search, bulk actions, playbook. No database here. */
import type { Role } from "@prisma/client";
import { WEIGHTS } from "./ranking";
import { EXPERTISE_CODES } from "./expertise";

/* ───────── Configuration (A5) ───────── */
export const WEIGHT_KEYS = ["fit", "capacity", "spread", "affinity", "responsiveness"] as const;
export type WeightKey = (typeof WEIGHT_KEYS)[number];
export const WEIGHT_LABEL: Record<WeightKey, string> = { fit: "Expertise fit", capacity: "Capacity", spread: "Load spread", affinity: "Affinity", responsiveness: "Responsiveness" };
export interface AppConfig { weights: Record<WeightKey, number>; windows: { reviewBusinessDays: number; mentorReplyDays: number; incidentOutcomeHours: number } }
export const DEFAULT_CONFIG: AppConfig = { weights: { ...WEIGHTS }, windows: { reviewBusinessDays: 2, mentorReplyDays: 5, incidentOutcomeHours: 48 } };
export const WINDOW_BOUNDS = { reviewBusinessDays: [1, 10], mentorReplyDays: [1, 14], incidentOutcomeHours: [1, 72] } as const;
export const WINDOW_LABEL = { reviewBusinessDays: "Review within", mentorReplyDays: "Mentor reply within", incidentOutcomeHours: "Incident outcome within" } as const;
export const WINDOW_UNIT = { reviewBusinessDays: "business days", mentorReplyDays: "days", incidentOutcomeHours: "hours" } as const;

/** Returns every problem with a proposed config; empty means valid. Weights are whole numbers, 0 to 100, totalling exactly 100. */
export function validateConfig(c: AppConfig): string[] {
  const errs: string[] = [];
  for (const k of WEIGHT_KEYS) { const v = c.weights[k]; if (!Number.isInteger(v) || v < 0 || v > 100) errs.push(`${WEIGHT_LABEL[k]} must be a whole number from 0 to 100.`); }
  const total = WEIGHT_KEYS.reduce((s, k) => s + (Number(c.weights[k]) || 0), 0);
  if (total !== 100) errs.push(`Weights must total 100 (they total ${total}).`);
  for (const k of Object.keys(WINDOW_BOUNDS) as (keyof typeof WINDOW_BOUNDS)[]) {
    const [lo, hi] = WINDOW_BOUNDS[k]; const v = c.windows[k];
    if (!Number.isInteger(v) || v < lo || v > hi) errs.push(`${WINDOW_LABEL[k]} must be ${lo} to ${hi} ${WINDOW_UNIT[k]}.`);
  }
  return errs;
}
/** Merges stored JSON over the defaults; anything malformed falls back to the default. */
export function mergeConfig(stored: unknown): AppConfig {
  const s = (stored && typeof stored === "object" ? stored : {}) as { weights?: Partial<AppConfig["weights"]>; windows?: Partial<AppConfig["windows"]> };
  const next: AppConfig = { weights: { ...DEFAULT_CONFIG.weights, ...s.weights }, windows: { ...DEFAULT_CONFIG.windows, ...s.windows } };
  return validateConfig(next).length ? DEFAULT_CONFIG : next;
}
/** Program lead (ADMIN) edits configuration; the safeguarding lead can read it. */
export const canEditConfig = (roles: readonly Role[]) => roles.includes("ADMIN");

/* ───────── Taxonomy (A12) ───────── */
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
export interface TopicInput { name: string; guidedPrompts: string[]; subTopics: string[]; expertiseMap: string[]; active: boolean }
const trimList = (l: string[], max: number) => Array.from(new Set(l.map((s) => s.trim()).filter(Boolean))).slice(0, max);
export function cleanTopic(i: TopicInput): { ok: true; value: TopicInput } | { ok: false; error: string } {
  const name = i.name.trim(); if (name.length < 2 || name.length > 60) return { ok: false, error: "Give the topic a name of 2 to 60 characters." };
  if (!slugify(name)) return { ok: false, error: "The topic name needs letters or numbers." };
  const codes = new Set<string>(EXPERTISE_CODES);
  const expertiseMap = trimList(i.expertiseMap, 15); if (expertiseMap.some((c) => !codes.has(c))) return { ok: false, error: "Unknown area of expertise code." };
  const guidedPrompts = trimList(i.guidedPrompts, 6); if (guidedPrompts.some((p) => p.length > 160)) return { ok: false, error: "Each prompt must be under 160 characters." };
  return { ok: true, value: { name, guidedPrompts, subTopics: trimList(i.subTopics, 12), expertiseMap, active: i.active } };
}

/* ───────── Broadcast (A17) ───────── */
export const AUDIENCES = ["EVERYONE", "MENTORS", "PARTICIPANTS", "GUARDIANS"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const AUDIENCE_LABEL: Record<Audience, string> = { EVERYONE: "Everyone", MENTORS: "Mentors", PARTICIPANTS: "Participants", GUARDIANS: "Guardians" };
export const AUDIENCE_NOUN: Record<Audience, [string, string]> = { EVERYONE: ["person", "people"], MENTORS: ["mentor", "mentors"], PARTICIPANTS: ["participant", "participants"], GUARDIANS: ["guardian", "guardians"] };
export const audienceRoles = (a: Audience): Role[] => a === "MENTORS" ? ["MENTOR"] : a === "PARTICIPANTS" ? ["PARTICIPANT"] : a === "GUARDIANS" ? ["GUARDIAN"] : ["MENTOR", "PARTICIPANT", "GUARDIAN"];
/** Only active accounts hear from a broadcast: never suspended, paused, closed or awaiting a guardian. */
export const canReceiveBroadcast = (u: { status: string; roles: readonly Role[] }, a: Audience) => u.status === "ACTIVE" && u.roles.some((r) => audienceRoles(a).includes(r));
export const recipientLabel = (n: number, a: Audience) => `${n} ${AUDIENCE_NOUN[a][n === 1 ? 0 : 1]}`;
export function validateBroadcast(b: { subject: string; body: string; scheduledFor?: Date | null }, now: Date = new Date()): string[] {
  const e: string[] = [];
  if (b.subject.trim().length < 3 || b.subject.length > 120) e.push("Write a subject of 3 to 120 characters.");
  if (b.body.trim().length < 10 || b.body.length > 4000) e.push("Write a message of 10 to 4000 characters.");
  if (b.scheduledFor && b.scheduledFor.getTime() <= now.getTime()) e.push("Choose a time in the future, or send now.");
  return e;
}
/** Sending needs the sender to have seen the recipient count: the confirmed number must still match the live audience. */
export function canSendBroadcast(confirmedCount: number | undefined, liveCount: number): { ok: true } | { ok: false; error: string } {
  if (liveCount === 0) return { ok: false, error: "Nobody is in this audience." };
  if (confirmedCount === undefined) return { ok: false, error: "Confirm the number of recipients before sending." };
  if (confirmedCount !== liveCount) return { ok: false, error: `The audience changed: it now reaches ${liveCount}. Review and confirm again.` };
  return { ok: true };
}
export const previewText = (body: string, max = 110) => { const t = body.trim(); return t.length <= max ? t : `${t.slice(0, max).replace(/\s+\S*$/, "")}…`; };

/* ───────── Queue health (A20) ───────── */
export type HealthStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE";
export const HEALTH_LABEL: Record<HealthStatus, string> = { ON_TRACK: "On track", AT_RISK: "At risk", OVERDUE: "Overdue" };
export const AT_RISK_FROM = 0.6; // share of the window used
export function queueStatus(o: { count: number; oldestAt: Date | null; windowMs: number; now?: Date }): { status: HealthStatus; pct: number; oldestMs: number } {
  const now = o.now ?? new Date();
  if (!o.count || !o.oldestAt) return { status: "ON_TRACK", pct: 0, oldestMs: 0 };
  const oldestMs = Math.max(0, now.getTime() - o.oldestAt.getTime());
  const used = o.windowMs > 0 ? oldestMs / o.windowMs : 1;
  return { status: used >= 1 ? "OVERDUE" : used >= AT_RISK_FROM ? "AT_RISK" : "ON_TRACK", pct: Math.min(100, Math.round(used * 100)), oldestMs };
}
export function durationLabel(ms: number): string {
  const m = Math.max(0, Math.floor(ms / 60000)); const d = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60);
  if (d >= 1) return h && d < 3 ? `${d}d ${h}h` : `${d}d`; if (h >= 1) return `${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim(); return `${m}m`;
}
/** "In 1h 40m" before the window ends, "Overdue 1d" after. */
export function windowEndsLabel(due: Date, now: Date = new Date()): string {
  const diff = due.getTime() - now.getTime(); return diff >= 0 ? `In ${durationLabel(diff)}` : `Overdue ${durationLabel(-diff)}`;
}
export const BREACH_SOON_MS = 4 * 3600_000;
/** Items whose window ends within four hours or has already ended, overdue first, then soonest. */
export function breachingSoon<T extends { due: Date }>(items: T[], now: Date = new Date()): T[] {
  return items.filter((i) => i.due.getTime() - now.getTime() <= BREACH_SOON_MS).sort((a, b) => a.due.getTime() - b.due.getTime());
}
export const loadWidth = (n: number) => Math.min(100, n * 10);

/* ───────── Search (A21) ───────── */
export const SEARCH_SCOPES = ["all", "people", "asks", "mentors", "guardians", "incidents"] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];
export const SCOPE_LABEL: Record<SearchScope, string> = { all: "All", people: "People", asks: "Asks", mentors: "Mentors", guardians: "Guardians", incidents: "Incidents" };
export const normaliseQuery = (q: string | undefined) => (q ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
export const queryOk = (q: string) => q.length >= 2;
/** a•••@e•••.org */
export function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@"); const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain; const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}•••@${host.slice(0, 1)}•••${tld}`;
}
/** Full contact details: team roles may ask; a minor's own contact is for the safeguarding lead only. */
export function canRevealContact(actor: readonly Role[], target: { minor: boolean }): boolean {
  if (!actor.includes("ADMIN") && !actor.includes("SAFEGUARDING_LEAD")) return false;
  return target.minor ? actor.includes("SAFEGUARDING_LEAD") : true;
}
/** Incident text is the safeguarding lead's; others see that a record exists. */
export const canSeeIncidentDetail = (roles: readonly Role[]) => roles.includes("SAFEGUARDING_LEAD");
export const showScope = (scope: SearchScope, section: Exclude<SearchScope, "all">) => scope === "all" || scope === section;

/* ───────── Bulk actions (A22) ───────── */
export const BULK_ACTIONS = ["ASSIGN", "SET_EXPERTISE", "REMIND"] as const;
export type BulkAction = (typeof BULK_ACTIONS)[number] | "CLOSE";
export const BULK_MAX = 50;
export const BULK_LABEL: Record<(typeof BULK_ACTIONS)[number], string> = { ASSIGN: "Assign reviewer", SET_EXPERTISE: "Set expertise needed", REMIND: "Send reminder to participants" };
export interface BulkItem { state: string; reason: string | null; flags: string[]; minor: boolean; pausedForCrisis: boolean; hasIncident?: boolean }
/** Safeguarding items: flagged content, a concern, a crisis pause, or an open incident. They are handled one at a time. */
export const isSafeguardingItem = (i: BulkItem) => i.reason === "R_FLAG" || i.reason === "R_CONCERN" || i.pausedForCrisis || !!i.hasIncident || i.flags.some((f) => f !== "CONTACT_DETAILS");
export function bulkEligible(action: BulkAction, i: BulkItem): { ok: true } | { ok: false; why: string } {
  if (!["SUBMITTED", "IN_TEAM_REVIEW", "AWAITING_GUARDIAN"].includes(i.state)) return { ok: false, why: "Not in the review queue." };
  if (isSafeguardingItem(i)) return { ok: false, why: "Safeguarding items are handled one at a time." };
  if (action === "CLOSE") return { ok: false, why: "Closing is never done in bulk." };
  if (action === "REMIND" && (i.minor || i.state === "AWAITING_GUARDIAN")) return { ok: false, why: "Nothing that reaches a minor is sent in bulk." };
  if (action !== "REMIND" && i.state === "AWAITING_GUARDIAN") return { ok: false, why: "Waiting for a guardian." };
  return { ok: true };
}
export function planBulk<T extends BulkItem & { id: string }>(action: BulkAction, items: T[]) {
  const eligible: T[] = []; const skipped: { id: string; why: string }[] = [];
  for (const i of items) { const r = bulkEligible(action, i); if (r.ok) eligible.push(i); else skipped.push({ id: i.id, why: r.why }); }
  return { eligible, skipped };
}

/* ───────── Reviewer playbook (A24) ───────── */
export const REVIEW_STEPS = [["A", "Read"], ["B", "Screen the content"], ["C", "Check what the village knows"], ["D", "Set expertise needed"], ["E", "Compose the summary"], ["F", "Release to shortlist"]] as const;
export interface PlaybookStep { title: string; todo: string; refer?: { head: string; text: string }; example?: string; escalate: string }
const ESC = "You see safeguarding, crisis or legal material. Freeze the Ask and tell a senior reviewer (24 hours).";
export const PLAYBOOK: Record<string, PlaybookStep> = {
  A: { title: "Read", todo: "Read the whole Ask once, then again for what the person is really asking. Note the age band and any reason code before you do anything else.", example: "\"This is about the road to medicine, not a diagnosis. Mentors can speak to it.\"", escalate: ESC },
  B: { title: "Screen the content", todo: "Check for names, schools, employers, contact details and anything about harm. Add what must stay out of the mentor summary to the withheld list.", refer: { head: "Refer, do not route", text: "If this needs a licensed professional, close it as Redirected with a kind note." }, escalate: ESC },
  C: { title: "Check what the village already knows", todo: "Search the library for the topic and cohort. Suggest up to three resources if any answer the question.", refer: { head: "Refer, do not route", text: "If this needs a licensed professional, close it as Redirected with a kind note." }, example: "\"Your question is about experience, which our mentors can share. I have added a checklist you may find useful first.\"", escalate: ESC },
  D: { title: "Set expertise needed", todo: "Choose the areas of expertise a mentor needs, one to three. Pick the narrowest that fits. For a minor, only mentors cleared for minors can be shortlisted.", example: "\"Healthcare and Education, because the question is about premed paths.\"", escalate: ESC },
  E: { title: "Compose the summary", todo: "Write the question and what would help in the person's own terms. A human reads and approves every summary. Leave out anything on the withheld list.", example: "\"A junior wants to understand the road to medicine and what to do now.\"", escalate: ESC },
  F: { title: "Release to shortlist", todo: "Read the shortlist as a suggestion, never an assignment. Release one Ask at a time. Nobody is released to who is not eligible.", refer: { head: "No one fits?", text: "Widen the search, ask a mentor personally, suggest a resource, or log it and wait." }, escalate: ESC },
};
export const stepIndex = (letter: string) => REVIEW_STEPS.findIndex(([l]) => l === letter);
/** The step to show: the first one not done, or the one asked for. */
export function currentStep(done: readonly string[], asked?: string): string {
  if (asked && stepIndex(asked) >= 0) return asked;
  return REVIEW_STEPS.find(([l]) => !done.includes(l))?.[0] ?? "F";
}
