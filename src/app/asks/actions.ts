"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { changeTopic, closeAsAnswered, getOwnAsk, reopenAsk, saveAnswers, startAsk, submitAsk, withdrawAsk } from "@/lib/asks";
import { CONTINUE_AT, PROMPTS } from "@/lib/domain/ask-answers";
import { sendMessage } from "@/lib/ask-thread";
import { joinCall, pickTime, reportOutcome, requestFollowUp, requestNewTimes, submitThanks } from "@/lib/connections";
import { createGoal, submitOffer } from "@/lib/insight";
import { detectContactDetails } from "@/lib/domain/contact-detect";

export type AskFormState = { ok?: boolean; error?: string; field?: string; completeness?: number; savedAt?: string };
const uid = async () => (await getSession())?.user?.id || redirect("/login?next=/asks/new");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || undefined;
const len = (fd: FormData) => (str(fd, "sessionLength") === "30" ? 30 : 60);
const SOON = ["week", "month", "term", "flexible"] as const;
const soonOf = (fd: FormData) => (SOON as readonly string[]).includes(str(fd, "soon")) ? (str(fd, "soon") as (typeof SOON)[number]) : undefined;
const contactIn = (s: string) => detectContactDetails(s).length > 0;
const edit = (id: string, step: string) => `/asks/${id}/edit?step=${step}`;

/** D2a Quick Ask: the question, a topic and a length. Starts the draft, then the wizard asks for the rest. */
export async function quickAskAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid();
  const q1 = str(fd, "q1"); const topic = str(fd, "topic");
  if (q1.length < 10) return { error: "Write your question in a sentence or two.", field: "q1" };
  if (!topic) return { error: "Pick the closest topic.", field: "topic" };
  const s = await startAsk(id, topic); if (!s.ok) return { error: s.error };
  const soon = soonOf(fd);
  await saveAnswers(id, s.id, { q1, sessionLength: len(fd), soon, soonMore: opt(fd, "soonMore"), timeBound: soon === "week" || soon === "month" });
  revalidatePath("/asks");
  redirect(fd.get("intent") === "save" ? "/asks" : edit(s.id, "tell"));
}

/** D10 step 1: pick or change the topic. */
export async function topicAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid();
  const topic = str(fd, "topic"); const askId = str(fd, "askId");
  if (!topic) return { error: "Pick the closest topic.", field: "topic" };
  let target = askId;
  if (askId) { const r = await changeTopic(id, askId, topic); if (!r.ok) return { error: r.error }; }
  else { const s = await startAsk(id, topic); if (!s.ok) return { error: s.error }; target = s.id; }
  redirect(fd.get("intent") === "save" ? "/asks" : edit(target, "tell"));
}

/** D2 step 2: the three prompts and the quick details. Continue needs the 80% line. */
export async function tellAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const soon = soonOf(fd);
  if (str(fd, "topic")) await changeTopic(id, askId, str(fd, "topic")); // only changes while a draft
  const r = await saveAnswers(id, askId, {
    q1: str(fd, "q1"), q2: str(fd, "q2"), q3: str(fd, "q3"), sessionLength: len(fd),
    stage: opt(fd, "stage"), soon, soonMore: opt(fd, "soonMore"), timeBound: soon === "week" || soon === "month",
    mentorType: opt(fd, "mentorType"), mentorTypeMore: opt(fd, "mentorTypeMore"), preferredMentorName: opt(fd, "preferredMentorName"),
  });
  if (!r.ok) return { error: r.error };
  const intent = String(fd.get("intent") ?? "continue");
  if (intent === "save") return { ok: true, completeness: r.completeness, savedAt: new Date().toISOString() };
  if (intent === "back") redirect(edit(askId, "topic"));
  if (r.completeness < CONTINUE_AT) {
    const a = await getOwnAsk(id, askId);
    const thin = a ? PROMPTS.find((p) => (a.ask.answers[p.key] ?? "").trim().split(/\s+/).length < 5 || (a.ask.answers[p.key] ?? "").trim().length < 25) : undefined;
    return { error: thin?.nudge ?? "A little more please.", field: thin?.key, completeness: r.completeness };
  }
  redirect(edit(askId, "read"));
}

/** D11 step 3: "Yes, close my Ask as answered". */
export async function answeredAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  const r = await closeAsAnswered(id, askId);
  if (!r.ok) redirect(edit(askId, "read"));
  revalidatePath("/asks");
  redirect(`/asks/${askId}`);
}

/** D12 step 4: both promises ticked, then submit. Minors go to their guardian, adults to the team, crisis wording to EX9. */
export async function sendAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  if (fd.has("sessionLength") || fd.has("soon") || fd.has("bestDays")) {
    const soon = soonOf(fd);
    await saveAnswers(id, askId, { sessionLength: len(fd), ...(soon ? { soon, timeBound: soon === "week" || soon === "month" } : {}), bestDays: opt(fd, "bestDays"), bestDaysMore: opt(fd, "bestDaysMore") });
  }
  if (fd.get("intent") === "save") { revalidatePath("/asks"); redirect("/asks"); }
  if (fd.get("intent") === "back") redirect(edit(askId, "read"));
  if (fd.has("needsChecks") && (fd.get("noContact") !== "on" || fd.get("understand") !== "on")) return { error: "Tick both boxes before you send.", field: "checks" };
  const r = await submitAsk(id, askId);
  if (!r.ok) return { error: r.error };
  revalidatePath("/asks"); revalidatePath("/home");
  redirect(r.next === "CRISIS" ? "/crisis?from=ask" : `/asks/${askId}/sent`);
}

