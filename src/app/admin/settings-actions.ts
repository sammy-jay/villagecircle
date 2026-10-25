"use server";

import { revalidatePath } from "next/cache";
import { adminActor } from "@/lib/admin-ctx";
import { getConfig, saveConfig } from "@/lib/config";
import { revealContact, runBulk } from "@/lib/admin-ops";
import { audit } from "@/lib/audit";
import { WEIGHT_KEYS } from "@/lib/domain/admin-ops";

export type XState = { ok?: boolean; error?: string; field?: string; done?: string; [k: string]: unknown };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => Number.parseInt(str(fd, k), 10);

/* ───── A5 configuration ───── */
export async function configAction(_: XState, fd: FormData): Promise<XState> {
  const a = await adminActor("config"); if (!a.ok) return { error: a.error };
  const cur = await getConfig();
  const next = {
    weights: Object.fromEntries(WEIGHT_KEYS.map((k) => [k, fd.has(`w_${k}`) ? int(fd, `w_${k}`) : cur.weights[k]])) as typeof cur.weights,
    windows: { reviewBusinessDays: fd.has("reviewBusinessDays") ? int(fd, "reviewBusinessDays") : cur.windows.reviewBusinessDays, mentorReplyDays: fd.has("mentorReplyDays") ? int(fd, "mentorReplyDays") : cur.windows.mentorReplyDays, incidentOutcomeHours: fd.has("incidentOutcomeHours") ? int(fd, "incidentOutcomeHours") : cur.windows.incidentOutcomeHours },
  };
  const r = await saveConfig(a.actor.id, next);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/config");
  return { ok: true, done: "saved" };
}

/* ───── A21 search: show full contact details ───── */
export async function revealAction(_: XState, fd: FormData): Promise<XState> {
  const a = await adminActor("accounts.view"); if (!a.ok) return { error: a.error };
  const why = str(fd, "why"); if (!why) return { error: "Pick why you need it first.", field: "why" };
  const r = await revealContact(a.actor, str(fd, "userId"));
  if (!r.ok) return { error: r.error };
  await audit(a.actor.id, "search.reveal_reason", "User", str(fd, "userId"), undefined, { why });
  return { ok: true, done: "revealed", email: r.email, phone: r.phone };
}

/* ───── A22 bulk ───── */
export async function bulkAction(_: XState, fd: FormData): Promise<XState> {
  const a = await adminActor("bulk"); if (!a.ok) return { error: a.error };
  const action = str(fd, "action") as "ASSIGN" | "SET_EXPERTISE" | "REMIND";
  if (!["ASSIGN", "SET_EXPERTISE", "REMIND"].includes(action)) return { error: "Choose what to do." };
  const r = await runBulk(a.actor, action, fd.getAll("ask").map(String), { reviewerId: str(fd, "reviewerId") || undefined, expertise: str(fd, "expertise") ? [str(fd, "expertise")] : undefined });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/bulk"); revalidatePath("/admin/asks");
  return { ok: true, done: action, count: r.done, skipped: r.skipped.length };
}
