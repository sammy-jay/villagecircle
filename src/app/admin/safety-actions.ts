"use server";

import { revalidatePath } from "next/cache";
import type { IncidentSeverity, IncidentState } from "@prisma/client";
import { adminActor } from "@/lib/admin-ctx";
import { moveIncident, resolveIncident, restoreConnection } from "@/lib/admin-incidents";
import { moderateItem, type ModAction } from "@/lib/admin-village";
import { handleDataRequest, markWaiting, replyToHelp, resendApproval } from "@/lib/admin-data";

export type SState = { ok?: boolean; error?: string; field?: string; done?: string };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ───── A11 incidents ───── */
export async function incidentMoveAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("safety.act"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  const r = await moveIncident(id, str(fd, "to") as IncidentState, a.actor, str(fd, "note") || undefined);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/incidents"); revalidatePath(`/admin/incidents/${id}`);
  return { ok: true, done: "moved" };
}
export async function incidentResolveAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("safety.act"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id");
  const r = await resolveIncident(id, a.actor, { outcome: str(fd, "outcome"), severity: (str(fd, "severity") || "MEDIUM") as IncidentSeverity, note: [str(fd, "note"), str(fd, "followUp") && `Follow-up: ${str(fd, "followUp")}`].filter(Boolean).join(". ") });
  if (!r.ok) return { error: r.error, field: "note" };
  revalidatePath("/admin/incidents"); revalidatePath(`/admin/incidents/${id}`); revalidatePath("/admin");
  return { ok: true, done: "resolved" };
}
export async function incidentRestoreAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("safety.act"); if (!a.ok) return { error: a.error };
  const r = await restoreConnection(str(fd, "id"), a.actor);
  if (!r.ok) return { error: r.error };
  revalidatePath(`/admin/incidents/${str(fd, "id")}`);
  return { ok: true, done: "restored" };
}

/* ───── A10 moderation ───── */
export async function moderateAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("moderation"); if (!a.ok) return { error: a.error };
  const action = str(fd, "action") as ModAction;
  if (!["APPROVE", "REJECT", "REMOVE", "EDIT", "ANONYMISE"].includes(action)) return { error: "Choose what to do." };
  const note = [str(fd, "reason"), str(fd, "note")].filter(Boolean).join(". ");
  if (action === "REJECT" && !str(fd, "reason")) return { error: "Choose a reason to reject.", field: "reason" };
  const r = await moderateItem(str(fd, "kind"), str(fd, "id"), action, a.actor.id, { note: note || undefined, body: str(fd, "body") || undefined });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/moderation"); revalidatePath("/admin");
  return { ok: true, done: action };
}

/* ───── A28 data requests ───── */
export async function dataRequestAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("data"); if (!a.ok) return { error: a.error };
  const action = str(fd, "action") as "CONFIRM" | "HOLD" | "RELEASE" | "DONE" | "DELETE_NOW";
  const r = await handleDataRequest(a.actor, str(fd, "key"), action, str(fd, "note") || undefined);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/data-requests");
  return { ok: true, done: action };
}

/* ───── A29 help requests ───── */
export async function helpReplyAction(_: SState, fd: FormData): Promise<SState> {
  const a = await adminActor("help"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id"); const intent = str(fd, "intent");
  const r = intent === "waiting" ? await markWaiting(a.actor, id) : intent === "resend" ? await resendApproval(a.actor, id) : await replyToHelp(a.actor, id, str(fd, "reply"));
  if (!r.ok) return { error: r.error, field: "reply" };
  revalidatePath("/admin/help");
  return { ok: true, done: intent || "reply" };
}
