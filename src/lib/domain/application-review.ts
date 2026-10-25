import type { ScreeningState } from "./mentor-application";
import { canGrantClearedForMinors, minorsRequirements } from "./mentor-application";

export type ReviewAction = "START_REVIEW" | "APPROVE" | "REQUEST_INFO" | "DECLINE" | "ACTIVATE_GUARDIAN" | "HOLD_GUARDIAN" | "GRANT_MINORS";

const ALLOWED: Record<string, Record<ReviewAction, string[]>> = {
  MENTOR: { START_REVIEW: ["SUBMITTED", "APPEALED"], APPROVE: ["SUBMITTED", "IN_REVIEW", "APPEALED"], REQUEST_INFO: ["SUBMITTED", "IN_REVIEW"], DECLINE: ["SUBMITTED", "IN_REVIEW", "APPEALED"], ACTIVATE_GUARDIAN: [], HOLD_GUARDIAN: [], GRANT_MINORS: ["APPROVED"] },
  GUARDIAN: { START_REVIEW: [], APPROVE: [], REQUEST_INFO: [], DECLINE: [], ACTIVATE_GUARDIAN: ["SUBMITTED", "IN_REVIEW"], HOLD_GUARDIAN: ["SUBMITTED", "IN_REVIEW"], GRANT_MINORS: [] },
};

/** Names exactly what is still missing, so the reviewer knows what to do next. */
export function missingMinors(m?: { optedForMinors: boolean; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; attestationCurrent: boolean }) {
  if (!m) return "This mentor has not completed a profile yet.";
  const left = minorsRequirements(m).items.filter((i) => !i.done).map((i) => ({ optIn: "the mentor's opt-in", screening: "clear enhanced screening", orientation: "safeguarding orientation", conduct: "the Code of Conduct", attestation: "a current safeguarding statement" })[i.key]);
  return left.length ? `Still needed before clearing for under 18: ${left.join(", ")}.` : "Ready to clear.";
}

export type ReviewCheck = { ok: true } | { ok: false; error: string };

export function canReview(a: { type: "MENTOR" | "GUARDIAN"; state: string; applicantId: string }, action: ReviewAction, reviewerId: string, ctx: { note?: string; mentor?: { optedForMinors: boolean; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; attestationCurrent: boolean } } = {}): ReviewCheck {
  if (a.applicantId === reviewerId) return { ok: false, error: "You can't review your own application." };
  if (!ALLOWED[a.type][action].includes(a.state)) return { ok: false, error: `That action isn't available while the application is ${a.state.toLowerCase().replace(/_/g, " ")}.` };
  if ((action === "DECLINE" || action === "REQUEST_INFO" || action === "HOLD_GUARDIAN") && !(ctx.note && ctx.note.trim().length >= 10)) return { ok: false, error: "Add a note of at least 10 characters. The applicant sees it." };
  if (action === "GRANT_MINORS" && !(ctx.mentor && canGrantClearedForMinors(ctx.mentor))) return { ok: false, error: missingMinors(ctx.mentor) };
  return { ok: true };
}

export type CheckItem = "bio" | "expertise" | "minors" | "attestation" | "g0" | "g1" | "g2" | "g3";
const MENTOR_ITEMS: CheckItem[] = ["bio", "expertise", "minors", "attestation"];
const GUARDIAN_ITEMS: CheckItem[] = ["g0", "g1", "g2", "g3"];

/** Reviewer checklist ticks can be changed in any state after submission, including after approval. Clearing a mentor for minors is the one tick with rules. */
export function canCheck(a: { type: "MENTOR" | "GUARDIAN"; state: string; applicantId: string }, item: CheckItem, on: boolean, reviewerId: string, mentor?: { optedForMinors: boolean; screening: ScreeningState; orientationDone: boolean; codeOfConduct: boolean; attestationCurrent: boolean }): ReviewCheck {
  if (a.applicantId === reviewerId) return { ok: false, error: "You can't review your own application." };
  if (!(a.type === "MENTOR" ? MENTOR_ITEMS : GUARDIAN_ITEMS).includes(item)) return { ok: false, error: "That checklist item doesn't apply here." };
  if (a.state === "DRAFT") return { ok: false, error: "The application hasn't been submitted yet." };
  if (item === "minors") {
    if (a.state !== "APPROVED") return { ok: false, error: "Approve the application first, then clear the mentor for participants under 18." };
    if (on && !(mentor && canGrantClearedForMinors(mentor))) return { ok: false, error: missingMinors(mentor) };
  }
  return { ok: true };
}
