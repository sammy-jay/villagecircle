import { requireRole } from "./auth";
import { db } from "./db";
import { UNREAD } from "./notifications";
import { openAskCount } from "./domain/limits";
import { isMinor } from "./domain/age";
import { guardianShellData } from "./call-extra";

export interface SettingsCtx { userId: string; name: string; role: "PARTICIPANT" | "MENTOR" | "GUARDIAN"; subtitle: string; openCount: number; both: boolean; unread: boolean; kids: string[]; needs: number; minor: boolean }

/** Shared guard and shell data for the settings pages. Returns a redirect target or the context. */
export async function settingsPage(): Promise<{ to: string } | { ctx: SettingsCtx }> {
  const g = await requireRole("PARTICIPANT", "MENTOR", "GUARDIAN");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : "/login" };
  // One round of reads instead of four in a row.
  const [u, asks, unreadN, guardianSh] = await Promise.all([
    db.user.findUnique({ where: { id: g.user.id }, include: { participant: true } }),
    db.ask.findMany({ where: { participant: { userId: g.user.id } }, select: { state: true } }),
    db.notification.count({ where: { userId: g.user.id, ...UNREAD } }),
    g.user.roles.includes("GUARDIAN") ? guardianShellData(g.user.id) : null,
  ]);
  if (!u) return { to: "/login" };
  const name = u.name ?? u.email ?? ""; const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  const role = u.roles.includes("PARTICIPANT") && u.participant ? "PARTICIPANT" : u.roles.includes("MENTOR") ? "MENTOR" : "GUARDIAN";
  const openCount = u.participant ? openAskCount(asks.map((a) => a.state)) : 0;
  const unread = unreadN > 0;
  const sh = role === "GUARDIAN" && guardianSh ? guardianSh : { kids: [] as string[], needs: 0 };
  return { ctx: { userId: u.id, name, role, subtitle: minor ? "Guardian-supported" : "Participant", openCount, both: u.roles.includes("MENTOR"), unread, kids: sh.kids, needs: sh.needs, minor } };
}
