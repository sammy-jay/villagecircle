"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReasonCode } from "@prisma/client";
import { adminActor } from "@/lib/admin-ctx";
import { buildShortlist, claimReview, confirmMentor, decideAsk, getReviewDetail, handMatchOptions, overrideShortlist, releaseToMentors, saveReview, saveSummary } from "@/lib/review";
import { audit } from "@/lib/audit";
import { notifyAdmins } from "@/lib/insight-admin";

export type QState = { ok?: boolean; error?: string; field?: string; done?: string; blocked?: string[] };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const touch = (id: string) => { revalidatePath("/admin/asks"); revalidatePath(`/admin/asks/${id}`); revalidatePath("/admin"); };

/* ───── A2 steps A to D ───── */
export async function claimAction(fd: FormData) {
  const a = await adminActor("asks.triage"); if (!a.ok) return;
  await claimReview(str(fd, "askId"), a.actor.id); touch(str(fd, "askId"));
}
export async function stepAction(fd: FormData) {
  const a = await adminActor("asks.triage"); if (!a.ok) return;
  const askId = str(fd, "askId"); const step = str(fd, "step");
  const d = await getReviewDetail(askId); if (!d) return;
  const cur = new Set(d.review?.stepsDone ?? []); if (cur.has(step)) cur.delete(step); else cur.add(step);
  await saveReview(askId, a.actor.id, { stepsDone: [...cur] }); touch(askId);
}
export async function scopeAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.triage"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId"); const len = Number(str(fd, "sessionLength"));
  const reason = str(fd, "reasonCode") as ReasonCode | "";
  const r = await saveReview(askId, a.actor.id, { expertiseNeeded: fd.getAll("expertise").map(String).filter(Boolean), sessionLength: len === 60 ? 60 : len === 30 ? 30 : undefined, withheld: str(fd, "withheld") ? str(fd, "withheld").split(",").map((s) => s.trim()) : undefined, reasonCode: reason || undefined });
  if (!r.ok) return { error: r.error };
  touch(askId); return { ok: true, done: "saved" };
}
export async function shortlistAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.triage"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId");
  const r = await buildShortlist(askId, { widen: str(fd, "widen") === "1", reviewerId: a.actor.id });
  if (!r.ok) return { error: r.error };
  touch(askId); return { ok: true, done: r.count ? "built" : "empty" };
}
export async function overrideAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.release"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId"); const mentorId = str(fd, "mentorId");
  if (!mentorId) return { error: "Choose a mentor.", field: "mentorId" };
  const note = [str(fd, "why"), str(fd, "note")].filter(Boolean).join(". ");
  const r = await overrideShortlist(askId, a.actor.id, mentorId, note);
  if (!r.ok) return { error: r.error, field: "note" };
  touch(askId); return { ok: true, done: "override" };
}

/** A2 reason code panel: route on to the summary, or return, answer, redirect, close or escalate. */
export async function decisionAction(_: QState, fd: FormData): Promise<QState> {
  const askId = str(fd, "askId"); const decision = str(fd, "decision");
  if (decision === "ROUTE") redirect(`/admin/asks/${askId}/compose`);
  const a = await adminActor(decision === "FLAG" ? "asks.triage" : "asks.release"); if (!a.ok) return { error: a.error };
  if (!["RETURN_FOR_INFO", "ANSWERED_BY_RESOURCE", "REDIRECT", "NOT_PROCEEDING", "FLAG"].includes(decision)) return { error: "Pick a reason code." };
  const links = str(fd, "linkTitle") ? [{ title: str(fd, "linkTitle"), url: str(fd, "linkUrl") || undefined }] : undefined;
  const r = await decideAsk(askId, a.actor.id, { decision: decision as "FLAG", note: str(fd, "note"), links });
  if (!r.ok) return { error: r.error, field: "note" };
  touch(askId); return { ok: true, done: decision };
}

/* ───── A8 steps E and F ───── */
export async function summaryAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.release"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId"); const approve = str(fd, "intent") !== "save";
  const r = await saveSummary(askId, a.actor.id, { question: str(fd, "question"), whatWouldHelp: str(fd, "help"), sessionLength: str(fd, "sessionLength") === "60" ? 60 : 30, approve, withheld: str(fd, "withheld") ? str(fd, "withheld").split(",").map((s) => s.trim()).filter(Boolean) : undefined });
  touch(askId);
  if (!r.ok) return { error: r.error, blocked: "blocked" in r && r.blocked ? [...r.blocked.contact.map((c) => c.match ?? String(c)), ...r.blocked.identifiers] : undefined };
  return { ok: true, done: approve ? "approved" : "saved" };
}
export async function releaseAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.release"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId");
  const r = await releaseToMentors(askId, a.actor.id, fd.getAll("mentor").map(String));
  if (!r.ok) return { error: r.error };
  touch(askId); return { ok: true, done: `released-${r.released}` };
}

/* ───── A9 step forward ───── */
export async function confirmAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.release"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId"); const mentorId = str(fd, "mentorId");
  if (!mentorId) return { error: "Choose the mentor to confirm." };
  const r = await confirmMentor(askId, a.actor.id, mentorId);
  if (!r.ok) return { error: r.error };
  if (str(fd, "why")) await audit(a.actor.id, "ask.mentor_choice_reason", "Ask", askId, null, { mentorId, why: str(fd, "why"), note: str(fd, "note") });
  touch(askId); return { ok: true, done: "confirmed" };
}

/* ───── A26 hand-match ───── */
export async function handMatchAction(_: QState, fd: FormData): Promise<QState> {
  const action = str(fd, "action") as "WIDEN" | "ASK_PERSONALLY" | "SUGGEST_RESOURCE" | "LOG_AND_WAIT";
  const a = await adminActor(action === "WIDEN" || action === "LOG_AND_WAIT" ? "asks.triage" : "asks.release"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId");
  const note = [str(fd, "reason"), str(fd, "note")].filter(Boolean).join(". ");
  const r = await handMatchOptions(askId, a.actor.id, action, { mentorId: str(fd, "mentorId") || undefined, note });
  if (!r.ok) return { error: r.error };
  touch(askId); return { ok: true, done: action };
}

/* ───── A31 "Something wrong with this record?" ───── */
export async function recordIssueAction(_: QState, fd: FormData): Promise<QState> {
  const a = await adminActor("asks.view"); if (!a.ok) return { error: a.error };
  const askId = str(fd, "askId"); const what = str(fd, "what");
  if (!what) return { error: "Pick what looks wrong.", field: "what" };
  await audit(a.actor.id, "ask.record_issue", "Ask", askId, null, { what, note: str(fd, "note") });
  await notifyAdmins("ask.record_issue", "A record needs checking", `${what}${str(fd, "note") ? `: ${str(fd, "note")}` : ""}`, `/admin/asks/${askId}/record`);
  return { ok: true, done: "sent" };
}
