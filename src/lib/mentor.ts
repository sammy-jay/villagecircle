import { db } from "./db";
import { audit } from "./audit";
import { sendEmail } from "./integrations/email";
import { screening } from "./integrations/screening";
import { step1, step2, step3, checkAttestation, ATTESTATION_VERSION, mentorAgeOk, mentorStage, type ScreeningState } from "./domain/mentor-application";
import { addBusinessDays, WINDOWS } from "./domain/service-windows";
import { allOrientationModulesComplete, isOrientationModuleId, ORIENTATION_MODULES } from "./domain/mentor-orientation";

export { ORIENTATION_MODULES } from "./domain/mentor-orientation";

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
  const prev = ((app?.payload as { draft?: object } | null)?.draft ?? {});
  const payload = { ...((app?.payload as object) ?? {}), draft: { ...prev, ...(draft as object) } };
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

type Ok = { ok: true } | { ok: false; error: string };
const admins = async (event: string, title: string, body: string, link: string) => (await import("./insight-admin")).notifyAdmins(event, title, body, link).catch(() => {});

/** DK11 "More information requested": the reviewer's question and the mentor's replies, kept on the application. */
export function infoRequest(app: { state: string; decision: string | null; decisionNote: string | null; payload: unknown }) {
  const replies = ((app.payload as { infoReplies?: { body: string; at: string }[] } | null)?.infoReplies ?? []);
  const open = app.state === "IN_REVIEW" && app.decision === "V-EVIDENCE";
  return { open, question: open ? app.decisionNote ?? "" : null, replies };
}

export async function replyToInfoRequest(userId: string, body: string): Promise<Ok> {
  const app = await getApplication(userId); if (!app) return { ok: false, error: "Application not found." };
  if (!infoRequest(app).open) return { ok: false, error: "There is no open question on your application." };
  const text = body.trim(); if (text.length < 10) return { ok: false, error: "Write your answer in a sentence or two." };
  const { detectContactDetails } = await import("./domain/contact-detect");
  if (detectContactDetails(text).length) return { ok: false, error: "Please leave out phone numbers, emails and links. The team already has your details." };
  const pl = (app.payload as Record<string, unknown> | null) ?? {};
  const infoReplies = [...((pl.infoReplies as unknown[]) ?? []), { body: text.slice(0, 2000), at: new Date().toISOString() }];
  await db.application.update({ where: { id: app.id }, data: { decision: null, payload: { ...pl, infoReplies } as never } });
  await audit(userId, "mentor.application.info_replied", "Application", app.id);
  await admins("application.info_replied", "A mentor answered your question", "Their reply is on the application.", `/admin/mentors/${app.id}`);
  return { ok: true };
}

export const APPEAL_KINDS = ["My circumstances have changed", "Something was missed or misread", "I have new experience to add", "Something else"] as const;

