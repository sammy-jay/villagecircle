import { createEvent, type EventAttributes } from "ics";

export interface CalendarInvite { uid: string; title: string; startsAt: Date; minutes: number; description: string; url?: string; organizerEmail: string }

/** ICS invite — works everywhere (Google, Outlook, Apple) with no API keys. No contact details of the other party are included (BR-10). */
export function buildIcs(i: CalendarInvite): string {
  const s = i.startsAt;
  const ev: EventAttributes = {
    uid: i.uid, title: i.title, description: i.description, url: i.url,
    start: [s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate(), s.getUTCHours(), s.getUTCMinutes()], startInputType: "utc", startOutputType: "utc",
    duration: { minutes: i.minutes }, status: "CONFIRMED",
    alarms: [{ action: "display", description: "Starts in 1 hour", trigger: { hours: 1, before: true } }],
  };
  const { error, value } = createEvent(ev);
  if (error || !value) throw new Error(`ICS failed: ${String(error)}`);
  return value;
}

export const googleCalendarLink = (i: CalendarInvite) => {
  const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const end = new Date(i.startsAt.getTime() + i.minutes * 60_000);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(i.title)}&dates=${f(i.startsAt)}/${f(end)}&details=${encodeURIComponent(i.description)}`;
};
