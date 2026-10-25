"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { registerUser, type SignupRole } from "@/lib/register";
import { consumeToken, resendVerifyEmail, sendResetEmail } from "@/lib/account";
import { hashPassword, passwordSchema } from "@/lib/password";
import { checkInviteCode, createInvite, decide, renewInvite, resendParticipantInvite, sendCode } from "@/lib/guardian";
import { confirmTurning18, guardianPauseConnection, recommend, submitConcern } from "@/lib/safety-user";
import { CONCERN_KINDS, type ConcernKind } from "@/lib/domain/safety-user";

export type ActionState = { ok?: boolean; error?: string; field?: string; [k: string]: unknown };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const uid = async () => (await getSession())?.user?.id || null;

/* ───── M1 / DK1 Register ───── */
export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await registerUser({
    role: (str(fd, "role") || "participant") as SignupRole,
    name: str(fd, "name"), email: str(fd, "email"), password: String(fd.get("password") ?? ""), dob: str(fd, "dob"),
    country: str(fd, "country"), region: str(fd, "region"), town: str(fd, "town"), heardFrom: str(fd, "heardFrom"), heardFromMore: str(fd, "heardFromMore"),
    agreeTerms: fd.get("agreeTerms") === "on" ? true : (false as unknown as true), agreeReview: fd.get("agreeReview") === "on", marketing: fd.get("marketing") === "on",
    guardianName: str(fd, "guardianName"), guardianEmail: str(fd, "guardianEmail"), guardianMobile: str(fd, "guardianMobile"), relationship: str(fd, "relationship"),
  });
  if ("redirect" in r) redirect(r.redirect);
  if (!r.ok) return { error: r.error, field: r.field };
  redirect(`/check-email?email=${encodeURIComponent(r.email)}`);
}

/* ───── M10 / DK4 / M22 Verify email ───── */
export async function resendVerifyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter the email you joined with." };
  await resendVerifyEmail(email);
  return { ok: true };
}

/* ───── M11 Forgot and reset ───── */
export async function forgotAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter the email you joined with." };
  const u = await db.user.findUnique({ where: { email }, select: { email: true, status: true } });
  if (u && u.status !== "CLOSED") await sendResetEmail({ email: u.email });
  return { ok: true }; // the same answer either way, so nobody can test which emails have accounts
}

export async function resetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = String(fd.get("password") ?? ""), confirm = String(fd.get("confirm") ?? "");
  const p = passwordSchema.safeParse(password);
  if (!p.success) return { error: p.error.issues[0]!.message, field: "password" };
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) return { error: "Use at least one letter and one number.", field: "password" };
  if (password !== confirm) return { error: "These two do not match. Type the same password again.", field: "confirm" };
  const email = await consumeToken("reset", str(fd, "token"));
  if (!email) return { expired: true };
  const u = await db.user.update({ where: { email }, data: { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } });
  await audit(u.id, "account.password.reset", "User", u.id);
  redirect("/login?reset=1");
}

/* ───── M12 Profile builder ───── */
export async function onboardingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login");
  const step = Number(str(fd, "step")) || 1;
  const u = await db.user.findUnique({ where: { id }, include: { participant: true } });
  if (!u?.participant) redirect("/login");
  if (fd.get("skip") !== "1") {
    if (step === 1) {
      const cohort = str(fd, "cohort");
      await db.participantProfile.update({ where: { id: u.participant.id }, data: { cohort: ["HIGH_SCHOOL", "COLLEGE", "GRADUATE", "EARLY_CAREER"].includes(cohort) ? (cohort as never) : null } });
      await db.user.update({ where: { id }, data: { region: str(fd, "region") || null, town: str(fd, "town") || null } });
    } else if (step === 2) {
      const interests = fd.getAll("interests").map(String).slice(0, 5);
      if (!interests.length) return { error: "Pick at least one thing you are curious about.", field: "interests" };
      const goal = [str(fd, "goal"), str(fd, "goalMore")].filter(Boolean);
      await db.participantProfile.update({ where: { id: u.participant.id }, data: { interests, goalsText: goal } });
    } else {
      const bg = [str(fd, "background"), str(fd, "backgroundMore")].filter(Boolean).join(": ");
      await db.participantProfile.update({ where: { id: u.participant.id }, data: { communityBackground: bg || null } });
      await db.user.update({ where: { id }, data: { languages: fd.getAll("languages").map(String) } });
    }
  }
  if (step >= 3) {
    await db.participantProfile.update({ where: { id: u.participant.id }, data: { onboardedAt: new Date() } });
    redirect(u.status === "PENDING_GUARDIAN" ? "/guardian-needed" : "/home");
  }
  redirect(`/onboarding?step=${step + 1}`);
}

/* ───── M13 / DK6 Waiting for guardian ───── */
export async function resendInviteAction(_: ActionState): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login");
  const r = await resendParticipantInvite(id);
  return r.ok ? { ok: true, message: "Sent again. They have a new email and text." } : { error: r.error };
}

export async function changeInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login");
  const g = { name: str(fd, "guardianName"), email: str(fd, "guardianEmail").toLowerCase(), mobile: str(fd, "guardianMobile"), relationship: str(fd, "relationship") };
  if (g.name.length < 2) return { error: "Add your guardian's name.", field: "guardianName" };
  if (!/^\S+@\S+\.\S+$/.test(g.email)) return { error: "Enter a valid email.", field: "guardianEmail" };
  if (!/^\+?[\d\s()-]{8,20}$/.test(g.mobile)) return { error: "Add their mobile with the country code.", field: "guardianMobile" };
  if (!g.relationship) return { error: "Pick how they are related to you.", field: "relationship" };
  try { await createInvite(id, g); } catch (e) { return { error: (e as Error).message }; }
  return { ok: true, message: `Invitation sent to ${g.name.split(" ")[0]}.` };
}

