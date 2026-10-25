import { requireRole } from "./auth";
import { db } from "./db";
import { participantPage, type PCtx } from "./participant-ctx";

/** Who is looking at a village page: a participant (with their context) or a mentor. */
export type VViewer = { kind: "participant"; ctx: PCtx } | { kind: "mentor"; name: string; both: boolean };

/** Guard for village pages. Participants get the participant shell; mentors (who are not participants) the mentor shell. */
export async function villageViewer(o: { mentors?: boolean } = {}): Promise<{ to: string } | { viewer: VViewer; userId: string }> {
  const g = await requireRole("PARTICIPANT", "MENTOR");
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : "/login" };
  const isP = g.user.roles.includes("PARTICIPANT");
  if (isP) { const p = await participantPage(); return "to" in p ? p : { viewer: { kind: "participant", ctx: p.ctx }, userId: p.ctx.userId }; }
  if (!o.mentors) return { to: "/mentor" };
  const u = await db.user.findUnique({ where: { id: g.user.id }, select: { name: true } });
  return { viewer: { kind: "mentor", name: u?.name ?? "Mentor", both: false }, userId: g.user.id };
}
