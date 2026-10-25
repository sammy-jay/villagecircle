import { db } from "./db";
import { mentorFor } from "./mentor-asks";
import { cohortLabel, monthYear } from "./domain/village";
import { preview, type ResourceState } from "./domain/mentor-resources";

/** Everything this mentor has submitted, newest first. Only their own rows; counts only (no names of readers). */
export async function myResources(userId: string) {
  if (!(await mentorFor(userId))) return null;
  const rs = await db.resource.findMany({ where: { contributorId: userId }, orderBy: { createdAt: "desc" }, take: 200 });
  const ids = rs.map((r) => r.id);
  const [credits, helped, topics] = await Promise.all([
    ids.length ? db.resourceCredit.findMany({ where: { resourceId: { in: ids } } }) : [],
    ids.length ? db.resourceHelped.groupBy({ by: ["resourceId"], where: { resourceId: { in: ids } }, _count: { _all: true } }) : [],
    db.topic.findMany({ select: { slug: true, name: true } }),
  ]);
  const name = new Map(topics.map((t) => [t.slug, t.name]));
  return rs.map((r) => ({
    id: r.id, title: r.title, type: r.type as string, state: r.moderation as ResourceState, preview: preview(r.body),
    topic: name.get(r.topics[0] ?? "") ?? "", audience: r.cohorts.map((c) => cohortLabel(c)).join(", "),
    credit: credits.find((c) => c.resourceId === r.id)?.mode ?? "FULL",
    helped: helped.find((h) => h.resourceId === r.id)?._count._all ?? 0,
    submitted: monthYear(r.createdAt, false), published: r.moderation === "APPROVED" && r.lastReviewed ? monthYear(r.lastReviewed, false) : null,
  }));
}
