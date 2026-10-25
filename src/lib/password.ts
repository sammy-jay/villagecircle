import bcrypt from "bcryptjs";
import { z } from "zod";

export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(128)
  .refine((p) => /[a-z]/i.test(p) && /\d/.test(p), "Include a letter and a number");
export const hashPassword = (p: string) => bcrypt.hash(p, 12);
export const verifyPassword = (p: string, h: string) => bcrypt.compare(p, h);

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
export function lockState(failed: number, lockedUntil: Date | null, now = new Date()) {
  if (lockedUntil && lockedUntil > now) return { locked: true, until: lockedUntil };
  return { locked: false as const, until: null, failed };
}
