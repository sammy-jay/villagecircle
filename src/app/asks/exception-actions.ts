"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { askTeamForDifferentMentor, requestChange, requestNewTimes, stuckReport } from "@/lib/connections";
import { giveBackInterest } from "@/lib/village";

export type ExState = { ok?: boolean; error?: string; field?: string };
const uid = async () => (await getSession())?.user?.id || redirect("/login");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** EX1: ask for another time, or cancel. The mentor never sees the reason. */
export async function changeAction(_: ExState, fd: FormData): Promise<ExState> {
  const askId = str(fd, "askId"); const kind = str(fd, "kind") === "CANCEL" ? "CANCEL" : "RESCHEDULE";
  const r = await requestChange(await uid(), askId, { kind, reason: str(fd, "reason") || undefined, note: str(fd, "note") || undefined });
  if (!r.ok) return { error: r.error };
  revalidatePath("/asks"); revalidatePath(`/asks/${askId}`);
  redirect(`/asks/${askId}?changed=${kind.toLowerCase()}`);
}

/** EX3: after a missed call, ask for new times or a different mentor. */
export async function missedAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  if (str(fd, "choice") === "other") await askTeamForDifferentMentor(id, askId); else await requestNewTimes(id, askId);
  revalidatePath(`/asks/${askId}`);
  redirect(`/asks/${askId}?rebook=1`);
}

/** EX4: "Tell the team I am stuck". */
export async function stuckAction(_: ExState, fd: FormData): Promise<ExState> {
  const r = await stuckReport(await uid(), str(fd, "askId"));
  return r.ok ? { ok: true } : { error: r.error };
}

/** EX17 Give back: a note of interest to the team, nothing more. */
export async function giveBackAction(_: ExState, fd: FormData): Promise<ExState> {
  const topics = [str(fd, "topic"), str(fd, "how")].filter(Boolean);
  const r = await giveBackInterest(await uid(), topics, [str(fd, "topicMore"), str(fd, "howMore")].filter(Boolean).join(". "));
  return r.ok ? { ok: true } : { error: r.error };
}
