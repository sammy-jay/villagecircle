/**
 * The one way an Ask's progress is described to a participant: five stages, each with one name and one sentence.
 * Home, My Asks, the Ask page, the "sent" page, the legend and the status tags all read from here, so the same
 * moment is never described in two different ways. (The team console keeps its own, finer labels: ask-tracking.ts.)
 * Pure: no database, no React.
 */
import { APP_TZ } from "./scheduling";

export const ASK_STAGES = [
  { key: "submitted", label: "Submitted", meaning: "Your Ask is sent. If you are under 18, your guardian approves it first." },
  { key: "review", label: "Under review", meaning: "A real person on the team reads every Ask, usually within 2 working days." },
  { key: "matching", label: "Finding your mentor", meaning: "The team is matching your Ask with a mentor who fits. Usually 2 to 5 days." },
  { key: "schedule", label: "Ready to schedule", meaning: "Your mentor is confirmed. Pick one of the times they offered." },
  { key: "done", label: "Completed", meaning: "Your conversation happened. Say thanks and look at your next steps." },
] as const;
export const STAGE_COUNT = ASK_STAGES.length;

/**
 * How many stages are done for a state. A booked call has the first four done: the last one, Completed, is what is
 * left. Drafts and closed Asks have no place on the trail (null). A mentor stepping forward is not told to the
 * participant until the team confirms the match (FR-R04), so it stays in "Finding your mentor".
 */
const DONE: Record<string, number> = {
  AWAITING_GUARDIAN: 0, SUBMITTED: 1, IN_TEAM_REVIEW: 1, OPEN_TO_MENTORS: 2, MENTOR_STEPPED_FORWARD: 2,
  CONNECTION_APPROVED: 3, SCHEDULED: 4, HELD: 5, COMPLETE: 5, FOLLOW_UP_REQUESTED: 5, ONGOING_MENTORSHIP: 5,
};
export const stagesDone = (state: string): number | null => DONE[state] ?? null;
/** The stage the Ask is in now (0 to 4), or null for drafts and closed Asks. */
export const stageNow = (state: string): number | null => { const d = stagesDone(state); return d === null ? null : Math.min(d, STAGE_COUNT - 1); };

/** The short status shown on a tag. One per stage, plus the two moments a participant must know about. */
export function statusLabel(state: string): string | null {
  if (state === "AWAITING_GUARDIAN") return "Waiting for guardian";
  if (state === "CONNECTION_APPROVED" || state === "SCHEDULED") return "Mentor confirmed";
  const s = stageNow(state); return s === null ? null : ASK_STAGES[s]!.label;
}

export const whenLong = (d: Date) => `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "short", day: "numeric", month: "short" }).format(d)}, ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", minute: "2-digit", hour12: true }).format(d)}`;

export type JourneyInput = {
  state: string; minor: boolean; guardianName: string | null;
  marks: { submitted: Date | null; authorized: Date | null; reviewed: Date | null; stepped: Date | null; approved: Date | null };
  mentor: { shortName: string } | null; mentorShort?: string | null;
  connection: { scheduledAt: Date | null; minutes: number; guardianTimeApprovedAt?: Date | null } | null;
  preferred?: string;
};
export type TrailRow = { title: string; sub: string; state: "done" | "current" | "next" };

/** The five stages as a trail, each with what happened (and when) or what happens next. */
export function journeyRows(j: JourneyInput): TrailRow[] {
  const done = stagesDone(j.state) ?? 0;
  const g = j.guardianName ?? "your guardian"; const G = g[0]!.toUpperCase() + g.slice(1);
  const mentor = j.mentor?.shortName ?? j.mentorShort ?? null;
  const c = j.connection; const mins = c?.minutes ?? 60;
  const subs: [string, string, string][] = [ // [done, current, next]
    [
      `Sent ${j.marks.submitted ? whenLong(j.marks.submitted) : ""}${j.minor && j.marks.authorized ? `. Approved by ${g} ${whenLong(j.marks.authorized)}` : ""}`.trim(),
      `Sent${j.marks.submitted ? ` ${whenLong(j.marks.submitted)}` : ""}. Waiting for ${g} to approve it. Most guardians answer within a day.`,
      ASK_STAGES[0].meaning,
    ],
    [j.marks.reviewed ? `Checked ${whenLong(j.marks.reviewed)}` : "Checked by the team", ASK_STAGES[1].meaning, ASK_STAGES[1].meaning],
    [
      `${mentor ?? "Your mentor"} confirmed${j.marks.approved ? ` ${whenLong(j.marks.approved)}` : ""}`,
      j.preferred ? `The team is looking for ${j.preferred} or another mentor who fits. Usually 2 to 5 days.` : ASK_STAGES[2].meaning,
      ASK_STAGES[2].meaning,
    ],
    [
      c?.scheduledAt ? `Booked for ${whenLong(c.scheduledAt)}` : "Time booked",
      j.minor && c?.scheduledAt && !c.guardianTimeApprovedAt ? `You picked ${whenLong(c.scheduledAt)}. Waiting for ${g} to approve it.`
        : `${mentor ?? "Your mentor"} is confirmed. Pick one of the times they offered.${j.minor ? ` ${G} approves it too.` : ""}`,
      ASK_STAGES[3].meaning,
    ],
    [
      "Your conversation happened. Notes, a thank-you and next steps.",
      `A ${mins}-minute video call${c?.scheduledAt ? ` on ${whenLong(c.scheduledAt)}` : ""}. Afterwards: notes, a thank-you and next steps.`,
      `A ${mins}-minute video call, then notes, a thank-you and next steps.`,
    ],
  ];
  return ASK_STAGES.map((s, i) => {
    const state = i < done ? "done" : i === done ? "current" : "next";
    return { title: s.label, sub: subs[i]![state === "done" ? 0 : state === "current" ? 1 : 2], state };
  });
}
