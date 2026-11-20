import { requireRole } from "./auth";
import { db } from "./db";
import { UNREAD } from "./notifications";
import { settleJobs } from "./jobs";
import { guardianShellData } from "./call-extra";

export interface GCtx { userId: string; name: string; first: string; kids: string[]; needs: number; unread: boolean }

/** Shared guard for guardian pages. Returns a redirect target or the shell context. */
export async function guardianPage(next: string): Promise<{ to: string } | { ctx: GCtx }> {
  const g = await requireRole("GUARDIAN");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : `/login?next=${encodeURIComponent(next)}` };
  // One round of reads. The approvals count waits for the sweep, so a call whose time has passed never shows as booked.
  const [u, sh, unread] = await Promise.all([
    db.user.findUnique({ where: { id: g.user.id }, select: { id: true, name: true } }),
    settleJobs().then(() => guardianShellData(g.user.id)),
    db.notification.count({ where: { userId: g.user.id, ...UNREAD } }),
  ]);
  if (!u) return { to: "/login" };
  return { ctx: { userId: u.id, name: u.name, first: u.name.split(" ")[0] ?? "", kids: sh.kids, needs: sh.needs, unread: unread > 0 } };
}
