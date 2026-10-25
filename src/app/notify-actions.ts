"use server";

import { getSession } from "@/lib/auth";
import { listNotifications, markAllRead, markRead, unreadCount } from "@/lib/notifications";

/** Events that open the urgent pop-up (NT3): safety first, then anything about to breach a window. */
const URGENT = /^(incident\.|ask\.window_at_risk|mentor\.disclosure|mentor\.suspended|account\.suspended)/;

export type BellItem = { id: string; title: string; body: string; when: string; unread: boolean; link: string | null; urgent: boolean; at: string };

/** NT3 panel from the bell: the six newest, and how many are unread. Any signed-in role. */
export async function bellAction(): Promise<{ items: BellItem[]; unread: number }> {
  const id = (await getSession())?.user?.id; if (!id) return { items: [], unread: 0 };
  const [rows, unread] = await Promise.all([listNotifications(id, 6), unreadCount(id)]);
  return { unread, items: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, when: n.when, unread: n.unread, link: n.link, urgent: URGENT.test(n.event), at: n.createdAt.toISOString() })) };
}
export async function bellReadAction(notificationId: string) {
  const id = (await getSession())?.user?.id; if (!id) return;
  await markRead(id, notificationId);
}
export async function bellReadAllAction() {
  const id = (await getSession())?.user?.id; if (!id) return;
  await markAllRead(id);
}