/* ───── DK5 / M3 / M19 / M20 / M21 Guardian authorization (token link) ───── */
export async function inviteCodeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await sendCode(str(fd, "token"), str(fd, "channel") === "email" ? "email" : "sms");
  if (r.ok) return { ok: true, sent: true };
  if (r.error === "TOO_SOON") return { error: "We just sent a code. You can ask for another in a minute." };
  return { error: r.error };
}

export async function checkCodeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const code = str(fd, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Enter all 6 digits." };
  const r = await checkInviteCode(str(fd, "token"), code);
  if (r.ok) return { ok: true, code };
  if (r.error === "WRONG") return { error: `That code does not match. ${r.attemptsLeft} ${r.attemptsLeft === 1 ? "attempt" : "attempts"} left.`, attemptsLeft: r.attemptsLeft };
  if (r.error === "EXPIRED" || r.error === "NO_CODE") return { error: "That code has expired. Ask for a new one." };
  return { error: r.error, locked: r.error === "LOCKED", until: r.until?.toISOString() };
}

export async function decideAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, "token");
  const decision = str(fd, "decision") === "decline" ? "decline" : "authorize";
  if (decision === "authorize") {
    if (fd.get("confirm") !== "on") return { error: "Please confirm you are the parent or legal guardian.", field: "confirm" };
    if (str(fd, "legalName").length < 3) return { error: "Type your full legal name to sign.", field: "legalName" };
    if (fd.get("attest") !== "yes") return { error: "Please tick that you understand this is a signed attestation.", field: "attest" };
  }
  const pref = str(fd, "preference");
  const r = await decide(token, { code: str(fd, "code"), decision, confirm: fd.get("confirm") === "on", preference: pref === "ATTEND" || pref === "REACHABLE" ? pref : undefined, name: str(fd, "name"), password: String(fd.get("password") ?? "") || undefined, legalName: str(fd, "legalName") });
  if (r.ok) return { ok: true, outcome: r.outcome };
  const msg: Record<string, string> = {
    WRONG: "That code does not match. Check the text message and try again.", EXPIRED: "That code has expired. Ask for a new one.", LOCKED: "Too many tries. Wait 15 minutes.",
    CONFIRM_REQUIRED: "Please confirm you are the parent or legal guardian.", PREFERENCE_REQUIRED: "Choose your preference for conversations.",
    PASSWORD_REQUIRED: "Choose a password for your guardian account.", WEAK_PASSWORD: "Use at least 10 characters, with a letter and a number.",
  };
  return { error: msg[r.error] ?? "This link can no longer be used.", code: r.error };
}

export async function renewInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const r = await renewInvite(str(fd, "token"));
  if (r.ok) return { ok: true };
  return { error: r.error === "TOO_SOON" ? "A new link was just sent. Check your email." : r.error === "USED" ? "This approval is already complete. You can log in." : "We could not renew this link. Ask your child to send a new invitation." };
}

/* ───── M16 Report a concern (signed in) ───── */
export async function concernAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login?next=/report");
  const kind = str(fd, "kind") as ConcernKind;
  if (!CONCERN_KINDS.includes(kind)) return { error: "Pick what happened.", field: "kind" };
  const r = await submitConcern(id, { kind, description: [str(fd, "detail") && `Detail: ${str(fd, "detail")}`, str(fd, "description")].filter(Boolean).join("\n") || undefined, askId: str(fd, "askId") || undefined });
  return r.ok ? { ok: true } : { error: r.error };
}

/* ───── M17 Turning 18 ───── */
export async function turning18Action(): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login");
  const r = await confirmTurning18(id);
  if (!r.ok) return { error: r.error };
  redirect("/home");
}

/* ───── M18 / P01 Recommend a young person ───── */
export async function recommendAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const d = { name: str(fd, "name"), role: [str(fd, "role"), str(fd, "roleMore")].filter(Boolean).join(": "), email: str(fd, "email"), first: str(fd, "first"), guardianEmail: str(fd, "guardianEmail"), why: str(fd, "why") };
  if (d.name.length < 2) return { error: "Add your name.", field: "name" };
  if (!str(fd, "role")) return { error: "Pick your role.", field: "role" };
  if (!/^\S+@\S+\.\S+$/.test(d.email)) return { error: "Enter a valid email", field: "email" };
  if (!d.first) return { error: "Add the young person's first name.", field: "first" };
  if (!/^\S+@\S+\.\S+$/.test(d.guardianEmail)) return { error: "Enter a valid email", field: "guardianEmail" };
  const r = await recommend(d);
  return r.ok ? { ok: true } : { error: r.error };
}

/* ───── M24 Pause a connection (guardian) ───── */
export async function pauseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = await uid(); if (!id) redirect("/login");
  const why = [str(fd, "reason"), str(fd, "more")].filter(Boolean).join(". ");
  const r = await guardianPauseConnection(id, str(fd, "askId"), why || undefined);
  if (!r.ok) return { error: r.error };
  redirect("/guardian?paused=1");
}
