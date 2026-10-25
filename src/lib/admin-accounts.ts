import type { Role } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify, notifySafeguarding } from "./notify";
import { moveAsk } from "./asks";
import { sendResetEmail } from "./account";
import { isMinor, ageOn } from "./domain/age";
import { shortName } from "./domain/views";
import { expertiseLabel } from "./domain/expertise";
import {
  canSuspend, canDeleteData, canChangeRoles, canRestoreStatus, canSuspendStatus, deleteNameMatches, rolesLabel, STATUS_VIEW, twoStepLabel, suspendReason, mentorSuspensionMessage, guardianSuspensionMessage,
  isTeamRole, rolesForTeamRole, defaultTeamRole, TEAM_ROLE_LABEL, checkRoleChange, ACCOUNT_DELETE_HOLD_DAYS, type TeamRole,
} from "./domain/admin-safety-1";

export type Res = { ok: true; [k: string]: unknown } | { ok: false; error: string };
const fail = (error: string): Res => ({ ok: false, error });
const OID = /^[a-f0-9]{24}$/i;
type Actor = { id: string; roles: Role[] };

/* ───────── A16 list and detail. Never returns email or phone. ───────── */
export async function accountList(q?: string) {
  const term = q?.trim();
  const users = await db.user.findMany({
    where: term ? { OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }] } : undefined,
    orderBy: { createdAt: "desc" }, take: 100,
    select: { id: true, name: true, roles: true, status: true, mfaEnabled: true, dateOfBirth: true, countryOfResidence: true },
  });
  return users.map((u) => ({ id: u.id, name: shortName(u.name), roles: u.roles, rolesLabel: rolesLabel(u.roles), status: STATUS_VIEW[u.status], statusKey: u.status, twoStep: twoStepLabel({ roles: u.roles, mfaEnabled: u.mfaEnabled, minor: !!u.dateOfBirth && isMinor(u.dateOfBirth) }), place: u.countryOfResidence ?? "—" }));
}

export async function accountDetail(id: string) {
  if (!OID.test(id)) return null;
  const u = await db.user.findUnique({ where: { id }, include: { mentor: true, participant: true } }); if (!u) return null;
  const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  const susp = await db.accountSuspension.findFirst({ where: { userId: id, liftedAt: null }, orderBy: { createdAt: "desc" } });
  const hist = await db.accountSuspension.count({ where: { userId: id } });
  return {
    id: u.id, name: u.name, first: u.name.trim().split(/\s+/)[0] ?? u.name, short: shortName(u.name), roles: u.roles, status: u.status, minor, age: u.dateOfBirth ? ageOn(u.dateOfBirth) : null,
    isMentor: !!u.mentor, clearedForMinors: !!u.mentor?.clearedForMinors, verification: u.mentor?.verification ?? null,
    hours: u.mentor ? { given: u.mentor.hoursGivenThisMonth, monthly: u.mentor.monthlyHours } : null, expertise: u.mentor ? expertiseLabel(u.mentor.primaryExpertise) : null, joined: u.createdAt,
    suspension: susp ? { reason: susp.reason, since: susp.createdAt, kind: susp.kind } : null, suspensions: hist,
  };
}

/* ───────── Create ───────── */
export async function createAccount(actor: Actor, d: { name: string; email: string; role: Role }): Promise<Res> {
  if (!canChangeRoles(actor.roles)) return fail("Only an admin can create accounts.");
  const name = d.name.trim(); const email = d.email.trim().toLowerCase();
  if (name.length < 2) return fail("Enter the person's name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address.");
  if (d.role === "SAFEGUARDING_LEAD") return fail("The safeguarding-lead permission is granted separately, from team roles.");
  if (await db.user.findUnique({ where: { email } })) return fail("There is already an account with that email.");
  const u = await db.user.create({ data: { name, email, roles: [d.role] } });
  await sendResetEmail({ email }).catch(() => undefined); // they choose their own password
  await audit(actor.id, "account.create", "User", u.id, null, { roles: [d.role] });
  return { ok: true, id: u.id };
}

/* ───────── Suspend and restore ───────── */
const LIVE = ["AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED"] as const;

