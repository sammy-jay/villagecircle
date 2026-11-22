/**
 * A video call you can join right now, to test Daily before deploying.
 *
 *   pnpm run call:test            Jordan (participant) and Marcus (mentor), starting in 2 minutes
 *   pnpm run call:test --minor    Ava (16, recorded) and Marcus, with her guardian Karen able to observe
 *   pnpm run call:test --remove   remove every test call and its Daily room
 *
 * Needs DAILY_API_KEY and DAILY_DOMAIN in .env and the demo seed (pnpm run db:seed:demo). Only records marked
 * as test calls are created or removed. Join both sides within 15 minutes of the start, or the call counts as missed.
 */
import { PrismaClient } from "@prisma/client";
import { deleteRoom, ensureRoom } from "../src/lib/integrations/video";
import { isConfigured } from "../src/lib/integrations/status";

const db = new PrismaClient();
const MARK = "TEST-VIDEO-CALL";
const APP = (process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
const PASSWORD = "VillageDemo2026";

async function remove() {
  const asks = await db.ask.findMany({ where: { teamNote: MARK }, select: { id: true, connection: { select: { id: true, roomName: true } } } });
  for (const a of asks) {
    const c = a.connection;
    if (c?.roomName) await deleteRoom(c.roomName).catch(() => undefined);
    await db.notification.deleteMany({ where: { OR: [{ link: { contains: a.id } }, ...(c ? [{ dedupeKey: { contains: c.id } }] : [])] } });
    await db.askStateChange.deleteMany({ where: { askId: a.id } });
    if (c) await db.connection.delete({ where: { id: c.id } });
    await db.ask.delete({ where: { id: a.id } });
  }
  return asks.length;
}

async function book(minor: boolean) {
  if (!isConfigured("video")) {
    console.log("\nVideo is not set up yet, so the call would open the preview room.");
    console.log("Add DAILY_API_KEY and DAILY_DOMAIN to .env (see .env.example), then run this again.\n");
    process.exitCode = 1; return;
  }
  const who = minor ? "ava.thompson" : "jordan.ramirez";
  const p = await db.user.findUnique({ where: { email: `${who}@example.com` }, include: { participant: true } });
  const m = await db.mentorProfile.findFirst({ where: { user: { email: "marcus.bennett@example.com" } } });
  const topic = await db.topic.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  if (!p?.participant || !m || !topic) { console.log("\nThe demo accounts are missing. Run pnpm run db:seed:demo first.\n"); process.exitCode = 1; return; }

  const start = new Date(Date.now() + 2 * 60_000); // the link opens 10 minutes before, so it is open straight away
  const ask = await db.ask.create({ data: {
    participantId: p.participant.id, submittedById: p.id, topicId: topic.id, state: "SCHEDULED", completeness: 100, submittedAt: new Date(), teamNote: MARK,
    answers: { q1: "Test video call to check the call room before deploying.", q2: "This is a test record and can be removed.", q3: "Checking camera, microphone and the room.", sessionLength: 30 },
  } });
  const conn = await db.connection.create({ data: { askId: ask.id, mentorId: m.id, participantId: p.participant.id, status: "CONFIRMED", scheduledAt: start, durationMinutes: 30, offeredTimes: [start], guardianAttends: minor, guardianApproved: minor, guardianMentorApprovedAt: minor ? new Date() : null, guardianTimeApprovedAt: minor ? new Date() : null } });
  const room = await ensureRoom({ name: `vc-${conn.id}`, startsAt: start, durationMinutes: 30, record: minor });
  await db.connection.update({ where: { id: conn.id }, data: { roomName: room.name } });

  console.log(`\nTest call booked. It starts at ${start.toLocaleTimeString()} and stays joinable for an hour. Daily room: ${room.url}\n`);
  console.log("Open each link in a different browser window (one normal, one private), sign in, allow camera and microphone, then press Join:\n");
  console.log(`  ${minor ? "Participant, 16" : "Participant"} (${who}@example.com):`.padEnd(48), `${APP}/asks/${ask.id}/call`);
  console.log("  Mentor (marcus.bennett@example.com):".padEnd(48), `${APP}/mentor/conversations/${ask.id}`);
  if (minor) console.log("  Guardian, observing (karen.thompson@example.com):".padEnd(48), `${APP}/guardian/asks/${ask.id}/call`);
  console.log(`\n  Password for all of them: ${PASSWORD}`);
  console.log(minor ? "\n  This call is recorded (under 18). If your Daily plan has no cloud recording, booking it fails with a Daily error." : "");
  console.log("\nWhen you are done: pnpm run call:test --remove\n");
}

(async () => {
  if (process.argv.includes("--remove")) console.log(`\nRemoved ${await remove()} test call(s).\n`);
  else await book(process.argv.includes("--minor"));
  await db.$disconnect();
})().catch(async (e) => { console.error("\n" + (e instanceof Error ? e.message : String(e)) + "\n"); await db.$disconnect(); process.exit(1); });
