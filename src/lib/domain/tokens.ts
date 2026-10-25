import { randomBytes, randomInt, createHash, timingSafeEqual } from "crypto";

export const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => { const raw = randomBytes(32).toString("base64url"); return { raw, hash: sha(raw) }; };
export const newCode = () => { const raw = String(randomInt(0, 1_000_000)).padStart(6, "0"); return { raw, hash: sha(raw) }; };
export function safeEqual(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }

export const INVITE_DAYS = 14; // S-3
export const REMINDER_AFTER_DAYS = 7; // §12
export const CODE_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;

export const inviteExpiry = (from = new Date()) => new Date(from.getTime() + INVITE_DAYS * 86400_000);

export type InviteCheck = { ok: true } | { ok: false; reason: "USED" | "EXPIRED" | "LOCKED" | "CLOSED"; until?: Date };

export function checkInvite(i: { state: string; expiresAt: Date; usedAt: Date | null; lockedUntil: Date | null }, now = new Date()): InviteCheck {
  if (i.usedAt || i.state === "AUTHORIZED") return { ok: false, reason: "USED" };
  if (i.state === "DECLINED" || i.state === "LAPSED") return { ok: false, reason: "CLOSED" };
  if (now >= i.expiresAt) return { ok: false, reason: "EXPIRED" };
  if (i.lockedUntil && i.lockedUntil > now) return { ok: false, reason: "LOCKED", until: i.lockedUntil };
  return { ok: true };
}

export type CodeResult = { ok: true } | { ok: false; reason: "NO_CODE" | "EXPIRED" | "WRONG" | "LOCKED"; attemptsLeft?: number; lockedUntil?: Date };

/** Pure check: returns what to persist (attempts / lock) as well as the verdict. */
export function checkCode(i: { codeHash: string | null; codeExpiresAt: Date | null; codeAttempts: number; lockedUntil: Date | null }, entered: string, now = new Date()): CodeResult & { nextAttempts: number; nextLockedUntil: Date | null } {
  if (i.lockedUntil && i.lockedUntil > now) return { ok: false, reason: "LOCKED", lockedUntil: i.lockedUntil, nextAttempts: i.codeAttempts, nextLockedUntil: i.lockedUntil };
  if (!i.codeHash || !i.codeExpiresAt) return { ok: false, reason: "NO_CODE", nextAttempts: i.codeAttempts, nextLockedUntil: null };
  if (now >= i.codeExpiresAt) return { ok: false, reason: "EXPIRED", nextAttempts: i.codeAttempts, nextLockedUntil: null };
  if (safeEqual(sha(entered.replace(/\s/g, "")), i.codeHash)) return { ok: true, nextAttempts: 0, nextLockedUntil: null };
  const attempts = i.codeAttempts + 1;
  if (attempts >= MAX_CODE_ATTEMPTS) { const until = new Date(now.getTime() + LOCK_MINUTES * 60_000); return { ok: false, reason: "LOCKED", lockedUntil: until, nextAttempts: 0, nextLockedUntil: until }; }
  return { ok: false, reason: "WRONG", attemptsLeft: MAX_CODE_ATTEMPTS - attempts, nextAttempts: attempts, nextLockedUntil: null };
}

export const maskPhone = (p: string) => `ending ${p.replace(/\D/g, "").slice(-4)}`;
