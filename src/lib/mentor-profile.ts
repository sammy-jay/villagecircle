/** Mentor "Profile and privacy": edit the profile, choose who can find you, and complete the steps for mentoring under-18s. */
import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { notify, notifySafeguarding } from "./notify";
import { screening } from "./integrations/screening";
import { reaffirmDates } from "./reaffirm";
import { BIO_MAX, BIO_MIN, minorsRequirements, type ScreeningState } from "./domain/mentor-application";
import { EXPERTISE_CODES } from "./domain/expertise";

type R = { ok: true } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const profileInput = z.object({
  bio: z.string().trim().min(BIO_MIN, `Tell us a little more (at least ${BIO_MIN} characters)`).max(BIO_MAX, `Please keep it to ${BIO_MAX} characters`),
  primaryExpertise: z.enum(EXPERTISE_CODES),
  extraExpertise: z.array(z.enum(EXPERTISE_CODES)).max(2, "Choose up to two more areas").default([]),
  expertiseOther: z.string().trim().max(120).optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(8).default([]),
  linkedinUrl: z.string().trim().url().regex(/linkedin\.com/i, "Enter a LinkedIn link").optional().or(z.literal("")),
}).superRefine((v, ctx) => {
  if (v.extraExpertise.includes(v.primaryExpertise)) ctx.addIssue({ code: "custom", path: ["extraExpertise"], message: "Pick different areas from your main one" });
  if (new Set(v.extraExpertise).size !== v.extraExpertise.length) ctx.addIssue({ code: "custom", path: ["extraExpertise"], message: "Each area once" });
  if ((v.primaryExpertise === "EXP-OTH" || v.extraExpertise.includes("EXP-OTH")) && !v.expertiseOther?.trim()) ctx.addIssue({ code: "custom", path: ["expertiseOther"], message: "Tell us your area" });
});

async function latestApplication(userId: string) {
  return db.application.findFirst({ where: { applicantId: userId, type: "MENTOR" }, orderBy: { createdAt: "desc" } });
}
const screeningOf = (s: string | null | undefined): ScreeningState => (s === "CLEAR" ? "CLEAR" : s === "CONSIDER" ? "CONSIDER" : s ? "PENDING" : "NONE");

export async function profileView(userId: string) {
  const m = await db.mentorProfile.findUnique({ where: { userId }, include: { user: true } }); if (!m) return null;
  const app = await latestApplication(userId);
  const d = await reaffirmDates(userId);
  const sc = screeningOf(app?.screeningState);
  const attestationCurrent = !!d.nextDueAt && d.nextDueAt.getTime() > Date.now();
  const req = minorsRequirements({ optedForMinors: m.optedForMinors, screening: sc, orientationDone: !!m.orientationDoneAt, codeOfConduct: !!m.codeOfConductAt, attestationCurrent });
  return {
    name: m.user.name, country: m.user.countryOfResidence ?? "", approved: m.verification === "APPROVED",
    bio: m.bio, primaryExpertise: m.primaryExpertise, extraExpertise: m.extraExpertise, expertiseOther: m.expertiseOther ?? "", languages: m.languages, linkedinUrl: m.linkedinUrl ?? "",
    bioCleared: !!m.bioClearedAt, listed: m.visibility === "LISTED", canList: m.verification === "APPROVED" && !!m.codeOfConductAt && !!m.orientationDoneAt,
    optedForMinors: m.optedForMinors, cleared: m.clearedForMinors, requested: !!m.minorsRequestedAt, screening: sc, screeningStarted: !!app?.screeningState,
    attestationDue: d.nextDueAt, orientationDone: !!m.orientationDoneAt, codeOfConduct: !!m.codeOfConductAt,
    req,
  };
}

/** Editing the profile never changes approval, but an edited bio has to be read by the team again. */
export async function updateProfile(userId: string, input: unknown): Promise<R> {
  const p = profileInput.safeParse(input); if (!p.success) return fail(p.error.issues[0]?.message ?? "Check the form and try again.");
  const m = await db.mentorProfile.findUnique({ where: { userId } }); if (!m) return fail("Start your application first.");
  const v = p.data; const bioChanged = v.bio.trim() !== m.bio.trim();
  await db.mentorProfile.update({ where: { userId }, data: { bio: v.bio, primaryExpertise: v.primaryExpertise, extraExpertise: v.extraExpertise, expertiseOther: v.expertiseOther || null, languages: v.languages, linkedinUrl: v.linkedinUrl || null, ...(bioChanged ? { bioClearedAt: null, bioClearedById: null } : {}) } });
  await db.user.update({ where: { id: userId }, data: { languages: v.languages } });
  await audit(userId, "mentor.profile.updated", "MentorProfile", m.id, null, { bioChanged });
  if (bioChanged && m.verification === "APPROVED") await notifySafeguarding("mentor.bio.changed", "A mentor updated their bio", "A bio change is waiting for the team to read.", "/admin/mentors?filter=Approved").catch(() => {});
  return { ok: true };
}

