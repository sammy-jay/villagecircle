/** Pure rules for Step 5 admin group 1: incidents, suspension, accounts, roles, audit, data requests, help. No database here. */
import type { AccountStatus, IncidentCategory, IncidentSeverity, IncidentState, Role } from "@prisma/client";
import { scrubOthers } from "./safety-user";

const has = (roles: readonly Role[], r: Role) => roles.includes(r);
export const isSafeguardingLead = (roles: readonly Role[]) => has(roles, "SAFEGUARDING_LEAD");
export const isAdmin = (roles: readonly Role[]) => has(roles, "ADMIN");

/** Only ADMIN may change roles (even a safeguarding lead who is not also an admin may not). */
export const canChangeRoles = (roles: readonly Role[]) => isAdmin(roles);
/** Incident triage, closure and the incident record itself belong to the safeguarding lead. */
export const canActOnIncident = (roles: readonly Role[]) => isSafeguardingLead(roles);
export const canCloseIncident = canActOnIncident;
/** Suspending a mentor and deleting data are safeguarding-lead-only. Other accounts: admin or safeguarding lead. */
export function canSuspend(actor: readonly Role[], target: readonly Role[]): boolean {
  if (target.includes("MENTOR")) return isSafeguardingLead(actor);
  return isAdmin(actor) || isSafeguardingLead(actor);
}
export const canDeleteData = (roles: readonly Role[]) => isSafeguardingLead(roles);

/* ───────── Incidents ───────── */
export const INCIDENT_STATES: IncidentState[] = ["REPORTED", "TRIAGED", "INVESTIGATING", "ACTIONED", "CLOSED"];
export const INCIDENT_STATE_LABEL: Record<IncidentState, string> = { REPORTED: "Reported", TRIAGED: "Triaged", INVESTIGATING: "Investigating", ACTIONED: "Actioned", CLOSED: "Closed" };
export const nextIncidentState = (s: IncidentState): IncidentState | null => INCIDENT_STATES[INCIDENT_STATES.indexOf(s) + 1] ?? null;
export const CATEGORY_LABEL: Record<IncidentCategory, string> = { SAFEGUARDING: "safeguarding", CONDUCT: "conduct", CONTACT_DETAILS: "contact outside the platform", NO_SHOW: "no show", TECHNICAL: "technical", OTHER: "other" };
export const SEVERITY_LABEL: Record<IncidentSeverity, string> = { LOW: "Low", MEDIUM: "Moderate", HIGH: "High", CRITICAL: "Critical" };
export const INCIDENT_OUTCOMES = [
  "Mentor warned and re-briefed on the Code of Conduct", "No further action needed", "Mentor suspended pending review", "Connection ended and both people supported", "Referred to the safeguarding lead's external partner",
] as const;
export const RESOLUTION_NOTE_MIN = 10;

export type MoveCheck = { ok: true } | { ok: false; error: string };
/** One step forward at a time, safeguarding lead only, and a resolution note before closing. */
export function canMoveIncident(from: IncidentState, to: IncidentState, roles: readonly Role[], note?: string): MoveCheck {
  if (!canActOnIncident(roles)) return { ok: false, error: "Only the safeguarding lead can change an incident." };
  if (nextIncidentState(from) !== to) return { ok: false, error: from === "CLOSED" ? "This incident is closed." : `An incident moves from ${INCIDENT_STATE_LABEL[from]} to ${INCIDENT_STATE_LABEL[nextIncidentState(from) ?? from]} next.` };
  if (to === "CLOSED") { if (!canCloseIncident(roles)) return { ok: false, error: "Only the safeguarding lead can close an incident." }; if ((note ?? "").trim().length < RESOLUTION_NOTE_MIN) return { ok: false, error: `Add a resolution note of at least ${RESOLUTION_NOTE_MIN} characters.` }; }
  return { ok: true };
}
/** Window: 24h for flagged (high or critical) incidents, 48h for a concern. */
export const incidentWindowHours = (sev: IncidentSeverity) => (sev === "HIGH" || sev === "CRITICAL" ? 24 : 48);
export function incidentCountdown(dueAt: Date | null, total: number, closed: boolean, now: Date = new Date()): { label: string; overdue: boolean } | null {
  if (closed || !dueAt) return null;
  const ms = dueAt.getTime() - now.getTime();
  if (ms <= 0) return { label: `Overdue by ${Math.max(1, Math.ceil(-ms / 3600_000))} hours`, overdue: true };
  return { label: `${Math.ceil(ms / 3600_000)} hours left of ${total}`, overdue: false };
}
/** Everyone except the safeguarding lead only learns that an incident exists. */
export function incidentView<T extends { description: string; resolution: string | null }>(i: T, roles: readonly Role[]): T | (Omit<T, "description" | "resolution"> & { description: null; resolution: null }) {
  return canActOnIncident(roles) ? i : { ...i, description: null, resolution: null };
}

