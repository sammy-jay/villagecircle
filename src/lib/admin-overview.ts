import type { Role } from "@prisma/client";
import { db } from "./db";
import { adminCounts } from "./admin-counts";
import { reviewQueue, unmetDemand } from "./review";
import { allAsks } from "./admin-all-asks";
import { incidentList } from "./admin-incidents";
import { moderationCounts } from "./admin-counts-4";
import { buildActions, dailyBuckets, type OverviewCounts } from "./domain/admin-overview";
import { getConfig } from "./config";
import { median } from "./admin-reports";

/** Everything the /admin overview shows, in one round of queries. */
export async function overview(roles: Role[]) {
  const since = new Date(Date.now() - 14 * 86400000);
  const [c, rq, unmet, tracked, incidents, mod, help, recentAsks, audits, auths] = await Promise.all([
    adminCounts(), reviewQueue("ALL"), unmetDemand(), allAsks("ALL"), incidentList(roles), moderationCounts(),
    db.helpRequest.count({ where: { status: "NEW" } }),
    db.ask.findMany({ where: { submittedAt: { gte: since } }, select: { submittedAt: true } }),
    db.auditEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.guardianAuthorization.findMany({ where: { kind: "ASK", approved: true }, orderBy: { decidedAt: "desc" }, take: 3, include: { ask: { include: { topic: true } } } }),
  ]);
  // A3 "Today so far" and the queue health card.
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [released, decided, thanksRead, cfg, reviewed] = await Promise.all([
    db.shortlistEntry.findMany({ where: { releasedAt: { gte: today } }, select: { askId: true }, distinct: ["askId"] }).then((r) => r.length),
    db.application.count({ where: { decidedAt: { gte: today } } }),
    db.auditEvent.count({ where: { createdAt: { gte: today }, action: { startsWith: "moderation." } } }),
    getConfig(),
    db.askStateChange.findMany({ where: { createdAt: { gte: monthStart }, from: "IN_TEAM_REVIEW" }, include: { ask: { select: { submittedAt: true } } } }),
  ]);
  const reviewDays = median(reviewed.filter((r) => r.ask.submittedAt).map((r) => (r.createdAt.getTime() - r.ask.submittedAt!.getTime()) / 86400000));
  const inReview = rq.rows.filter((r) => r.state !== "AWAITING_GUARDIAN");
  const onTime = inReview.filter((r) => !r.overdue && !r.atRisk).length;
  const open = incidents.filter((i) => i.state !== "CLOSED");
  const upcoming = tracked.rows.filter((r) => r.upcoming).sort((a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!));
  const counts: OverviewCounts = {
    overdueIncidents: open.filter((i) => i.countdown?.overdue).length, openIncidents: open.length, atRiskAsks: rq.counts.atRisk, attentionAsks: tracked.counts.attention,
    awaitingGuardian: rq.counts.awaitingGuardian, mentorApps: c.mentors, guardianApps: c.guardians, asksToReview: c.asks, unmet, help, moderation: mod.total, upcomingMinor: upcoming.filter((r) => r.minor).length,
  };
  const actorIds = [...new Set(audits.map((a) => a.actorId).filter(Boolean) as string[])];
  const actors = actorIds.length ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
  return {
    nav: c, counts, actions: buildActions(counts), pipeline: tracked.counts, open: open.slice(0, 4), upcoming: upcoming.slice(0, 5),
    trend: dailyBuckets(recentAsks.map((a) => a.submittedAt!).filter(Boolean)),
    activity: audits.map((a) => ({ id: a.id, action: a.action, object: a.object, at: a.createdAt, actor: a.actorId ? actors.find((x) => x.id === a.actorId)?.name ?? "Team member" : "System" })),
    auths: auths.map((a) => ({ id: a.id, at: a.decidedAt, topic: a.ask.topic.name })),
    today: { released, decided, thanksRead },
    health: { onTime, total: inReview.length, atRisk: inReview.length - onTime, reviewDays: cfg.windows.reviewBusinessDays, replyDays: cfg.windows.mentorReplyDays, medianReviewDays: reviewDays },
  };
}
