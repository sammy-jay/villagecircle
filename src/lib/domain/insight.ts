/** Step 4 insight rules: mentor hours (BR-13), availability windows, check-in due dates, impact aggregation. Pure, no database. */

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
export const monthStartUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const nextMonthStartUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
export const yearStartUtc = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
export const monthName = (d: Date) => MONTHS[d.getUTCMonth()]!;

/** BR-13: the monthly reset runs once per calendar month, however often the cron fires. */
export const shouldResetMonth = (lastResetKey: string | null | undefined, now: Date) => lastResetKey !== monthKey(now);
/** The monthly job sends the review on the first business day (UTC): the 1st, or the 2nd/3rd if it is a Monday. */
export function isFirstBusinessDay(now: Date) {
  const day = now.getUTCDate(); const wd = now.getUTCDay();
  if (wd === 0 || wd === 6) return false;
  return day === 1 || (day <= 3 && wd === 1);
}

export interface Hours { given: number; monthly: number }
export const hoursAtCap = (h: Hours) => h.monthly > 0 && h.given >= h.monthly;
export const hoursPercent = (h: Hours) => (h.monthly > 0 ? Math.min(100, Math.round((h.given / h.monthly) * 100)) : 0);
/** One decimal, no trailing zero: 1.5, 4. */
export const fmtHours = (x: number) => String(Math.round(x * 10) / 10);
/** A conversation counts toward hours only once it was held. */
export const countsTowardHours = (c: { hoursCounted: boolean; status: string }) => c.hoursCounted && c.status === "HELD";

// ───────── Availability (stored in MentorProfile.availability) ─────────
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const SLOTS = [{ hour: 8, label: "8 am" }, { hour: 12, label: "12 pm" }, { hour: 18, label: "6 pm" }, { hour: 20, label: "8 pm" }] as const;
export interface Availability { paused: boolean; grid: string[]; raised: { month: string; from: number } | null }
export const cell = (day: string, hour: number) => `${day}-${hour}`;
export function parseAvailability(j: unknown): Availability {
  const o = (j && typeof j === "object" ? j : {}) as Record<string, unknown>;
  const ok = new Set(DAYS.flatMap((d) => SLOTS.map((s) => cell(d, s.hour))));
  const grid = Array.isArray(o.grid) ? [...new Set(o.grid.filter((x): x is string => typeof x === "string" && ok.has(x)))] : [];
  const r = o.raised as { month?: unknown; from?: unknown } | undefined;
  return { paused: o.paused === true, grid, raised: r && typeof r.month === "string" && typeof r.from === "number" ? { month: r.month, from: r.from } : null };
}
/** D7 chips map onto the D23 grid. */
export const WINDOW_CHIPS = [
  { label: "Weekday evenings", cells: (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).flatMap((d) => [cell(d, 18), cell(d, 20)]) },
  { label: "Weekday mornings", cells: (["Mon", "Tue", "Wed", "Thu", "Fri"] as const).flatMap((d) => [cell(d, 8), cell(d, 12)]) },
  { label: "Saturday", cells: SLOTS.map((s) => cell("Sat", s.hour)) },
  { label: "Sunday", cells: SLOTS.map((s) => cell("Sun", s.hour)) },
];
export const chipOn = (grid: string[], cells: string[]) => cells.every((c) => grid.includes(c));
export const toggleChip = (grid: string[], cells: string[]) => (chipOn(grid, cells) ? grid.filter((c) => !cells.includes(c)) : [...new Set([...grid, ...cells])]);

/** BR-13 / pause: no new Asks are released to a mentor who is paused or at their monthly hours. */
export const acceptingAsks = (a: { paused: boolean }, h: Hours) => !a.paused && !hoursAtCap(h);

/** "Add one hour this month" works once a month; the base value returns at the next reset. */
export function canRaiseHours(a: Availability, now: Date) { return a.raised?.month !== monthKey(now); }
export function raiseHours(a: Availability, monthly: number, now: Date): { monthly: number; availability: Availability } | null {
  if (!canRaiseHours(a, now)) return null;
  return { monthly: monthly + 1, availability: { ...a, raised: { month: monthKey(now), from: monthly } } };
}
/** At the monthly reset, a raise made in an earlier month is undone. */
export function monthlyHoursAfterReset(monthly: number, a: Availability, now: Date): { monthly: number; availability: Availability } {
  if (a.raised && a.raised.month !== monthKey(now)) return { monthly: a.raised.from, availability: { ...a, raised: null } };
  return { monthly, availability: a };
}