/* ───────── Suspension ───────── */
export const SUSPEND_REASONS = [
  { code: "V-DISCLOSE", label: "Change in circumstances disclosed", hold: "DISCLOSURE" },
  { code: "V-CONDUCT", label: "Conduct concern under review", hold: "REMOVAL" },
  { code: "V-INCIDENT", label: "Open incident", hold: "REMOVAL" },
  { code: "V-LAPSED", label: "Safeguarding re-affirmation overdue", hold: "LAPSED" },
] as const;
export const suspendReason = (code: string) => SUSPEND_REASONS.find((r) => r.code === code) ?? null;
/** The four effects of suspending a mentor are not optional (A23). */
export const SUSPEND_EFFECTS = ["Return his open Asks to the team", "Notify guardians of any booked conversation", "Tell Kwame, in plain words, what happens next", "Alert the safeguarding lead (24 hours)"] as const;
export const SAFEGUARD_ALERT_HOURS = 24;
export const suspensionEffectsFor = (first: string) => SUSPEND_EFFECTS.map((e) => e.replace("his", "their").replace("Kwame", first));
export const MENTOR_SUSPEND_BODY = "They will stop receiving Asks straight away. The record is preserved and nothing is deleted.";
/** Plain words for the mentor. No reason, no names of the people they were matched with. */
export const mentorSuspensionMessage = "Your mentoring is paused while the team looks at something. Your record is kept and nothing has been deleted. A member of the team will contact you within two business days.";
export const guardianSuspensionMessage = "A conversation booked with this mentor has been cancelled and will be offered to another mentor. Nothing is needed from you.";

/* ───────── Accounts ───────── */
const ROLE_LABEL: Record<Role, string> = { PARTICIPANT: "Participant", MENTOR: "Mentor", GUARDIAN: "Guardian", ADMIN: "Admin", SAFEGUARDING_LEAD: "Safeguarding lead" };
export const rolesLabel = (roles: readonly Role[]) => [...roles].sort().map((r, i) => (i === 0 ? ROLE_LABEL[r] : ROLE_LABEL[r].toLowerCase())).join(", ") || "None";
export const STATUS_VIEW: Record<AccountStatus, { label: string; tone: "good" | "warn" | "bad" | "neutral" }> = {
  ACTIVE: { label: "Active", tone: "good" }, PENDING_GUARDIAN: { label: "Pending guardian", tone: "warn" }, SUSPENDED: { label: "Suspended", tone: "bad" }, PAUSED: { label: "Paused", tone: "neutral" }, CLOSED: { label: "Closed", tone: "neutral" },
};
export function twoStepLabel(u: { roles: readonly Role[]; mfaEnabled: boolean; minor: boolean }): string {
  if (isAdmin(u.roles) || isSafeguardingLead(u.roles)) return u.mfaEnabled ? "Required, on" : "Required, not set up";
  return u.minor ? "—" : "No";
}
/** Restore is for suspended or paused accounts; Suspend for live ones. */
export const canRestoreStatus = (s: AccountStatus) => s === "SUSPENDED" || s === "PAUSED";
export const canSuspendStatus = (s: AccountStatus) => s === "ACTIVE" || s === "PENDING_GUARDIAN";
export const deleteNameMatches = (typed: string, name: string) => typed.trim().toLowerCase() === name.trim().toLowerCase() && name.trim().length > 0;
export const ACCOUNT_DELETE_HOLD_DAYS = 30;

