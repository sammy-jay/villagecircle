"use server";

import { revalidatePath } from "next/cache";
import { adminActor } from "@/lib/admin-ctx";
import { act, recordOrientation, recordScreening, remindMentor, setCheck } from "@/lib/admin-applications";
import { audit } from "@/lib/audit";
import { decisionMessage } from "@/lib/domain/admin-reasons";
import type { CheckItem } from "@/lib/domain/application-review";

export type AState = { ok?: boolean; error?: string; field?: string; done?: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const touch = (id: string) => { revalidatePath("/admin/mentors"); revalidatePath(`/admin/mentors/${id}`); revalidatePath("/admin/guardians"); revalidatePath("/admin"); };

/* ───── A1 decision ───── */
export async function mentorDecisionAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("applications.decide"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id"); const action = str(fd, "action") as "APPROVE" | "REQUEST_INFO" | "DECLINE" | "START_REVIEW";
  if (!["APPROVE", "REQUEST_INFO", "DECLINE", "START_REVIEW"].includes(action)) return { error: "Choose a decision." };
  const reason = str(fd, "reason"); const note = str(fd, "note");
  if ((action === "DECLINE" || action === "REQUEST_INFO") && !reason) return { error: "Choose a reason first. The applicant gets a plain message with it.", field: "reason" };
  const message = action === "APPROVE" ? note : decisionMessage(reason, note);
  const r = await act(a.actor.id, id, action, message || undefined);
  if (!r.ok) return { error: r.error };
  touch(id);
  return { ok: true, done: action };
}

/* ───── A1 / A32 checklist ───── */
export async function checkAction(fd: FormData) {
  const item = str(fd, "item") as CheckItem;
  const a = await adminActor(item === "minors" ? "minors.clear" : item.startsWith("g") ? "guardians.decide" : "applications.decide"); if (!a.ok) return;
  await setCheck(a.actor.id, str(fd, "id"), item, str(fd, "on") === "1");
  touch(str(fd, "id"));
}

/* ───── A32 screening, orientation, reminder, sign-off ───── */
export async function screeningAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("minors.clear"); if (!a.ok) return { error: a.error };
  const state = str(fd, "state") as "CLEAR" | "CONSIDER" | "PENDING";
  if (!["CLEAR", "CONSIDER", "PENDING"].includes(state)) return { error: "Choose the screening result." };
  const r = await recordScreening(a.actor.id, a.actor.roles, str(fd, "id"), state, str(fd, "note"));
  if (!r.ok) return { error: r.error, field: "note" };
  touch(str(fd, "id"));
  return { ok: true, done: "screening" };
}
export async function orientationRecordAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("minors.clear"); if (!a.ok) return { error: a.error };
  const note = [str(fd, "date") && `Held ${str(fd, "date")}`, str(fd, "format"), str(fd, "ranBy") && `run by ${str(fd, "ranBy")}`, str(fd, "note")].filter(Boolean).join(". ");
  if (str(fd, "note").length < 10) return { error: "Add a note of at least 10 characters: who ran it and what was covered.", field: "note" };
  const r = await recordOrientation(a.actor.id, str(fd, "id"), note);
  if (!r.ok) return { error: r.error };
  touch(str(fd, "id"));
  return { ok: true, done: "orientation" };
}
export async function remindAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("minors.clear"); if (!a.ok) return { error: a.error };
  const r = await remindMentor(a.actor.id, str(fd, "id"));
  return r.ok ? { ok: true, done: "reminded" } : { error: r.error };
}
/** A32 "Clear for under 18": only when all five are done, signed with the reviewer's own legal name. */
export async function clearMinorsAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("minors.clear"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  if (str(fd, "decision") === "decline") {
    const reason = str(fd, "reason"); if (!reason) return { error: "Pick a reason for declining.", field: "reason" };
    await audit(a.actor.id, "application.minors.declined", "Application", id, null, { reason, note: str(fd, "note") });
    touch(id);
    return { ok: true, done: "declined" };
  }
  const norm = (s: string) => s.normalize("NFKD").replace(/\s+/g, " ").trim().toLowerCase();
  if (str(fd, "attest") !== "yes" || norm(str(fd, "legalName")) !== norm(a.actor.name)) return { error: "Sign with your own full legal name, as it is on your team account, and tick the box.", field: "legalName" };
  const r = await act(a.actor.id, id, "GRANT_MINORS");
  if (!r.ok) return { error: r.error };
  await audit(a.actor.id, "application.minors.signed", "Application", id, null, { typedLegalName: str(fd, "legalName"), at: new Date().toISOString() });
  touch(id);
  return { ok: true, done: "cleared" };
}

/* ───── A6 guardian spot check ───── */
export async function guardianDecisionAction(_: AState, fd: FormData): Promise<AState> {
  const a = await adminActor("guardians.decide"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id"); const flag = str(fd, "action") === "HOLD_GUARDIAN";
  const note = [str(fd, "method") && `Spot check: ${str(fd, "method")}`, flag ? decisionMessage(str(fd, "reason"), str(fd, "note")) : str(fd, "note")].filter(Boolean).join(". ");
  if (flag && !str(fd, "reason")) return { error: "Choose a reason to flag this authorization.", field: "reason" };
  const r = await act(a.actor.id, id, flag ? "HOLD_GUARDIAN" : "ACTIVATE_GUARDIAN", note || undefined);
  if (!r.ok) return { error: r.error };
  touch(id);
  return { ok: true, done: flag ? "flagged" : "activated" };
}
