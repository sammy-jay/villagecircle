import { db } from "./db";
import { notify } from "./notify";
import { audit } from "./audit";
import { roleIn } from "./connections";
import { detectContactDetails } from "./domain/contact-detect";
import { screenText } from "./domain/ask-answers";
import { firstName, shortName } from "./domain/views";
import { expertiseLabel } from "./domain/expertise";
import type { R } from "./asks";

/** States where the young person and the mentor may write to each other (after the match, until the Ask ends). */
const OPEN_FOR_CHAT = ["CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"];
export const MAX_MESSAGE = 1000;

/** N08: the thread as either side sees it. Names are first name (participant) or short name (mentor) only. */
export async function threadView(userId: string, askId: string) {
  const r = await roleIn(userId, askId);
  if (!r || (r.role !== "PARTICIPANT" && r.role !== "MENTOR") || !r.conn) return null;
  const rows = await db.askMessage.findMany({ where: { askId }, orderBy: { createdAt: "asc" }, take: 300 });
  const m = r.conn.mentor;
  return {
    role: r.role, askId, state: r.ask.state, open: OPEN_FOR_CHAT.includes(r.ask.state) && !r.conn.pausedByConcern,
    topic: r.ask.topic.name, participantFirst: firstName(r.ask.participant.user.name),
    mentor: { short: shortName(m.user.name), area: expertiseLabel(m.primaryExpertise), country: m.user.countryOfResidence ?? "", bio: m.bio, expertise: [m.primaryExpertise, ...m.extraExpertise].map(expertiseLabel).slice(0, 3) },
    matchedAt: r.conn.guardianMentorApprovedAt ?? r.conn.createdAt, guardianApproved: !!r.conn.guardianMentorApprovedAt,
    scheduledAt: r.conn.scheduledAt,
    messages: rows.map((x) => ({ id: x.id, mine: x.authorId === userId, role: x.role, body: x.body, at: x.createdAt })),
  };
}

/**
 * Sends one message. Contact details are refused outright (nothing is stored), so a young person and a mentor never swap numbers.
 * Crisis or safeguarding wording is still delivered, and the safeguarding lead is told.
 */
export async function sendMessage(userId: string, askId: string, body: string): Promise<R<{ blocked?: false }> | { ok: false; error: string; blocked: true }> {
  const text = body.trim().slice(0, MAX_MESSAGE);
  if (!text) return { ok: false, error: "Write a message first." };
  const r = await roleIn(userId, askId);
  if (!r || (r.role !== "PARTICIPANT" && r.role !== "MENTOR") || !r.conn) return { ok: false, error: "Not available." };
  if (!OPEN_FOR_CHAT.includes(r.ask.state) || r.conn.pausedByConcern) return { ok: false, error: "This chat is closed." };
  if (detectContactDetails(text).length) {
    await audit(userId, "thread.blocked_contact", "Ask", askId);
    return { ok: false, blocked: true, error: "It has contact details. Chats and calls stay on the Village Circle so your guardian and the team can keep you safe. Take them out to send." };
  }
  await db.askMessage.create({ data: { askId, authorId: userId, role: r.role, body: text } });
  const flags = screenText(text).filter((f) => f === "CRISIS" || f === "SAFEGUARDING");
  if (flags.length) await audit(userId, "thread.flagged", "Ask", askId, null, { flags });
  const other = r.role === "PARTICIPANT" ? r.conn.mentor.userId : r.ask.participant.userId;
  const from = r.role === "PARTICIPANT" ? firstName(r.ask.participant.user.name) : shortName(r.conn.mentor.user.name);
  await notify(other, "thread.message", `New message from ${from}`, "Open the chat to read it.", { link: r.role === "PARTICIPANT" ? `/mentor/conversations/${askId}` : `/asks/${askId}/thread`, dedupeKey: `thread-${askId}-${other}-${Math.floor(Date.now() / 600_000)}` });
  return { ok: true };
}
