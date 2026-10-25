/** Scheduling rules for conversations (BRD §6, D14, EX1–EX4). Pure, so they can be tested without a database. */
export const OPENS_BEFORE_MIN = 10; // the link opens ten minutes early
export const MISSED_AFTER_MIN = 15; // someone waited fifteen minutes
export const MAX_OFFERS = 3;
export const MIN_LEAD_MIN = 60; // offered times must be at least an hour away
export const FREE_RESCHEDULES = 1; // "You can move a conversation once. After that the team steps in (R-MISS)."
export const STUCK_RESCHEDULE_MIN = 10; // EX4: if it cannot be fixed in 10 minutes we reschedule at no cost

export function validateOffers(times: Date[], now = new Date()): { ok: true; times: Date[] } | { ok: false; error: string } {
  const valid = times.filter((t) => !Number.isNaN(t.getTime()));
  if (valid.length === 0) return { ok: false, error: "Offer at least one time." };
  if (valid.length > MAX_OFFERS) return { ok: false, error: "Offer up to three times." };
  if (valid.some((t) => t.getTime() < now.getTime() + MIN_LEAD_MIN * 60_000)) return { ok: false, error: "Offered times must be at least an hour from now." };
  const uniq = [...new Map(valid.map((t) => [t.getTime(), t])).values()].sort((a, b) => a.getTime() - b.getTime());
  if (uniq.length !== valid.length) return { ok: false, error: "Each time must be different." };
  return { ok: true, times: uniq };
}
export const sameInstant = (a: Date, b: Date) => a.getTime() === b.getTime();
export const isOffered = (offered: Date[], t: Date) => offered.some((o) => sameInstant(o, t));

export const joinOpensAt = (start: Date) => new Date(start.getTime() - OPENS_BEFORE_MIN * 60_000);
export const callEndsAt = (start: Date, minutes: number) => new Date(start.getTime() + minutes * 60_000);
export type JoinState = "TOO_EARLY" | "OPEN" | "ENDED";
export function joinState(start: Date, minutes: number, now = new Date()): JoinState {
  if (now < joinOpensAt(start)) return "TOO_EARLY";
  return now > new Date(callEndsAt(start, minutes).getTime() + 30 * 60_000) ? "ENDED" : "OPEN";
}
export const minutesUntilOpen = (start: Date, now = new Date()) => Math.max(0, Math.ceil((joinOpensAt(start).getTime() - now.getTime()) / 60_000));

export type Attendance = "UNKNOWN" | "BOTH" | "PARTICIPANT_ABSENT" | "MENTOR_ABSENT" | "NEITHER";
/** Not blame, only a record: who was not in the room fifteen minutes after the start. */
export function attendanceAfterWait(start: Date, j: { mentor: Date | null; participant: Date | null }, now = new Date()): Attendance {
  if (now.getTime() < start.getTime() + MISSED_AFTER_MIN * 60_000) return j.mentor && j.participant ? "BOTH" : "UNKNOWN";
  if (j.mentor && j.participant) return "BOTH";
  if (!j.mentor && !j.participant) return "NEITHER";
  return j.mentor ? "PARTICIPANT_ABSENT" : "MENTOR_ABSENT";
}
export const canReschedule = (count: number) => count < FREE_RESCHEDULES; // beyond this, a team member steps in

export const APP_TZ = () => process.env.APP_TIMEZONE || "America/Chicago";
const tzName = (d: Date, tz: string) => new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value ?? tz;
export const fmtDay = (d: Date, tz = APP_TZ()) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(d);
export const fmtDayShort = (d: Date, tz = APP_TZ()) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(d);
export const fmtTime = (d: Date, tz = APP_TZ()) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d).replace(" AM", " am").replace(" PM", " pm");
export const fmtWhen = (d: Date, tz = APP_TZ()) => `${fmtDay(d, tz)}, ${fmtTime(d, tz)}`;
export const fmtRange = (d: Date, minutes: number, tz = APP_TZ()) => `${fmtTime(d, tz)} to ${fmtTime(callEndsAt(d, minutes), tz)}`;
export const tzLabel = (d = new Date(), tz = APP_TZ()) => tzName(d, tz).replace(" Standard Time", " time").replace(" Daylight Time", " time");
export const fmtDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
