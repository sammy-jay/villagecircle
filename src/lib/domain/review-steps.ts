/**
 * A2 / A8 / A24 review steps A to F: which are done. A step is done when the work behind it happened (the expertise
 * was saved, the summary approved, the Ask released), when a reviewer ticked it, or when a later step's work is done,
 * since the app only lets a reviewer get there in order (release needs an approved summary, and so on).
 * Steps done by the work itself are `automatic`: they cannot be unticked, because the work cannot be undone by a tick.
 */
import { REVIEW_STEPS } from "./admin-ops";

export type ReviewEvidence = {
  state: string;
  review: { stepsDone: string[]; decision?: string | null; expertiseNeeded?: string[]; summaryApprovedAt?: Date | string | null; withheld?: string[] } | null;
};
const LETTERS = REVIEW_STEPS.map(([l]) => l as string);
/** Still with the team: a release from an earlier round does not count, the Ask has to be released again. */
const IN_REVIEW = ["DRAFT", "AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW"];

export function reviewSteps(e: ReviewEvidence): { done: string[]; automatic: string[]; current: string | null; why: Record<string, string> } {
  const r = e.review;
  const why: Record<string, string> = {};
  if (r?.withheld?.length) why.B = "Withheld details were added";
  if (r?.expertiseNeeded?.length) why.D = "Expertise was set";
  if (r?.summaryApprovedAt) why.E = "The summary was approved";
  if (r?.decision === "RELEASE" && !IN_REVIEW.includes(e.state)) why.F = "Released to mentors";
  const furthest = Math.max(-1, ...Object.keys(why).map((l) => LETTERS.indexOf(l)));
  const automatic = LETTERS.filter((l, i) => !!why[l] || i < furthest);
  for (const l of automatic) why[l] ??= "A later step is done";
  const done = LETTERS.filter((l) => automatic.includes(l) || (r?.stepsDone ?? []).includes(l));
  return { done, automatic, current: LETTERS.find((l) => !done.includes(l)) ?? null, why };
}
