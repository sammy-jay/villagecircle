"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { adminActor } from "@/lib/admin-ctx";
import { changeTeamRole, createAccount, deleteAccount, inviteTeamMember, restoreAccount, suspendAccount } from "@/lib/admin-accounts";
import { sendResetEmail } from "@/lib/account";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";

export type PState = { ok?: boolean; error?: string; field?: string; done?: string; [k: string]: unknown };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const touch = (id?: string) => { revalidatePath("/admin/accounts"); if (id) revalidatePath(`/admin/accounts/${id}`); revalidatePath("/admin/roles"); };

/* ───── A16 accounts ───── */
export async function createAccountAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("team"); if (!a.ok) return { error: a.error };
  const r = await createAccount(a.actor, { name: str(fd, "name"), email: str(fd, "email"), role: str(fd, "role") as Role });
  if (!r.ok) return { error: r.error };
  touch(); return { ok: true, done: "created" };
}
export async function restoreAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("accounts.suspend"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  const r = await restoreAccount(a.actor, id, { note: str(fd, "note") });
  if (!r.ok) return { error: r.error };
  touch(id); return { ok: true, done: "restored" };
}
export async function deleteAccountAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("accounts.suspend"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  const r = await deleteAccount(a.actor, id, str(fd, "typed"));
  if (!r.ok) return { error: r.error, field: "typed" };
  touch(id); return { ok: true, done: "deleted" };
}

/* ───── A23 suspend ───── */
export async function suspendAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("accounts.suspend"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  const r = await suspendAccount(a.actor, id, { reason: str(fd, "reason"), note: [str(fd, "more"), str(fd, "note")].filter(Boolean).join(". ") });
  if (!r.ok) return { error: r.error };
  if (str(fd, "incident")) await audit(a.actor.id, "incident.mentor_suspended", "Incident", str(fd, "incident"), null, { userId: id });
  touch(id);
  const asks = typeof r.returnedAsks === "number" ? r.returnedAsks : null; const g = typeof r.guardiansNotified === "number" ? r.guardiansNotified : null;
  return { ok: true, done: "suspended", asks, guardians: g };
}

/* ───── A19 team roles ───── */
export async function inviteAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("team"); if (!a.ok) return { error: a.error };
  const r = await inviteTeamMember(a.actor, { name: str(fd, "name"), email: str(fd, "email"), teamRole: str(fd, "teamRole"), note: str(fd, "note") });
  if (!r.ok) return { error: r.error };
  touch(); return { ok: true, done: "invited" };
}
export async function changeRoleAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("team"); if (!a.ok) return { error: a.error };
  const r = await changeTeamRole(a.actor, str(fd, "id"), str(fd, "teamRole"));
  if (!r.ok) return { error: r.error };
  touch(); return { ok: true, done: "changed" };
}
export async function resendInviteAction(_: PState, fd: FormData): Promise<PState> {
  const a = await adminActor("team"); if (!a.ok) return { error: a.error };
  const u = await db.user.findUnique({ where: { id: str(fd, "id") }, select: { id: true, email: true } });
  if (!u) return { error: "Not found." };
  await sendResetEmail({ email: u.email }).catch(() => undefined);
  await audit(a.actor.id, "team.invite.resend", "User", u.id);
  return { ok: true, done: "resent" };
}