/* ───────── Roles ───────── */
export const TEAM_ROLES = ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD", "READ_ONLY"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];
export const TEAM_ROLE_LABEL: Record<TeamRole, string> = { PROGRAM_LEAD: "Program lead", REVIEWER: "Reviewer", VOLUNTEER_REVIEWER: "Volunteer reviewer", SAFEGUARDING_LEAD: "Safeguarding lead", READ_ONLY: "Read-only" };
/** Rows of the A19 matrix. Recordings are never given to any role but the safeguarding lead (NFR-05). */
export const PERMISSIONS: { label: string; roles: TeamRole[] }[] = [
  { label: "See Ask details", roles: ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD"] },
  { label: "Compose and release mentor summary", roles: ["PROGRAM_LEAD", "REVIEWER"] },
  { label: "Confirm a mentor", roles: ["PROGRAM_LEAD", "REVIEWER"] },
  { label: "Approve mentor applications", roles: ["PROGRAM_LEAD", "REVIEWER"] },
  { label: "See recordings", roles: ["SAFEGUARDING_LEAD"] },
  { label: "Suspend an account or connection", roles: ["PROGRAM_LEAD", "SAFEGUARDING_LEAD"] },
  { label: "Edit configuration and templates", roles: ["PROGRAM_LEAD"] },
  { label: "Export reports (CSV)", roles: ["PROGRAM_LEAD", "READ_ONLY"] },
  { label: "Manage team roles", roles: ["PROGRAM_LEAD"] },
];
export const teamRoleAllows = (r: TeamRole, perm: string) => PERMISSIONS.find((p) => p.label === perm)?.roles.includes(r) ?? false;
export const isTeamRole = (s: string): s is TeamRole => (TEAM_ROLES as readonly string[]).includes(s);
/** Console access roles for a team role. The safeguarding-lead permission is granted separately and only by an admin. */
export const rolesForTeamRole = (t: TeamRole): Role[] => (t === "SAFEGUARDING_LEAD" ? ["ADMIN", "SAFEGUARDING_LEAD"] : ["ADMIN"]);
export const defaultTeamRole = (roles: readonly Role[]): TeamRole => (isSafeguardingLead(roles) ? "SAFEGUARDING_LEAD" : "PROGRAM_LEAD");
/** Never leave the console without an admin, and never let people change their own role. */
export function checkRoleChange(o: { actorId: string; targetId: string; adminCount: number; targetIsAdmin: boolean; newRole: TeamRole }): MoveCheck {
  if (o.actorId === o.targetId) return { ok: false, error: "You cannot change your own role." };
  void o.newRole; // every team role keeps ADMIN console access, so the admin count only matters for removal
  if (o.targetIsAdmin && o.adminCount < 1) return { ok: false, error: "There must always be at least one admin." };
  return { ok: true };
}

/* ───────── Audit log ───────── */
const FIXED: Record<string, string> = { "template.save": "Edited template", "template.reset": "Reset template", "application.approve": "Approved mentor application", "application.decline": "Declined application", "ask.override": "Overrode shortlist", "mentor.suspend": "Suspended mentor eligibility", "mentor.reinstate": "Reinstated mentor eligibility" };
export function actionLabel(action: string): string {
  if (FIXED[action]) return FIXED[action]!;
  const w = action.split(/[._]/).filter(Boolean); if (!w.length) return action;
  const [head, ...rest] = w;
  return [head![0]!.toUpperCase() + head!.slice(1), ...rest.map((x) => x.toLowerCase())].join(" ");
}
const short = (v: unknown): string => (v == null ? "none" : typeof v === "object" ? JSON.stringify(v) : String(v));
/** One line: "state: A → B". Contact keys (email, phone and so on) are dropped. */
export function diffSummary(before: unknown, after: unknown, max = 160): string {
  const b = (scrubOthers(before) ?? {}) as Record<string, unknown>; const a = (scrubOthers(after) ?? {}) as Record<string, unknown>;
  if (typeof b !== "object" || typeof a !== "object") return "";
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const parts = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])).map((k) => (k in b && k in a ? `${k}: ${short(b[k])} → ${short(a[k])}` : k in a ? `${k}: ${short(a[k])}` : `${k}: ${short(b[k])} removed`));
  const s = parts.join("; ");
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
export const AUDIT_PAGE = 50;
export function auditWhere(f: { actor?: string; object?: string; from?: string; to?: string }) {
  const w: Record<string, unknown> = {};
  if (f.actor === "SYSTEM") w.actorId = null; else if (f.actor && /^[a-f0-9]{24}$/i.test(f.actor)) w.actorId = f.actor;
  if (f.object?.trim()) w.object = { contains: f.object.trim(), mode: "insensitive" };
  const range: Record<string, Date> = {};
  const from = f.from ? new Date(`${f.from}T00:00:00.000Z`) : null; const to = f.to ? new Date(`${f.to}T23:59:59.999Z`) : null;
  if (from && !isNaN(+from)) range.gte = from; if (to && !isNaN(+to)) range.lte = to;
  if (Object.keys(range).length) w.createdAt = range;
  return w;
}
/** Actors who are not on the team show as their role only, never by name. */
export function actorLabel(a: { name: string; roles: readonly Role[] } | null): string {
  if (!a) return "System";
  if (isAdmin(a.roles) || isSafeguardingLead(a.roles)) { const p = a.name.trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1]![0]!.toUpperCase()}.` : p[0] ?? ""; }
  return a.roles.includes("GUARDIAN") ? "Guardian" : a.roles.includes("MENTOR") ? "Mentor" : "Participant";
}
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDayMon = (d: Date) => `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
export const fmtStamp = (d: Date) => { const h = d.getUTCHours(); return `${fmtDayMon(d)} ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
export function auditCsv(rows: { actor: string; action: string; object: string; change: string; when: Date }[]): string {
  const cell = (v: string) => { const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return ["Actor,Action,Object,Before and after,When (UTC)", ...rows.map((r) => [r.actor, r.action, r.object, r.change, r.when.toISOString()].map(cell).join(","))].join("\n");
}

/* ───────── Data requests ───────── */
export const addMonth = (d: Date) => { const x = new Date(d.getTime()); x.setUTCMonth(x.getUTCMonth() + 1); return x; };
export const KEPT_AFTER_DELETION: [string, string][] = [["Consent and attestation records", "Statutory period [TBC with counsel]"], ["Closed Asks", "Deleted after 24 months"], ["Incident records", "Kept, restricted access"], ["Thanks", "Anonymised"]];
export type DataStatusTone = "good" | "warn" | "bad" | "neutral";
/** The status a request shows, from facts only. */
export function dataRequestStatus(r: { kind: "EXPORT" | "DELETE"; minor: boolean; exportExpired?: boolean; cancelled?: boolean; completed?: boolean; teamState?: string | null }): { label: string; tone: DataStatusTone; needsAction: boolean; done: boolean } {
  if (r.kind === "EXPORT") {
    if (r.teamState === "DONE" || r.exportExpired) return { label: "Complete", tone: "good", needsAction: false, done: true };
    return { label: r.minor ? "Ready · guardian told" : "Ready", tone: "good", needsAction: false, done: false };
  }
  if (r.completed || r.teamState === "DONE") return { label: "Complete", tone: "good", needsAction: false, done: true };
  if (r.cancelled) return { label: "Cancelled", tone: "neutral", needsAction: false, done: true };
  if (r.teamState === "HELD") return { label: "On hold", tone: "warn", needsAction: false, done: false };
  if (r.minor && r.teamState !== "CONFIRMED") return { label: "Needs guardian confirmation", tone: "bad", needsAction: true, done: false };
  return { label: "30-day wait", tone: "warn", needsAction: false, done: false };
}
/** Deleting now (before the 30 days) is safeguarding-lead-only, needs guardian confirmation for under-18s, and never while an incident is open. */
export function canDeleteNow(o: { roles: readonly Role[]; minor: boolean; guardianConfirmed: boolean; openIncidents: number; onHold: boolean }): MoveCheck {
  if (!canDeleteData(o.roles)) return { ok: false, error: "Only the safeguarding lead can delete personal data." };
  if (o.openIncidents > 0) return { ok: false, error: "This person is part of an open incident. Personal data is kept until it is closed (legal hold)." };
  if (o.onHold) return { ok: false, error: "This request is on hold." };
  if (o.minor && !o.guardianConfirmed) return { ok: false, error: "A guardian must confirm a deletion for someone under 18." };
  return { ok: true };
}
export function dataPersonLabel(u: { name: string; minor: boolean; age: number | null; anonymised: boolean }): string {
  if (u.anonymised) return "Former member";
  if (u.minor) return `${u.name}${u.age != null ? ` (${u.age})` : ""}`;
  const p = u.name.trim().split(/\s+/); return p.length > 1 ? `${p[0]![0]!.toUpperCase()}. ${p[p.length - 1]}` : p[0] ?? "";
}

/* ───────── Help requests ───────── */
export const HELP_STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" }> = { NEW: { label: "New", tone: "bad" }, WAITING: { label: "Waiting", tone: "warn" }, REPLIED: { label: "Replied", tone: "good" } };
export function ago(d: Date, now: Date = new Date()): string {
  const h = Math.floor((now.getTime() - d.getTime()) / 3600_000);
  if (h < 1) return "Just now"; if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24); return days === 1 ? "Yesterday" : `${days} days ago`;
}
export function helpFromLabel(r: { fromName: string | null; fromRole: string; minor: boolean }, age?: number | null): string {
  const role = r.fromRole.toLowerCase();
  if (r.minor) return `${r.fromRole[0]!.toUpperCase()}${role.slice(1)}${age ? `, ${age}` : ""}`; // a young person is never named in the queue
  if (r.fromName) return r.fromRole.toLowerCase() === "visitor" ? r.fromName : `${r.fromName} (${role})`;
  return r.fromRole[0]!.toUpperCase() + role.slice(1);
}
const SAFE_WORDS = /\b(unsafe|abuse|abused|hurt me|hurting|harm|self.?harm|suicid|grooming|inappropriate|touched|threat|afraid of|scared of)\b/i;
export const looksLikeSafeguarding = (text: string) => SAFE_WORDS.test(text);
export const REPLY_MIN = 5;
