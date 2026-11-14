/**
 * Demo data for client review: US-based people, Asks at every stage, library, events and community.
 *
 *   pnpm run db:seed:demo          wipe the previous demo records, then seed again
 *   pnpm run db:seed:demo --wipe   only remove the demo records
 *
 * Every demo account uses an @example.com address (a reserved domain), which is how the wipe finds them.
 * Nothing else in the database is touched. Only the four review accounts have a password; the rest cannot sign in.
 * Times are relative to the moment the seed runs, so booked calls are always in the future.
 */
import { PrismaClient, type AskState, type Cohort, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DOMAIN = "@example.com";
export const DEMO_PASSWORD = "VillageDemo2026";
const TZ = process.env.APP_TIMEZONE || "America/Chicago";
const DAY = 86_400_000;
const NOW = new Date();
const ago = (days: number, hours = 0) => new Date(NOW.getTime() - days * DAY - hours * 3_600_000);
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY);
const email = (slug: string) => `${slug}${DOMAIN}`;
const GV = "2026.1"; // guidelines version
const ATT = "1.2"; // attestation version

/** A wall-clock time in the platform zone, `days` from today. */
function at(days: number, hour: number, minute = 0): Date {
  const base = new Date(NOW.getTime() + days * DAY);
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(base).map((x) => [x.type, x.value]));
  const guess = Date.UTC(+p.year!, +p.month! - 1, +p.day!, hour, minute);
  const off = (d: Date) => {
    const q = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
    return Date.UTC(+q.year!, +q.month! - 1, +q.day!, +q.hour!, +q.minute!, +q.second!) - d.getTime();
  };
  return new Date(guess - off(new Date(guess)));
}
const pastAt = (daysAgo: number, hour: number) => at(-daysAgo, hour);
const yearsAgo = (years: number, extraDays = 0) => new Date(Date.UTC(NOW.getUTCFullYear() - years, NOW.getUTCMonth(), NOW.getUTCDate()) - extraDays * DAY);

// ───────────────────────── Wipe ─────────────────────────

const EVENT_TITLES = ["Breaking into tech: a panel with working engineers", "College essays that sound like you", "Office hours: internships and first jobs", "Money basics for your first paycheck"];
const RESOURCE_TAG = "demo-seed";

async function wipe() {
  const users = await db.user.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } });
  const uids = users.map((u) => u.id);
  const parts = await db.participantProfile.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  const pids = parts.map((p) => p.id);
  const mentors = await db.mentorProfile.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  const mids = mentors.map((m) => m.id);
  const guardians = await db.guardian.findMany({ where: { userId: { in: uids } }, select: { id: true } });
  const gids = guardians.map((g) => g.id);
  const asks = await db.ask.findMany({ where: { participantId: { in: pids } }, select: { id: true } });
  const aids = asks.map((a) => a.id);
  const conns = await db.connection.findMany({ where: { askId: { in: aids } }, select: { id: true } });
  const cids = conns.map((c) => c.id);
  const apps = await db.application.findMany({ where: { applicantId: { in: uids } }, select: { id: true } });
  const goals = await db.goal.findMany({ where: { participantId: { in: pids } }, select: { id: true } });
  const resources = await db.resource.findMany({ where: { topics: { has: RESOURCE_TAG } }, select: { id: true } });
  const rids = resources.map((r) => r.id);
  const events = await db.event.findMany({ where: { title: { in: EVENT_TITLES } }, select: { id: true } });
  const eids = events.map((e) => e.id);
  const incidents = await db.incident.findMany({ where: { reporterId: { in: uids } }, select: { id: true } });
  const thanks = await db.thanks.findMany({ where: { connectionId: { in: cids } }, select: { id: true } });
  const posts = await db.post.findMany({ where: { authorId: { in: uids } }, select: { id: true } });

  await db.villageModeration.deleteMany({ where: { itemId: { in: [...thanks.map((t) => t.id), ...posts.map((p) => p.id), ...rids] } } });
  await db.thanks.deleteMany({ where: { id: { in: thanks.map((t) => t.id) } } });
  await db.checkIn.deleteMany({ where: { connectionId: { in: cids } } });
  await db.askMessage.deleteMany({ where: { askId: { in: aids } } });
  await db.askStateChange.deleteMany({ where: { askId: { in: aids } } });
  await db.guardianAuthorization.deleteMany({ where: { askId: { in: aids } } });
  await db.shortlistEntry.deleteMany({ where: { OR: [{ askId: { in: aids } }, { mentorId: { in: mids } }] } });
  await db.review.deleteMany({ where: { askId: { in: aids } } });
  await db.ongoingMentorship.deleteMany({ where: { askId: { in: aids } } });
  await db.connection.deleteMany({ where: { OR: [{ id: { in: cids } }, { mentorId: { in: mids } }] } });
  await db.ask.deleteMany({ where: { id: { in: aids } } });
  await db.goalEvent.deleteMany({ where: { goalId: { in: goals.map((g) => g.id) } } });
  await db.goal.deleteMany({ where: { participantId: { in: pids } } });
  await db.attestation.deleteMany({ where: { applicationId: { in: apps.map((a) => a.id) } } });
  await db.application.deleteMany({ where: { applicantId: { in: uids } } });
  await db.guardianLink.deleteMany({ where: { OR: [{ guardianId: { in: gids } }, { participantId: { in: pids } }] } });
  await db.guardianInvite.deleteMany({ where: { participantId: { in: pids } } });
  await db.guardianDataRequest.deleteMany({ where: { guardianId: { in: gids } } });
  await db.incidentEvent.deleteMany({ where: { incidentId: { in: incidents.map((i) => i.id) } } });
  await db.incident.deleteMany({ where: { id: { in: incidents.map((i) => i.id) } } });
  await db.helpRequest.deleteMany({ where: { fromUserId: { in: uids } } });
  await db.savedItem.deleteMany({ where: { OR: [{ userId: { in: uids } }, { resourceId: { in: rids } }] } });
  await db.resourceHelped.deleteMany({ where: { OR: [{ userId: { in: uids } }, { resourceId: { in: rids } }] } });
  await db.resourceCredit.deleteMany({ where: { resourceId: { in: rids } } });
  await db.resource.deleteMany({ where: { id: { in: rids } } });
  await db.eventInfo.deleteMany({ where: { eventId: { in: eids } } });
  await db.eventVolunteerRole.deleteMany({ where: { eventId: { in: eids } } });
  await db.volunteerInterest.deleteMany({ where: { OR: [{ userId: { in: uids } }, { eventId: { in: eids } }] } });
  await db.event.deleteMany({ where: { id: { in: eids } } });
  await db.post.deleteMany({ where: { authorId: { in: uids } } });
  await db.notification.deleteMany({ where: { userId: { in: uids } } });
  await db.consentRecord.deleteMany({ where: { userId: { in: uids } } });
  await db.mentorReaffirmation.deleteMany({ where: { userId: { in: uids } } });
  await db.eligibilityHold.deleteMany({ where: { userId: { in: uids } } });
  await db.auditEvent.deleteMany({ where: { actorId: { in: uids } } });
  await db.teamMember.deleteMany({ where: { userId: { in: uids } } });
  if (uids.length) await db.setting.deleteMany({ where: { OR: uids.map((id) => ({ key: { contains: id } })) } });
  await db.guardian.deleteMany({ where: { id: { in: gids } } });
  await db.mentorProfile.deleteMany({ where: { id: { in: mids } } });
  await db.participantProfile.deleteMany({ where: { id: { in: pids } } });
  await db.account.deleteMany({ where: { userId: { in: uids } } });
  await db.session.deleteMany({ where: { userId: { in: uids } } });
  await db.user.deleteMany({ where: { id: { in: uids } } });
  return uids.length;
}

// ───────────────────────── People ─────────────────────────

let HASH = "";
type Person = { name: string; slug: string; dob: Date; state: string; city: string; login?: boolean; createdDaysAgo: number; heardFrom?: string };

