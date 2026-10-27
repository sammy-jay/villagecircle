import type { AskState } from "@prisma/client";

/** The Ask lifecycle from BRD §6.1. The map is the single source of truth. */
const FORWARD: Record<AskState, AskState[]> = {
  DRAFT: ["AWAITING_GUARDIAN", "SUBMITTED"],
  AWAITING_GUARDIAN: ["SUBMITTED"], // guardian approval; decline is an exit
  SUBMITTED: ["IN_TEAM_REVIEW"],
  IN_TEAM_REVIEW: ["OPEN_TO_MENTORS", "CONNECTION_APPROVED"], // the team rebooks a call that did not happen with the same mentor
  OPEN_TO_MENTORS: ["MENTOR_STEPPED_FORWARD", "IN_TEAM_REVIEW"], // BR-15: returns to team
  MENTOR_STEPPED_FORWARD: ["CONNECTION_APPROVED", "OPEN_TO_MENTORS"],
  CONNECTION_APPROVED: ["SCHEDULED", "IN_TEAM_REVIEW"], // team takes it back if a mentor hands the conversation back or a second miss happens
  SCHEDULED: ["HELD", "CONNECTION_APPROVED"], // reschedule goes back
  HELD: ["COMPLETE"],
  COMPLETE: ["FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"],
  FOLLOW_UP_REQUESTED: ["IN_TEAM_REVIEW"],
  ONGOING_MENTORSHIP: [],
  WITHDRAWN: [], ANSWERED_BY_RESOURCE: [], REDIRECTED: [], NOT_PROCEEDING: [], GUARDIAN_DECLINED: [], LAPSED: [],
};

export const EXIT_STATES: AskState[] = [
  "WITHDRAWN", "ANSWERED_BY_RESOURCE", "REDIRECTED", "NOT_PROCEEDING", "GUARDIAN_DECLINED", "LAPSED",
];

const TERMINAL: AskState[] = [...EXIT_STATES, "COMPLETE", "ONGOING_MENTORSHIP", "FOLLOW_UP_REQUESTED"];
/** States that no longer count toward the open-Ask cap (BR-14). */
const NOT_OPEN: AskState[] = [...EXIT_STATES, "COMPLETE", "ONGOING_MENTORSHIP", "FOLLOW_UP_REQUESTED", "HELD"];

export function isExit(s: AskState) { return EXIT_STATES.includes(s); }
export function isOpen(s: AskState) { return !NOT_OPEN.includes(s); }

export type Actor = "PARTICIPANT" | "GUARDIAN" | "MENTOR" | "ADMIN" | "SYSTEM";

export interface TransitionCtx {
  to: AskState; from: AskState; actor: Actor;
  isMinor?: boolean;
  guardianAuthorized?: boolean; // authorization on the Ask itself (BR-05/06)
  reviewerReleased?: boolean; // a human reviewer released it (BR-08)
  summaryApproved?: boolean; // reviewer saw exactly what the mentor will see
  guardianApprovedMentorAndTime?: boolean; // BR-06
}

export type TransitionResult = { ok: true } | { ok: false; error: string };

export function canTransition(c: TransitionCtx): TransitionResult {
  const { from, to, actor } = c;
  if (from === to) return { ok: false, error: "Already in that state." };
  if (isExit(from)) return { ok: false, error: "This Ask has ended." };

  // Exits are available from any non-terminal stage, with who-may rules.
  if (isExit(to)) {
    if (TERMINAL.includes(from) && from !== "FOLLOW_UP_REQUESTED") return { ok: false, error: "This Ask is already complete." };
    const allowed: Record<string, Actor[]> = {
      WITHDRAWN: ["PARTICIPANT", "GUARDIAN"],
      GUARDIAN_DECLINED: ["GUARDIAN"],
      ANSWERED_BY_RESOURCE: ["PARTICIPANT", "ADMIN"],
      REDIRECTED: ["ADMIN"], NOT_PROCEEDING: ["ADMIN"], LAPSED: ["ADMIN", "SYSTEM"],
    };
    return allowed[to]?.includes(actor) ? { ok: true } : { ok: false, error: `${actor} cannot move an Ask to ${to}.` };
  }

  if (!FORWARD[from].includes(to)) return { ok: false, error: `Cannot go from ${from} to ${to}.` };

  if (from === "DRAFT") {
    if (c.isMinor && to === "SUBMITTED") return { ok: false, error: "A minor's Ask needs guardian authorization first." }; // BR-05
    if (!c.isMinor && to === "AWAITING_GUARDIAN") return { ok: false, error: "Adults do not need guardian authorization." };
  }
  if (from === "AWAITING_GUARDIAN" && to === "SUBMITTED" && !(actor === "GUARDIAN" && c.guardianAuthorized))
    return { ok: false, error: "Only a verified guardian authorization can submit this Ask." };
  if (to === "OPEN_TO_MENTORS" && from === "IN_TEAM_REVIEW") { // BR-08 + step E
    if (actor !== "ADMIN" || !c.reviewerReleased) return { ok: false, error: "Every Ask needs a human reviewer before any mentor sees it." };
    if (!c.summaryApproved) return { ok: false, error: "The mentor-facing summary must be approved before release." };
  }
  if (from === "SUBMITTED" && to === "IN_TEAM_REVIEW" && actor !== "ADMIN" && actor !== "SYSTEM") return { ok: false, error: "Not allowed." };
  if (from === "IN_TEAM_REVIEW" && to === "CONNECTION_APPROVED" && actor !== "ADMIN") return { ok: false, error: "Only the team can rebook with the same mentor." };
  if (from === "MENTOR_STEPPED_FORWARD" && to === "CONNECTION_APPROVED" && actor !== "ADMIN")
    return { ok: false, error: "The team confirms who takes the Ask." };
  if (from === "CONNECTION_APPROVED" && to === "SCHEDULED" && c.isMinor && !c.guardianApprovedMentorAndTime)
    return { ok: false, error: "The guardian must approve this mentor and time." }; // BR-06
  if (from === "OPEN_TO_MENTORS" && to === "IN_TEAM_REVIEW" && actor !== "SYSTEM" && actor !== "ADMIN")
    return { ok: false, error: "Not allowed." };
  return { ok: true };
}
