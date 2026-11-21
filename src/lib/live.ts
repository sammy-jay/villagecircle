/**
 * Live updates: a short fingerprint of everything that can change what this person's dashboards show. The browser
 * asks for it every few seconds (/api/live) and re-renders the page only when it changes, so a stage change, a new
 * message, a released Ask, an approval or a queue change shows up without a refresh.
 *
 * Every part is a single indexed lookup (newest id or newest update time), read at once. ObjectIds grow with time, so
 * "newest id" is the cheapest way to see that something new was written to an append-mostly collection.
 * The fingerprint is a hash: it says that something changed, never what.
 */
import { createHash } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { UNREAD } from "./notifications";

const t = (d: Date | null | undefined) => (d ? d.getTime().toString(36) : "-");
const newest = { orderBy: { id: "desc" as const }, select: { id: true } };

export async function liveVersion(userId: string, roles: Role[], teamVerified: boolean): Promise<string> {
  const participant = roles.includes("PARTICIPANT"), mentor = roles.includes("MENTOR"), guardian = roles.includes("GUARDIAN");
  const team = teamVerified && (roles.includes("ADMIN") || roles.includes("SAFEGUARDING_LEAD"));

  // Round 1: the person, their notifications and applications, their profiles, and the team's queues.
  const [user, note, unread, app, pp, mp, gd, teamParts] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { updatedAt: true, status: true } }),
    db.notification.findFirst({ where: { userId }, ...newest }), // messages, stage changes and approvals all notify
    db.notification.count({ where: { userId, ...UNREAD } }), // read in another tab or device
    db.application.findFirst({ where: { applicantId: userId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    participant ? db.participantProfile.findUnique({ where: { userId }, select: { id: true, updatedAt: true } }) : null,
    mentor ? db.mentorProfile.findUnique({ where: { userId }, select: { id: true, updatedAt: true } }) : null,
    guardian ? db.guardian.findUnique({ where: { userId }, select: { links: { where: { active: true }, select: { participantId: true } } } }) : null,
    team ? Promise.all([
      db.askStateChange.findFirst(newest), // every Ask moving stage, from anyone
      db.auditEvent.findFirst(newest), // every recorded team and account action
      db.application.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.incident.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
      db.incidentEvent.findFirst(newest),
      db.helpRequest.findFirst(newest),
      db.thanks.findFirst(newest), db.post.findFirst(newest), db.resource.findFirst(newest), db.villageModeration.findFirst(newest),
    ]).then((xs) => xs.map((x) => (x && "id" in x ? x.id : t((x as { updatedAt?: Date } | null)?.updatedAt))).join(".")) : "",
  ]);

  // Round 2: what hangs off the profiles.
  const kids = gd?.links.map((l) => l.participantId) ?? [];
  const [pAsk, pConn, shortlist, mConn, kAsk, kConn] = await Promise.all([
    pp ? db.ask.findFirst({ where: { participantId: pp.id }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null,
    pp ? db.connection.findFirst({ where: { participantId: pp.id }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null,
    mp ? db.shortlistEntry.findMany({ where: { mentorId: mp.id, releasedAt: { not: null } }, select: { askId: true, releasedAt: true, respondedAt: true } }) : [],
    mp ? db.connection.findFirst({ where: { mentorId: mp.id }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null,
    kids.length ? db.ask.findFirst({ where: { participantId: { in: kids } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null,
    kids.length ? db.connection.findFirst({ where: { participantId: { in: kids } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null,
  ]);
  // Round 3 (mentors only): an Ask released to them changing stage, for example taken by someone else.
  const mAsk = shortlist.length ? await db.ask.findFirst({ where: { id: { in: shortlist.map((s) => s.askId) } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }) : null;
  const released = shortlist.reduce((a, s) => `${a}${t(s.releasedAt)}${t(s.respondedAt)}`, String(shortlist.length));

  const parts = [
    t(user?.updatedAt), user?.status ?? "-", note?.id ?? "-", unread, t(app?.updatedAt),
    t(pp?.updatedAt), t(pAsk?.updatedAt), t(pConn?.updatedAt),
    t(mp?.updatedAt), released, t(mConn?.updatedAt), t(mAsk?.updatedAt),
    kids.join(","), t(kAsk?.updatedAt), t(kConn?.updatedAt),
    teamParts,
  ];
  return createHash("sha1").update(parts.join("|")).digest("base64url").slice(0, 16);
}
