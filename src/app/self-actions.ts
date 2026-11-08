"use server";

import { formatBackground } from "@/components/account/options";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { answerCheckIn, createGoal, deleteGoal, setGoalProgress, toggleStep } from "@/lib/insight";
import { saveProfile, SHOW_KEYS } from "@/lib/participant-profile";
import { setPref, PREF_KEYS, type PrefKey } from "@/lib/notifications";
import { createHelpRequest } from "@/lib/admin-data";
import { cancelDeletion, requestDeletion, requestExport } from "@/lib/safety-user";

export type SelfState = { ok?: boolean; error?: string; field?: string; [k: string]: unknown };
const uid = async () => (await getSession())?.user?.id || redirect("/login");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/* ───── D17 / P06 goals ───── */
export async function addGoalAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const statement = str(fd, "statement");
  if (statement.length < 3) return { error: "Write your goal in a few words.", field: "statement" };
  const r = await createGoal(await uid(), { statement: statement.slice(0, 200), targetDate: str(fd, "targetDate") || undefined });
  if (!r.ok) return { error: r.error };
  revalidatePath("/goals");
  return { ok: true, n: Date.now() };
}
export async function goalProgressAction(fd: FormData) {
  await setGoalProgress(await uid(), str(fd, "id"), str(fd, "progress"));
  revalidatePath("/goals");
}
export async function deleteGoalAction(fd: FormData) {
  await deleteGoal(await uid(), str(fd, "id"));
  revalidatePath("/goals");
}
export async function stepAction(fd: FormData) {
  await toggleStep(await uid(), str(fd, "askId"), Number(str(fd, "index")), fd.get("done") === "1");
  revalidatePath("/goals");
}

/* ───── D22 check-in ───── */
export async function checkInAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const r = await answerCheckIn(await uid(), str(fd, "id"), str(fd, "answer"), [str(fd, "note"), str(fd, "feeling") && `Feeling: ${str(fd, "feeling")}`, str(fd, "feelingMore")].filter(Boolean).join(". "));
  if (!r.ok) return { error: r.error };
  revalidatePath("/goals/check-in");
  return { ok: true };
}

/* ───── N07 profile and privacy ───── */
export async function profileAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const cohort = str(fd, "cohort");
  const r = await saveProfile(await uid(), {
    cohort: cohort || null, region: str(fd, "region") || null, interests: fd.getAll("interests").map(String),
    goal: str(fd, "goal"), goalMore: str(fd, "goalMore"), background: formatBackground(fd.getAll("background").map(String), str(fd, "backgroundMore")),
    show: Object.fromEntries(SHOW_KEYS.map((k) => [k, fd.get(`show_${k}`) === "on"])),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/settings/profile"); revalidatePath("/me");
  return { ok: true, savedAt: new Date().toISOString() };
}

/* ───── N10 notification preferences ───── */
export async function prefsAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const id = await uid();
  for (const k of PREF_KEYS) await setPref(id, k as PrefKey, fd.get(k) === "on");
  revalidatePath("/settings/notifications");
  return { ok: true, savedAt: new Date().toISOString() };
}

/* ───── N11 contact the team ───── */
export async function contactAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const id = await uid();
  const about = [str(fd, "about"), str(fd, "aboutMore"), str(fd, "soon") && `How soon: ${str(fd, "soon")}`].filter(Boolean).join(". ");
  const message = str(fd, "message");
  if (message.length < 5) return { error: "Tell us a little more.", field: "message" };
  const r = await createHelpRequest({ fromUserId: id, fromRole: "PARTICIPANT", about: about || "General", message: message.slice(0, 1000) });
  if (!r.ok) return { error: r.error };
  return { ok: true, escalated: "escalated" in r ? r.escalated : false };
}

/* ───── D21 data ───── */
export async function exportAction(_: SelfState): Promise<SelfState> {
  const r = await requestExport(await uid());
  if (r.ok) revalidatePath("/settings/data");
  return r.ok ? { ok: true } : { error: r.error };
}
export async function deletionAction(_: SelfState, fd: FormData): Promise<SelfState> {
  const r = await requestDeletion(await uid(), { word: str(fd, "word"), email: str(fd, "email") });
  if (!r.ok) return { error: r.error };
  return { ok: true, until: r.purgeAfter.toISOString() }; // the form signs out on the client, then lands on P02-D2
}
export async function cancelDeletionAction() {
  await cancelDeletion(await uid());
  revalidatePath("/settings");
}