/** Hands the mentor's open work back to the team. Returns the number of Asks returned and guardians told. */
async function returnMentorWork(mentorProfileId: string): Promise<{ asks: number; guardians: number }> {
  const conns = await db.connection.findMany({ where: { mentorId: mentorProfileId, status: { notIn: ["HELD", "CANCELLED", "MISSED"] } }, include: { ask: true, participant: { include: { user: true } } } });
  let asks = 0; let guardians = 0;
  for (const c of conns) {
    const booked = c.ask.state === "SCHEDULED";
    await db.connection.update({ where: { id: c.id }, data: { status: "CANCELLED", scheduledAt: null, offeredTimes: [] } });
    let state = c.ask.state;
    const path: Record<string, string[]> = { SCHEDULED: ["CONNECTION_APPROVED", "IN_TEAM_REVIEW"], CONNECTION_APPROVED: ["IN_TEAM_REVIEW"], MENTOR_STEPPED_FORWARD: ["OPEN_TO_MENTORS", "IN_TEAM_REVIEW"] };
    for (const to of path[state] ?? []) { const r = await moveAsk(c.askId, to as never, "SYSTEM", { note: "Mentor eligibility suspended" }); if (!r.ok) break; state = to as never; }
    asks++;
    if (booked && c.participant.user.dateOfBirth && isMinor(c.participant.user.dateOfBirth)) {
      const links = await db.guardianLink.findMany({ where: { participantId: c.participantId, active: true }, include: { guardian: true } });
      for (const l of links) { await notify(l.guardian.userId, "connection.cancelled", "A conversation was cancelled", guardianSuspensionMessage, { link: "/guardian" }); guardians++; }
    }
  }
  // Asks released to this mentor but not yet answered go back to the team's attention: the mentor is no longer eligible.
  const pending = await db.shortlistEntry.findMany({ where: { mentorId: mentorProfileId, response: "NONE", ask: { state: "OPEN_TO_MENTORS" } } });
  for (const p of pending) { await db.shortlistEntry.update({ where: { id: p.id }, data: { response: "PASSED", reason: "Mentor eligibility suspended", respondedAt: new Date() } }); asks++; }
  return { asks, guardians };
}

export async function suspendAccount(actor: Actor, id: string, d: { reason?: string; note?: string }): Promise<Res> {
  if (!OID.test(id)) return fail("Account not found.");
  const u = await db.user.findUnique({ where: { id }, include: { mentor: true } }); if (!u) return fail("Account not found.");
  if (u.id === actor.id) return fail("You cannot suspend your own account.");
  if (!canSuspend(actor.roles, u.roles)) return fail(u.roles.includes("MENTOR") ? "Only the safeguarding lead can suspend a mentor." : "Not allowed.");
  if (!canSuspendStatus(u.status)) return fail("This account is not active.");
  const note = (d.note ?? "").trim();
  const isMentor = u.roles.includes("MENTOR") && !!u.mentor;
  if (isMentor) {
    const r = suspendReason(d.reason ?? ""); if (!r) return fail("Choose a reason.");
    const moved = await returnMentorWork(u.mentor!.id);
    await db.eligibilityHold.upsert({ where: { userId: id }, update: { kind: r.hold, since: new Date(), resolvedAt: null }, create: { userId: id, kind: r.hold } });
    await db.user.update({ where: { id }, data: { status: "PAUSED" } });
    await db.accountSuspension.create({ data: { userId: id, kind: "MENTOR_ELIGIBILITY", reason: `${r.code} · ${r.label}`, note: note || null, byId: actor.id, returnedAsks: moved.asks, guardiansNotified: moved.guardians } });
    await notify(id, "mentor.suspended", "Your mentoring is paused", mentorSuspensionMessage, { link: "/mentor" });
    await notifySafeguarding("mentor.suspended", "A mentor's eligibility was suspended", `Reason code ${r.code}. ${moved.asks} Ask${moved.asks === 1 ? "" : "s"} returned to the team. Review within 24 hours.`, `/admin/accounts/${id}`);
    await audit(actor.id, "mentor.suspend", "User", id, { status: u.status }, { status: "PAUSED", reason: r.code, note, returnedAsks: moved.asks, guardiansNotified: moved.guardians });
    return { ok: true, returnedAsks: moved.asks, guardiansNotified: moved.guardians };
  }
  if (note.length < 5) return fail("Add a short internal note.");
  await db.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  await db.accountSuspension.create({ data: { userId: id, kind: "ACCOUNT", reason: "Account suspended", note, byId: actor.id } });
  await notifySafeguarding("account.suspended", "An account was suspended", "A team member suspended an account. Review within 24 hours.", `/admin/accounts/${id}`);
  await audit(actor.id, "account.suspend", "User", id, { status: u.status }, { status: "SUSPENDED", note });
  return { ok: true };
}

/** Reversible: nothing was deleted, so restoring puts the account back as it was. */
export async function restoreAccount(actor: Actor, id: string, d: { note?: string } = {}): Promise<Res> {
  if (!OID.test(id)) return fail("Account not found.");
  const u = await db.user.findUnique({ where: { id } }); if (!u) return fail("Account not found.");
  if (!canSuspend(actor.roles, u.roles)) return fail(u.roles.includes("MENTOR") ? "Only the safeguarding lead can reinstate a mentor." : "Not allowed.");
  if (!canRestoreStatus(u.status)) return fail("This account is not suspended or paused.");
  await db.user.update({ where: { id }, data: { status: "ACTIVE" } });
  await db.eligibilityHold.updateMany({ where: { userId: id, resolvedAt: null }, data: { resolvedAt: new Date() } });
  await db.accountSuspension.updateMany({ where: { userId: id, liftedAt: null }, data: { liftedAt: new Date(), liftedById: actor.id } });
  if (u.roles.includes("MENTOR")) await notify(id, "mentor.reinstated", "Your mentoring is open again", "You can receive Asks again. Thank you for your patience.", { link: "/mentor" });
  await audit(actor.id, u.roles.includes("MENTOR") ? "mentor.reinstate" : "account.restore", "User", id, { status: u.status }, { status: "ACTIVE", note: d.note?.trim() || undefined });
  return { ok: true };
}

