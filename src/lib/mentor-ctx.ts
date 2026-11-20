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
  if (!g.ok) return { to: g.reason === "mfa" ? "/mfa" : g.reason === "forbidden" ? "/after-login" : `/login?next=${encodeURIComponent(next)}` };
  const id = g.user.id;
  // One round of reads, alongside the sweep (a call whose time has passed must not show as booked; the page loads its data after this returns).
  const [, u, app, m, unread, hold, openN] = await Promise.all([
    settleJobs(),
    db.user.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
    db.application.findFirst({ where: { applicantId: id, type: "MENTOR" }, orderBy: { createdAt: "desc" }, select: { state: true } }),
    db.mentorProfile.findUnique({ where: { userId: id }, select: { id: true, verification: true, codeOfConductAt: true, orientationDoneAt: true } }),
    db.notification.count({ where: { userId: id, ...UNREAD } }),
    db.eligibilityHold.findUnique({ where: { userId: id } }),
    db.shortlistEntry.count({ where: { mentor: { userId: id }, releasedAt: { not: null }, response: "NONE", ask: { state: "OPEN_TO_MENTORS" } } }),
  ]);
  if (!u) return { to: "/login" };
  const gate = gateFor(app, m);
  if (need === "active" && gate !== "ACTIVE") return { to: mentorHome(gate) };
  if (need === "profile" && !m) return { to: mentorHome(gate) };
  const open = m && gate === "ACTIVE" ? openN : 0;
  return { ctx: { userId: u.id, name: u.name, first: firstName(u.name), short: shortName(u.name), unread: unread > 0, open, gate, hasProfile: !!m, paused: !!hold && !hold.resolvedAt } };
}
