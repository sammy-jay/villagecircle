import { z } from "zod";
import { EXPERTISE_CODES } from "./expertise";
import { ageOn } from "./age";

export const ATTESTATION_VERSION = "1.2";
export const ATTESTATION_TEXT =
  "I confirm that I have never been charged with or convicted of any offence involving child endangerment, child abuse, neglect or exploitation, and that I do not appear on any child abuse register or sex offender registry in any jurisdiction. I understand that a false statement ends my participation immediately and may be reported to the appropriate authorities.";
export const MENTOR_MIN_AGE = 21; // EL-01
export const BIO_MIN = 80;
export const BIO_MAX = 600;

export const step1 = z.object({
  phone: z.string().trim().regex(/^\+\d{8,15}$/, "Use international format, like +2348012345678"),
  country: z.string().trim().min(2, "Tell us where you live").max(60),
  countryOfOrigin: z.string().trim().max(60).optional(),
  languages: z.array(z.string().trim().min(2)).max(8).default([]), // optional, never inferred
  // Board fields (DK7 / M5) kept with the application for matching and counts only.
  region: z.string().trim().max(60).optional(),
  languagesMore: z.string().trim().max(200).optional(),
  timeZone: z.string().trim().max(60).optional(),
  experience: z.string().trim().max(40).optional(),
  heard: z.string().trim().max(60).optional(),
  heardMore: z.string().trim().max(200).optional(),
});

export const step2 = z.object({
  bio: z.string().trim().min(BIO_MIN, `Tell us a little more (at least ${BIO_MIN} characters)`).max(BIO_MAX, `Please keep it to ${BIO_MAX} characters`),
  primaryExpertise: z.enum(EXPERTISE_CODES),
  extraExpertise: z.array(z.enum(EXPERTISE_CODES)).max(2, "Choose up to two more areas").default([]),
  expertiseOther: z.string().trim().max(120).optional(),
  linkedinUrl: z.string().trim().url().regex(/linkedin\.com/i, "Enter a LinkedIn link").optional().or(z.literal("")),
  monthlyHours: z.number().int().min(1).max(20),
  conversationLength: z.union([z.literal(30), z.literal(60)]),
  optedForMinors: z.boolean(),
  // DK8 / M6: the help areas young people pick from, and seniority. Counts and matching only.
  areas: z.array(z.string().trim().min(2).max(40)).max(3, "Pick up to three areas").default([]),
  seniority: z.string().trim().max(60).optional(),
}).superRefine((v, ctx) => {
  if (v.extraExpertise.includes(v.primaryExpertise)) ctx.addIssue({ code: "custom", path: ["extraExpertise"], message: "Pick different areas from your main one" });
  if (new Set(v.extraExpertise).size !== v.extraExpertise.length) ctx.addIssue({ code: "custom", path: ["extraExpertise"], message: "Each area once" });
  if ((v.primaryExpertise === "EXP-OTH" || v.extraExpertise.includes("EXP-OTH")) && !v.expertiseOther?.trim()) ctx.addIssue({ code: "custom", path: ["expertiseOther"], message: "Tell us your area" });
});

export const step3 = z.object({
  attestationAffirmed: z.boolean(),
  attestationRefused: z.boolean().default(false),
  typedLegalName: z.string().trim().min(3),
  acceptCodeOfConduct: z.literal(true, { message: "Accept the Code of Conduct to continue" }),
});

export type AttestationVerdict = { ok: true } | { ok: false; reason: "REFUSED" | "UNSIGNED" | "NAME_MISMATCH" | "SUPERSEDED" };
const norm = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

/** BR-02/03, V-ATTEST: refused, unsigned, mismatched or superseded attestation blocks submission; there is no partial approval. */
export function checkAttestation(a: { affirmed: boolean; refused?: boolean; typedLegalName: string; accountName: string; version: string }): AttestationVerdict {
  if (a.refused) return { ok: false, reason: "REFUSED" };
  if (a.version !== ATTESTATION_VERSION) return { ok: false, reason: "SUPERSEDED" };
  if (!a.affirmed || !a.typedLegalName.trim()) return { ok: false, reason: "UNSIGNED" };
  if (norm(a.typedLegalName) !== norm(a.accountName)) return { ok: false, reason: "NAME_MISMATCH" };
  return { ok: true };
}

export const mentorAgeOk = (dob: Date, now = new Date()) => ageOn(dob, now) >= MENTOR_MIN_AGE;

export type ScreeningState = "NONE" | "PENDING" | "CLEAR" | "CONSIDER";

/** A reviewer approves; the cleared-for-minors flag additionally needs opt-in + enhanced screening CLEAR (EL-06, V-MINORS, BR-04). */
export function canGrantClearedForMinors(m: { optedForMinors: boolean; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; attestationCurrent: boolean }) {
  return m.optedForMinors && m.screening === "CLEAR" && m.orientationDone && m.codeOfConduct && m.attestationCurrent;
}

/** The five conditions for under-18 matching, in the order the mentor works through them, for the mentor's profile screen. */
export type MinorsInput = { optedForMinors: boolean; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; attestationCurrent: boolean };
export function minorsRequirements(m: MinorsInput) {
  const items = [
    { key: "optIn", label: "You chose to mentor young people", done: m.optedForMinors },
    { key: "screening", label: "Enhanced background screening is clear", done: m.screening === "CLEAR" },
    { key: "orientation", label: "Safeguarding orientation is complete", done: m.orientationDone },
    { key: "conduct", label: "You accepted the Code of Conduct", done: m.codeOfConduct },
    { key: "attestation", label: "Your safeguarding statement is current", done: m.attestationCurrent },
  ] as const;
  return { items, ready: canGrantClearedForMinors(m) };
}

/** Stage shown to the mentor. Orientation and screening gate "Active" (BR-01). */
export type MentorStage = "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "MORE_INFO" | "SCREENING_PENDING" | "ORIENTATION_PENDING" | "ACTIVE" | "DECLINED" | "WITHDRAWN" | "LAPSED";
export function mentorStage(a: { state: string; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; approved: boolean }): MentorStage {
  if (a.state === "DECLINED") return "DECLINED"; if (a.state === "WITHDRAWN") return "WITHDRAWN";
  if (a.state === "DRAFT") return "DRAFT"; if (a.state === "SUBMITTED") return "SUBMITTED";
  if (a.state === "IN_REVIEW" || a.state === "APPEALED") return "IN_REVIEW";
  if (a.state === "SCREENING" && !a.approved) return "IN_REVIEW";
  if (!a.approved) return "IN_REVIEW";
  if (a.screening !== "CLEAR") return "SCREENING_PENDING";
  if (!a.orientationDone || !a.codeOfConduct) return "ORIENTATION_PENDING";
  return "ACTIVE";
}