/** Starts the held deletion (30 days). Safeguarding lead only; the person's name must be typed. Records under legal hold are never touched by the later anonymising. */
export async function deleteAccount(actor: Actor, id: string, typedName: string): Promise<Res> {
  if (!canDeleteData(actor.roles)) return fail("Only the safeguarding lead can delete an account and its data.");
  if (!OID.test(id)) return fail("Account not found.");
  const u = await db.user.findUnique({ where: { id } }); if (!u) return fail("Account not found.");
  if (u.id === actor.id) return fail("You cannot delete your own account here.");
  if (!deleteNameMatches(typedName, u.name)) return fail("Type the person's full name exactly to confirm.");
  const purgeAfter = new Date(Date.now() + ACCOUNT_DELETE_HOLD_DAYS * 86400_000);
  await db.deletionRequest.upsert({ where: { userId: id }, update: { requestedAt: new Date(), purgeAfter, cancelledAt: null, completedAt: null }, create: { userId: id, purgeAfter } });
  await db.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  await audit(actor.id, "account.delete.scheduled", "User", id, { status: u.status }, { status: "SUSPENDED", purgeAfter });
  return { ok: true, purgeAfter };
}

/* ───────── A19 roles ───────── */
export async function teamList() {
  const users = await db.user.findMany({ where: { roles: { hasSome: ["ADMIN", "SAFEGUARDING_LEAD"] } }, orderBy: { createdAt: "asc" } });
  const tm = await db.teamMember.findMany({ where: { userId: { in: users.map((u) => u.id) } } });
  return users.map((u) => {
    const m = tm.find((t) => t.userId === u.id);
    const teamRole: TeamRole = m && isTeamRole(m.teamRole) ? m.teamRole : defaultTeamRole(u.roles);
    const invited = !u.passwordHash && !u.emailVerified;
    return { id: u.id, name: shortName(u.name), teamRole, roleLabel: TEAM_ROLE_LABEL[teamRole], mfa: u.mfaEnabled, invited, note: m?.note ?? null, suspended: u.status === "SUSPENDED" };
  });
}

export async function inviteTeamMember(actor: Actor, d: { name: string; email: string; teamRole: string; note?: string }): Promise<Res> {
  if (!canChangeRoles(actor.roles)) return fail("Only an admin can invite team members.");
  if (!isTeamRole(d.teamRole)) return fail("Choose a role.");
  const name = d.name.trim(); const email = d.email.trim().toLowerCase();
  if (name.length < 2) return fail("Enter the person's name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter a valid email address.");
  if (await db.user.findUnique({ where: { email } })) return fail("There is already an account with that email.");
  const u = await db.user.create({ data: { name, email, roles: rolesForTeamRole(d.teamRole) } });
  await db.teamMember.create({ data: { userId: u.id, teamRole: d.teamRole, note: d.note?.trim() || null, invitedById: actor.id } });
  await sendResetEmail({ email }).catch(() => undefined);
  await audit(actor.id, "team.invite", "User", u.id, null, { teamRole: d.teamRole, roles: rolesForTeamRole(d.teamRole) });
  return { ok: true, id: u.id };
}

export async function changeTeamRole(actor: Actor, targetId: string, teamRole: string): Promise<Res> {
  if (!canChangeRoles(actor.roles)) return fail("Only an admin can change roles.");
  if (!OID.test(targetId) || !isTeamRole(teamRole)) return fail("Not found.");
  const t = await db.user.findUnique({ where: { id: targetId } }); if (!t) return fail("Not found.");
  const adminCount = await db.user.count({ where: { roles: { has: "ADMIN" }, status: "ACTIVE" } });
  const c = checkRoleChange({ actorId: actor.id, targetId, adminCount, targetIsAdmin: t.roles.includes("ADMIN"), newRole: teamRole }); if (!c.ok) return fail(c.error);
  const before = await db.teamMember.findUnique({ where: { userId: targetId } });
  const roles = rolesForTeamRole(teamRole);
  await db.user.update({ where: { id: targetId }, data: { roles } });
  await db.teamMember.upsert({ where: { userId: targetId }, update: { teamRole }, create: { userId: targetId, teamRole, invitedById: actor.id } });
  await audit(actor.id, "team.role.change", "User", targetId, { teamRole: before?.teamRole ?? defaultTeamRole(t.roles), roles: t.roles }, { teamRole, roles });
  return { ok: true };
}
