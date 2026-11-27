"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { appealDecline, applyView, completeOrientationModule, replyToInfoRequest, saveDraft, saveSign, saveStep, submit } from "@/lib/mentor";
import { mentorRespond } from "@/lib/mentor-asks";
import { acceptCodeOfConduct, requestMinorsClearance, setMinorsOptIn, startEnhancedScreening, updateProfile } from "@/lib/mentor-profile";
import { discloseChange, reaffirm } from "@/lib/reaffirm";
import { raiseOneHour, saveAvailability, saveResourceDraft, submitResource, type Draft } from "@/lib/insight";
import { completeConversation, joinCall, mentorChangeTime } from "@/lib/connections";
import { proposeTalk, setMentorListed, volunteerForEvent } from "@/lib/village";

export type MState = { ok?: boolean; error?: string; field?: string; [k: string]: unknown };
const uid = async () => (await getSession())?.user?.id || redirect("/login?next=/mentor");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const all = (fd: FormData, k: string) => fd.getAll(k).map((v) => String(v).trim()).filter(Boolean);
const ip = () => headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
const list = (s: string) => s.split(/[,;]| and /).map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 8);

/* ───── M5–M8 / DK7–DK10 apply ───── */
function stepData(step: number, fd: FormData) {
  if (step === 1) return {
    phone: str(fd, "phone").replace(/[\s()-]/g, ""), country: str(fd, "country"), countryOfOrigin: str(fd, "countryOfOrigin") || undefined, languages: list(str(fd, "languages")),
    region: str(fd, "region") || undefined, languagesMore: str(fd, "languagesMore") || undefined, timeZone: str(fd, "timeZone") || undefined, experience: str(fd, "experience") || undefined,
    heard: str(fd, "heard") || undefined, heardMore: str(fd, "heardMore") || undefined,
  };
  return {
    primaryExpertise: str(fd, "primaryExpertise"), extraExpertise: [], expertiseOther: str(fd, "expertiseOther") || undefined, linkedinUrl: str(fd, "linkedinUrl") ? (/^https?:/.test(str(fd, "linkedinUrl")) ? str(fd, "linkedinUrl") : `https://${str(fd, "linkedinUrl")}`) : "",
    monthlyHours: Number(str(fd, "monthlyHours") || 1), conversationLength: str(fd, "conversationLength") === "30" ? 30 : 60, optedForMinors: str(fd, "optedForMinors") === "yes",
    areas: all(fd, "areas"), seniority: str(fd, "seniority") || undefined,
  };
}

export async function applyStepAction(_: MState, fd: FormData): Promise<MState> {
  const userId = await uid(); const step = Number(str(fd, "step"));
  const intent = str(fd, "intent"); // "continue" | "draft" | "close"
  if (intent === "draft" || intent === "close") {
    const raw = Object.fromEntries([...fd.keys()].filter((k) => !k.startsWith("$") && k !== "intent").map((k) => [k, fd.getAll(k).length > 1 ? all(fd, k) : str(fd, k)]));
    await saveDraft(userId, { [`s${step}`]: raw, ...(step === 1 ? { bio: str(fd, "bio") } : {}) });
    if (intent === "close") redirect("/?draft=saved");
    revalidatePath("/mentor/apply");
    return { ok: true, saved: Date.now() };
  }
  if (step === 1) {
    const bio = str(fd, "bio");
    if (bio.length < 80) return { error: "Tell us a little more in your bio (at least 80 characters).", field: "bio" };
    if (bio.length > 600) return { error: "Please keep your bio to 600 characters.", field: "bio" };
    await saveDraft(userId, { bio, s1: null });
    const r = await saveStep(userId, 1, stepData(1, fd));
    if (!r.ok) { const [field, error] = Object.entries(r.errors)[0] ?? ["form", "Check the form."]; return { error, field }; }
    redirect("/mentor/apply?step=2");
  }
  if (step === 2) {
    const v = await applyView(userId); const bio = String((v?.draft as { bio?: string } | null)?.bio ?? (v?.step2 as { bio?: string } | null)?.bio ?? "");
    if (!all(fd, "areas").length) return { error: "Pick at least one area you can help with.", field: "areas" };
    const r = await saveStep(userId, 2, { ...stepData(2, fd), bio });
    if (!r.ok) { const [field, error] = Object.entries(r.errors)[0] ?? ["form", "Check the form."]; return { error: field === "bio" ? `Your bio on step 1: ${error}` : error, field }; }
    await saveDraft(userId, { s2: null });
    redirect("/mentor/apply?step=3");
  }
  if (step === 3) {
    const s = await getSession(); const commitments = ["c1", "c2", "c3", "c4"].every((k) => str(fd, k) === "yes");
    const r = await saveSign(userId, s?.user?.name ?? "", { commitments, typedLegalName: str(fd, "legalName"), understood: str(fd, "attest") === "yes" });
    if (!r.ok) return { error: r.error, field: commitments ? "legalName" : "commitments" };
    redirect("/mentor/apply?step=4");
  }
  return { error: "Something went wrong. Go back a step and try again." };
}

