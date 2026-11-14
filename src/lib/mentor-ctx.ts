import { requireRole } from "./auth";
import { db } from "./db";
import { UNREAD } from "./notifications";
import { settleJobs } from "./jobs";
import { firstName, shortName } from "./domain/views";
import { gateFor, mentorHome, type MentorGate } from "./domain/mentor-gate";

export { mentorHome, type MentorGate };
export interface MCtx { userId: string; name: string; first: string; short: string; unread: boolean; open: number; gate: MentorGate; hasProfile: boolean; paused: boolean }

/**
 * Shared guard for mentor pages. `need` says how far along the mentor must be:
 * "any" (signed-in mentor), "profile" (application sent), "active" (approved and oriented).
 * Anyone not far enough along is sent to the page for their own stage.
 */
export async function mentorPage(next: string, need: "any" | "profile" | "active" = "active"): Promise<{ to: string } | { ctx: MCtx }> {
  const g = await requireRole("MENTOR");
  if (g.ok) await settleJobs(); // a call whose time has passed must not show as booked
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : g.reason === "forbidden" ? "/after-login" : `/login?next=${encodeURIComponent(next)}` };
  const u = await db.user.findUnique({ where: { id: g.user.id }, select: { id: true, name: true, status: true } });
  if (!u) return { to: "/login" };
  const [app, m, unread, hold] = await Promise.all([
    db.application.findFirst({ where: { applicantId: u.id, type: "MENTOR" }, orderBy: { createdAt: "desc" }, select: { state: true } }),
    db.mentorProfile.findUnique({ where: { userId: u.id }, select: { id: true, verification: true, codeOfConductAt: true, orientationDoneAt: true } }),
    db.notification.count({ where: { userId: u.id, ...UNREAD } }),
    db.eligibilityHold.findUnique({ where: { userId: u.id } }),
  ]);
  const gate = gateFor(app, m);
  if (need === "active" && gate !== "ACTIVE") return { to: mentorHome(gate) };
  if (need === "profile" && !m) return { to: mentorHome(gate) };
  const open = m && gate === "ACTIVE" ? await db.shortlistEntry.count({ where: { mentorId: m.id, releasedAt: { not: null }, response: "NONE", ask: { state: "OPEN_TO_MENTORS" } } }) : 0;
  return { ctx: { userId: u.id, name: u.name, first: firstName(u.name), short: shortName(u.name), unread: unread > 0, open, gate, hasProfile: !!m, paused: !!hold && !hold.resolvedAt } };
}
