import { db } from "./db";
import { listOwnAsks, participantFor } from "./asks";
import { directoryFor, libraryFor, thanksWall, upcomingEvents } from "./village";
import { goalsAndNotes } from "./insight";
import { APP_TZ } from "./domain/scheduling";
import { isOpen } from "./domain/ask-state";
import { trackerView } from "./connections";
import type { AskState } from "@prisma/client";

/** A minor picked a time and their guardian has not approved it yet: nothing to pick, just waiting. */
export const waitingOnGuardianTime = (t: { state: string; minor: boolean; connection: { scheduledAt: Date | null; guardianTimeApprovedAt: Date | null } | null } | null) =>
  !!t && t.minor && t.state === "CONNECTION_APPROVED" && !!t.connection?.scheduledAt && !t.connection.guardianTimeApprovedAt;

const greetingFor = (d: Date) => {
  const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", hourCycle: "h23" }).format(d));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** Everything Home (D1) and Welcome (N09) show, read once. Mentor names are already shortened by the village projections. */
export async function homeFor(userId: string) {
  // Two rounds: who they are and their Asks, then everything the feed shows at once. The participant row is shared
  // with the page guard and the loaders below (once per request).
  const [own, p] = await Promise.all([listOwnAsks(userId), participantFor(userId)]);
  if (!own || !p) return null;
  const user = p.user; const now = new Date();

  const open = own.asks.filter((a) => a.state !== "DRAFT" && isOpen(a.state as AskState));
  const active = open[0] ?? null;
  const [dir, lib, thanks, events, goals, track, link] = await Promise.all([
    directoryFor(userId), libraryFor(userId), thanksWall(1), upcomingEvents(userId, 3), goalsAndNotes(userId), active ? trackerView(userId, active.id) : null,
    own.minor ? db.guardianLink.findFirst({ where: { participantId: p.profile.id, active: true }, select: { guardian: { select: { user: { select: { name: true } } } } } }) : null,
  ]);
  const guardian: { first: string; approved: boolean } | null = link ? { first: link.guardian.user.name.split(" ")[0] ?? "Your guardian", approved: true } : null;

  return {
    first: user.name.split(" ")[0] ?? "friend",
    minor: own.minor,
    dateLine: `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long" }).format(now).toUpperCase()}${user.town ? ` · ${user.town.toUpperCase()}` : ""}`,
    greeting: greetingFor(now),
    guardian,
    // N09: nobody has sent an Ask yet.
    welcome: own.asks.every((a) => a.state === "DRAFT"),
    steps: { accountAt: user.createdAt, profileDone: !!p.profile.onboardedAt, askSent: own.asks.some((a) => a.state !== "DRAFT"), timePicked: own.asks.some((a) => ["SCHEDULED", "HELD", "COMPLETE"].includes(a.state)) },
    active: active && { id: active.id, state: active.state as AskState, title: active.title, topic: active.topic, mentor: active.mentorShort, scheduledAt: active.scheduledAt, waitingGuardian: waitingOnGuardianTime(track) },
    /** The active Ask's dated trail, for "Additional details" on its card. */
    track,
    mentors: (dir?.cards ?? []).slice(0, 4).map((c) => ({ id: c.id, name: c.name, role: c.role, country: c.country })),
    tips: (lib?.cards ?? []).slice(0, 4),
    saved: new Set(lib?.saved ?? []),
    thanks: thanks[0] ?? null,
    events,
    goal: goals?.goals.find((g) => g.progress === "IN_PROGRESS" || g.progress === "NOT_STARTED") ?? null,
    goalCount: goals?.goals.length ?? 0,
  };
}
export type HomeData = NonNullable<Awaited<ReturnType<typeof homeFor>>>;