export async function submitApplicationAction(_: MState): Promise<MState> {
  const userId = await uid();
  const v = await applyView(userId); if (!v) redirect("/login");
  if (!v.step1) return { error: "Finish step 1 first.", step: 1 };
  if (!v.step2) return { error: "Finish step 2 first.", step: 2 };
  if (!v.sign) return { error: "Sign step 3 first.", step: 3 };
  const r = await submit(userId, v.user.name, v.user.dateOfBirth, { attestationAffirmed: true, typedLegalName: v.sign.typedLegalName, acceptCodeOfConduct: true }, ip());
  if (!r.ok) {
    const msg: Record<string, string> = { UNDER_21: "Mentors must be 21 or older.", INCOMPLETE: "A step is missing. Go back and check each one.", NAME_MISMATCH: "Your signature must match the legal name on your account.", NO_DRAFT: "This application has already been sent.", SUPERSEDED: "The statement has changed. Sign step 3 again." };
    return { error: msg[r.error] ?? "Check each step and try again." };
  }
  revalidatePath("/mentor");
  redirect("/mentor/application?sent=1");
}

/* ───── DK11 / M14 status, EX10 appeal, DK12 / M15 orientation ───── */
export async function infoReplyAction(_: MState, fd: FormData): Promise<MState> {
  const r = await replyToInfoRequest(await uid(), str(fd, "reply"));
  if (!r.ok) return { error: r.error, field: "reply" };
  revalidatePath("/mentor/application");
  return { ok: true };
}
export async function appealAction(_: MState, fd: FormData): Promise<MState> {
  const r = await appealDecline(await uid(), str(fd, "kind"), str(fd, "note"));
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor/application");
  return { ok: true };
}
export async function conductAction(fd: FormData) {
  if (str(fd, "accept") !== "yes") return;
  await acceptCodeOfConduct(await uid(), ip());
  revalidatePath("/mentor/orientation");
}
export async function orientationVideoAction(_: MState, fd: FormData): Promise<MState> {
  const s = await getSession();
  if (!s?.user?.id || !s.user.roles.includes("MENTOR")) return { error: "Sign in with a mentor account to continue." };
  const result = await completeOrientationModule(s.user.id, str(fd, "moduleId"));
  if (!result.ok) return { error: result.error };
  revalidatePath("/mentor/orientation");
  revalidatePath("/mentor");
  if (result.completed) redirect("/mentor");
  return { ok: true };
}

/* ───── D6 / D27 / EX13 responding to an Ask ───── */
export async function respondAction(_: MState, fd: FormData): Promise<MState> {
  const userId = await uid(); const askId = str(fd, "askId"); const action = str(fd, "action");
  if (action === "STEP_FORWARD") {
    const times = all(fd, "times");
    if (!times.length) return { error: "Offer at least one time.", field: "times" };
    const r = await mentorRespond(userId, askId, { action: "STEP_FORWARD", times: times.map((t) => new Date(t).toISOString()) });
    if (!r.ok) return { error: r.error };
    revalidatePath("/mentor");
    redirect(`/mentor/responses?done=stepped`);
  }
  if (action === "REFER_ON") {
    const note = str(fd, "note"); const reason = str(fd, "reason");
    if (!reason && note.length < 3) return { error: "Choose a reason or add a short note.", field: "reason" };
    const r = await mentorRespond(userId, askId, { action: "REFER_ON", note, colleague: str(fd, "colleague") || undefined, reason: reason || undefined });
    if (!r.ok) return { error: r.error };
    revalidatePath("/mentor");
    redirect(`/mentor?done=returned`);
  }
  const r = await mentorRespond(userId, askId, { action: "PASS" });
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor");
  redirect(`/mentor?done=passed`);
}
/** One-press Pass from the inbox card. */
export async function passAction(fd: FormData) {
  await mentorRespond(await uid(), str(fd, "askId"), { action: "PASS" });
  revalidatePath("/mentor");
  redirect("/mentor?done=passed");
}

/* ───── CL4 / EX2 / D8 a booked conversation ───── */
export async function mentorJoinAction(_: MState, fd: FormData): Promise<MState> {
  const askId = str(fd, "askId");
  const r = await joinCall(await uid(), askId);
  if (!r.ok) return { error: r.error };
  redirect(`/mentor/conversations/${askId}/room`);
}
export async function mentorLeaveAction(fd: FormData) {
  redirect(`/mentor/conversations/${str(fd, "askId")}?after=1`);
}
export async function changeTimeAction(_: MState, fd: FormData): Promise<MState> {
  const askId = str(fd, "askId"); const action = str(fd, "action") === "HAND_BACK" ? "HAND_BACK" : "OFFER";
  const times = all(fd, "times");
  if (action === "OFFER" && !times.length) return { error: "Pick at least one new time.", field: "times" };
  const note = [str(fd, "reason"), str(fd, "note")].filter(Boolean).join(". ");
  const r = await mentorChangeTime(await uid(), askId, { action, times: times.map((t) => new Date(t).toISOString()), note: note || undefined });
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor");
  redirect(`/mentor?done=${action === "HAND_BACK" ? "handed" : "moved"}`);
}
export async function completeAction(_: MState, fd: FormData): Promise<MState> {
  const askId = str(fd, "askId"); const fb = Number(str(fd, "feedback"));
  const r = await completeConversation(await uid(), askId, { notes: str(fd, "notes"), nextSteps: str(fd, "nextSteps") || str(fd, "next"), feedback: fb >= 1 && fb <= 5 ? fb : undefined, minutes: Number(str(fd, "minutes")) || undefined, next: (["END", "FOLLOW_UP", "ONGOING"] as const).find((x) => x === str(fd, "next")) });
  if (!r.ok) return { error: r.error, field: "notes" };
  revalidatePath("/mentor"); revalidatePath("/mentor/impact");
  return { ok: true };
}

