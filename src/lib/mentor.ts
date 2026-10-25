import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./integrations/email";
import { screening } from "./integrations/screening";
import { step1, step2, step3, checkAttestation, ATTESTATION_VERSION, mentorAgeOk, mentorStage, type ScreeningState } from "./domain/mentor-application";
import { addBusinessDays, WINDOWS } from "./domain/service-windows";

export const ORIENTATION_MODULES = [
  ["boundaries", "Boundaries and the platform-only rule"], ["signs", "Recognising signs a young person may need help"],
  ["report", "How to raise a concern in under a minute"], ["conversation", "Running a good 30 or 60 minute conversation"],
] as const;

export async function getApplication(userId: string) {
  return db.application.findFirst({ where: { applicantId: userId, type: "MENTOR" }, orderBy: { createdAt: "desc" } });
}

export async function saveStep(userId: string, step: 1 | 2, data: unknown) {
  const parsed = (step === 1 ? step1 : step2).safeParse(data);
  if (!parsed.success) return { ok: false as const, errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])) };
  const app = await getApplication(userId);
  if (app && !["DRAFT"].includes(app.state)) return { ok: false as const, errors: { form: "This application has already been sent." } };
  const payload = { ...((app?.payload as object) ?? {}), [`step${step}`]: parsed.data };
  if (app) await db.application.update({ where: { id: app.id }, data: { payload } });
  else await db.application.create({ data: { applicantId: userId, type: "MENTOR", state: "DRAFT", payload } });
  return { ok: true as const };
}

/** "Save draft": keeps whatever has been typed, valid or not, so closing the tab never loses work. */
export async function saveDraft(userId: string, draft: unknown) {
  const app = await getApplication(userId);
  if (app && app.state !== "DRAFT") return { ok: false as const };
  const payload = { ...((app?.payload as object) ?? {}), draft };
  if (app) await db.application.update({ where: { id: app.id }, data: { payload: payload as never } });
  else await db.application.create({ data: { applicantId: userId, type: "MENTOR", state: "DRAFT", payload: payload as never } });
  return { ok: true as const };
}

export async function submit(userId: string, accountName: string, dob: Date | null, input: unknown, ip: string) {
  const s3 = step3.safeParse(input);
  const raw = input as { attestationRefused?: boolean };
  const app = await getApplication(userId);
  if (!app || app.state !== "DRAFT") return { ok: false as const, error: "NO_DRAFT" as const };

  // BR-03 / V-ATTEST: a refused attestation ends the sign-up. No partial approval.
  if (raw?.attestationRefused) {
    await db.application.update({ where: { id: app.id }, data: { state: "DECLINED", decision: "V-ATTEST", decisionNote: "Attestation refused", decidedAt: new Date() } });
    await audit(userId, "mentor.attestation.refused", "Application", app.id);
    return { ok: false as const, error: "REFUSED" as const };
  }
  if (!s3.success) return { ok: false as const, error: "INVALID" as const, errors: Object.fromEntries(s3.error.issues.map((i) => [String(i.path[0] ?? "form"), i.message])) };
  if (!dob || !mentorAgeOk(dob)) return { ok: false as const, error: "UNDER_21" as const };
  const pl = app.payload as { resumeKey?: string; step1?: ReturnType<typeof step1.parse>; step2?: ReturnType<typeof step2.parse> } | null;
  if (!pl?.step1 || !pl.step2) return { ok: false as const, error: "INCOMPLETE" as const };
  const verdict = checkAttestation({ affirmed: s3.data.attestationAffirmed, typedLegalName: s3.data.typedLegalName, accountName, version: ATTESTATION_VERSION });
  if (!verdict.ok) return { ok: false as const, error: verdict.reason };

  const now = new Date();
  const { step1: a, step2: b } = pl;
  await db.mentorProfile.upsert({
    where: { userId },
    create: { userId, bio: b.bio, primaryExpertise: b.primaryExpertise, extraExpertise: b.extraExpertise, expertiseOther: b.expertiseOther || null, languages: a.languages, monthlyHours: b.monthlyHours, conversationLength: b.conversationLength, optedForMinors: b.optedForMinors, linkedinUrl: b.linkedinUrl || null, resumeKey: pl.resumeKey, codeOfConductAt: now, verification: "PENDING" },
    update: { bio: b.bio, primaryExpertise: b.primaryExpertise, extraExpertise: b.extraExpertise, expertiseOther: b.expertiseOther || null, languages: a.languages, monthlyHours: b.monthlyHours, conversationLength: b.conversationLength, optedForMinors: b.optedForMinors, linkedinUrl: b.linkedinUrl || null, codeOfConductAt: now, verification: "PENDING", bioClearedAt: null, bioClearedById: null },
  });
  await db.user.update({ where: { id: userId }, data: { countryOfResidence: a.country, countryOfOrigin: a.countryOfOrigin || null, phone: a.phone, languages: a.languages } });
  const next = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  await db.application.update({ where: { id: app.id }, data: { state: "SUBMITTED", submittedAt: now } });
  await db.attestation.create({ data: { applicationId: app.id, statementVersion: ATTESTATION_VERSION, typedLegalName: s3.data.typedLegalName.trim(), affirmed: true, ipAddress: ip, nextDueAt: next } });
  await db.consentRecord.create({ data: { userId, kind: "SAFEGUARDING_ATTESTATION", version: ATTESTATION_VERSION, granted: true, ipAddress: ip } });
  await db.consentRecord.create({ data: { userId, kind: "CODE_OF_CONDUCT", version: ATTESTATION_VERSION, granted: true, ipAddress: ip } });
  const u = await db.user.findUnique({ where: { id: userId } });
  if (u) {
    try { const r = await screening().start({ id: userId, email: u.email, name: u.name }); await db.application.update({ where: { id: app.id }, data: { screeningRef: r.ref, screeningState: r.state } }); }
    catch (e) { await db.application.update({ where: { id: app.id }, data: { screeningState: "PENDING", decisionNote: `Screening could not start automatically: ${(e as Error).message}` } }); }
    await sendEmail({ to: u.email, subject: "We've received your application", html: `<p>Thank you, ${u.name.split(" ")[0]}. Our team reviews every application within ${WINDOWS.mentorApplicationBusinessDays} business days (by ${addBusinessDays(now, WINDOWS.mentorApplicationBusinessDays).toDateString()}). We'll email you when there's news.</p>` }).catch(() => {});
  }
  await audit(userId, "mentor.application.submitted", "Application", app.id, null, { attestation: ATTESTATION_VERSION });
  return { ok: true as const };
}

export async function statusFor(userId: string) {
  const app = await getApplication(userId); if (!app) return null;
  const m = await db.mentorProfile.findUnique({ where: { userId } });
  const screeningState = ((app.screeningState === "CLEAR" ? "CLEAR" : app.screeningState === "CONSIDER" ? "CONSIDER" : app.screeningState ? "PENDING" : "NONE") as ScreeningState);
  const stage = mentorStage({ state: app.state, screening: screeningState, orientationDone: !!m?.orientationDoneAt, codeOfConduct: !!m?.codeOfConductAt, approved: app.state === "APPROVED" });
  return { app, mentor: m, stage, screening: screeningState, dueBy: app.submittedAt ? addBusinessDays(app.submittedAt, WINDOWS.mentorApplicationBusinessDays) : null };
}