/** N05-D2 Withdraw. */
export async function withdrawAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const r = await withdrawAsk(id, askId, [str(fd, "reason"), str(fd, "more")].filter(Boolean).join(". ") || undefined);
  if (!r.ok) return { error: r.error };
  revalidatePath("/asks"); revalidatePath("/home");
  redirect(`/asks/${askId}?withdrawn=1`);
}

/* ───── N08 thread ───── */
export type ThreadState = { ok?: boolean; error?: string; blocked?: boolean; draft?: string; n?: number };
export async function sendMessageAction(prev: ThreadState, fd: FormData): Promise<ThreadState> {
  const id = await uid(); const askId = str(fd, "askId"); const body = str(fd, "body");
  const r = await sendMessage(id, askId, body);
  if (!r.ok) return { error: r.error, blocked: "blocked" in r ? r.blocked : false, draft: body };
  revalidatePath(`/asks/${askId}/thread`);
  return { ok: true, n: (prev.n ?? 0) + 1 };
}

/* ───── D14 pick a time ───── */
export async function pickTimeAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId"); const time = str(fd, "time");
  if (!time) return { error: "Pick one of the times first.", field: "time" };
  const r = await pickTime(id, askId, time);
  if (!r.ok) return { error: r.error };
  revalidatePath("/asks"); revalidatePath("/home");
  redirect(`/asks/${askId}?picked=1`);
}
export async function newTimesAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const r = await requestNewTimes(id, askId);
  return r.ok ? { ok: true } : { error: r.error };
}

/* ───── EX8 reopen, EX5 update and send back ───── */
export async function reopenAction(fd: FormData) {
  const id = await uid();
  const r = await reopenAsk(id, str(fd, "askId"));
  if (!r.ok) redirect(`/asks/${str(fd, "askId")}`);
  revalidatePath("/asks");
  redirect(`/asks/${r.id}/edit?step=${str(fd, "step") || "tell"}`);
}
export async function resubmitAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const r = await saveAnswers(id, askId, { q1: str(fd, "q1"), q2: str(fd, "q2"), q3: str(fd, "q3") });
  if (!r.ok) return { error: r.error };
  if (fd.get("intent") === "save") return { ok: true, completeness: r.completeness, savedAt: new Date().toISOString() };
  if (r.completeness < CONTINUE_AT) return { error: "Reach the 80% line to send it back.", completeness: r.completeness };
  const s = await submitAsk(id, askId);
  if (!s.ok) return { error: s.error };
  revalidatePath("/asks");
  redirect(s.next === "CRISIS" ? "/crisis?from=ask" : `/asks/${askId}/sent`);
}

/* ───── CL1 / CL2 calls ───── */
export async function joinAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const r = await joinCall(id, askId);
  if (!r.ok) return { error: r.error };
  redirect(`/asks/${askId}/room`);
}
export async function leaveAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  await reportOutcome(id, askId, "HAPPENED");
  redirect(`/asks/${askId}/after`);
}

/* ───── D16 after the call, N04 thanks ───── */
const HELPED = { YES: "YES", LITTLE: "LITTLE", NOT_REALLY: "NOT_REALLY" } as const;
export async function afterAction(_: AskFormState, fd: FormData): Promise<AskFormState> {
  const id = await uid(); const askId = str(fd, "askId");
  const helped = HELPED[str(fd, "helped") as keyof typeof HELPED];
  if (contactIn(str(fd, "body"))) return { error: "Take out phone numbers, emails or handles first.", field: "body" };
  const r = await submitThanks(id, askId, { body: str(fd, "body"), share: fd.get("share") === "on", helped, tags: fd.getAll("tag").map(String) });
  if (!r.ok) return { error: r.error };
  const steps = fd.getAll("step").map(String).map((s) => s.trim()).filter(Boolean);
  for (const s of steps) await createGoal(id, { statement: s.slice(0, 200), askId });
  revalidatePath("/goals"); revalidatePath(`/asks/${askId}`);
  redirect(fd.get("next") === "thanks" ? `/asks/${askId}?thanked=1` : `/asks/${askId}/after?sent=1`);
}
export async function followUpAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  await requestFollowUp(id, askId, "FOLLOW_UP");
  revalidatePath(`/asks/${askId}`);
  redirect(`/asks/${askId}?followup=1`);
}

/* ───── EX18 goals offer ───── */
export async function offerAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  const choice = str(fd, "choice") === "ONGOING" ? "ONGOING" : "GOALS";
  await submitOffer(id, askId, choice);
  redirect(`/asks/${askId}/offer?sent=${choice.toLowerCase()}`);
}
export async function outcomeAction(fd: FormData) {
  const id = await uid(); const askId = str(fd, "askId");
  const outcome = str(fd, "outcome") === "PROBLEM" ? "PROBLEM" : "HAPPENED";
  await reportOutcome(id, askId, outcome);
  redirect(outcome === "PROBLEM" ? `/report?ask=${askId}` : `/asks/${askId}/after`);
}
