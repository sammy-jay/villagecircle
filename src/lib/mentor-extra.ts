import { db } from "./db";
import { firstName } from "./domain/views";
import { mentorFor } from "./mentor-asks";
import { roleIn } from "./connections";
import { isMinor } from "./domain/age";

/** D5: the mentor's own conversations by stage. Participants appear as a first name only, and only once a connection exists. */
export async function mentorConversations(userId: string) {
  const m = await mentorFor(userId); if (!m) return null;
  const conns = await db.connection.findMany({ where: { mentorId: m.id, ask: { state: { in: ["CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"] } } }, include: { ask: { include: { topic: true } }, participant: { include: { user: { select: { name: true } } } } }, orderBy: { scheduledAt: "asc" } });
  const row = (c: (typeof conns)[number]) => ({ askId: c.askId, topic: c.ask.topic.name, first: firstName(c.participant.user.name), minutes: c.durationMinutes, at: c.scheduledAt });
  const scheduled = conns.filter((c) => ["CONNECTION_APPROVED", "SCHEDULED"].includes(c.ask.state)).map(row);
  const completed = conns.filter((c) => !["CONNECTION_APPROVED", "SCHEDULED"].includes(c.ask.state)).map(row).reverse();
  const stepped = await db.shortlistEntry.findMany({ where: { mentorId: m.id, response: "STEPPED_FORWARD", ask: { state: "MENTOR_STEPPED_FORWARD" } }, include: { ask: { include: { topic: true } } } });
  return { scheduled, completed, stepped: stepped.map((s) => ({ askId: s.askId, topic: s.ask.topic.name, minutes: s.lengthMinutes ?? 30, offered: s.offeredTimes })) };
}

/** EX2: what the mentor needs to move a conversation. No participant name beyond a first name. */
export async function mentorChangeView(userId: string, askId: string) {
  const r = await roleIn(userId, askId); if (!r || r.role !== "MENTOR" || !r.conn || !["SCHEDULED", "CONNECTION_APPROVED"].includes(r.ask.state)) return null;
  const u = r.ask.participant.user;
  const m = await db.mentorProfile.findUnique({ where: { id: r.conn.mentorId } });
  return { topic: r.ask.topic.name, start: r.conn.scheduledAt, minutes: r.conn.durationMinutes, minor: !!u.dateOfBirth && isMinor(u.dateOfBirth), participantFirst: firstName(u.name), hoursGiven: m?.hoursGivenThisMonth ?? 0, monthlyHours: m?.monthlyHours ?? 0 };
}

/** D27 "Your responses": this mentor's own answers to released Asks. Never shown to a participant. */
export async function mentorResponses(userId: string) {
  const m = await mentorFor(userId); if (!m) return null;
  const rows = await db.shortlistEntry.findMany({ where: { mentorId: m.id, response: { not: "NONE" } }, include: { ask: { include: { topic: true, connection: true, participant: { include: { user: { select: { ageBand: true } } } } } } }, orderBy: { respondedAt: "desc" }, take: 50 });
  const outcome = (r: (typeof rows)[number]) => {
    if (r.response === "PASSED") return "Passed";
    if (r.response === "REFERRED_ON") return "Suggested a colleague";
    if (r.ask.connection?.mentorId === m.id) return "Booked";
    if (r.ask.state === "MENTOR_STEPPED_FORWARD" || r.ask.state === "OPEN_TO_MENTORS") return "Waiting for the team";
    return "Closer fit found";
  };
  const who = (b: string | null | undefined) => (b === "AGE_13_15" || b === "AGE_16_17" ? "high school student" : "adult participant");
  return {
    counts: { stepped: rows.filter((r) => r.response === "STEPPED_FORWARD").length, referred: rows.filter((r) => r.response === "REFERRED_ON").length, passed: rows.filter((r) => r.response === "PASSED").length },
    rows: rows.map((r) => ({ askId: r.askId, title: `${r.ask.topic.name}, ${who(r.ask.participant.user.ageBand)}`, at: r.respondedAt, outcome: outcome(r) })),
  };
}

/** Up to `n` start times from the mentor's weekly windows, at least an hour away, for stepping forward (D27) or moving a call (EX2). */
export async function windowOffers(userId: string, n = 6) {
  const m = await mentorFor(userId); if (!m) return [];
  const { parseAvailability, nextWindowTimes } = await import("./domain/insight");
  const { APP_TZ } = await import("./domain/scheduling");
  return nextWindowTimes(parseAvailability(m.availability).grid, new Date(), APP_TZ(), n);
}
