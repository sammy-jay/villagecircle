/** Top-bar search for mentors and guardians. Each person only ever searches what they can already see. */
import { db } from "./db";
import { mentorInbox } from "./mentor-asks";
import { mentorConversations } from "./mentor-extra";
import { myResources } from "./mentor-resources";
import { memberLibraryCards } from "./village";
import { matchesAll } from "./domain/search";
import { parseAnswers } from "./domain/ask-answers";
import { STATE_LABEL } from "./domain/ask-tracking";
import { firstName, shortName } from "./domain/views";

export type Hit = { key: string; title: string; sub: string; href: string };
export type Group = { label: string; hits: Hit[] };

const keep = (hits: Hit[], q: string) => hits.filter((h) => matchesAll(`${h.title} ${h.sub}`, q));
const whenShort = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d) : "");

async function library(q: string): Promise<Group> {
  const cards = await memberLibraryCards();
  return { label: "Library", hits: keep(cards.map((c) => ({ key: `r-${c.id}`, title: c.title, sub: `${c.kind} · ${c.topic} · ${c.credit}`, href: `/village/library/${c.id}` })), q) };
}

/** Mentor: Asks in their inbox, their own conversations, what they have shared, and the library. Participants appear by first name only. */
export async function mentorSearch(userId: string, q: string): Promise<Group[]> {
  const [inbox, convs, mine, lib] = await Promise.all([mentorInbox(userId), mentorConversations(userId), myResources(userId), library(q)]);
  const asks: Hit[] = (inbox?.items ?? []).map((a) => ({ key: `a-${a.askId}`, title: a.question, sub: `${a.topic} · ${a.sessionLength} min · open Ask`, href: `/mentor/asks/${a.askId}` }));
  const talk: Hit[] = [...(convs?.scheduled ?? []), ...(convs?.completed ?? [])].map((c) => ({ key: `c-${c.askId}`, title: `${c.topic} with ${c.first}`, sub: c.at ? `Conversation · ${whenShort(c.at)}` : "Conversation · time to be chosen", href: `/mentor/conversations/${c.askId}` }));
  const shared: Hit[] = (mine ?? []).map((r) => ({ key: `m-${r.id}`, title: r.title, sub: `You shared · ${r.topic} · ${r.state.toLowerCase()}`, href: "/mentor/resources" }));
  return [{ label: "Asks in your inbox", hits: keep(asks, q) }, { label: "Your conversations", hits: keep(talk, q) }, { label: "What you shared", hits: keep(shared, q) }, lib].filter((g) => g.hits.length);
}

/** Guardian: their young person's Asks and calls, and the library. Nothing about other families. */
export async function guardianSearch(userId: string, q: string): Promise<Group[]> {
  const g = await db.guardian.findUnique({ where: { userId }, include: { links: { where: { active: true }, include: { participant: { include: { user: { select: { name: true } } } } } } } });
  const pids = g?.links.map((l) => l.participantId) ?? [];
  const [asks, lib] = await Promise.all([
    pids.length ? db.ask.findMany({ where: { participantId: { in: pids }, state: { not: "DRAFT" } }, include: { topic: true, participant: { include: { user: { select: { name: true } } } }, connection: { include: { mentor: { include: { user: { select: { name: true } } } } } } }, orderBy: { updatedAt: "desc" }, take: 100 }) : Promise.resolve([]),
    library(q),
  ]);
  const askHits: Hit[] = asks.map((a) => ({ key: `a-${a.id}`, title: parseAnswers(a.answers).q1.split(/[.?!]/)[0]?.trim() || a.topic.name, sub: `${firstName(a.participant.user.name)} · ${a.topic.name} · ${STATE_LABEL[a.state] ?? a.state}`, href: a.state === "AWAITING_GUARDIAN" || a.state === "MENTOR_STEPPED_FORWARD" || a.state === "CONNECTION_APPROVED" ? `/guardian/approvals/${a.id}` : "/guardian" }));
  const callHits: Hit[] = asks.filter((a) => a.connection?.scheduledAt).map((a) => ({ key: `c-${a.id}`, title: `${a.topic.name} call with ${shortName(a.connection!.mentor.user.name)}`, sub: `${firstName(a.participant.user.name)} · ${whenShort(a.connection!.scheduledAt)}`, href: a.connection!.status === "HELD" ? `/guardian/recordings/${a.connection!.id}` : `/guardian/asks/${a.id}/call` }));
  return [{ label: "Asks", hits: keep(askHits, q) }, { label: "Calls and recordings", hits: keep(callHits, q) }, lib].filter((x) => x.hits.length);
}
