/** Team-side tracking of every Ask across its whole life (pure, no I/O). */
export type StageGroup = "REVIEW" | "MATCHING" | "SCHEDULED" | "DONE" | "CLOSED";
export type TrackFilter = "ALL" | "ATTENTION" | "UNDER18" | "UPCOMING" | StageGroup;

export const STAGE_OF: Record<string, StageGroup | undefined> = {
  AWAITING_GUARDIAN: "REVIEW", SUBMITTED: "REVIEW", IN_TEAM_REVIEW: "REVIEW",
  OPEN_TO_MENTORS: "MATCHING", MENTOR_STEPPED_FORWARD: "MATCHING", CONNECTION_APPROVED: "MATCHING",
  SCHEDULED: "SCHEDULED",
  HELD: "DONE", COMPLETE: "DONE", FOLLOW_UP_REQUESTED: "DONE", ONGOING_MENTORSHIP: "DONE",
  WITHDRAWN: "CLOSED", ANSWERED_BY_RESOURCE: "CLOSED", REDIRECTED: "CLOSED", NOT_PROCEEDING: "CLOSED", GUARDIAN_DECLINED: "CLOSED", LAPSED: "CLOSED",
};
export const STAGE_LABEL: Record<StageGroup, string> = { REVIEW: "In review", MATCHING: "Finding a mentor", SCHEDULED: "Scheduled", DONE: "Held and after", CLOSED: "Closed" };
export const STATE_LABEL: Record<string, string> = {
  AWAITING_GUARDIAN: "Awaiting guardian", SUBMITTED: "Submitted", IN_TEAM_REVIEW: "In team review", OPEN_TO_MENTORS: "Open to mentors", MENTOR_STEPPED_FORWARD: "Mentor stepped forward", CONNECTION_APPROVED: "Connection approved", SCHEDULED: "Scheduled", HELD: "Held", COMPLETE: "Complete", FOLLOW_UP_REQUESTED: "Follow-up requested", ONGOING_MENTORSHIP: "Ongoing mentorship", WITHDRAWN: "Withdrawn", ANSWERED_BY_RESOURCE: "Answered by resource", REDIRECTED: "Redirected", NOT_PROCEEDING: "Not proceeding", GUARDIAN_DECLINED: "Guardian declined", LAPSED: "Lapsed", DRAFT: "Draft",
};
export const UPCOMING_HOURS = 72;

export type TrackInput = { state: string; minor: boolean; serviceWindowDue: Date | null; scheduledAt: Date | null; connectionStatus: string | null; attendance: string | null; updatedAt: Date };

/** Reasons the team should look at this Ask now. Empty when nothing needs doing. */
export function attentionReasons(a: TrackInput, now = new Date()): string[] {
  const out: string[] = [];
  const h = (ms: number) => ms / 3600000;
  if (a.connectionStatus === "MISSED" || (a.attendance && ["PARTICIPANT_ABSENT", "MENTOR_ABSENT", "NEITHER"].includes(a.attendance))) out.push("Missed conversation");
  if (a.state === "SCHEDULED" && a.scheduledAt && h(now.getTime() - a.scheduledAt.getTime()) > 2) out.push("Time has passed, no outcome recorded");
  if (a.state === "OPEN_TO_MENTORS" && a.serviceWindowDue && a.serviceWindowDue.getTime() < now.getTime()) out.push("No mentor yet, past service window");
  if (a.state === "FOLLOW_UP_REQUESTED") out.push("Follow-up requested");
  if (a.state === "MENTOR_STEPPED_FORWARD" && h(now.getTime() - a.updatedAt.getTime()) > 48) out.push("Mentor waiting over 48 hours");
  return out;
}
export const isUpcoming = (a: Pick<TrackInput, "state" | "scheduledAt">, now = new Date()) =>
  a.state === "SCHEDULED" && !!a.scheduledAt && a.scheduledAt.getTime() >= now.getTime() && a.scheduledAt.getTime() - now.getTime() <= UPCOMING_HOURS * 3600000;

export function matchesFilter(f: TrackFilter, a: TrackInput, now = new Date()): boolean {
  if (f === "ALL") return true;
  if (f === "ATTENTION") return attentionReasons(a, now).length > 0;
  if (f === "UNDER18") return a.minor;
  if (f === "UPCOMING") return isUpcoming(a, now);
  return STAGE_OF[a.state] === f;
}
