import type { AgeBand } from "@prisma/client";

export const MIN_AGE = 15; // BR-20 (designs: "for ages 15 and up")
export const ADULT_AGE = 18; // BR-19

export function ageOn(dob: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const m = on.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < dob.getUTCDate())) age -= 1;
  return age;
}

export type AgeGate =
  | { ok: true; band: AgeBand; minor: boolean; age: number }
  | { ok: false; reason: "UNDER_15" | "INVALID_DOB" };

/** BR-20: participants under 15 are never admitted. The AGE_13_15 band name is kept for stored data; it now only holds 15-year-olds. */
export function ageGate(dob: Date, now: Date = new Date()): AgeGate {
  if (Number.isNaN(dob.getTime()) || dob > now || ageOn(dob, now) > 120) return { ok: false, reason: "INVALID_DOB" };
  const age = ageOn(dob, now);
  if (age < MIN_AGE) return { ok: false, reason: "UNDER_15" };
  if (age < 16) return { ok: true, band: "AGE_13_15", minor: true, age };
  if (age < ADULT_AGE) return { ok: true, band: "AGE_16_17", minor: true, age };
  return { ok: true, band: "ADULT", minor: false, age };
}

export function isMinor(dob: Date, now: Date = new Date()): boolean {
  return ageOn(dob, now) < ADULT_AGE;
}

/** BR-19: guardian authority ends on the 18th birthday. */
export function eighteenthBirthday(dob: Date): Date {
  return new Date(Date.UTC(dob.getUTCFullYear() + ADULT_AGE, dob.getUTCMonth(), dob.getUTCDate()));
}

export function guardianAuthorityActive(dob: Date, now: Date = new Date()): boolean {
  return now < eighteenthBirthday(dob);
}