/** EX10: one appeal per decline, read by a different reviewer. */
export async function appealDecline(userId: string, kind: string, note: string): Promise<Ok> {
  const app = await getApplication(userId); if (!app || app.state !== "DECLINED") return { ok: false, error: "There is nothing to appeal." };
  if (app.decision === "V-ATTEST") return { ok: false, error: "A refused safeguarding statement cannot be appealed." };
  const pl = (app.payload as Record<string, unknown> | null) ?? {};
  if (pl.appeal) return { ok: false, error: "You have already appealed this decision." };
  if (!(APPEAL_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "Choose what your appeal is about." };
  const text = note.trim(); if (text.length < 10) return { ok: false, error: "Tell us a little more, in a sentence or two." };
  await db.application.update({ where: { id: app.id }, data: { state: "APPEALED", payload: { ...pl, appeal: { kind, note: text.slice(0, 2000), at: new Date().toISOString(), previousReviewer: app.decidedById } } as never } });
  await audit(userId, "mentor.application.appealed", "Application", app.id, { state: "DECLINED" }, { state: "APPEALED", kind });
  await admins("application.appealed", "A mentor appealed a decision", "A different reviewer should read it.", `/admin/mentors/${app.id}`);
  return { ok: true };
}

/** DK12: the mentor asks for a place at safeguarding orientation. The team records it as done (recordOrientation). */
export async function orientationView(userId: string) {
  const m = await db.mentorProfile.findUnique({ where: { userId } }); const app = await getApplication(userId);
  if (!m || !app) return null;
  const moduleRows = await Promise.all(ORIENTATION_MODULES.map(({ id }) => db.setting.findUnique({ where: { key: `orientation-video:${userId}:${id}` } })));
  const completedModules = ORIENTATION_MODULES.filter((_, i) => !!moduleRows[i]).map(({ id }) => id);
  const approvedAt = app.decidedAt && app.state === "APPROVED" ? app.decidedAt : null;
  const daysLeft = approvedAt ? Math.max(0, 30 - Math.floor((Date.now() - approvedAt.getTime()) / 86400_000)) : 30;
  const sc = app.screeningState === "CLEAR" ? "CLEAR" : app.screeningState === "CONSIDER" ? "CONSIDER" : app.screeningState ? "PENDING" : "NONE";
  return { conduct: !!m.codeOfConductAt, orientation: !!m.orientationDoneAt, completedModules, minors: m.optedForMinors, screening: sc as ScreeningState, daysLeft };
}

export async function completeOrientationModule(userId: string, moduleId: string): Promise<Ok> {
  if (!isOrientationModuleId(moduleId)) return { ok: false, error: "Choose a lesson from the orientation." };
  const [mentor, app] = await Promise.all([
    db.mentorProfile.findUnique({ where: { userId }, select: { codeOfConductAt: true, orientationDoneAt: true, verification: true } }),
    getApplication(userId),
  ]);
  if (!mentor || app?.state !== "APPROVED" || mentor.verification !== "APPROVED") return { ok: false, error: "Your application must be approved before you can complete orientation." };
  if (!mentor.codeOfConductAt) return { ok: false, error: "Accept the Code of Conduct before starting orientation." };
  if (mentor.orientationDoneAt) return { ok: true };

  const key = `orientation-video:${userId}:${moduleId}`;
  await db.setting.upsert({ where: { key }, update: { value: { completedAt: new Date().toISOString() } }, create: { key, value: { completedAt: new Date().toISOString() } } });
  const rows = await Promise.all(ORIENTATION_MODULES.map(({ id }) => db.setting.findUnique({ where: { key: `orientation-video:${userId}:${id}` } })));
  const completed = ORIENTATION_MODULES.filter((_, i) => !!rows[i]).map(({ id }) => id);
  if (allOrientationModulesComplete(completed)) {
    const result = await db.mentorProfile.updateMany({ where: { userId, orientationDoneAt: null }, data: { orientationDoneAt: new Date() } });
    if (result.count > 0) await audit(userId, "mentor.orientation.completed", "User", userId, null, { modules: completed });
  }
  return { ok: true };
}

/** DK9 / M7: the four commitments and the signature, held on the draft until "Send to the team" (submit) records the attestation. */
export async function saveSign(userId: string, accountName: string, d: { commitments: boolean; typedLegalName: string; understood: boolean }): Promise<Ok> {
  const app = await getApplication(userId); if (!app || app.state !== "DRAFT") return { ok: false, error: "Start from step 1." };
  if (!d.commitments) return { ok: false, error: "Tick all four commitments to continue." };
  const v = checkAttestation({ affirmed: d.understood, typedLegalName: d.typedLegalName, accountName, version: ATTESTATION_VERSION });
  if (!v.ok) return { ok: false, error: v.reason === "NAME_MISMATCH" ? "Type your full legal name exactly as it is on your account." : "Type your name and tick the last box to sign." };
  const pl = (app.payload as Record<string, unknown> | null) ?? {};
  await db.application.update({ where: { id: app.id }, data: { payload: { ...pl, sign: { typedLegalName: d.typedLegalName.trim(), at: new Date().toISOString(), version: ATTESTATION_VERSION } } as never } });
  return { ok: true };
}

/** Everything the four apply screens need, from the saved draft. */
export async function applyView(userId: string) {
  const [u, app] = await Promise.all([db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, dateOfBirth: true, phone: true, countryOfResidence: true, languages: true } }), getApplication(userId)]);
  if (!u) return null;
  const pl = (app?.payload ?? {}) as { step1?: Record<string, unknown>; step2?: Record<string, unknown>; sign?: { typedLegalName: string; at: string; version: string }; draft?: Record<string, unknown> };
  return { user: u, state: app?.state ?? null, step1: pl.step1 ?? null, step2: pl.step2 ?? null, sign: pl.sign ?? null, draft: pl.draft ?? null, savedAt: app?.updatedAt ?? null };
}
