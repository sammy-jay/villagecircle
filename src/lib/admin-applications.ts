import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./integrations/email";
import { canCheck, canReview, type CheckItem, type ReviewAction } from "./domain/application-review";
import type { ScreeningState } from "./domain/mentor-application";
import { esc } from "./account";
import { afterMinorsDecision } from "./mentor-profile";
import { isConfigured } from "./integrations/status";
import { reaffirmDates } from "./reaffirm";
import { notify } from "./notify";

export async function act(reviewerId: string, id: string, action: ReviewAction, note?: string) {
  const app = await db.application.findUnique({ where: { id }, include: { applicant: true, attestation: true } });
  if (!app || (app.type !== "MENTOR" && app.type !== "GUARDIAN")) return { ok: false as const, error: "Application not found." };
  const mentor = app.type === "MENTOR" ? await db.mentorProfile.findUnique({ where: { userId: app.applicantId } }) : null;
  const due = (await reaffirmDates(app.applicantId)).nextDueAt; const attCurrent = !!due && due.getTime() > Date.now();
  const screening = (app.screeningState === "CLEAR" ? "CLEAR" : app.screeningState === "CONSIDER" ? "CONSIDER" : app.screeningState ? "PENDING" : "NONE") as ScreeningState;
  const chk = canReview({ type: app.type, state: app.state, applicantId: app.applicantId }, action, reviewerId, {
    note, mentor: mentor ? { optedForMinors: mentor.optedForMinors, screening, orientationDone: !!mentor.orientationDoneAt, codeOfConduct: !!mentor.codeOfConductAt, attestationCurrent: attCurrent } : undefined });
  if (!chk.ok) return chk;

  const before = { state: app.state }; const now = new Date(); const to = app.applicant.email; const first = esc(app.applicant.name.split(" ")[0]);
  const mail = (subject: string, body: string) => sendEmail({ to, subject, html: `<p>Hi ${first},</p>${body}` }).catch(() => {});
  switch (action) {
    case "START_REVIEW": await db.application.update({ where: { id }, data: { state: "IN_REVIEW", decidedById: reviewerId } }); break;
    case "APPROVE":
      await db.application.update({ where: { id }, data: { state: "APPROVED", decision: "APPROVED", decidedById: reviewerId, decidedAt: now, decisionNote: note ?? null } });
      await db.mentorProfile.update({ where: { userId: app.applicantId }, data: { verification: "APPROVED" } }); // BR-01 still needs orientation + screening before Asks
      await mail("Your application is approved", `<p>Welcome to the village. Two steps remain before Asks can reach you: background screening and a short safeguarding orientation.</p>`); break;
    case "REQUEST_INFO":
      await db.application.update({ where: { id }, data: { state: "IN_REVIEW", decision: "V-EVIDENCE", decidedById: reviewerId, decisionNote: note } });
      await mail("A quick question about your application", `<p>${esc(note!)}</p><p>Reply within 14 days so we can keep your application open.</p>`); break;
    case "DECLINE":
      await db.application.update({ where: { id }, data: { state: "DECLINED", decision: "DECLINED", decidedById: reviewerId, decidedAt: now, decisionNote: note } });
      await mail("About your application", `<p>${esc(note!)}</p><p>You can appeal from your application page.</p>`); break;
    case "GRANT_MINORS": await db.mentorProfile.update({ where: { userId: app.applicantId }, data: { clearedForMinors: true } }); await afterMinorsDecision(app.applicantId, true); break;
    case "ACTIVATE_GUARDIAN":
      await db.application.update({ where: { id }, data: { state: "APPROVED", decision: "V-GUARD", decidedById: reviewerId, decidedAt: now } });
      await db.user.update({ where: { id: app.applicantId }, data: { status: "ACTIVE" } });
      await mail("Your account is open", `<p>Your guardian has authorized your account and our team has checked it. You can sign in and send your first Ask.</p>`); break;
    case "HOLD_GUARDIAN":
      await db.application.update({ where: { id }, data: { state: "IN_REVIEW", decidedById: reviewerId, decisionNote: note } }); break;
  }
  await audit(reviewerId, `application.${action.toLowerCase()}`, "Application", id, before, { note });
  return { ok: true as const };
}

export async function applyScreeningResult(ref: string, state: "CLEAR" | "CONSIDER" | "PENDING") {
  const app = await db.application.findFirst({ where: { screeningRef: ref } });
  if (!app) return false;
  await db.application.update({ where: { id: app.id }, data: { screeningState: state } }); // CONSIDER never auto-declines; a human decides
  await audit(null, "screening.result", "Application", app.id, null, { state });
  return true;
}

