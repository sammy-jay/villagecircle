/** Service windows from the BRD, in business days / hours. */
export const WINDOWS = { reviewBusinessDays: 2, mentorApplicationBusinessDays: 5, concernHours: 48, flaggedHours: 24, shortlistDays: 7 } as const;

const isWeekend = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6;

export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  let left = days;
  while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (!isWeekend(d)) left -= 1; }
  return d;
}

export const addHours = (from: Date, h: number) => new Date(from.getTime() + h * 3600_000);
export const reviewDue = (submitted: Date) => addBusinessDays(submitted, WINDOWS.reviewBusinessDays);
export const atRisk = (due: Date, now: Date = new Date()) => due.getTime() - now.getTime() <= 4 * 3600_000 && due > now; // 4h warning
export const isOverdue = (due: Date, now: Date = new Date()) => now >= due;