/** Opting out takes effect straight away: the clearance is withdrawn and any pending request is dropped. */
export async function setMinorsOptIn(userId: string, on: boolean): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId } }); if (!m) return fail("Start your application first.");
  await db.mentorProfile.update({ where: { userId }, data: on ? { optedForMinors: true } : { optedForMinors: false, clearedForMinors: false, minorsRequestedAt: null } });
  await audit(userId, on ? "mentor.minors.optin" : "mentor.minors.optout", "MentorProfile", m.id);
  return { ok: true };
}

export async function startEnhancedScreening(userId: string): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId }, include: { user: true } }); if (!m) return fail("Start your application first.");
  if (!m.optedForMinors) return fail("Choose to mentor young adults first.");
  if (m.verification !== "APPROVED") return fail("Screening for under-18 mentoring opens once your application is approved.");
  const app = await latestApplication(userId); if (!app) return fail("Application not found.");
  if (app.screeningState === "CLEAR") return fail("Your screening is already clear.");
  if (app.screeningState === "CONSIDER") return fail("A member of the team will contact you about your screening.");
  if (app.screeningState && app.screeningRef) return fail("Your screening is already in progress. We will email you when it is done.");
  try {
    const r = await screening().start({ id: userId, email: m.user.email, name: m.user.name });
    await db.application.update({ where: { id: app.id }, data: { screeningRef: r.ref, screeningState: r.state } });
  } catch { return fail("We could not start screening just now. Try again in a few minutes, or contact the team."); }
  await audit(userId, "mentor.screening.requested", "Application", app.id);
  return { ok: true };
}

export async function acceptCodeOfConduct(userId: string, ip: string): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId } }); if (!m) return fail("Start your application first.");
  if (m.codeOfConductAt) return { ok: true };
  await db.mentorProfile.update({ where: { userId }, data: { codeOfConductAt: new Date() } });
  await db.consentRecord.create({ data: { userId, kind: "CODE_OF_CONDUCT", version: "1.2", granted: true, ipAddress: ip } });
  await audit(userId, "mentor.conduct.accepted", "MentorProfile", m.id);
  return { ok: true };
}

/** Sends the mentor's request to the safeguarding team. The team still decides: ticking "cleared" on the application is the only way it turns on. */
export async function requestMinorsClearance(userId: string): Promise<R> {
  const v = await profileView(userId); if (!v) return fail("Start your application first.");
  if (!v.approved) return fail("Your application needs to be approved first.");
  if (v.cleared) return fail("You are already cleared to mentor young adults.");
  if (v.requested) return { ok: true };
  if (!v.req.ready) return fail("Finish every step in the list first. The request goes to the team once they are all done.");
  await db.mentorProfile.update({ where: { userId }, data: { minorsRequestedAt: new Date() } });
  await audit(userId, "mentor.minors.requested", "MentorProfile", userId);
  await notifySafeguarding("mentor.minors.requested", "A mentor is ready to be cleared for under-18s", `${v.name} has finished every step and asked to be cleared.`, "/admin/mentors?filter=Approved").catch(() => {});
  return { ok: true };
}

/** Called by the admin checklist when the team clears or withdraws the flag. */
export async function afterMinorsDecision(userId: string, cleared: boolean) {
  await db.mentorProfile.update({ where: { userId }, data: { minorsRequestedAt: null } }).catch(() => {});
  await notify(userId, cleared ? "mentor.minors.cleared" : "mentor.minors.withdrawn", cleared ? "You are cleared to mentor young adults" : "Your under-18 clearance was withdrawn", cleared ? "Our team has cleared you. Asks from participants under 18 can now reach you." : "Our team has withdrawn your clearance for participants under 18. A member of the team will contact you if there is anything to talk through.", { link: "/mentor/profile" }).catch(() => {});
}
