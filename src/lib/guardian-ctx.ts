import { requireRole } from "./auth";
import { db } from "./db";
import { UNREAD } from "./notifications";
import { settleJobs } from "./jobs";
import { guardianShellData } from "./call-extra";

export interface GCtx { userId: string; name: string; first: string; kids: string[]; needs: number; unread: boolean }

/** Shared guard for guardian pages. Returns a redirect target or the shell context. */
export async function guardianPage(next: string): Promise<{ to: string } | { ctx: GCtx }> {
  const g = await requireRole("GUARDIAN");
  if (g.ok) await settleJobs(); // a call whose time has passed must not show as booked
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : `/login?next=${encodeURIComponent(next)}` };
  const u = await db.user.findUnique({ where: { id: g.user.id }, select: { id: true, name: true } });
  if (!u) return { to: "/login" };
  const [sh, unread] = await Promise.all([guardianShellData(u.id), db.notification.count({ where: { userId: u.id, ...UNREAD } })]);
  return { ctx: { userId: u.id, name: u.name, first: u.name.split(" ")[0] ?? "", kids: sh.kids, needs: sh.needs, unread: unread > 0 } };
}
