/** A27: library items expire twelve months after review (six for admissions, legal and immigration advice). */
export const DEFAULT_MONTHS = 12;
export const SHORT_MONTHS = 6;
export const DUE_SOON_DAYS = 60;
const SHORT_TOPIC = /admission|legal|law\b|immigration|visa/i;

export function cycleMonths(topics: string[], overrides: Record<string, number> = {}): number {
  const ov = topics.map((t) => overrides[t.toLowerCase()]).filter((n): n is number => typeof n === "number" && n > 0);
  if (ov.length) return Math.min(...ov);
  return topics.some((t) => SHORT_TOPIC.test(t)) ? SHORT_MONTHS : DEFAULT_MONTHS;
}
export function addMonths(d: Date, n: number): Date { const x = new Date(d); const day = x.getUTCDate(); x.setUTCDate(1); x.setUTCMonth(x.getUTCMonth() + n); const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate(); x.setUTCDate(Math.min(day, last)); return x; }
export function dueDate(lastReviewed: Date | null, createdAt: Date, months: number): Date { return addMonths(lastReviewed ?? createdAt, months); }
export type CycleState = "EXPIRED" | "DUE_SOON" | "CURRENT";
export function cycleState(due: Date, now = new Date()): CycleState {
  if (due.getTime() <= now.getTime()) return "EXPIRED";
  return (due.getTime() - now.getTime()) / 86400000 <= DUE_SOON_DAYS ? "DUE_SOON" : "CURRENT";
}
export const daysUntil = (due: Date, now = new Date()) => Math.ceil((due.getTime() - now.getTime()) / 86400000);
export function agoLabel(d: Date | null, now = new Date()): string {
  if (!d) return "Not yet";
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days < 31) return days <= 1 ? "Today" : `${days} days ago`;
  const m = Math.max(1, Math.round(days / 30.4)); return `${m} month${m === 1 ? "" : "s"} ago`;
}