async function makeUser(p: Person, roles: ("PARTICIPANT" | "MENTOR" | "GUARDIAN" | "ADMIN")[], extra: Partial<Prisma.UserCreateInput> = {}) {
  const age = (NOW.getTime() - p.dob.getTime()) / (365.25 * DAY);
  const ageBand = age < 16 ? "AGE_13_15" : age < 18 ? "AGE_16_17" : "ADULT";
  const u = await db.user.create({
    data: {
      name: p.name, email: email(p.slug), passwordHash: p.login ? HASH : null, roles, emailVerified: ago(p.createdDaysAgo), dateOfBirth: p.dob, ageBand,
      countryOfResidence: "United States", countryOfOrigin: "United States", languages: ["English"], region: p.state, town: p.city, heardFrom: p.heardFrom,
      createdAt: ago(p.createdDaysAgo), status: "ACTIVE", ...extra,
    },
  });
  await db.consentRecord.createMany({ data: (["TERMS", "PRIVACY", "CODE_OF_CONDUCT"] as const).map((kind) => ({ userId: u.id, kind, version: GV, granted: true, createdAt: ago(p.createdDaysAgo) })) });
  return u;
}

async function participant(p: Person, prof: { cohort: Cohort; interests: string[]; goals: string[]; background?: string }, extra: Partial<Prisma.UserCreateInput> = {}) {
  const u = await makeUser(p, ["PARTICIPANT"], extra);
  const profile = await db.participantProfile.create({ data: { userId: u.id, cohort: prof.cohort, interests: prof.interests, goalsText: prof.goals, communityBackground: prof.background, onboardedAt: ago(p.createdDaysAgo - 0.1) } });
  return { user: u, profile };
}

type MentorSpec = Person & { bio: string; primary: string; extra?: string[]; languages?: string[]; cleared?: boolean; hours?: number; length?: 30 | 60; grid: string[]; areas: string[]; seniority: string; experience: string; timeZone: string; linkedin?: string };

async function mentor(m: MentorSpec, reviewerId: string, state: "APPROVED" | "SUBMITTED" | "IN_REVIEW" | "SCREENING" = "APPROVED") {
  const u = await makeUser(m, ["MENTOR"], { languages: m.languages ?? ["English"] });
  const approved = state === "APPROVED";
  const signed = ago(m.createdDaysAgo - 1);
  const mp = await db.mentorProfile.create({
    data: {
      userId: u.id, bio: m.bio, primaryExpertise: m.primary, extraExpertise: m.extra ?? [], languages: m.languages ?? ["English"],
      verification: approved ? "APPROVED" : state === "SCREENING" ? "PENDING" : "NOT_STARTED", clearedForMinors: approved && !!m.cleared, optedForMinors: !!m.cleared,
      codeOfConductAt: approved ? signed : null, orientationDoneAt: approved ? ago(m.createdDaysAgo - 6) : null, bioClearedAt: approved ? ago(m.createdDaysAgo - 4) : null, bioClearedById: approved ? reviewerId : null,
      monthlyHours: m.hours ?? 2, conversationLength: m.length ?? 30, availability: { paused: false, grid: m.grid, raised: null },
      visibility: approved ? "LISTED" : "PRIVATE", linkedinUrl: m.linkedin, responseRate: approved ? 0.9 : null, createdAt: ago(m.createdDaysAgo),
    },
  });
  const app = await db.application.create({
    data: {
      applicantId: u.id, type: "MENTOR", state, submittedAt: signed, createdAt: ago(m.createdDaysAgo),
      payload: {
        step1: { phone: "+13125550100", country: "United States", countryOfOrigin: "United States", languages: m.languages ?? ["English"], region: m.state, timeZone: m.timeZone, experience: m.experience, heard: m.heardFrom ?? "A friend or colleague" },
        step2: { bio: m.bio, primaryExpertise: m.primary, extraExpertise: m.extra ?? [], linkedinUrl: m.linkedin ?? "", monthlyHours: m.hours ?? 2, conversationLength: m.length ?? 30, optedForMinors: !!m.cleared, areas: m.areas, seniority: m.seniority },
      },
      ...(approved ? { decision: "APPROVED", decidedById: reviewerId, decidedAt: ago(m.createdDaysAgo - 5), screeningRef: `chk_demo_${m.slug.replace(/\W/g, "")}`, screeningState: "clear", checklist: { expertise: true, attestation: true } } : {}),
      ...(state === "SCREENING" ? { screeningRef: `chk_demo_${m.slug.replace(/\W/g, "")}`, screeningState: "pending" } : {}),
    },
  });
  await db.attestation.create({ data: { applicationId: app.id, statementVersion: ATT, typedLegalName: m.name, affirmed: true, ipAddress: "203.0.113.10", signedAt: signed, nextDueAt: new Date(signed.getTime() + 365 * DAY) } });
  await db.consentRecord.create({ data: { userId: u.id, kind: "SAFEGUARDING_ATTESTATION", version: ATT, granted: true, createdAt: signed } });
  if (approved) await db.auditEvent.create({ data: { actorId: reviewerId, action: "application.approved", object: "Application", objectId: app.id, createdAt: ago(m.createdDaysAgo - 5) } });
  return { user: u, profile: mp };
}

async function guardianFor(p: Person, childProfileId: string, childDob: Date, relationship: string, mobile: string, pref: "ATTEND" | "REACHABLE") {
  const u = await makeUser(p, ["GUARDIAN"]);
  const g = await db.guardian.create({ data: { userId: u.id, relationship, mobile, verificationMethod: "SMS code to mobile", verified: true, verifiedAt: ago(p.createdDaysAgo), attendancePref: pref, guidelinesVersion: GV, consentState: "GRANTED", createdAt: ago(p.createdDaysAgo) } });
  const endsOn = new Date(Date.UTC(childDob.getUTCFullYear() + 18, childDob.getUTCMonth(), childDob.getUTCDate()));
  await db.guardianLink.create({ data: { guardianId: g.id, participantId: childProfileId, active: true, endsOn, createdAt: ago(p.createdDaysAgo) } });
  await db.consentRecord.createMany({ data: [{ userId: u.id, kind: "GUARDIAN_GUIDELINES", version: GV, granted: true, createdAt: ago(p.createdDaysAgo) }] });
  return { user: u, guardian: g };
}

// ───────────────────────── Asks ─────────────────────────

type Answers = { q1: string; q2: string; q3: string; sessionLength: 30 | 60; stage: string; soon: "week" | "month" | "term" | "flexible"; mentorType?: string; bestDays?: string };
const PATH: AskState[] = ["SUBMITTED", "IN_TEAM_REVIEW", "OPEN_TO_MENTORS", "MENTOR_STEPPED_FORWARD", "CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE"];

interface AskSpec {
  participant: { user: { id: string; name: string }; profile: { id: string } };
  minor: boolean; guardianId?: string; topic: string; answers: Answers; to: AskState;
  createdDaysAgo: number; reviewerId: string; summary?: { question: string; whatWouldHelp: string }; withheld?: string[];
  shortlist?: { mentorId: string; mentorUserId: string; response?: "STEPPED_FORWARD" | "PASSED" | "NONE" }[];
  chosen?: { mentorId: string; mentorUserId: string };
  call?: { at: Date; offered: Date[]; picked?: boolean; recorded?: boolean; notes?: string; nextSteps?: string; helped?: "YES" | "LITTLE" };
}