/** Tick or untick one reviewer checklist item. Works after approval too. Bio and minors write to the mentor profile; the rest are saved on the application. */
export async function setCheck(reviewerId: string, id: string, item: CheckItem, on: boolean) {
  const app = await db.application.findUnique({ where: { id }, include: { attestation: true } });
  if (!app || (app.type !== "MENTOR" && app.type !== "GUARDIAN")) return { ok: false as const, error: "Application not found." };
  const mentor = app.type === "MENTOR" ? await db.mentorProfile.findUnique({ where: { userId: app.applicantId } }) : null;
  if (app.type === "MENTOR" && !mentor) return { ok: false as const, error: "This mentor hasn't completed a profile yet." };
  const due = (await reaffirmDates(app.applicantId)).nextDueAt; const attCurrent = !!due && due.getTime() > Date.now();
  const screening = (app.screeningState === "CLEAR" ? "CLEAR" : app.screeningState === "CONSIDER" ? "CONSIDER" : app.screeningState ? "PENDING" : "NONE") as ScreeningState;
  const chk = canCheck({ type: app.type, state: app.state, applicantId: app.applicantId }, item, on, reviewerId, mentor ? { optedForMinors: mentor.optedForMinors, screening, orientationDone: !!mentor.orientationDoneAt, codeOfConduct: !!mentor.codeOfConductAt, attestationCurrent: attCurrent } : undefined);
  if (!chk.ok) return chk;
  if (item === "bio") await db.mentorProfile.update({ where: { userId: app.applicantId }, data: on ? { bioClearedAt: new Date(), bioClearedById: reviewerId } : { bioClearedAt: null, bioClearedById: null } });
  else if (item === "minors") { await db.mentorProfile.update({ where: { userId: app.applicantId }, data: { clearedForMinors: on } }); await afterMinorsDecision(app.applicantId, on); }
  else { const cur = (app.checklist ?? {}) as Record<string, boolean>; await db.application.update({ where: { id }, data: { checklist: { ...cur, [item]: on } } }); }
  await audit(reviewerId, `application.check.${item}.${on ? "on" : "off"}`, "Application", id, null, { item, on });
  return { ok: true as const };
}

async function mentorFor(id: string) {
  const app = await db.application.findUnique({ where: { id } });
  if (!app || app.type !== "MENTOR") return null;
  const mentor = await db.mentorProfile.findUnique({ where: { userId: app.applicantId } });
  return mentor ? { app, mentor } : null;
}

/** Team records the outcome of the enhanced screening. With a screening provider connected, results arrive by webhook and only a safeguarding lead may override. */
export async function recordScreening(reviewerId: string, roles: string[], id: string, state: "CLEAR" | "CONSIDER" | "PENDING", note: string) {
  const x = await mentorFor(id); if (!x) return { ok: false as const, error: "Application not found." };
  if (x.app.applicantId === reviewerId) return { ok: false as const, error: "You can't review your own application." };
  if (isConfigured("screening") && !roles.includes("SAFEGUARDING_LEAD")) return { ok: false as const, error: "Screening results come from the provider. Only a safeguarding lead can record one by hand." };
  if (note.trim().length < 10) return { ok: false as const, error: "Add the screening reference or a note of at least 10 characters." };
  const before = { screeningState: x.app.screeningState };
  await db.application.update({ where: { id }, data: { screeningState: state } });
  await audit(reviewerId, "application.screening.recorded", "Application", id, before, { state, note: note.trim() });
  return { ok: true as const };
}

/** Team marks safeguarding orientation complete, for example after a live session. The note says how it was done. */
export async function recordOrientation(reviewerId: string, id: string, note: string) {
  const x = await mentorFor(id); if (!x) return { ok: false as const, error: "Application not found." };
  if (x.app.applicantId === reviewerId) return { ok: false as const, error: "You can't review your own application." };
  if (x.app.state !== "APPROVED") return { ok: false as const, error: "Approve the application first." };
  if (x.mentor.orientationDoneAt) return { ok: true as const };
  if (note.trim().length < 10) return { ok: false as const, error: "Say how it was completed, at least 10 characters." };
  await db.mentorProfile.update({ where: { userId: x.app.applicantId }, data: { orientationDoneAt: new Date() } });
  await audit(reviewerId, "application.orientation.recorded", "Application", id, null, { note: note.trim() });
  return { ok: true as const };
}

/** The Code of Conduct and the safeguarding statement are the mentor's own promises. The team can only ask for them. */
export async function remindMentor(reviewerId: string, id: string) {
  const x = await mentorFor(id); if (!x) return { ok: false as const, error: "Application not found." };
  const att = await db.attestation.findFirst({ where: { applicationId: id }, orderBy: { signedAt: "desc" } });
  const todo = [!x.mentor.optedForMinors && "choose to mentor young adults", !x.mentor.codeOfConductAt && "accept the Code of Conduct", (!att || att.nextDueAt < new Date()) && "sign your safeguarding statement again", !x.mentor.orientationDoneAt && "finish the safeguarding orientation"].filter(Boolean) as string[];
  if (!todo.length) return { ok: false as const, error: "Nothing is waiting on the mentor." };
  await notify(x.app.applicantId, "mentor.minors.reminder", "A few steps before you can mentor young adults", `Please ${todo.join(", ")}. You can do all of it from Profile and privacy.`, { link: "/mentor/profile" });
  await audit(reviewerId, "application.minors.reminder", "Application", id, null, { todo });
  return { ok: true as const };
}
