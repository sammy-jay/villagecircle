import { z } from "zod";
import { detectContactDetails } from "./contact-detect";

/** What a participant writes in the wizard (D2 / D12). */
export const askAnswersSchema = z.object({
  q1: z.string().max(1500).default(""), // what do you most want to understand or decide
  q2: z.string().max(1500).default(""), // where are you right now
  q3: z.string().max(1500).default(""), // what would help most
  sessionLength: z.union([z.literal(30), z.literal(60)]).default(60),
  preferredMentorName: z.string().max(80).optional(),
  timeBound: z.boolean().default(false),
  // D2 "A few quick details": optional, counted as totals only. The Ask itself stays in q1 to q3.
  stage: z.string().max(60).optional(),
  soon: z.enum(["week", "month", "term", "flexible"]).optional(),
  soonMore: z.string().max(200).optional(),
  mentorType: z.string().max(80).optional(),
  mentorTypeMore: z.string().max(200).optional(),
  bestDays: z.string().max(80).optional(),
  bestDaysMore: z.string().max(200).optional(),
});
export type AskAnswers = z.infer<typeof askAnswersSchema>;
export const parseAnswers = (v: unknown): AskAnswers => askAnswersSchema.parse(v && typeof v === "object" ? v : {});

export const PROMPTS = [
  { key: "q1", label: "1. What do you most want to understand or decide?", hint: "", short: "What I most want to understand", nudge: "A little more please: what is the main thing you want to understand or decide?" },
  { key: "q2", label: "2. Where are you right now?", hint: "Grade, interests, what you've already tried.", short: "Where I am right now", nudge: "A little more please: where are you now, and what have you tried?" },
  { key: "q3", label: "3. What would help most?", hint: "The kind of person or advice that would make a difference.", short: "What would help most", nudge: "A little more please: what would you want to walk away knowing?" },
] as const;

/** A prompt counts once it has a few honest sentences (at least 5 words and 25 characters). */
export const promptDone = (s: string) => s.trim().length >= 25 && s.trim().split(/\s+/).length >= 5;
/** Topic is worth 10, each prompt 30. D2 shows 70% with one thin prompt; the line to continue is 80%. */
export const CONTINUE_AT = 80;
export function completeness(a: Partial<AskAnswers>, hasTopic = true): number {
  return (hasTopic ? 10 : 0) + (promptDone(a.q1 ?? "") ? 30 : 0) + (promptDone(a.q2 ?? "") ? 30 : 0) + (promptDone(a.q3 ?? "") ? 30 : 0);
}
export const missingPrompts = (a: Partial<AskAnswers>) => PROMPTS.filter((p) => !promptDone((a[p.key] as string) ?? "")).map((p) => p.key);

export type ContentFlag = "CONTACT_DETAILS" | "LICENSED_ADVICE" | "SAFEGUARDING" | "CRISIS" | "SOLICITATION";
const RX: [ContentFlag, RegExp][] = [
  ["CRISIS", /\b(kill myself|end my life|suicid\w*|self[- ]harm|hurt myself|want to die|don'?t want to be here)\b/i],
  ["SAFEGUARDING", /\b(abus\w+|molest\w*|hits me|beats me|unsafe at home|someone is touching|grooming|trafficking)\b/i],
  ["LICENSED_ADVICE", /\b(sue |lawsuit|my landlord|legal advice|diagnos\w+|prescri\w+|dosage|medication for|tax advice|should i invest|immigration case)\b/i],
  ["SOLICITATION", /\b(pay me|send money|venmo|cash ?app|paypal|buy from me|sponsor me|date me|boyfriend|girlfriend)\b/i],
];
/** Step B of review, and a first pass at submit. Conservative: a flag only freezes the Ask for a person to look at it. */
export function screenText(text: string): ContentFlag[] {
  const out = new Set<ContentFlag>();
  if (detectContactDetails(text).length) out.add("CONTACT_DETAILS");
  for (const [f, re] of RX) if (re.test(text)) out.add(f);
  return [...out];
}
export const askText = (a: AskAnswers) => `${a.q1}\n${a.q2}\n${a.q3}`;
export const ASK_FLAG_LABEL: Record<ContentFlag, string> = {
  CONTACT_DETAILS: "Contact details in the text", LICENSED_ADVICE: "Needs a licensed professional", SAFEGUARDING: "Safeguarding concern", CRISIS: "Crisis referral", SOLICITATION: "Solicitation",
};
