import { requireRole } from "./auth";
import { db } from "./db";
import { openAskCount } from "./domain/limits";
import { isMinor } from "./domain/age";
import { guardianShellData } from "./call-extra";

export interface SettingsCtx { userId: string; name: string; role: "PARTICIPANT" | "MENTOR" | "GUARDIAN"; subtitle: string; openCount: number; both: boolean; unread: boolean; kids: string[]; needs: number; minor: boolean }

/** Shared guard and shell data for the settings pages. Returns a redirect target or the context. */
export async function settingsPage(): Promise<{ to: string } | { ctx: SettingsCtx }> {
  const g = await requireRole("PARTICIPANT", "MENTOR", "GUARDIAN");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : "/login" };
  const u = await db.user.findUnique({ where: { id: g.user.id }, include: { participant: true } }); if (!u) return { to: "/login" };
  const name = u.name ?? u.email ?? ""; const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  const role = u.roles.includes("PARTICIPANT") && u.participant ? "PARTICIPANT" : u.roles.includes("MENTOR") ? "MENTOR" : "GUARDIAN";
  let openCount = 0;
  if (u.participant) openCount = openAskCount((await db.ask.findMany({ where: { participantId: u.participant.id }, select: { state: true } })).map((a) => a.state));
  const unread = (await db.notification.count({ where: { userId: u.id, readAt: null } })) > 0;
  const sh = role === "GUARDIAN" ? await guardianShellData(u.id) : { kids: [] as string[], needs: 0 };
  return { ctx: { userId: u.id, name, role, subtitle: minor ? "Guardian-supported" : "Participant", openCount, both: u.roles.includes("MENTOR"), unread, kids: sh.kids, needs: sh.needs, minor } };
}
