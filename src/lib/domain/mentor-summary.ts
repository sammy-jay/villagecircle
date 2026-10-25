import { detectContactDetails, type ContactHit } from "./contact-detect";

/** BR-09: mentors see ONLY what the team composed. This is the whole mentor-facing shape — nothing else is ever sent. */
export interface MentorFacingAsk {
  askId: string;
  topic: string;
  question: string;
  whatWouldHelp: string;
  ageBand: "13-15" | "16-17" | "18+";
  sessionLength: 30 | 60;
}

export interface SummaryDraft {
  askId: string; topic: string; question: string; whatWouldHelp: string;
  ageBand: MentorFacingAsk["ageBand"]; sessionLength: 30 | 60;
}

export interface Withheld { names: string[]; schools: string[]; employers: string[] }

export type ComposeResult =
  | { ok: true; summary: MentorFacingAsk }
  | { ok: false; blocked: { contact: ContactHit[]; identifiers: string[] } };

/** Release is blocked if contact details — or any withheld name/school/employer — leak into the summary. */
export function composeMentorSummary(draft: SummaryDraft, withheld: Withheld): ComposeResult {
  const body = `${draft.topic}\n${draft.question}\n${draft.whatWouldHelp}`;
  const contact = detectContactDetails(body);
  const lower = body.toLowerCase();
  const identifiers = [...withheld.names, ...withheld.schools, ...withheld.employers]
    .map((s) => s.trim()).filter((s) => s.length >= 2)
    .filter((s) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(s.toLowerCase())}($|[^\\p{L}\\p{N}])`, "u").test(lower));
  if (contact.length || identifiers.length) return { ok: false, blocked: { contact, identifiers } };
  return { ok: true, summary: { ...draft } };
}

/** Whitelist projection so nothing extra can ride along even if a caller passes a fat object. */
export function toMentorView(s: MentorFacingAsk): MentorFacingAsk {
  return { askId: s.askId, topic: s.topic, question: s.question, whatWouldHelp: s.whatWouldHelp, ageBand: s.ageBand, sessionLength: s.sessionLength };
}

function escapeRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
