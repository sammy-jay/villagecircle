import { db } from "./db";
import { relativeTime } from "./domain/insight";

export const PREF_KEYS = ["resources", "events", "review"] as const;
export type PrefKey = (typeof PREF_KEYS)[number];

/** Bell dot: how many in-app notifications are unread. */
export async function unreadCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, channel: "IN_APP", readAt: null } });
}

export async function listNotifications(userId: string, limit = 30) {
  const now = new Date();
  const rows = await db.notification.findMany({ where: { userId, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((n) => ({ id: n.id, event: n.event, title: n.title, body: n.body, unread: !n.readAt, when: relativeTime(n.createdAt, now), createdAt: n.createdAt }));
}

export async function markRead(userId: string, id: string) {
  if (!/^[0-9a-f]{24}$/i.test(id)) return;
  await db.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}
export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function getPrefs(userId: string): Promise<Record<PrefKey, boolean>> {
  const row = await db.setting.findUnique({ where: { key: `notify-prefs:${userId}` } });
  const v = (row?.value ?? {}) as Record<string, string>;
  return { resources: v.resources !== "OFF", events: v.events !== "OFF", review: v.review !== "OFF" };
}
export async function setPref(userId: string, key: PrefKey, on: boolean) {
  const cur = await getPrefs(userId); const next = { ...cur, [key]: on };
  const value = Object.fromEntries(PREF_KEYS.map((k) => [k, next[k] ? "EMAIL" : "OFF"]));
  await db.setting.upsert({ where: { key: `notify-prefs:${userId}` }, update: { value }, create: { key: `notify-prefs:${userId}`, value } });
}
