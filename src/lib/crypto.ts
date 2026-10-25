import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function key(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes of hex (64 chars).");
  return Buffer.from(hex, "hex");
}
export function encrypt(plain: string): string {
  const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decrypt(payload: string): string {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", key(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
