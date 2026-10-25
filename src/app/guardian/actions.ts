"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { guardianDecideAsk } from "@/lib/asks";
import { guardianApproveConnection, joinCall } from "@/lib/connections";
import { askTeamAboutOngoing, decideOngoing, guardianDataRequest, guardianPauseConnection, requestRecording, withdrawConsent } from "@/lib/safety-user";
import { setAttendance, setAttendancePref } from "@/lib/guardian-app";
import type { OngoingDecision } from "@/lib/domain/safety-user";

export type GState = { ok?: boolean; error?: string; field?: string; [k: string]: unknown };
const uid = async () => (await getSession())?.user?.id || redirect("/login?next=/guardian");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const touch = () => { revalidatePath("/guardian"); revalidatePath("/guardian/approvals"); };

/* ───── G1 / G2 step 1: the Ask itself ───── */
export async function decideAskAction(_: GState, fd: FormData): Promise<GState> {
  const askId = str(fd, "askId"); const approve = str(fd, "decision") === "approve";
  const r = await guardianDecideAsk(await uid(), askId, approve);
  if (!r.ok) return { error: r.error };
  touch();
  return { ok: true, decided: approve ? "approved" : "declined" };
}

/* ───── G2 steps 2 and 3: mentor and time ───── */
export async function approveConnectionAction(_: GState, fd: FormData): Promise<GState> {
  const askId = str(fd, "askId"); const approve = str(fd, "decision") !== "decline";
  const r = await guardianApproveConnection(await uid(), askId, { approve, time: str(fd, "time") || undefined, attends: str(fd, "attends") === "ATTEND" });
  if (!r.ok) return { error: r.error };
  touch(); revalidatePath("/guardian/recordings");
  redirect(`/guardian/approvals?done=${approve ? "booked" : "declined"}`);
}

/* ───── G1 attendance for a booked call, and the family default ───── */
export async function attendanceAction(fd: FormData) {
  await setAttendance(await uid(), str(fd, "askId"), str(fd, "attends") === "1");
  touch();
}
export async function attendancePrefAction(fd: FormData) {
  await setAttendancePref(await uid(), str(fd, "pref") === "ATTEND" ? "ATTEND" : "REACHABLE");
  revalidatePath("/guardian/authorizations"); revalidatePath("/guardian");
}

/* ───── G3 recordings and data ───── */
export async function requestRecordingAction(_: GState, fd: FormData): Promise<GState> {
  const r = await requestRecording(await uid(), str(fd, "connectionId"));
  return r.ok ? { ok: true } : { error: r.error };
}
export async function dataRequestAction(_: GState, fd: FormData): Promise<GState> {
  const kind = str(fd, "kind") === "DELETE" ? "DELETE" : "EXPORT";
  if (kind === "DELETE" && str(fd, "confirm") !== "DELETE") return { error: "Type DELETE to confirm.", field: "confirm" };
  const r = await guardianDataRequest(await uid(), str(fd, "participantId"), kind);
  return r.ok ? { ok: true, kind } : { error: r.error };
}

/* ───── G4 withdraw consent ───── */
export async function withdrawConsentAction(_: GState, fd: FormData): Promise<GState> {
  const why = [str(fd, "reason"), str(fd, "more")].filter(Boolean).join(". ");
  const r = await withdrawConsent(await uid(), str(fd, "participantId"), why || undefined);
  if (!r.ok) return { error: r.error };
  touch();
  redirect("/guardian/withdraw?done=1");
}

/* ───── G6 ongoing mentorship ───── */
export async function ongoingAction(_: GState, fd: FormData): Promise<GState> {
  const askId = str(fd, "askId");
  const r = await decideOngoing(await uid(), askId, str(fd, "decision") as OngoingDecision);
  if (!r.ok) return { error: r.error };
  touch();
  return { ok: true, decision: str(fd, "decision") };
}
export async function ongoingQuestionAction(_: GState, fd: FormData): Promise<GState> {
  const q = str(fd, "question");
  if (q.length < 5) return { error: "Write your question in a sentence.", field: "question" };
  const r = await askTeamAboutOngoing(await uid(), str(fd, "askId"), q);
  return r.ok ? { ok: true, asked: true } : { error: r.error };
}

/* ───── P07 / CL3 calls ───── */
export async function guardianJoinAction(_: GState, fd: FormData): Promise<GState> {
  const askId = str(fd, "askId");
  const r = await joinCall(await uid(), askId);
  if (!r.ok) return { error: r.error };
  redirect(`/guardian/asks/${askId}/room`);
}
/** CL3 "Pause this connection": ends the call for everyone and alerts the safeguarding lead. */
export async function pauseFromCallAction(fd: FormData) {
  const askId = str(fd, "askId");
  await guardianPauseConnection(await uid(), askId, "Paused from inside the call");
  touch();
  redirect(`/guardian/asks/${askId}/room?paused=1`);
}

/** CL3 "Step out, stay reachable": leaves the call; the conversation carries on. */
export async function stepOutAction(fd: FormData) {
  const askId = str(fd, "askId");
  await setAttendance(await uid(), askId, false);
  touch();
  redirect("/guardian?stepped=1");
}
