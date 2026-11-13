import { requireRole } from "./auth";
import { db } from "./db";
import { settleJobs } from "./jobs";
import { openAskCount } from "./domain/limits";
import { isMinor } from "./domain/age";

export interface PCtx { userId: string; name: string; first: string; minor: boolean; both: boolean; openCount: number; unread: boolean; status: string }

/** Shared guard for participant pages. Returns a redirect target or the shell context. */
export async function participantPage(opts: { allowPaused?: boolean } = {}): Promise<{ to: string } | { ctx: PCtx }> {
  const g = await requireRole("PARTICIPANT");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : "/login" };
  await settleJobs(); // a call whose time has passed must not show as booked
  const u = await db.user.findUnique({ where: { id: g.user.id }, include: { participant: true } });
  if (!u?.participant) return { to: "/login" };
  if (u.status === "PENDING_GUARDIAN") return { to: "/guardian-needed" };
  if (u.status === "PAUSED" && !opts.allowPaused) return { to: "/paused" };
  const asks = await db.ask.findMany({ where: { participantId: u.participant.id }, select: { state: true } });
  const unread = (await db.notification.count({ where: { userId: u.id, readAt: null } })) > 0;
  const name = u.name ?? u.email ?? "";
  return { ctx: { userId: u.id, name, first: name.split(" ")[0] || "friend", minor: !!u.dateOfBirth && isMinor(u.dateOfBirth), both: u.roles.includes("MENTOR"), openCount: openAskCount(asks.map((a) => a.state)), unread, status: u.status } };
}
