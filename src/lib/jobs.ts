/**
 * The scheduled jobs behind /api/cron/*. Each one is safe to run again: notifications carry dedupe keys and the sweeps check state first.
 * The Vercel free plan allows one run a day, so vercel.json calls /api/cron/all once a day, and the jobs that need to run more often
 * also run from page loads (settleJobs) and, once the repo is on GitHub, every 10 minutes from .github/workflows/cron.yml.
 */
import { db } from "./db";
import { notify } from "./notify";
import { moveAsk } from "./asks";
import { settleCalls, sweepEndedCalls, sweepMisses, sweepPassedTimes } from "./connections";
import { createDueCheckIns, resetMonthlyHours, sendMonthlyDigests } from "./insight";
import { sweepReaffirmations } from "./reaffirm";
import { sweepDeletions } from "./safety-user";
import { sendDueBroadcasts } from "./admin-ops";
import { reminderDue, windowSoon } from "./domain/jobs";
import { fmtWhen } from "./domain/scheduling";
import { firstName } from "./domain/views";
import { isMinor } from "./domain/age";
import { addBusinessDays } from "./domain/service-windows";

/** Hourly: the 24-hour and 1-hour reminders to everyone in a booked call (participant, mentor, and an attending guardian). */
export async function callReminders(now: Date = new Date()) {
  const conns = await db.connection.findMany({
    where: { status: "CONFIRMED", pausedByConcern: false, scheduledAt: { gt: now, lte: new Date(now.getTime() + 24 * 3600_000) }, ask: { state: "SCHEDULED" } },
    include: { ask: { include: { topic: true } }, mentor: { include: { user: true } }, participant: { include: { user: true } } },
  });
  let sent = 0;
  for (const c of conns) {
    const which = reminderDue(c.scheduledAt!, now); if (!which) continue;
    const when = fmtWhen(c.scheduledAt!); const soon = which === "1h" ? "in about an hour" : "tomorrow";
    const title = which === "1h" ? "Your conversation starts soon" : "Your conversation is tomorrow";
    const minor = !!c.participant.user.dateOfBirth && isMinor(c.participant.user.dateOfBirth);
    await notify(c.participant.userId, "connection.reminder", title, `${c.ask.topic.name} with ${firstName(c.mentor.user.name)}, ${when}. The link opens 10 minutes before.`, { link: `/asks/${c.askId}/call`, dedupeKey: `remind-${which}:${c.id}:p` });
    await notify(c.mentor.userId, "connection.reminder", title, `${c.ask.topic.name} with ${firstName(c.participant.user.name)}, ${when}. The link opens 10 minutes before.`, { link: `/mentor/conversations/${c.askId}`, dedupeKey: `remind-${which}:${c.id}:m` });
    if (minor && c.guardianAttends) {
      const links = await db.guardianLink.findMany({ where: { participantId: c.participantId, active: true }, include: { guardian: true } });
      for (const l of links) await notify(l.guardian.userId, "connection.reminder", title, `${firstName(c.participant.user.name)}'s conversation is ${soon}, ${when}. You said you would attend.`, { link: `/guardian/asks/${c.askId}/call`, dedupeKey: `remind-${which}:${c.id}:g:${l.guardianId}` });
    }
    sent++;
  }
  return sent;
}

/**
 * Every 30 minutes: warn admins 4 hours before an Ask's service window ends (A7 "Service window at risk"), and return Asks
 * whose release window has passed with nobody stepping forward to the team (BR-15), rather than letting them lapse silently.
 */
export async function serviceWindowSweep(now: Date = new Date()) {
  const asks = await db.ask.findMany({ where: { state: { in: ["SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS"] }, serviceWindowDue: { not: null } }, include: { topic: true }, take: 500 });
  const admins = await db.user.findMany({ where: { roles: { has: "ADMIN" }, status: "ACTIVE" }, select: { id: true } });
  let warned = 0, returned = 0;
  for (const a of asks) {
    if (a.state === "OPEN_TO_MENTORS" && a.serviceWindowDue! <= now) {
      const r = await moveAsk(a.id, "IN_TEAM_REVIEW", "SYSTEM", { reason: "R_NOONE", note: "Nobody stepped forward inside the release window", data: { serviceWindowDue: addBusinessDays(now, 2) } });
      if (r.ok) returned++;
      continue;
    }
    if (windowSoon(a.serviceWindowDue, now)) {
      for (const ad of admins) await notify(ad.id, "ask.window_at_risk", "An Ask is close to its service window", `${a.topic.name}. Due within 4 hours.`, { link: `/admin/asks/${a.id}`, dedupeKey: `window:${a.id}:${a.serviceWindowDue!.toISOString()}:${ad.id}` });
      warned++;
    }
  }
  return { warned, returned };
}

/** Every 10 minutes: missed calls (15 minutes after the start), times that passed before booking, calls that ended without a close-out, and scheduled announcements. */
export async function runSweeps() {
  const [misses, passed, ended, broadcasts] = [await sweepMisses(), await sweepPassedTimes(), await sweepEndedCalls(), await sendDueBroadcasts()];
  return { misses, passed, ended, broadcasts };
}

/** Daily: 30-day check-ins, annual re-affirmations, deletions whose 30 days are over, and the monthly hours reset (it runs once a month however often it is called). */
export async function runDaily(now: Date = new Date()) {
  const checkIns = await createDueCheckIns(now);
  const reaffirm = await sweepReaffirmations(now);
  const deletions = await sweepDeletions(now);
  const hoursReset = await resetMonthlyHours(now);
  return { checkIns, reaffirm, deletions, hoursReset };
}

/** Days 1 to 3 of the month: the monthly review and the mentor round-up (sent on the first business day only). */
export async function runMonthly(now: Date = new Date()) {
  const hoursReset = await resetMonthlyHours(now);
  const digests = await sendMonthlyDigests(now);
  return { hoursReset, digests };
}

/** Once a day (vercel.json): every job in turn. One failing job does not stop the others. */
export async function runAll(now: Date = new Date()) {
  const out: Record<string, unknown> = {};
  const steps: [string, () => Promise<unknown>][] = [
    ["sweeps", () => runSweeps()], ["serviceWindows", () => serviceWindowSweep(now)], ["reminders", () => callReminders(now)],
    ["daily", () => runDaily(now)], ["monthly", () => runMonthly(now)],
  ];
  for (const [name, run] of steps) {
    try { out[name] = await run(); } catch (e) { console.error(`[cron:all:${name}]`, e); out[name] = "failed"; }
  }
  return out;
}

let lastQuick = 0, lastWindows = 0;
/**
 * Called by the signed-in page guards. Settles calls (at most once a minute), and runs the reminders and announcements every
 * 10 minutes and the service-window check every 30, so they keep working between the daily cron runs while people use the app.
 */
export async function settleJobs() {
  await settleCalls();
  const now = Date.now();
  if (now - lastQuick >= 10 * 60_000) {
    lastQuick = now;
    try { await callReminders(); await sendDueBroadcasts(); } catch (e) { console.error("settleJobs:quick", e); }
  }
  if (now - lastWindows >= 30 * 60_000) {
    lastWindows = now;
    try { await serviceWindowSweep(); } catch (e) { console.error("settleJobs:windows", e); }
  }
}