/* ───── D23 / EX12 / D7 hours and settings ───── */
export async function availabilityAction(_: MState, fd: FormData): Promise<MState> {
  const r = await saveAvailability(await uid(), { monthlyHours: Number(str(fd, "monthlyHours")), length: Number(str(fd, "length")), grid: all(fd, "grid"), paused: str(fd, "paused") === "on" || str(fd, "paused") === "yes" });
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor/availability"); revalidatePath("/mentor/settings");
  return { ok: true, saved: Date.now() };
}
export async function raiseHourAction(_: MState): Promise<MState> {
  const r = await raiseOneHour(await uid());
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor/availability");
  return { ok: true };
}
export async function listedAction(fd: FormData) {
  await setMentorListed(await uid(), str(fd, "listed") === "on");
  revalidatePath("/mentor/settings"); revalidatePath("/mentor/profile");
}

/* ───── P04 / EX11 / D7 re-affirmation ───── */
export async function reaffirmAction(_: MState, fd: FormData): Promise<MState> {
  if (str(fd, "affirm") !== "yes") return { error: "Tick the statement box to affirm.", field: "affirm" };
  const r = await reaffirm(await uid(), { affirmed: str(fd, "attest") === "yes", typedLegalName: str(fd, "legalName") }, ip());
  if (!r.ok) return { error: r.error, field: "legalName" };
  revalidatePath("/mentor"); revalidatePath("/mentor/settings");
  const back = str(fd, "back");
  if (back) return { ok: true };
  redirect("/mentor/reaffirm?done=1");
}
export async function discloseAction(_: MState, fd: FormData): Promise<MState> {
  const r = await discloseChange(await uid(), str(fd, "note"));
  if (!r.ok) return { error: r.error, field: "note" };
  revalidatePath("/mentor/reaffirm");
  redirect("/mentor/reaffirm");
}

/* ───── D28 profile and privacy ───── */
export async function profileAction(_: MState, fd: FormData): Promise<MState> {
  const linkedin = str(fd, "linkedinUrl");
  const r = await updateProfile(await uid(), {
    bio: str(fd, "bio"), primaryExpertise: str(fd, "primaryExpertise"), extraExpertise: all(fd, "extraExpertise").slice(0, 2), expertiseOther: str(fd, "expertiseOther") || undefined,
    languages: list(str(fd, "languages")), linkedinUrl: linkedin ? (/^https?:/.test(linkedin) ? linkedin : `https://${linkedin}`) : "",
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor/profile");
  return { ok: true, saved: Date.now() };
}
export async function minorsAction(fd: FormData) {
  const userId = await uid(); const what = str(fd, "what");
  if (what === "on" || what === "off") await setMinorsOptIn(userId, what === "on");
  else if (what === "screening") await startEnhancedScreening(userId);
  else if (what === "conduct") await acceptCodeOfConduct(userId, ip());
  else if (what === "request") await requestMinorsClearance(userId);
  revalidatePath("/mentor/profile");
}

/* ───── D24 / P03 resources ───── */
const draftOf = (fd: FormData): Draft => ({ type: str(fd, "type"), title: str(fd, "title"), body: str(fd, "body"), topic: str(fd, "topic"), cohort: str(fd, "cohort"), credit: str(fd, "credit"), askId: str(fd, "askId") });
export async function resourceAction(_: MState, fd: FormData): Promise<MState> {
  const userId = await uid(); const d = draftOf(fd);
  if (str(fd, "intent") === "draft") { await saveResourceDraft(userId, d); return { ok: true, draft: Date.now() }; }
  const r = await submitResource(userId, d);
  if (!r.ok) return { error: r.error, field: "field" in r ? r.field : undefined };
  revalidatePath("/mentor/resources");
  redirect("/mentor/resources?sent=1");
}

/* ───── D26 volunteer ───── */
export async function volunteerAction(_: MState, fd: FormData): Promise<MState> {
  const r = await volunteerForEvent(await uid(), str(fd, "eventId"), str(fd, "role"));
  if (!r.ok) return { error: r.error };
  revalidatePath("/mentor/volunteer");
  return { ok: true };
}
export async function talkAction(_: MState, fd: FormData): Promise<MState> {
  const r = await proposeTalk(await uid(), str(fd, "note"));
  if (!r.ok) return { error: r.error, field: "note" };
  return { ok: true, talk: true };
}
