import { authenticator } from "otplib";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "./crypto";

authenticator.options = { window: 1 };

export function newMfaSecret(email: string) {
  const secret = authenticator.generateSecret();
  return { secret, encrypted: encrypt(secret), otpauth: authenticator.keyuri(email, "The Village Circle", secret) };
}
export const otpauthFor = (email: string, secret: string) => authenticator.keyuri(email, "The Village Circle", secret);
export const qrDataUrl = (otpauth: string) => QRCode.toDataURL(otpauth);
export function verifyTotp(encryptedSecret: string, code: string): boolean {
  try { return authenticator.check(code.replace(/\s/g, ""), decrypt(encryptedSecret)); } catch { return false; }
}
export async function newRecoveryCodes(n = 8) {
  const codes = Array.from({ length: n }, () => randomBytes(5).toString("hex"));
  return { codes, hashed: await Promise.all(codes.map((c) => bcrypt.hash(c, 10))) };
}
export async function consumeRecoveryCode(hashed: string[], code: string): Promise<string[] | null> {
  for (let i = 0; i < hashed.length; i++) if (await bcrypt.compare(code.replace(/[\s-]/g, "").toLowerCase(), hashed[i])) return hashed.filter((_, j) => j !== i);
  return null;
}