/** Builds an Ask that walked the real lifecycle: history rows, review, shortlist, guardian approvals and the connection. */
async function ask(s: AskSpec) {
  const topic = await db.topic.findUniqueOrThrow({ where: { slug: s.topic } });
  const created = ago(s.createdDaysAgo);
  // History steps are spread over the first part of the Ask's life, and always land before a call that already happened.
  const span = s.call && s.call.at < NOW ? Math.min(s.createdDaysAgo * DAY * 0.6, s.call.at.getTime() - created.getTime() - 3_600_000) : s.createdDaysAgo * DAY * 0.6;
  const stepMs = Math.max(600_000, span / 8);
  let t = created.getTime();
  let released = false;
  const tick = () => new Date((t += stepMs));
  const timeBound = s.answers.soon === "week" || s.answers.soon === "month";
  const a = await db.ask.create({
    data: {
      participantId: s.participant.profile.id, submittedById: s.participant.user.id, topicId: topic.id, answers: { ...s.answers, timeBound }, completeness: 100,
      urgency: timeBound ? "SOON" : "FLEXIBLE", state: "DRAFT", createdAt: created, submittedAt: s.to === "DRAFT" ? null : created,
    },
  });
  const history: Prisma.AskStateChangeCreateManyInput[] = [];
  let from: AskState = "DRAFT";
  const go = (to: AskState, actorId: string | null, extra: Partial<Prisma.AskStateChangeCreateManyInput> = {}) => { history.push({ askId: a.id, from, to, actorId, createdAt: tick(), ...extra }); from = to; };

  if (s.minor) {
    go("AWAITING_GUARDIAN", s.participant.user.id, { reason: "R_CONSENT" });
    if (s.to === "AWAITING_GUARDIAN") { await finish(); return a; }
    await db.guardianAuthorization.create({ data: { guardianId: s.guardianId!, askId: a.id, kind: "ASK", approved: true, decidedAt: new Date(t) } });
    go("SUBMITTED", null, { note: "Guardian authorized the Ask" });
  } else go("SUBMITTED", s.participant.user.id);

  const idx = PATH.indexOf(s.to);
  if (idx >= 1) go("IN_TEAM_REVIEW", null, { reason: timeBound ? "R_TIME" : "R_NEW" });
  released = idx >= 2;
  await db.review.create({
    data: {
      askId: a.id, reviewerId: released ? s.reviewerId : null, expertiseNeeded: [], sessionLength: s.answers.sessionLength, flags: [], withheld: s.withheld ?? [],
      ageBandHandling: s.minor ? "Under 18: cleared mentors only, guardian approves mentor and time, call recorded" : null,
      mentorSummary: s.summary ? JSON.stringify(s.summary) : null, summaryApprovedAt: released ? new Date(t) : null,
      decision: released ? "RELEASE" : "PENDING", stepsDone: released ? ["A", "B", "C", "D", "E", "F"] : ["A"], startedAt: new Date(t), decidedAt: released ? new Date(t) : null,
    },
  });
  if (released) {
    go("OPEN_TO_MENTORS", s.reviewerId, { note: "Summary approved and released" });
    let rank = 1;
    for (const e of s.shortlist ?? []) {
      const stepped = e.response === "STEPPED_FORWARD";
      await db.shortlistEntry.create({
        data: {
          askId: a.id, mentorId: e.mentorId, rank, score: 0.92 - rank * 0.07, round: 1, releasedAt: new Date(t), response: e.response ?? "NONE",
          respondedAt: e.response && e.response !== "NONE" ? new Date(t + 3_600_000) : null,
          offeredTimes: stepped && s.call ? s.call.offered : [], lengthMinutes: stepped ? s.answers.sessionLength : null,
        },
      });
      rank++;
    }
  }
  if (idx >= 3) go("MENTOR_STEPPED_FORWARD", s.chosen?.mentorUserId ?? null);
  if (idx >= 4 && s.chosen && s.call) {
    go("CONNECTION_APPROVED", s.reviewerId);
    const scheduled = idx >= 5;
    const held = idx >= 6;
    const picked = scheduled || !!s.call.picked;
    const approvedAt = new Date(t);
    const conn = await db.connection.create({
      data: {
        askId: a.id, mentorId: s.chosen.mentorId, participantId: s.participant.profile.id, durationMinutes: s.answers.sessionLength, offeredTimes: s.call.offered,
        status: held ? "HELD" : scheduled ? "CONFIRMED" : s.minor && picked ? "AWAITING_GUARDIAN" : "PROPOSED",
        scheduledAt: picked ? s.call.at : null, guardianAttends: s.minor,
        guardianApproved: s.minor && scheduled, guardianMentorApprovedAt: s.minor && scheduled ? approvedAt : null, guardianTimeApprovedAt: s.minor && scheduled ? approvedAt : null,
        ...(held ? {
          attendance: "BOTH", mentorJoinedAt: new Date(s.call.at.getTime() - 3 * 60_000), participantJoinedAt: new Date(s.call.at.getTime() - 60_000), guardianJoinedAt: s.minor ? new Date(s.call.at.getTime() - 2 * 60_000) : null,
          endedAt: new Date(s.call.at.getTime() + s.answers.sessionLength * 60_000), notes: s.call.notes, nextSteps: s.call.nextSteps, hoursCounted: true,
          participantOutcome: "HAPPENED", mentorOutcome: "HAPPENED", guardianOutcome: s.minor ? "HAPPENED" : null, helpedNextStep: s.call.helped ?? "YES", mentorFeedback: 5,
          recordingKey: s.minor ? `recordings/demo/${a.id}.mp4` : null, roomName: `vc-demo-${a.id}`,
        } : {}),
      },
    });
    if (s.minor && scheduled) await db.guardianAuthorization.create({ data: { guardianId: s.guardianId!, askId: a.id, kind: "MENTOR_AND_TIME", mentorId: s.chosen.mentorId, scheduledAt: s.call.at, approved: true, decidedAt: approvedAt } });
    if (scheduled) {
      go("SCHEDULED", null);
      if (!held) await db.connection.update({ where: { id: conn.id }, data: { roomName: await dailyRoom(`vc-${conn.id}`, s.call.at, s.answers.sessionLength, s.minor) } });
    }
    if (held) { t = s.call.at.getTime() + s.answers.sessionLength * 60_000; go("HELD", null); }
    if (idx >= 7) go("COMPLETE", s.chosen.mentorUserId, { note: "Mentor closed out the conversation" });
  }
  await finish();
  return a;

  async function finish() {
    await db.askStateChange.createMany({ data: history });
    const due = ["SUBMITTED", "IN_TEAM_REVIEW"].includes(from) ? addDays(NOW, 2) : from === "OPEN_TO_MENTORS" ? addDays(NOW, 3) : null;
    await db.ask.update({ where: { id: a.id }, data: { state: from, serviceWindowDue: due, releaseRound: released ? 1 : 0, reasonCode: history.at(-1)?.reason ?? null } });
  }
}

/** Seeded booked calls need a real Daily room when video is configured; otherwise the app uses its practice room. */
async function dailyRoom(name: string, startsAt: Date, minutes: number, record: boolean): Promise<string> {
  const key = process.env.DAILY_API_KEY; const domain = process.env.DAILY_DOMAIN;
  if (!key || !domain) return name;
  const exp = Math.floor(startsAt.getTime() / 1000) + (minutes + 30) * 60;
  const nbf = Math.floor(startsAt.getTime() / 1000) - 10 * 60;
  try {
    const res = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, privacy: "private", properties: { exp, nbf, max_participants: 3, enable_recording: record ? "cloud" : undefined, enable_chat: true, eject_at_room_exp: true } }),
    });
    if (!res.ok) console.warn(`  Daily room ${name}: ${res.status} ${await res.text()}`);
  } catch (e) { console.warn(`  Daily room ${name} failed:`, e); }
  return name;
}

// The dedupe index is unique and MongoDB counts a missing key as a value, so every notification carries its own key.
let noteN = 0;
const note = (userId: string, event: string, title: string, body: string, link: string, daysAgo: number, read = false) =>
  db.notification.create({ data: { userId, event, channel: "IN_APP", title, body, link, sentAt: ago(daysAgo), readAt: read ? ago(daysAgo - 0.1) : null, createdAt: ago(daysAgo), dedupeKey: `demo-${userId}-${++noteN}` } });

// ───────────────────────── Seed ─────────────────────────

