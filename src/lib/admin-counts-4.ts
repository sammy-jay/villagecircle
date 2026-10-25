import { db } from "./db";
/** Gold count on the Moderation nav item (A10). */
export async function moderationCounts() {
  const [thanks, posts, resources] = await Promise.all([
    db.thanks.count({ where: { moderation: "PENDING", sharePublicly: true } }), db.post.count({ where: { moderation: "PENDING" } }), db.resource.count({ where: { moderation: "PENDING" } }),
  ]);
  return { thanks, posts, resources, events: 0, total: thanks + posts + resources };
}
