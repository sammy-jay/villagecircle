import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { hashPassword, passwordSchema } from "./password";
import { sendVerifyEmail } from "./account";
import { createInvite, GUIDELINES_VERSION } from "./guardian";
import { ADULT_AGE, ageGate, ageOn } from "./domain/age";
import { mentorAgeOk, MENTOR_MIN_AGE } from "./domain/mentor-application";

export type SignupRole = "participant" | "mentor" | "guardian";
export type RegisterResult =
  | { ok: true; email: string; minor: boolean }
  | { ok: false; error: string; field?: string }
  | { ok: false; redirect: "/under-15" };

const email = z.string().trim().toLowerCase().email("Enter a valid email");
const base = z.object({
  role: z.enum(["participant", "mentor", "guardian"]),
  name: z.string().trim().min(1, "Add your first name").max(80),
  email,
  password: passwordSchema,
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Add your date of birth"),
  country: z.string().trim().max(60).optional(),
  region: z.string().trim().max(60).optional(),
  town: z.string().trim().max(80).optional(),
  heardFrom: z.string().trim().max(60).optional(),
  heardFromMore: z.string().trim().max(200).optional(),
  agreeTerms: z.literal(true, { message: "Please agree to the Terms, Privacy Policy and Code of Conduct." }),
  marketing: z.boolean().default(false),
});
const guardianDetails = z.object({
  guardianName: z.string().trim().min(2, "Add your parent or guardian's name").max(80),
  guardianEmail: email,
  guardianMobile: z.string().trim().regex(/^\+?[\d\s()-]{8,20}$/, "Add their mobile number with the country code"),
  relationship: z.string().trim().min(2, "Pick how they are related to you").max(40),
});

export type RegisterInput = z.input<typeof base> & Partial<z.input<typeof guardianDetails>> & { agreeReview?: boolean };

/**
 * M1 / DK1 registration. Under-15s are turned away before anything is stored (BR-20).
 * Minors start PENDING_GUARDIAN and their guardian is invited straight away (BR-05).
 */
export async function registerUser(input: RegisterInput, now = new Date()): Promise<RegisterResult> {
  const parsed = base.safeParse(input);
  if (!parsed.success) { const i = parsed.error.issues[0]!; return { ok: false, error: i.message, field: String(i.path[0] ?? "") }; }
  const d = parsed.data;
  const dob = new Date(`${d.dob}T00:00:00Z`);

  if (d.role === "participant") {
    const gate = ageGate(dob, now);
    if (!gate.ok) return gate.reason === "UNDER_15" ? { ok: false, redirect: "/under-15" } : { ok: false, error: "Check your date of birth.", field: "dob" };
  } else if (Number.isNaN(dob.getTime()) || dob > now) {
    return { ok: false, error: "Check your date of birth.", field: "dob" };
  } else if (d.role === "mentor" && !mentorAgeOk(dob, now)) {
    return { ok: false, error: `Mentors need to be ${MENTOR_MIN_AGE} or older.`, field: "dob" };
  } else if (d.role === "guardian" && ageOn(dob, now) < ADULT_AGE) {
    return { ok: false, error: "Guardians need to be 18 or older.", field: "dob" };
  }

  const gate = ageGate(dob, now);
  const minor = d.role === "participant" && gate.ok && gate.minor;
  let g: z.infer<typeof guardianDetails> | null = null;
  if (minor) {
    const gp = guardianDetails.safeParse(input);
    if (!gp.success) { const i = gp.error.issues[0]!; return { ok: false, error: i.message, field: String(i.path[0] ?? "") }; }
    if (gp.data.guardianEmail === d.email) return { ok: false, error: "Your guardian needs their own email address.", field: "guardianEmail" };
    if (!input.agreeReview) return { ok: false, error: "Please confirm you understand the team and your guardian review each Ask.", field: "agreeReview" };
    g = gp.data;
  }

  if (await db.user.findUnique({ where: { email: d.email }, select: { id: true } })) {
    return { ok: false, error: "An account already uses this email. Log in, or reset your password.", field: "email" };
  }

  const user = await db.user.create({
    data: {
      name: d.name, email: d.email, passwordHash: await hashPassword(d.password),
      roles: [d.role === "participant" ? "PARTICIPANT" : d.role === "mentor" ? "MENTOR" : "GUARDIAN"],
      dateOfBirth: dob, ageBand: gate.ok ? gate.band : "ADULT",
      countryOfResidence: d.country || null, region: d.region || null, town: d.town || null,
      heardFrom: d.heardFrom || null, heardFromMore: d.heardFromMore || null, marketingOptIn: d.marketing,
      status: minor ? "PENDING_GUARDIAN" : "ACTIVE",
      ...(d.role === "participant" ? { participant: { create: {} } } : {}),
    },
  });
  await db.consentRecord.createMany({ data: (["TERMS", "PRIVACY", "CODE_OF_CONDUCT"] as const).map((kind) => ({ userId: user.id, kind, version: GUIDELINES_VERSION, granted: true })) });
  await audit(user.id, "account.registered", "User", user.id, null, { role: d.role, minor });
  if (g) await createInvite(user.id, { name: g.guardianName, email: g.guardianEmail, mobile: g.guardianMobile, relationship: g.relationship });
  await sendVerifyEmail({ email: user.email, name: user.name });
  return { ok: true, email: user.email, minor };
}

/** Where to send someone right after they sign in. */
export async function landingFor(userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } });
  if (!u) return "/login";
  if (u.roles.includes("ADMIN") || u.roles.includes("SAFEGUARDING_LEAD")) return "/admin";
  if (!u.emailVerified) return `/check-email?email=${encodeURIComponent(u.email)}`;
  if (u.roles.includes("PARTICIPANT")) {
    if (u.status === "PENDING_GUARDIAN") return "/guardian-needed";
    if (u.status === "PAUSED") return "/paused";
    if (u.participant && !u.participant.onboardedAt) return "/onboarding";
    return "/home";
  }
  if (u.roles.includes("MENTOR")) return "/mentor";
  if (u.roles.includes("GUARDIAN")) return "/guardian";
  return "/";
}