/** The next times that fall inside the windows, in the platform time zone. Used for the "How participants see it" preview. */
export function nextWindowTimes(grid: string[], now: Date, tz: string, n = 2): Date[] {
  const out: Date[] = [];
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23", minute: "numeric" });
  const start = new Date(Math.ceil((now.getTime() + 60 * 60_000) / 60_000) * 60_000);
  for (let i = 0; i < 14 * 24 * 4 && out.length < n; i++) {
    const t = new Date(start.getTime() + i * 15 * 60_000);
    const p = Object.fromEntries(fmt.formatToParts(t).map((x) => [x.type, x.value]));
    if (p.minute !== "0" && p.minute !== "00") continue;
    if (grid.includes(`${p.weekday}-${Number(p.hour)}`)) out.push(t);
  }
  return out;
}

// ───────── Check-ins ─────────
export const CHECKIN_DAYS = 30;
export const checkInDueAt = (endedAt: Date) => new Date(endedAt.getTime() + CHECKIN_DAYS * 86400_000);
/** A check-in is created once, 30 days after a held conversation, and only if the participant did not report a problem. */
export function checkInDue(c: { endedAt: Date | null; status: string; participantOutcome: string | null; hasCheckIn: boolean }, now: Date) {
  if (c.hasCheckIn || !c.endedAt || c.status !== "HELD" || c.participantOutcome === "PROBLEM") return false;
  return checkInDueAt(c.endedAt).getTime() <= now.getTime();
}
export const CHECKIN_ANSWERS = ["TOOK_STEP", "THINKING", "NOT_REALLY"] as const;
export type CheckInAnswer = (typeof CHECKIN_ANSWERS)[number];

// ───────── Goals ─────────
export const PROGRESS_LABEL: Record<string, string> = { NOT_STARTED: "Not started", IN_PROGRESS: "Started", ACHIEVED: "Achieved", PARKED: "Parked" };
export const PROGRESS_PCT: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 15, ACHIEVED: 100, PARKED: 0 };
export const movedForward = (p: string) => p === "IN_PROGRESS" || p === "ACHIEVED";

// ───────── Impact: counts only, never names ─────────
export interface ImpactConn { durationMinutes: number; hoursCounted: boolean; status: string; endedAt: Date | null; helpedNextStep: string | null }
export function aggregateImpact(conns: ImpactConn[], thanks: number, resources: number, now: Date) {
  const held = conns.filter(countsTowardHours);
  const year = held.filter((c) => c.endedAt && c.endedAt.getUTCFullYear() === now.getUTCFullYear());
  const month = held.filter((c) => c.endedAt && monthKey(c.endedAt) === monthKey(now));
  const minutes = year.reduce((n, c) => n + c.durationMinutes, 0);
  const tally = { yes: 0, little: 0, notReally: 0 };
  for (const c of held) { if (c.helpedNextStep === "YES") tally.yes++; else if (c.helpedNextStep === "LITTLE") tally.little++; else if (c.helpedNextStep === "NOT_REALLY") tally.notReally++; }
  return { hoursThisYear: Math.round(minutes / 6) / 10, conversationsHeld: held.length, conversationsThisMonth: month.length, thanks, resources, helpedNextStep: tally };
}
/** The twelve-hour One Hour Challenge: filled circles, whole hours only. */
export const challengeDots = (hours: number, total = 12) => Math.max(0, Math.min(total, Math.floor(hours)));
/** How a thank-you is attributed: never a name. */
export function thanksAttribution(a: { ageBand: string | null; isGuardian: boolean }) {
  if (a.isGuardian) return "A parent or guardian";
  return a.ageBand === "AGE_13_15" || a.ageBand === "AGE_16_17" ? "A high school student" : "A participant";
}

/** Notification bodies must not carry contact details or a full name (BR-10). */
export const safeBody = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "").replace(/\+?\d[\d\s().-]{7,}\d/g, "").trim();

/** "2 hours ago", "Yesterday", "3 Oct". */
export function relativeTime(d: Date, now: Date) {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24 && d.getUTCDate() === now.getUTCDate()) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const y = new Date(now.getTime() - 86400_000);
  if (monthKey(d) === monthKey(y) && d.getUTCDate() === y.getUTCDate()) return "Yesterday";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]!.slice(0, 3)}`;
}