async function seed() {
  HASH = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Topics (same as the base seed, so this script works on an empty database too).
  const TOPICS = [["career-conversations", "Career conversations"], ["college-guidance", "College guidance"], ["internship-advice", "Internship advice"], ["resume-review", "Résumé review"], ["interview-preparation", "Interview preparation"], ["entrepreneurship", "Entrepreneurship"], ["leadership-development", "Leadership development"], ["industry-exposure", "Industry exposure"], ["professional-networks", "Professional networks"]];
  let order = 0;
  for (const [slug, name] of TOPICS) await db.topic.upsert({ where: { slug: slug! }, update: {}, create: { slug: slug!, name: name!, sortOrder: order++, guidedPrompts: [] } });

  // Team reviewer (no password: appears in the console as the person who reviewed things).
  const reviewer = await makeUser({ name: "Dana Whitfield", slug: "dana.whitfield", dob: yearsAgo(41), state: "Illinois", city: "Chicago", createdDaysAgo: 200 }, ["ADMIN"]);
  await db.teamMember.create({ data: { userId: reviewer.id, teamRole: "REVIEWER", note: "Demo reviewer" } });
  const R = reviewer.id;

  const EVE = ["Mon-18", "Tue-18", "Wed-18", "Thu-18", "Mon-20", "Wed-20"];
  const WKND = ["Sat-8", "Sat-12", "Sun-12"];

  // ── Mentors (all approved and listed, except the two in the application queue) ──
  const marcus = await mentor({
    name: "Marcus Bennett", slug: "marcus.bennett", login: true, dob: yearsAgo(34), state: "Georgia", city: "Atlanta", createdDaysAgo: 150,
    bio: "Senior software engineer at a fintech company in Atlanta. I went to Georgia State as a first-generation college student and taught myself to code on the side. Happy to talk about getting into tech without a traditional path, résumés for engineering roles and preparing for technical interviews.",
    primary: "EXP-TEC", extra: ["EXP-ENG"], cleared: true, hours: 4, length: 30, grid: [...EVE, "Sat-12"], areas: ["Tech", "Careers"], seniority: "Senior professional", experience: "10 to 15 years", timeZone: "Eastern Time (US), UTC-5",
  }, R);
  const rachel = await mentor({
    name: "Rachel Kim", slug: "rachel.kim", dob: yearsAgo(31), state: "Washington", city: "Seattle", createdDaysAgo: 180,
    bio: "Product manager at a large tech company in Seattle. I started as an intern after a lot of rejected applications, so I know how the internship search feels. I can help with finding and landing internships, product roles and making the most of your first summer at a company.",
    primary: "EXP-TEC", extra: ["EXP-BUS"], hours: 2, length: 60, grid: ["Tue-18", "Thu-18", "Sun-12"], areas: ["Careers", "Tech"], seniority: "Mid-career", experience: "5 to 10 years", timeZone: "Pacific Time (US), UTC-8",
  }, R);
  const priya = await mentor({
    name: "Dr. Priya Nair", slug: "priya.nair", dob: yearsAgo(39), state: "Texas", city: "Houston", createdDaysAgo: 170,
    bio: "Pediatrician at a children's hospital in Houston. I talk with students about the road to medicine: choosing a pre-med major, volunteering and shadowing, the MCAT and other health careers like nursing, physician assistant and public health.",
    primary: "EXP-HLT", extra: ["EXP-SCI"], cleared: true, hours: 2, length: 30, grid: ["Sat-8", "Sat-12", "Wed-20"], areas: ["Health", "Life after school"], seniority: "Senior professional", experience: "10 to 15 years", timeZone: "Central Time (US), UTC-6",
  }, R);
  const james = await mentor({
    name: "James Whitaker", slug: "james.whitaker", dob: yearsAgo(46), state: "Illinois", city: "Chicago", createdDaysAgo: 160,
    bio: "Financial planner and former bank analyst in Chicago. I help young adults understand student loans, budgeting a first paycheck, credit scores and what careers in finance and accounting actually look like day to day.",
    primary: "EXP-FIN", extra: ["EXP-BUS"], hours: 3, length: 30, grid: ["Mon-12", "Wed-12", "Fri-12"], areas: ["Money", "Careers"], seniority: "Senior professional", experience: "Over 15 years", timeZone: "Central Time (US), UTC-6",
  }, R);
  const angela = await mentor({
    name: "Angela Morris", slug: "angela.morris", dob: yearsAgo(44), state: "Pennsylvania", city: "Philadelphia", createdDaysAgo: 140,
    bio: "High school counselor in Philadelphia for fifteen years. I help with college lists, application essays, financial aid and the FAFSA, and figuring out whether a four-year school, community college or a trade program fits you best.",
    primary: "EXP-EDU", extra: ["EXP-LDR"], cleared: true, hours: 4, length: 30, grid: [...EVE, ...WKND], areas: ["School and exams", "Life after school"], seniority: "Senior professional", experience: "Over 15 years", timeZone: "Eastern Time (US), UTC-5",
  }, R);
  const carlos = await mentor({
    name: "Carlos Mendoza", slug: "carlos.mendoza", dob: yearsAgo(38), state: "Arizona", city: "Phoenix", createdDaysAgo: 120,
    bio: "Founder of a landscaping and design company in Phoenix with twelve employees. I started with one truck. I can talk through starting a small business, pricing, getting your first customers and balancing a side hustle with school.",
    primary: "EXP-ENT", extra: ["EXP-TRD"], hours: 2, length: 60, grid: ["Sat-8", "Sun-12"], areas: ["Starting something", "Money"], seniority: "Business owner", experience: "10 to 15 years", timeZone: "Other",
  }, R, "APPROVED");
  const nicole = await mentor({
    name: "Nicole Foster", slug: "nicole.foster", dob: yearsAgo(36), state: "District of Columbia", city: "Washington", createdDaysAgo: 110,
    bio: "Attorney working in public interest law in Washington, DC. I can share what law school is really like, how to prepare for the LSAT, and other careers in government, policy and nonprofits.",
    primary: "EXP-LAW", extra: ["EXP-PUB"], hours: 2, length: 30, grid: ["Tue-20", "Thu-20"], areas: ["Law", "Careers"], seniority: "Mid-career", experience: "10 to 15 years", timeZone: "Eastern Time (US), UTC-5",
  }, R);
  const michael = await mentor({
    name: "Michael Okafor", slug: "michael.okafor", dob: yearsAgo(42), state: "Michigan", city: "Detroit", createdDaysAgo: 130,
    bio: "Mechanical engineer at an auto manufacturer in Detroit. I mentor students thinking about engineering: which kind fits you, what to take in high school, co-ops and internships, and what the work is like on a plant floor.",
    primary: "EXP-ENG", extra: ["EXP-TRD"], cleared: true, hours: 2, length: 30, grid: ["Mon-18", "Thu-18", "Sat-12"], areas: ["Careers", "Tech"], seniority: "Senior professional", experience: "Over 15 years", timeZone: "Eastern Time (US), UTC-5",
  }, R);
  // Applications waiting for the team (A1 queue).
  await mentor({
    name: "Laura Chen", slug: "laura.chen", dob: yearsAgo(29), state: "California", city: "San Francisco", createdDaysAgo: 3,
    bio: "UX designer at a design studio in San Francisco. I studied art before moving into design and would love to help creative students find their way into design, illustration and other creative careers.",
    primary: "EXP-CRE", extra: ["EXP-TEC"], cleared: true, hours: 2, length: 30, grid: ["Tue-18", "Sat-12"], areas: ["Arts", "Careers"], seniority: "Mid-career", experience: "5 to 10 years", timeZone: "Pacific Time (US), UTC-8",
  }, R, "SUBMITTED");
  await mentor({
    name: "Robert Garcia", slug: "robert.garcia", dob: yearsAgo(51), state: "Florida", city: "Miami", createdDaysAgo: 6,
    bio: "Licensed electrician and owner of an electrical contracting business in Miami. I want to show young people that the skilled trades are a great career: apprenticeships, licensing and running your own crew.",
    primary: "EXP-TRD", extra: ["EXP-ENT"], hours: 2, length: 30, grid: ["Sat-8"], areas: ["Careers", "Starting something"], seniority: "Business owner", experience: "Over 15 years", timeZone: "Eastern Time (US), UTC-5",
  }, R, "SCREENING");

  // ── Review accounts: adult participant, minor with guardian ──
  const jordan = await participant({ name: "Jordan Ramirez", slug: "jordan.ramirez", login: true, dob: yearsAgo(20, 40), state: "Texas", city: "Austin", createdDaysAgo: 60, heardFrom: "Social media" },
    { cohort: "COLLEGE", interests: ["Tech", "Internships", "CVs", "Interviews"], goals: ["Find an internship", "Get my first job"], background: "First in my family to go to college" });
  const avaDob = yearsAgo(16, 120);
  const ava = await participant({ name: "Ava Thompson", slug: "ava.thompson", login: true, dob: avaDob, state: "Illinois", city: "Naperville", createdDaysAgo: 75, heardFrom: "A teacher or school" },
    { cohort: "HIGH_SCHOOL", interests: ["Medicine and health", "University and courses", "Study skills"], goals: ["Choose a course or university", "Figure out what I want"] });
  await db.consentRecord.create({ data: { userId: ava.user.id, kind: "RECORDING", version: GV, granted: true, createdAt: ago(74) } });
  const karen = await guardianFor({ name: "Karen Thompson", slug: "karen.thompson", login: true, dob: yearsAgo(47), state: "Illinois", city: "Naperville", createdDaysAgo: 74 }, ava.profile.id, avaDob, "Parent", "+16305550142", "ATTEND");
  await db.guardianInvite.create({ data: { participantId: ava.profile.id, guardianName: "Karen Thompson", guardianEmail: email("karen.thompson"), guardianMobile: "+16305550142", relationship: "Parent", tokenHash: `demo-used-${ava.profile.id}`, state: "AUTHORIZED", expiresAt: ago(60), usedAt: ago(74), createdAt: ago(75) } });
  await db.application.create({ data: { applicantId: ava.user.id, type: "GUARDIAN", state: "APPROVED", submittedAt: ago(74), decidedAt: ago(73), decidedById: R, decision: "APPROVED", createdAt: ago(74), payload: { guardianUserId: karen.user.id, relationship: "Parent", method: "SMS code to mobile", preference: "ATTEND" } } });

  // ── Other participants who fill the queues ──
  const tyler = await participant({ name: "Tyler Brooks", slug: "tyler.brooks", dob: yearsAgo(19, 200), state: "Ohio", city: "Columbus", createdDaysAgo: 20 }, { cohort: "COLLEGE", interests: ["Tech", "Internships"], goals: ["Find an internship"] });
  const sofiaDob = yearsAgo(17, 60);
  const sofia = await participant({ name: "Sofia Hernandez", slug: "sofia.hernandez", dob: sofiaDob, state: "California", city: "San Diego", createdDaysAgo: 30 }, { cohort: "HIGH_SCHOOL", interests: ["Tech", "University and courses"], goals: ["Choose a course or university"], background: "First in my family to go to college" });
  const maria = await guardianFor({ name: "Maria Hernandez", slug: "maria.hernandez", dob: yearsAgo(45), state: "California", city: "San Diego", createdDaysAgo: 29 }, sofia.profile.id, sofiaDob, "Parent", "+16195550178", "REACHABLE");
  const destiny = await participant({ name: "Destiny Williams", slug: "destiny.williams", dob: yearsAgo(22, 10), state: "Georgia", city: "Savannah", createdDaysAgo: 25 }, { cohort: "GRADUATE", interests: ["Careers", "Tech", "Interviews"], goals: ["Get my first job"] });
  const kevin = await participant({ name: "Kevin Nguyen", slug: "kevin.nguyen", dob: yearsAgo(21, 90), state: "Washington", city: "Tacoma", createdDaysAgo: 45 }, { cohort: "COLLEGE", interests: ["Tech", "CVs"], goals: ["Get my first job"] });
  const isaiah = await participant({ name: "Isaiah Johnson", slug: "isaiah.johnson", dob: yearsAgo(18, 70), state: "New York", city: "Brooklyn", createdDaysAgo: 4 }, { cohort: "HIGH_SCHOOL", interests: ["Law", "University and courses"], goals: ["Choose a course or university"] });
  const emily = await participant({ name: "Emily Carter", slug: "emily.carter", dob: yearsAgo(23, 30), state: "North Carolina", city: "Charlotte", createdDaysAgo: 50 }, { cohort: "EARLY_CAREER", interests: ["Starting a business", "Money skills"], goals: ["Start a business"] });
  // A 15-year-old whose guardian has authorized: waiting on the team's spot check (A6 queue).
  const elijahDob = yearsAgo(15, 100);
  const elijah = await participant({ name: "Elijah Davis", slug: "elijah.davis", dob: elijahDob, state: "Tennessee", city: "Memphis", createdDaysAgo: 2 }, { cohort: "HIGH_SCHOOL", interests: ["Careers", "Leadership"], goals: ["Figure out what I want"] }, { status: "PENDING_GUARDIAN" });
  const denise = await guardianFor({ name: "Denise Davis", slug: "denise.davis", dob: yearsAgo(43), state: "Tennessee", city: "Memphis", createdDaysAgo: 1 }, elijah.profile.id, elijahDob, "Parent", "+19015550133", "ATTEND");
  await db.guardianInvite.create({ data: { participantId: elijah.profile.id, guardianName: "Denise Davis", guardianEmail: email("denise.davis"), guardianMobile: "+19015550133", relationship: "Parent", tokenHash: `demo-used-${elijah.profile.id}`, state: "AUTHORIZED", expiresAt: addDays(NOW, 12), usedAt: ago(1), createdAt: ago(2) } });
  await db.application.create({ data: { applicantId: elijah.user.id, type: "GUARDIAN", state: "SUBMITTED", submittedAt: ago(1), createdAt: ago(1), payload: { guardianUserId: denise.user.id, relationship: "Parent", method: "SMS code to mobile", preference: "ATTEND" } } });

  const M = (x: { user: { id: string }; profile: { id: string } }) => ({ mentorId: x.profile.id, mentorUserId: x.user.id });

  // ── Jordan (adult): one complete, one booked with Marcus, one in review ──
  const j1 = await ask({
    participant: jordan, minor: false, topic: "internship-advice", to: "COMPLETE", createdDaysAgo: 40, reviewerId: R,
    answers: { q1: "How do I find a software internship for next summer when I have no previous internship experience?", q2: "I'm a junior studying computer science at a state university in Texas. I've applied to about thirty internships and only heard back from two.", q3: "Someone who has hired interns or been through the search and can tell me what I'm missing in my applications.", sessionLength: 60, stage: "At university", soon: "month", mentorType: "Someone in tech" },
    summary: { question: "A college junior in computer science wants to know how to land a first software internship after many applications with few replies.", whatWouldHelp: "Advice from someone who has hired interns or been through the search recently, focused on what makes an application stand out." },
    withheld: ["University name"], shortlist: [{ ...M(rachel), response: "STEPPED_FORWARD" }, { ...M(marcus), response: "NONE" }], chosen: M(rachel),
    call: { at: pastAt(30, 18), offered: [pastAt(30, 18), pastAt(29, 18), pastAt(28, 12)], notes: "Talked through Jordan's application list and résumé. Too many generic applications; suggested targeting 15 companies with tailored notes and asking for referrals through the campus ACM chapter.", nextSteps: "Rewrite the résumé summary around two projects. Reach out to three alumni on LinkedIn. Apply to the companies on the shortlist by December 1.", helped: "YES" },
  });
  const j2 = await ask({
    participant: jordan, minor: false, topic: "resume-review", to: "SCHEDULED", createdDaysAgo: 9, reviewerId: R,
    answers: { q1: "Can someone review my résumé before I send out applications for spring and summer software roles?", q2: "I rewrote my résumé after my last mentor conversation and added two class projects and a hackathon. I'm not sure if it reads well to recruiters.", q3: "A software engineer who reads résumés and can tell me what to cut and what to make stronger.", sessionLength: 30, stage: "At university", soon: "week", mentorType: "Someone in tech" },
    summary: { question: "A college junior wants a résumé review before applying to spring and summer software roles.", whatWouldHelp: "Line-by-line feedback from a working software engineer on what to cut and what to strengthen." },
    shortlist: [{ ...M(marcus), response: "STEPPED_FORWARD" }, { ...M(michael), response: "PASSED" }], chosen: M(marcus),
    call: { at: at(3, 18), offered: [at(3, 18), at(4, 18), at(5, 20)] },
  });
  await ask({
    participant: jordan, minor: false, topic: "interview-preparation", to: "IN_TEAM_REVIEW", createdDaysAgo: 1, reviewerId: R,
    answers: { q1: "How should I prepare for technical interviews, especially the coding challenge rounds?", q2: "I have my first technical phone screen coming up in a few weeks. I've done some practice problems online but I freeze when I have to talk through my thinking.", q3: "Someone who does technical interviews and can do a practice question with me and tell me how to explain my approach.", sessionLength: 60, stage: "At university", soon: "month", mentorType: "Someone in tech" },
  });

  // ── Ava (16): one complete with Dr. Nair, one waiting on Karen to approve the Ask, one waiting on Karen to approve Marcus and the time ──
  const a1 = await ask({
    participant: ava, minor: true, guardianId: karen.guardian.id, topic: "career-conversations", to: "COMPLETE", createdDaysAgo: 55, reviewerId: R,
    answers: { q1: "What is it really like to become a doctor, and how do I know if medicine is right for me?", q2: "I'm a junior in high school. I love biology and I volunteer at a hospital gift shop on weekends, but I've never talked to an actual doctor about the job.", q3: "Talking to a doctor about what a normal day looks like and what I should be doing in high school to prepare.", sessionLength: 30, stage: "Grade 11", soon: "term", mentorType: "A doctor" },
    summary: { question: "A high school junior who loves biology wants to know what a career in medicine is really like and whether it is a good fit.", whatWouldHelp: "A conversation with a physician about daily work and what to focus on during high school." },
    withheld: ["School name", "Hospital where she volunteers"], shortlist: [{ ...M(priya), response: "STEPPED_FORWARD" }], chosen: M(priya),
    call: { at: pastAt(40, 12), offered: [pastAt(40, 12), pastAt(39, 8)], notes: "Ava had great questions about pediatrics and residency. Talked about AP Biology and Chemistry, shadowing, and that it's fine not to be sure yet.", nextSteps: "Ask the volunteer coordinator about a patient-facing role. Look at summer health programs at local universities. Take AP Chemistry next year.", helped: "YES" },
  });
  await ask({
    participant: ava, minor: true, guardianId: karen.guardian.id, topic: "college-guidance", to: "AWAITING_GUARDIAN", createdDaysAgo: 1, reviewerId: R,
    answers: { q1: "How do I pick colleges to apply to if I want to study pre-med but I'm not sure which schools are a good fit?", q2: "I'm starting to build my college list for next year. My counselor gave me a long list, but I don't know how to narrow it down or what matters most for pre-med.", q3: "Someone who knows college admissions and can help me decide what to look for in a school.", sessionLength: 30, stage: "Grade 11", soon: "term", mentorType: "A college counselor" },
  });
  const a3 = await ask({
    participant: ava, minor: true, guardianId: karen.guardian.id, topic: "industry-exposure", to: "CONNECTION_APPROVED", createdDaysAgo: 8, reviewerId: R,
    answers: { q1: "I'm curious about health technology. What do software engineers do at medical or health companies?", q2: "After talking with a doctor I realized I also like coding. I'm taking AP Computer Science this year and want to know if there are careers that mix both.", q3: "Someone who works in tech and can tell me about jobs where technology and healthcare meet.", sessionLength: 30, stage: "Grade 11", soon: "month", mentorType: "Someone in tech" },
    summary: { question: "A high school junior interested in both medicine and coding wants to learn about software careers in health technology.", whatWouldHelp: "A conversation with a software engineer about roles that combine technology and healthcare." },
    withheld: ["School name"], shortlist: [{ ...M(marcus), response: "STEPPED_FORWARD" }, { ...M(michael), response: "NONE" }], chosen: M(marcus),
    call: { at: at(6, 18), offered: [at(6, 18), at(7, 18), at(9, 12)], picked: true },
  });

  // ── Marcus's inbox: two open Asks released to him, one he stepped forward on (team to confirm) ──
  const t1 = await ask({
    participant: tyler, minor: false, topic: "internship-advice", to: "OPEN_TO_MENTORS", createdDaysAgo: 3, reviewerId: R,
    answers: { q1: "Should I take an IT help desk job this summer or keep applying for software engineering internships?", q2: "I'm a sophomore in computer science in Ohio. I got an offer for a paid IT help desk role but I haven't heard back from any software internships yet.", q3: "Someone in software who can tell me if help desk experience will help or if I should hold out for an engineering role.", sessionLength: 30, stage: "At university", soon: "month", mentorType: "Someone in tech" },
    summary: { question: "A college sophomore in computer science has an IT help desk offer and wonders whether to accept it or keep waiting for a software internship.", whatWouldHelp: "Perspective from a software engineer on how help desk experience is viewed and how to decide." },
    shortlist: [{ ...M(marcus) }, { ...M(rachel) }],
  });
  await ask({
    participant: sofia, minor: true, guardianId: maria.guardian.id, topic: "college-guidance", to: "OPEN_TO_MENTORS", createdDaysAgo: 4, reviewerId: R,
    answers: { q1: "Is it better to study computer engineering or computer science if I like both hardware and programming?", q2: "I'm a senior in high school in California applying to colleges now. I built a small robot for a school club and I also like programming, so I can't decide what major to put down.", q3: "An engineer who can explain the real difference between the two majors and the jobs each one leads to.", sessionLength: 30, stage: "Grade 12", soon: "week", mentorType: "An engineer" },
    summary: { question: "A high school senior applying to college can't decide between computer engineering and computer science.", whatWouldHelp: "An engineer who can explain how the majors differ and what careers each leads to." },
    withheld: ["School name", "Club name"], shortlist: [{ ...M(marcus) }, { ...M(michael) }],
  });
  await ask({
    participant: destiny, minor: false, topic: "career-conversations", to: "MENTOR_STEPPED_FORWARD", createdDaysAgo: 6, reviewerId: R,
    answers: { q1: "How can I move from a retail management job into a tech career without going back to school for four years?", q2: "I graduated with a business degree last year and I'm working as an assistant store manager. I've started an online data analytics course and I enjoy it.", q3: "Someone who changed careers into tech or who hires people without computer science degrees.", sessionLength: 60, stage: "Working", soon: "flexible", mentorType: "Someone in tech" },
    summary: { question: "A recent business graduate working in retail management wants to move into tech, likely data analytics, without another degree.", whatWouldHelp: "Advice from someone who switched into tech or hires people from non-traditional backgrounds." },
    shortlist: [{ ...M(marcus), response: "STEPPED_FORWARD" }, { ...M(rachel), response: "STEPPED_FORWARD" }], chosen: M(marcus),
    call: { at: at(8, 20), offered: [at(8, 20), at(10, 18), at(12, 12)] },
  });
  // Marcus: a conversation already held this month (counts toward his hours and impact).
  const k1 = await ask({
    participant: kevin, minor: false, topic: "resume-review", to: "COMPLETE", createdDaysAgo: 20, reviewerId: R,
    answers: { q1: "My résumé is getting no responses for junior developer jobs. What am I doing wrong?", q2: "I'm a senior in college graduating in the spring. I've sent my résumé to about fifty companies through job boards with no replies.", q3: "A software engineer who can tell me honestly what recruiters see when they read my résumé.", sessionLength: 30, stage: "At university", soon: "month", mentorType: "Someone in tech" },
    summary: { question: "A college senior is getting no replies to junior developer applications and wants to know why.", whatWouldHelp: "Honest feedback from a software engineer on how recruiters read the résumé." },
    shortlist: [{ ...M(marcus), response: "STEPPED_FORWARD" }], chosen: M(marcus),
    call: { at: pastAt(Math.min(10, NOW.getUTCDate() - 1 || 1), 18), offered: [pastAt(Math.min(10, NOW.getUTCDate() - 1 || 1), 18)], notes: "Résumé was a wall of coursework. Moved projects to the top, added numbers, cut the objective statement.", nextSteps: "Send the updated résumé to five referrals instead of job boards.", helped: "YES" },
  });
  // Emily with Carlos: held and complete. Isaiah: just sent, in team review.
  const e1 = await ask({
    participant: emily, minor: false, topic: "entrepreneurship", to: "COMPLETE", createdDaysAgo: 35, reviewerId: R,
    answers: { q1: "How do I know if my baking side business is ready to become a real business with an LLC and a storefront?", q2: "I sell custom cakes from home on weekends and I'm making about as much as my part-time job. I don't know about licenses, taxes or whether to rent a kitchen.", q3: "A small business owner who has made the jump from side hustle to full business.", sessionLength: 60, stage: "Working", soon: "flexible", mentorType: "A business owner" },
    summary: { question: "A young adult with a growing home baking business wants to know when and how to formalize it.", whatWouldHelp: "A small business owner who has grown a side hustle into a full business." },
    shortlist: [{ ...M(carlos), response: "STEPPED_FORWARD" }], chosen: M(carlos),
    call: { at: pastAt(25, 12), offered: [pastAt(25, 12)], notes: "Walked through cottage food laws, separating business money, and testing a shared commercial kitchen before a lease.", nextSteps: "Open a business bank account. Track every order for three months. Visit two commissary kitchens.", helped: "YES" },
  });
  await ask({
    participant: isaiah, minor: false, topic: "college-guidance", to: "IN_TEAM_REVIEW", createdDaysAgo: 0.5, reviewerId: R,
    answers: { q1: "What should I major in during undergrad if I want to go to law school later?", q2: "I'm a senior in high school in New York. I'm on the debate team and I'm interested in civil rights law, but I don't know if I need a specific major.", q3: "A lawyer who can tell me what helped them most before law school.", sessionLength: 30, stage: "Grade 12", soon: "week", mentorType: "A lawyer" },
  });

  // Mentor hours this month and last-Ask dates.
  const monthStart = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), 1));
  for (const m of [marcus, rachel, priya, carlos]) {
    const held = await db.connection.findMany({ where: { mentorId: m.profile.id, status: "HELD", scheduledAt: { gte: monthStart } }, select: { durationMinutes: true } });
    await db.mentorProfile.update({ where: { id: m.profile.id }, data: { hoursGivenThisMonth: held.reduce((s, c) => s + c.durationMinutes / 60, 0), lastAskAt: ago(3) } });
  }

  // ── Thanks and check-ins on held conversations ──
  const conn = async (askId: string) => db.connection.findUniqueOrThrow({ where: { askId } });
  const thanks = [
    { c: await conn(j1.id), author: jordan.user.id, body: "Rachel helped me see that I was sending the same application everywhere. I rewrote my résumé the same week and already got two interview invites. Thank you!", tags: ["Practical tips", "Gave me a plan"], pub: true, days: 29 },
    { c: await conn(a1.id), author: ava.user.id, body: "Dr. Nair answered every question I had about becoming a doctor and made me feel like it's okay not to have everything figured out yet.", tags: ["Encouraging", "Explained it simply"], pub: true, days: 39 },
    { c: await conn(k1.id), author: kevin.user.id, body: "Marcus was honest about my résumé in the best way. The changes were simple but I can already see the difference.", tags: ["Honest", "Clear advice"], pub: true, days: 4 },
    { c: await conn(e1.id), author: emily.user.id, body: "Carlos gave me a clear plan for growing my bakery step by step instead of jumping in all at once.", tags: ["Gave me a plan"], pub: false, days: 24 },
  ];
  for (const t of thanks) await db.thanks.create({ data: { connectionId: t.c.id, authorId: t.author, body: t.body, tags: t.tags, sharePublicly: t.pub, moderation: "APPROVED", publishedAt: t.pub ? ago(t.days - 1) : null, createdAt: ago(t.days) } });
  await db.checkIn.create({ data: { connectionId: (await conn(j1.id)).id, participantId: jordan.profile.id, userId: jordan.user.id, dueAt: ago(0.5), createdAt: ago(0.5) } });
  await db.checkIn.create({ data: { connectionId: (await conn(a1.id)).id, participantId: ava.profile.id, userId: ava.user.id, dueAt: ago(10), answer: "TOOK_STEP", note: "I signed up for a summer health program!", answeredAt: ago(9), createdAt: ago(10) } });

  // ── Ask thread messages ──
  await db.askMessage.createMany({ data: [
    { askId: j2.id, authorId: R, role: "TEAM", body: "Hi Jordan, Marcus has stepped forward for your résumé review. Please have your latest version ready to share on the call.", createdAt: ago(5) },
    { askId: j2.id, authorId: jordan.user.id, role: "PARTICIPANT", body: "Thank you! I'll have it ready.", createdAt: ago(4.8) },
    { askId: a3.id, authorId: R, role: "TEAM", body: "Hi Ava, a mentor who works in health technology has offered times. Your mom will approve the mentor and the time before anything is booked.", createdAt: ago(2) },
  ] });

  // ── Goals ──
  const goal = async (pid: string, uid: string, statement: string, progress: "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED", daysAgo: number, target?: Date, asks: string[] = []) => {
    const g = await db.goal.create({ data: { participantId: pid, statement, progress, targetDate: target, linkedAskIds: asks, createdAt: ago(daysAgo) } });
    await db.goalEvent.create({ data: { goalId: g.id, userId: uid, progress, createdAt: ago(daysAgo - 1) } });
  };
  await goal(jordan.profile.id, jordan.user.id, "Land a software engineering internship for summer 2027", "IN_PROGRESS", 38, at(90, 12), [j1.id, j2.id]);
  await goal(jordan.profile.id, jordan.user.id, "Rewrite my résumé around two strong projects", "ACHIEVED", 28, undefined, [j1.id]);
  await goal(jordan.profile.id, jordan.user.id, "Practice ten technical interview questions out loud", "NOT_STARTED", 1, at(30, 12));
  await goal(ava.profile.id, ava.user.id, "Find a patient-facing volunteer role at the hospital", "IN_PROGRESS", 38, at(45, 12), [a1.id]);
  await goal(ava.profile.id, ava.user.id, "Sign up for AP Chemistry for senior year", "ACHIEVED", 36);

  // ── Library ──
  const res = [
    { title: "How to write a résumé when you don't have much experience", type: "GUIDE", by: marcus, topics: ["resume-review"], cohorts: ["HIGH_SCHOOL", "COLLEGE"], body: "Start with projects, not job titles. A class project, a club role or a weekend job all count. For each one, write what you did and what changed because of it, with a number if you can. Keep it to one page, put your strongest item first, and cut the objective statement: recruiters skip it." },
    { title: "Finding your first internship: a 6-week plan", type: "GUIDE", by: rachel, topics: ["internship-advice"], cohorts: ["COLLEGE"], body: "Week 1: list 20 companies you'd genuinely like to work for. Week 2: find one person at each on LinkedIn. Week 3: tailor your résumé for the top 10. Week 4: ask for referrals, politely. Week 5: apply and track everything in a spreadsheet. Week 6: follow up once, then move on. Most internships are filled between September and February." },
    { title: "The FAFSA, explained in plain English", type: "ARTICLE", by: angela, topics: ["college-guidance"], cohorts: ["HIGH_SCHOOL"], body: "The FAFSA is the form colleges use to decide how much federal aid you can get, including grants you don't pay back. It opens each fall. You'll need your family's tax information and your Social Security number. Fill it out even if you think you won't qualify: many schools use it for their own scholarships too." },
    { title: "Pre-med in high school: what actually matters", type: "ARTICLE", by: priya, topics: ["career-conversations", "college-guidance"], cohorts: ["HIGH_SCHOOL"], body: "You don't need to shadow a surgeon at 16. Take the strongest science classes you can, find volunteer work where you're around people, and learn how to study well. Medical schools care far more about what you do in college. Use high school to find out whether you actually enjoy helping people when it's hard." },
    { title: "Budgeting your first paycheck", type: "TEMPLATE", by: james, topics: ["professional-networks"], cohorts: ["COLLEGE", "EARLY_CAREER"], body: "Try the 50/30/20 split: 50% for needs like rent, food and transportation, 30% for wants, and 20% for savings and paying down debt. Set up an automatic transfer to savings on payday so you never see that money. Build a starter emergency fund of $1,000 before anything else." },
    { title: "Five questions to ask in any interview", type: "GUIDE", by: nicole, topics: ["interview-preparation"], cohorts: ["COLLEGE", "GRADUATE"], body: "1. What does a great first 90 days look like in this role? 2. What's the hardest part of this job? 3. How does the team give feedback? 4. What have past people in this role gone on to do? 5. Is there anything about my background you'd like me to say more about?" },
    { title: "Is engineering right for you? A quick guide to the branches", type: "VIDEO", by: michael, topics: ["industry-exposure", "college-guidance"], cohorts: ["HIGH_SCHOOL"], body: "Mechanical, electrical, civil, chemical and computer engineering all start with the same math and physics but lead to very different days at work. This short talk walks through what each branch builds, the classes to take in high school, and how co-op programs let you earn while you learn." },
    { title: "Starting a side business while in school", type: "ARTICLE", by: carlos, topics: ["entrepreneurship"], cohorts: ["COLLEGE", "EARLY_CAREER"], body: "Start small and keep your costs low. Sell to ten real customers before you spend money on a logo or a website. Keep business money in a separate account from day one. Check your state's rules for business licenses, and talk to your school's small business center: most offer free advice." },
  ] as const;
  const resourceIds: string[] = [];
  for (const [i, r] of res.entries()) {
    const x = await db.resource.create({ data: { title: r.title, type: r.type, body: r.body, topics: [...r.topics, RESOURCE_TAG], cohorts: [...r.cohorts], contributorId: r.by.user.id, lastReviewed: ago(10 + i * 4), visibility: i % 3 === 2 ? "MEMBERS" : "PUBLIC", moderation: "APPROVED", createdAt: ago(60 + i * 5) } });
    resourceIds.push(x.id);
  }
  // A contribution waiting in moderation (A10).
  const pendingRes = await db.resource.create({ data: { title: "Writing a cover letter that gets read", type: "GUIDE", body: "Open with why this company, not why you. Keep it under 250 words. Mention one specific thing about their work and one specific thing you did that connects to it.", topics: ["resume-review", RESOURCE_TAG], cohorts: ["COLLEGE"], contributorId: marcus.user.id, visibility: "PUBLIC", moderation: "PENDING", createdAt: ago(1) } });
  void pendingRes;
  for (const rid of [resourceIds[0]!, resourceIds[1]!, resourceIds[5]!]) await db.savedItem.create({ data: { userId: jordan.user.id, resourceId: rid, createdAt: ago(12) } });
  for (const rid of [resourceIds[3]!, resourceIds[2]!]) await db.savedItem.create({ data: { userId: ava.user.id, resourceId: rid, createdAt: ago(20) } });
  for (const [u, rid] of [[jordan, 0], [jordan, 1], [kevin, 0], [ava, 3], [sofia, 6], [emily, 7]] as const) await db.resourceHelped.create({ data: { userId: u.user.id, resourceId: resourceIds[rid]!, createdAt: ago(8) } });

  // ── Events (upcoming) ──
  const events = [
    { title: EVENT_TITLES[0]!, type: "PANEL", at: at(10, 18), host: "Marcus Bennett, Rachel Kim and Michael Okafor", cap: 100, regs: [jordan.user.id, tyler.user.id, kevin.user.id, destiny.user.id], info: { description: "Three engineers share how they got their first job in tech, what they wish they'd known, and answer your questions live.", audience: "High school and college", topicTag: "Tech careers", formatLabel: "Live panel" } },
    { title: EVENT_TITLES[1]!, type: "WORKSHOP", at: at(13, 19), host: "Angela Morris", cap: 40, regs: [ava.user.id, sofia.user.id, isaiah.user.id], info: { description: "A hands-on workshop on writing a personal statement that sounds like you. Bring a draft or just an idea.", audience: "High school juniors and seniors", topicTag: "College applications", formatLabel: "Workshop" } },
    { title: EVENT_TITLES[2]!, type: "OFFICE_HOURS", at: at(17, 12), host: "Rachel Kim", cap: 15, regs: [jordan.user.id], info: { description: "Drop in with your internship and first-job questions. Short one-on-one slots in a small group.", audience: "College and recent graduates", topicTag: "Internships", formatLabel: "Office hours" } },
    { title: EVENT_TITLES[3]!, type: "WORKSHOP", at: at(24, 18), host: "James Whitaker", cap: 60, regs: [emily.user.id, kevin.user.id], info: { description: "Paychecks, taxes, credit scores and student loans, explained simply, with a budgeting template to take home.", audience: "Everyone 16 and up", topicTag: "Money skills", formatLabel: "Webinar" } },
  ] as const;
  for (const e of events) {
    const ev = await db.event.create({ data: { title: e.title, type: e.type, startsAt: e.at, host: e.host, capacity: e.cap, registrations: [...e.regs], createdAt: ago(14) } });
    await db.eventInfo.create({ data: { eventId: ev.id, ...e.info, location: "Online, link sent when you register" } });
    await db.eventVolunteerRole.create({ data: { eventId: ev.id, role: "Moderator for the Q&A", places: 1 } });
  }

  // ── Community posts ──
  const posts = [
    { by: angela, body: "Seniors: early action deadlines are close. If you're stuck on your essay, write the story you'd tell a friend first, then clean it up. Your voice matters more than big words.", d: 6, mod: "APPROVED" },
    { by: rachel, body: "Internship season tip: a two-line note to a recruiter after you apply goes a long way. Keep it short and specific about why that team.", d: 4, mod: "APPROVED" },
    { by: james, body: "If you just got your first job, set up your 401(k) match today. It's free money and most people miss it in their first year.", d: 3, mod: "APPROVED" },
    { by: michael, body: "Shout out to the students who joined our robotics Q&A last week. The questions were sharper than some of the ones I get at work!", d: 2, mod: "APPROVED" },
    { by: carlos, body: "Started my business with one truck and a borrowed mower. You don't need everything figured out to begin.", d: 0.5, mod: "PENDING" },
  ] as const;
  for (const p of posts) await db.post.create({ data: { authorId: p.by.user.id, body: p.body, moderation: p.mod, createdAt: ago(p.d) } });

  // ── Safety and support (admin queues) ──
  const kConn = await conn(k1.id);
  const inc = await db.incident.create({ data: { reporterId: kevin.user.id, subjectId: null, connectionId: kConn.id, category: "TECHNICAL", severity: "LOW", state: "TRIAGED", description: "The video froze twice during my call and we had to rejoin. We finished the conversation but lost about five minutes.", dueAt: addDays(NOW, 1), createdAt: ago(2) } });
  await db.incidentEvent.createMany({ data: [
    { incidentId: inc.id, kind: "REPORTED", text: "Reported by the participant after the call.", actorId: kevin.user.id, createdAt: ago(2) },
    { incidentId: inc.id, kind: "TRIAGED", text: "Low severity, technical. Checking the video provider logs.", actorId: R, createdAt: ago(1.5) },
  ] });
  await db.helpRequest.create({ data: { fromUserId: tyler.user.id, fromName: "Tyler Brooks", fromRole: "PARTICIPANT", email: email("tyler.brooks"), about: "My Ask", message: "How long does it usually take for a mentor to respond after my Ask is released? Just want to know what to expect.", status: "NEW", createdAt: ago(1) } });
  await db.helpRequest.create({ data: { fromUserId: karen.user.id, fromName: "Karen Thompson", fromRole: "GUARDIAN", email: email("karen.thompson"), about: "A question about the village", message: "Can I download the recording of my daughter's call, or only watch it online?", status: "REPLIED", reply: "Recordings can be watched from your Calls and recordings page. They are not downloadable, to keep them safe.", repliedAt: ago(20), repliedById: R, createdAt: ago(21) } });

  // ── Notifications for the four review accounts ──
  await note(jordan.user.id, "connection.confirmed", "Your conversation is confirmed", "Résumé review with Marcus. The link opens 10 minutes before.", `/asks/${j2.id}`, 4);
  await note(jordan.user.id, "checkin.due", "One month on: how is it going?", "A quick check-in on your internship conversation with Rachel.", "/goals/check-in", 0.5);
  await note(jordan.user.id, "ask.received", "We got your Ask", "Interview preparation. A person on the team will read it within two business days.", "/asks", 1, true);
  await note(ava.user.id, "ask.awaiting_guardian", "Sent to your guardian", "Your college guidance Ask is waiting for your mom to approve it.", "/asks", 1);
  await note(ava.user.id, "ask.mentor_found", "A mentor will talk with you", "Your guardian will approve the mentor and the time.", `/asks/${a3.id}`, 2);
  await note(karen.user.id, "ask.approve", "Ava sent a new Ask", "Please read it and approve it before it goes to the team.", "/guardian/approvals", 1);
  await note(karen.user.id, "ask.approve_time", "Approve the mentor and the time", "Ava chose a time. Nothing is booked until you answer.", `/guardian/approvals/${a3.id}`, 2);
  await note(karen.user.id, "recording.ready", "A recording is ready", "Ava's conversation with Dr. Nair is ready to watch.", "/guardian/recordings", 39, true);
  await note(marcus.user.id, "ask.released", "A new Ask matches your experience", "Internship advice. Released to you by the team.", "/mentor", 3);
  await note(marcus.user.id, "ask.released", "A new Ask matches your experience", "College guidance, under 18.", "/mentor", 4);
  await note(marcus.user.id, "ask.confirmed", "You've been confirmed for an Ask", "Jordan picked a time for the résumé review.", `/mentor/conversations/${j2.id}`, 4, true);
  await note(marcus.user.id, "conversation.thanks", "You got a thank-you", "Kevin thanked you for the résumé review.", "/mentor/impact", 4);

  return { jordan, ava, karen, marcus };
}

(async () => {
  const removed = await wipe();
  console.log(`Removed ${removed} demo users and their records.`);
  if (process.argv.includes("--wipe")) { await db.$disconnect(); return; }
  await seed();
  const users = await db.user.count({ where: { email: { endsWith: DOMAIN } } });
  const asks = await db.ask.count({ where: { participant: { user: { email: { endsWith: DOMAIN } } } } });
  console.log(`Seeded ${users} demo users and ${asks} Asks (times in ${TZ}).`);
  console.log("\nReview accounts (password for all four: " + DEMO_PASSWORD + ")");
  for (const [role, e] of [["Participant (adult, 20)", "jordan.ramirez"], ["Participant (16, with guardian)", "ava.thompson"], ["Guardian (Ava's mom)", "karen.thompson"], ["Mentor", "marcus.bennett"]]) console.log(`  ${role.padEnd(32)} ${email(e!)}`);
  await db.$disconnect();
})().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
