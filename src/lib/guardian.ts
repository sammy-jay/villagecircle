import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./integrations/email";
import { sendSms } from "./integrations/sms";
import { newToken, newCode, sha, checkInvite, checkCode, inviteExpiry, CODE_MINUTES, maskPhone } from "./domain/tokens";
import { eighteenthBirthday } from "./domain/age";
import { hashPassword, passwordSchema } from "./password";
import { esc } from "./account";

const APP = () => process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
export const GUIDELINES_VERSION = "2026.1";

export async function createInvite(participantUserId: string, g: { name: string; email: string; mobile: string; relationship: string }) {
  const user = await db.user.findUnique({ where: { id: participantUserId }, include: { participant: true } });
  if (!user?.participant) throw new Error("No participant profile");
  if (user.status !== "PENDING_GUARDIAN") throw new Error("This account doesn't need a guardian invitation.");
  // One live invitation at a time: a new one supersedes the old.
  await db.guardianInvite.updateMany({ where: { participantId: user.participant.id, state: { in: ["SENT", "REMINDED"] } }, data: { state: "LAPSED" } });
  const t = newToken();
  const inv = await db.guardianInvite.create({ data: { participantId: user.participant.id, guardianName: g.name, guardianEmail: g.email.toLowerCase(), guardianMobile: g.mobile, relationship: g.relationship, tokenHash: t.hash, expiresAt: inviteExpiry() } });
  const first = esc(user.name.split(" ")[0]);
  await sendEmail({ to: inv.guardianEmail, subject: `${user.name.split(" ")[0]} would like your authorization`, html:
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D1914"><h2 style="font-family:Georgia,serif">Guardian authorization</h2><p>${first} would like to join The Village Circle to speak with a professional in the community. Before we connect them with anyone, we need your authorization as their parent or guardian.</p><p><a href="${APP()}/guardian/authorize/${t.raw}" style="background:#1F4D36;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Review and authorize</a></p><p style="color:#6E655A;font-size:13px">This link works once and expires in 14 days.</p></div>` });
  await audit(participantUserId, "guardian.invite.sent", "GuardianInvite", inv.id);
  return inv;
}

export async function findInvite(raw: string) { return db.guardianInvite.findUnique({ where: { tokenHash: sha(raw) } }); }

/** Everything the authorization screen is allowed to show: first name, age, masked phone. Never the young person's other details. */
export async function inviteView(raw: string) {
  const inv = await findInvite(raw); if (!inv) return { status: "INVALID" as const };
  const check = checkInvite(inv);
  if (!check.ok) return { status: check.reason, until: check.until };
  const p = await db.participantProfile.findUnique({ where: { id: inv.participantId }, include: { user: true } });
  if (!p) return { status: "INVALID" as const };
  const age = p.user.dateOfBirth ? Math.floor((Date.now() - p.user.dateOfBirth.getTime()) / 31557600000) : null;
  const existing = await db.user.findUnique({ where: { email: inv.guardianEmail }, select: { id: true } });
  return { status: "OK" as const, firstName: p.user.name.split(" ")[0], age, topic: null as string | null, guardianName: inv.guardianName, phoneHint: maskPhone(inv.guardianMobile), hasAccount: !!existing, codeSent: !!inv.codeHash && !!inv.codeExpiresAt && inv.codeExpiresAt > new Date() };
}

/** M19 "Send me a new link": same guardian details, fresh single-use link, at most once a minute. */
export async function renewInvite(raw: string) {
  const inv = await findInvite(raw); if (!inv) return { ok: false as const, error: "INVALID" };
  if (inv.state === "AUTHORIZED" || inv.state === "DECLINED") return { ok: false as const, error: "USED" };
  if (Date.now() - inv.createdAt.getTime() < 60_000) return { ok: false as const, error: "TOO_SOON" };
  const p = await db.participantProfile.findUnique({ where: { id: inv.participantId } }); if (!p) return { ok: false as const, error: "INVALID" };
  try { await createInvite(p.userId, { name: inv.guardianName, email: inv.guardianEmail, mobile: inv.guardianMobile, relationship: inv.relationship }); } catch { return { ok: false as const, error: "INVALID" }; }
  return { ok: true as const };
}

export async function sendCode(raw: string, channel: "sms" | "email" = "sms") {
  const inv = await findInvite(raw); if (!inv) return { ok: false as const, error: "INVALID" };
  const c = checkInvite(inv); if (!c.ok) return { ok: false as const, error: c.reason };
  if (inv.codeExpiresAt && inv.codeExpiresAt.getTime() - CODE_MINUTES * 60_000 > Date.now() - 60_000) return { ok: false as const, error: "TOO_SOON" };
  const code = newCode();
  await db.guardianInvite.update({ where: { id: inv.id }, data: { codeHash: code.hash, codeExpiresAt: new Date(Date.now() + CODE_MINUTES * 60_000), codeAttempts: 0 } });
  const text = `Your Village Circle code is ${code.raw}. It expires in ${CODE_MINUTES} minutes. We will never ask you to share it.`;
  if (channel === "email") await sendEmail({ to: inv.guardianEmail, subject: "Your Village Circle code", html: `<p>${text}</p>` });
  else await sendSms(inv.guardianMobile, text);
  return { ok: true as const };
}

export type AuthorizeInput = { code: string; decision: "authorize" | "decline"; preference?: "ATTEND" | "REACHABLE"; confirm?: boolean; name?: string; password?: string };

export async function decide(raw: string, input: AuthorizeInput) {
  const inv = await findInvite(raw); if (!inv) return { ok: false as const, error: "INVALID" as const };
  const c = checkInvite(inv); if (!c.ok) return { ok: false as const, error: c.reason, until: c.until };
  const r = checkCode(inv, input.code);
  await db.guardianInvite.update({ where: { id: inv.id }, data: { codeAttempts: r.nextAttempts, lockedUntil: r.nextLockedUntil, ...(r.ok ? { codeHash: null } : {}) } });
  if (!r.ok) return { ok: false as const, error: r.reason, attemptsLeft: r.attemptsLeft, until: r.lockedUntil };

  const p = await db.participantProfile.findUnique({ where: { id: inv.participantId }, include: { user: true } });
  if (!p) return { ok: false as const, error: "INVALID" as const };

  if (input.decision === "decline") {
    // A refusal closes the young person's account with a plain-language notice.
    await db.guardianInvite.update({ where: { id: inv.id }, data: { state: "DECLINED", usedAt: new Date() } });
    await db.user.update({ where: { id: p.userId }, data: { status: "CLOSED" } });
    await audit(null, "guardian.declined", "GuardianInvite", inv.id);
    await sendEmail({ to: p.user.email, subject: "About your Village Circle account", html: "<p>Your parent or guardian chose not to authorize your account, so it has been closed. You are welcome to talk with them about it. If you are 13 or older you can start again with their support.</p>" }).catch(() => {});
    return { ok: true as const, outcome: "DECLINED" as const };
  }

  if (!input.confirm) return { ok: false as const, error: "CONFIRM_REQUIRED" as const };
  if (!input.preference) return { ok: false as const, error: "PREFERENCE_REQUIRED" as const };

  // Guardian account: reuse by email, otherwise create (name + password required).
  let gUser = await db.user.findUnique({ where: { email: inv.guardianEmail } });
  if (!gUser) {
    if (!input.password) return { ok: false as const, error: "PASSWORD_REQUIRED" as const };
    if (!passwordSchema.safeParse(input.password).success) return { ok: false as const, error: "WEAK_PASSWORD" as const };
    gUser = await db.user.create({ data: { name: (input.name || inv.guardianName).trim(), email: inv.guardianEmail, passwordHash: await hashPassword(input.password), roles: ["GUARDIAN"], emailVerified: new Date() } });
  } else if (!gUser.roles.includes("GUARDIAN")) {
    gUser = await db.user.update({ where: { id: gUser.id }, data: { roles: { set: [...gUser.roles, "GUARDIAN"] } } });
  }
  const guardian = await db.guardian.upsert({ where: { userId: gUser.id }, update: { mobile: inv.guardianMobile, verified: true, verifiedAt: new Date(), verificationMethod: "SMS code to mobile", attendancePref: input.preference, guidelinesVersion: GUIDELINES_VERSION, consentState: "GRANTED" },
    create: { userId: gUser.id, relationship: inv.relationship, mobile: inv.guardianMobile, verified: true, verifiedAt: new Date(), verificationMethod: "SMS code to mobile", attendancePref: input.preference, guidelinesVersion: GUIDELINES_VERSION, consentState: "GRANTED" } });
  await db.guardianLink.upsert({ where: { guardianId_participantId: { guardianId: guardian.id, participantId: p.id } }, update: { active: true }, create: { guardianId: guardian.id, participantId: p.id, endsOn: p.user.dateOfBirth ? eighteenthBirthday(p.user.dateOfBirth) : null } });
  await db.consentRecord.createMany({ data: [{ userId: gUser.id, kind: "GUARDIAN_GUIDELINES", version: GUIDELINES_VERSION, granted: true }, { userId: gUser.id, kind: "CODE_OF_CONDUCT", version: GUIDELINES_VERSION, granted: true }, { userId: p.userId, kind: "RECORDING", version: GUIDELINES_VERSION, granted: true }] });
  await db.guardianInvite.update({ where: { id: inv.id }, data: { state: "AUTHORIZED", usedAt: new Date() } });
  // V-GUARD: queue for a spot check, then the team activates the account (within 2 business days).
  await db.application.create({ data: { applicantId: p.userId, type: "GUARDIAN", state: "SUBMITTED", submittedAt: new Date(), payload: { guardianUserId: gUser.id, relationship: inv.relationship, method: "SMS code to mobile", preference: input.preference } } });
  await audit(gUser.id, "guardian.authorized", "GuardianInvite", inv.id, null, { participant: p.id, preference: input.preference, guidelines: GUIDELINES_VERSION });
  return { ok: true as const, outcome: "AUTHORIZED" as const, createdAccount: !input.password ? false : true };
}
