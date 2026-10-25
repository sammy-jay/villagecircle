import { StepTrail } from "@/components/public/kit";
import { APP_TZ } from "@/lib/domain/scheduling";

/* The "What happens next" / "Where things are" trail used by N05, D13 and D3. */

export const whenLong = (d: Date) => `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "short", day: "numeric", month: "short" }).format(d)}, ${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(" ", " ")}`;

type Journey = {
  state: string; minor: boolean; guardianName: string | null;
  marks: { submitted: Date | null; authorized: Date | null; reviewed: Date | null; stepped: Date | null; approved: Date | null };
  mentor: { shortName: string; headline?: string } | null; mentorShort?: string | null;
  connection: { scheduledAt: Date | null; minutes: number } | null;
  preferred?: string;
};

const ORDER = ["DRAFT", "AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE"];

/** Steps from submission to the call. `full` adds "The conversation" and "Afterwards" (D13, D3). */
export function journeySteps(j: Journey, full = false) {
  const at = ORDER.indexOf(j.state);
  const past = (s: string) => at > ORDER.indexOf(s);
  const g = j.guardianName ?? "Your guardian";
  const mentor = j.mentor?.shortName ?? j.mentorShort ?? null;
  const rows: { key: string; title: string; sub: string; done: boolean }[] = [
    { key: "sent", title: "Sent", sub: j.marks.submitted ? `${whenLong(j.marks.submitted)}` : "Not sent yet", done: !!j.marks.submitted },
    ...(j.minor ? [{ key: "guardian", title: j.guardianName ? `${j.guardianName} approves` : "Your guardian approves", sub: j.marks.authorized ? `Approved ${whenLong(j.marks.authorized)}` : `${g} gets a message now. Most guardians answer within a day.`, done: past("AWAITING_GUARDIAN") }] : []),
    { key: "team", title: past("IN_TEAM_REVIEW") ? "Checked by the team" : "The team reads it", sub: j.marks.reviewed ? `Done ${whenLong(j.marks.reviewed)}` : "A real person reads every Ask, usually within 24 hours. They may help you tidy it up.", done: past("IN_TEAM_REVIEW") },
    { key: "mentor", title: mentor && past("OPEN_TO_MENTORS") ? `${mentor} stepped forward` : "A mentor steps forward", sub: j.marks.stepped ? `${whenLong(j.marks.stepped)}${j.mentor?.headline ? ` · ${j.mentor.headline}` : ""}` : `${j.preferred ? `${j.preferred} or another mentor who fits` : "Someone who fits your Ask"}. Usually 2 to 5 days.`, done: past("OPEN_TO_MENTORS") },
    { key: "time", title: "Pick a time", sub: j.connection?.scheduledAt && past("CONNECTION_APPROVED") ? `Booked for ${whenLong(j.connection.scheduledAt)}` : j.minor ? "Choose one. Your guardian approves the time too." : "Choose one of the times offered.", done: past("CONNECTION_APPROVED") },
  ];
  if (full) rows.push(
    { key: "call", title: "The conversation", sub: `${j.connection?.minutes ?? 60} minutes, on video`, done: past("SCHEDULED") },
    { key: "after", title: "Afterwards", sub: "Notes, a thank-you, next steps", done: past("HELD") },
  );
  const firstOpen = rows.findIndex((r) => !r.done);
  return rows.map((r, i) => ({ title: r.title, sub: r.sub, state: (r.done ? "done" : i === firstOpen ? "current" : "next") as "done" | "current" | "next" }));
}

export function Journey({ j, full }: { j: Journey; full?: boolean }) {
  return <StepTrail steps={journeySteps(j, full)} />;
}
