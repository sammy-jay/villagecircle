/** A18 / A25: the console's second step. A fresh check sets mfaVerifiedAt; the session trusts nothing else (see auth.ts). */
import { db } from "./db";
import { audit } from "./audit";
import { decrypt } from "./crypto";
import { consumeRecoveryCode, newMfaSecret, newRecoveryCodes, otpauthFor, qrDataUrl, verifyTotp } from "./mfa";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** A25: the pending secret for a team member who has not turned the second step on yet. Created once and kept until it is confirmed. */
export async function pendingMfa(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { email: true, mfaEnabled: true, mfaSecret: true } });
  if (!u || u.mfaEnabled) return null;
  let secret: string;
  if (!u.mfaSecret) { const s = newMfaSecret(u.email); secret = s.secret; await db.user.update({ where: { id: userId }, data: { mfaSecret: s.encrypted } }); }
  else secret = decrypt(u.mfaSecret);
  return { qr: await qrDataUrl(otpauthFor(u.email, secret)), key: secret.replace(/(.{4})/g, "$1 ").trim() };
}

/** A25 "Turn on and continue": the first good code turns it on and returns backup codes, shown once. */
export async function enableMfa(userId: string, code: string): Promise<R<{ codes: string[] }>> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true, mfaSecret: true } });
  if (!u?.mfaSecret) return { ok: false, error: "Refresh the page to get a new code to scan." };
  if (u.mfaEnabled) return { ok: false, error: "Two-step sign-in is already on." };
  if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return { ok: false, error: "Enter the six digits from your app." };
  if (!verifyTotp(u.mfaSecret, code)) return { ok: false, error: "That code did not match. Wait for the next one and try again." };
  const rc = await newRecoveryCodes(8);
  await db.user.update({ where: { id: userId }, data: { mfaEnabled: true, mfaRecoveryCodes: rc.hashed, mfaVerifiedAt: new Date() } });
  await audit(userId, "mfa.enabled", "User", userId);
  return { ok: true, codes: rc.codes.map((c) => `${c.slice(0, 5)}-${c.slice(5)}`.toUpperCase()) };
}

/** A18 second step: an authenticator code, or one backup code (used up when it works). */
export async function checkMfa(userId: string, code: string): Promise<R> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { mfaEnabled: true, mfaSecret: true, mfaRecoveryCodes: true } });
  if (!u?.mfaEnabled || !u.mfaSecret) return { ok: false, error: "Set up two-step sign-in first." };
  const c = code.trim();
  if (/^\d{6}$/.test(c.replace(/\s/g, ""))) {
    if (!verifyTotp(u.mfaSecret, c)) { await audit(userId, "mfa.failed", "User", userId); return { ok: false, error: "That code did not match. Codes change every 30 seconds." }; }
  } else {
    const left = await consumeRecoveryCode(u.mfaRecoveryCodes, c);
    if (!left) { await audit(userId, "mfa.failed", "User", userId); return { ok: false, error: "That backup code did not match, or it has been used." }; }
    await db.user.update({ where: { id: userId }, data: { mfaRecoveryCodes: left } });
    await audit(userId, "mfa.recovery_code_used", "User", userId, null, { left: left.length });
  }
  await db.user.update({ where: { id: userId }, data: { mfaVerifiedAt: new Date() } });
  await audit(userId, "mfa.passed", "User", userId);
  return { ok: true };
}
