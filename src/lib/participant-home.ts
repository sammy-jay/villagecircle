import { db } from "./db";
import { listOwnAsks } from "./asks";
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
  const own = await listOwnAsks(userId); if (!own) return null;
  const user = await db.user.findUnique({ where: { id: userId }, include: { participant: true } });
  if (!user?.participant) return null;
  const now = new Date();

  const open = own.asks.filter((a) => a.state !== "DRAFT" && isOpen(a.state as AskState));
  const active = open[0] ?? null;
  const [dir, lib, thanks, events, goals, track] = await Promise.all([directoryFor(userId), libraryFor(userId), thanksWall(1), upcomingEvents(userId, 3), goalsAndNotes(userId), active ? trackerView(userId, active.id) : null]);

  let guardian: { first: string; approved: boolean } | null = null;
  if (own.minor) {
    const link = await db.guardianLink.findFirst({ where: { participantId: user.participant.id, active: true }, include: { guardian: { include: { user: true } } } });
    if (link) guardian = { first: link.guardian.user.name.split(" ")[0] ?? "Your guardian", approved: true };
  }

  return {
    first: user.name.split(" ")[0] ?? "friend",
    minor: own.minor,
    dateLine: `${new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), weekday: "long", day: "numeric", month: "long" }).format(now).toUpperCase()}${user.town ? ` · ${user.town.toUpperCase()}` : ""}`,
    greeting: greetingFor(now),
    guardian,
    // N09: nobody has sent an Ask yet.
    welcome: own.asks.every((a) => a.state === "DRAFT"),
    steps: { accountAt: user.createdAt, profileDone: !!user.participant.onboardedAt, askSent: own.asks.some((a) => a.state !== "DRAFT"), timePicked: own.asks.some((a) => ["SCHEDULED", "HELD", "COMPLETE"].includes(a.state)) },
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
