import { db } from "./db";
import { newToken, sha } from "./domain/tokens";
import { sendEmail } from "./integrations/email";

const APP = () => process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
const layout = (title: string, body: string) => `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D1914"><h2 style="font-family:Georgia,serif">${title}</h2>${body}<p style="color:#6E655A;font-size:13px">The Village Circle</p></div>`;
const button = (href: string, label: string) => `<p><a href="${href}" style="background:#1F4D36;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></p>`;

async function issue(identifier: string, minutes: number) {
  await db.verificationToken.deleteMany({ where: { identifier } });
  const t = newToken();
  await db.verificationToken.create({ data: { identifier, token: t.hash, expires: new Date(Date.now() + minutes * 60_000) } });
  return t.raw;
}

export async function sendVerifyEmail(user: { email: string; name: string }) {
  const raw = await issue(`verify:${user.email}`, 60 * 24);
  await sendEmail({ to: user.email, subject: "Confirm your email", html: layout(`Welcome, ${esc(user.name.split(" ")[0])}`, `<p>Confirm your email to finish setting up your account.</p>${button(`${APP()}/verify-email/${raw}`, "Confirm email")}<p>This link works for 24 hours.</p>`) });
}
/** Re-sends the confirmation link. Silent about whether the address exists, and refuses to send more than one a minute. */
export async function resendVerifyEmail(email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.emailVerified || user.status === "CLOSED") return;
  const recent = await db.verificationToken.findFirst({ where: { identifier: `verify:${user.email}`, expires: { gt: new Date(Date.now() + 24 * 60 * 60_000 - 60_000) } } });
  if (recent) return;
  await sendVerifyEmail(user);
}
export async function sendResetEmail(user: { email: string }) {
  const raw = await issue(`reset:${user.email}`, 60);
  await sendEmail({ to: user.email, subject: "Reset your password", html: layout("Reset your password", `<p>Use the button below to choose a new password.</p>${button(`${APP()}/reset/${raw}`, "Choose a new password")}<p>This link works for one hour. If you didn't ask for this, you can ignore it.</p>`) });
}

/** Consumes a token once. Returns the email it was issued for, or null. */
export async function consumeToken(kind: "verify" | "reset", raw: string): Promise<string | null> {
  const row = await db.verificationToken.findUnique({ where: { token: sha(raw) } });
  if (!row || !row.identifier.startsWith(`${kind}:`) || row.expires < new Date()) return null;
  await db.verificationToken.delete({ where: { id: row.id } });
  return row.identifier.slice(kind.length + 1);
}
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
