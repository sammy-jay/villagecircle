import { requireRole } from "./auth";
import { db } from "./db";
import { UNREAD } from "./notifications";
import { settleJobs } from "./jobs";
import { openAskCount } from "./domain/limits";
import { isMinor } from "./domain/age";
import { participantFor } from "./asks";

export interface PCtx { userId: string; name: string; first: string; minor: boolean; both: boolean; openCount: number; unread: boolean; status: string }

/** Shared guard for participant pages. Returns a redirect target or the shell context. */
export async function participantPage(opts: { allowPaused?: boolean } = {}): Promise<{ to: string } | { ctx: PCtx }> {
  const g = await requireRole("PARTICIPANT");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : "/login" };
  // One round of reads at once. Ask states are read after the sweep, so a call whose time has passed never shows as booked.
  const [p, asks, unreadN] = await Promise.all([
    participantFor(g.user.id), // shared with the page's own loaders (once per request)
    settleJobs().then(() => db.ask.findMany({ where: { participant: { userId: g.user.id } }, select: { state: true } })),
    db.notification.count({ where: { userId: g.user.id, ...UNREAD } }),
  ]);
  const u = p?.user;
  if (!u?.participant) return { to: "/login" };
  if (u.status === "PENDING_GUARDIAN") return { to: "/guardian-needed" };
  if (u.status === "PAUSED" && !opts.allowPaused) return { to: "/paused" };
  const unread = unreadN > 0;
  const name = u.name ?? u.email ?? "";
  return { ctx: { userId: u.id, name, first: name.split(" ")[0] || "friend", minor: !!u.dateOfBirth && isMinor(u.dateOfBirth), both: u.roles.includes("MENTOR"), openCount: openAskCount(asks.map((a) => a.state)), unread, status: u.status } };
}
