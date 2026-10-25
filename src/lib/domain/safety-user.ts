import type { AccountStatus, AgeBand, IncidentCategory, IncidentSeverity } from "@prisma/client";
import { ageOn, eighteenthBirthday, ADULT_AGE } from "./age";

export const CONCERN_KINDS = ["contact", "outside", "unsafe", "other"] as const;
export type ConcernKind = (typeof CONCERN_KINDS)[number];
export const CONCERN_LABELS: Record<ConcernKind, string> = {
  contact: "Someone asked for or gave contact details",
  outside: "Someone tried to arrange something outside the platform",
  unsafe: "I felt uncomfortable or unsafe",
  other: "Something else",
};

/** A concern always opens an Incident. Safeguarding is HIGH with a 24 hour window; everything else is answered within 48 hours. */
export function concernPlan(kind: ConcernKind, now: Date = new Date()): { category: IncidentCategory; severity: IncidentSeverity; hours: number; dueAt: Date } {
  const category: IncidentCategory = kind === "unsafe" ? "SAFEGUARDING" : kind === "contact" ? "CONTACT_DETAILS" : kind === "outside" ? "CONDUCT" : "OTHER";
  const safeguarding = category === "SAFEGUARDING";
  const hours = safeguarding ? 24 : 48;
  return { category, severity: safeguarding ? "HIGH" : "MEDIUM", hours, dueAt: new Date(now.getTime() + hours * 3600_000) };
}

/** What the person who was reported may ever be shown about a report: nothing. */
export function reportedPartyView(): null { return null; }

/** Withdrawing consent: the young person's account is suspended (no sign-in) and open Asks are held until the team follows up. */
export function withdrawalEffect(): { status: AccountStatus; holdOpenAsks: true; cancelBooked: true } { return { status: "SUSPENDED", holdOpenAsks: true, cancelBooked: true }; }
/** A guardian pause: the young person can still sign in, to a calm paused page. */
export function pauseEffect(): { status: AccountStatus; holdOpenAsks: true; cancelBooked: true } { return { status: "PAUSED", holdOpenAsks: true, cancelBooked: true }; }

/** Turning 18. Nothing changes for the guardian until the participant confirms, and only on or after the birthday. */
export function turning18Plan(dob: Date, confirmed: boolean, now: Date = new Date()): { birthday: Date; daysLeft: number; adultNow: boolean; apply: boolean; band: AgeBand | null; guardianAccessEnds: boolean } {
  const birthday = eighteenthBirthday(dob);
  const adultNow = ageOn(dob, now) >= ADULT_AGE;
  const apply = adultNow && confirmed;
  return { birthday, daysLeft: Math.max(0, Math.ceil((birthday.getTime() - now.getTime()) / 86400_000)), adultNow, apply, band: apply ? "ADULT" : null, guardianAccessEnds: apply };
}
/** The turning-18 notice appears from 60 days before the birthday until it is confirmed. */
export const turning18Visible = (dob: Date, confirmed: boolean, now: Date = new Date()) => !confirmed && ageOn(dob, now) >= 16 && eighteenthBirthday(dob).getTime() - now.getTime() <= 60 * 86400_000;

/** Account deletion: personal fields are anonymised; the audit log and safeguarding records are never touched (legal hold). */
export const KEEP_ON_DELETE = ["AuditEvent", "Incident", "ConsentRecord", "Attestation", "MentorReaffirmation", "AskStateChange"] as const;
export function anonymisedUser(id: string): { name: string; email: string; passwordHash: null; image: null; dateOfBirth: null; countryOfOrigin: null; countryOfResidence: null; phone: null; languages: string[]; mfaSecret: null; mfaEnabled: false; mfaRecoveryCodes: string[]; status: AccountStatus } {
  return { name: "Former member", email: `deleted-${id}@deleted.invalid`, passwordHash: null, image: null, dateOfBirth: null, countryOfOrigin: null, countryOfResidence: null, phone: null, languages: [], mfaSecret: null, mfaEnabled: false, mfaRecoveryCodes: [], status: "CLOSED" };
}
export const DELETE_GRACE_DAYS = 30;
/** Deleting needs the account email typed again (case-insensitive, trimmed). */
export const deleteConfirmed = (typed: string, email: string) => typed.trim().toLowerCase() === email.trim().toLowerCase() && email.length > 0;

/** Data export: only the requesting user's own records. Other people appear only by first name, never with contact details. */
const FORBIDDEN_KEYS = ["email", "phone", "mobile", "passwordHash", "guardianEmail", "guardianMobile", "mfaSecret", "mfaRecoveryCodes", "tokenHash", "codeHash"];
export function scrubOthers<T>(value: T, allowKeys: string[] = []): T {
  if (Array.isArray(value)) return value.map((v) => scrubOthers(v, allowKeys)) as unknown as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) { if (FORBIDDEN_KEYS.includes(k) && !allowKeys.includes(k)) continue; out[k] = scrubOthers(v, allowKeys); }
    return out as T;
  }
  return value;
}
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => { const s = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"` : s; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

/** Mentor annual re-affirmation. Lapsing pauses the mentor; open conversations are kept. */
export const REAFFIRM_MONTHS = 12;
export const reaffirmDue = (lastSigned: Date) => new Date(Date.UTC(lastSigned.getUTCFullYear() + 1, lastSigned.getUTCMonth(), lastSigned.getUTCDate()));
export const reaffirmLapsed = (nextDueAt: Date, now: Date = new Date()) => now.getTime() >= nextDueAt.getTime();

/** Session timeout (EX16): warn at 28 minutes, sign out at 30. */
export const IDLE_LIMIT_MS = 30 * 60_000;
export const IDLE_WARN_MS = 28 * 60_000;
export const fmtCountdown = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** Ongoing mentorship decisions (G6). Never a default. */
export type OngoingDecision = "THREE_MONTHS" | "ONE_MORE" | "NOT_NOW";
export const ONGOING_DECISIONS: OngoingDecision[] = ["THREE_MONTHS", "ONE_MORE", "NOT_NOW"];
export const ongoingEndsOn = (d: OngoingDecision, now: Date = new Date()) => d === "THREE_MONTHS" ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, now.getUTCDate())) : null;
