import type { ReviewDecision, ReasonCode } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { moveAsk, queueForReview, type R } from "./asks";
import { parseAnswers, screenText, askText, ASK_FLAG_LABEL, type ContentFlag } from "./domain/ask-answers";
import { composeMentorSummary, type MentorFacingAsk } from "./domain/mentor-summary";
import { rankMentors } from "./domain/ranking";
import { mentorEligibleForAsk, mentorHasCapacity } from "./domain/permissions";
import { parseAvailability } from "./domain/insight";
import { ageBandLabel, firstName } from "./domain/views";
import { expertiseLabel } from "./domain/expertise";
import { addBusinessDays, addHours, atRisk, isOverdue, WINDOWS } from "./domain/service-windows";
import { isMinor, ageOn } from "./domain/age";

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export const REASON_LABEL: Record<string, string> = { R_NEW: "R-NEW", R_THIN: "R-THIN", R_CONSENT: "R-CONSENT", R_FLAG: "R-FLAG", R_REFER: "R-REFER", R_NOONE: "R-NOONE", R_QUIET: "R-QUIET", R_MANY: "R-MANY", R_TIME: "R-TIME", R_AGAIN: "R-AGAIN", R_MISS: "R-MISS", R_CONCERN: "R-CONCERN" };

// ───────── A7 queue ─────────
export async function reviewQueue(filter: "ALL" | "AT_RISK" | "FLAGGED" | "AWAITING_GUARDIAN" | "TIME_BOUND" = "ALL") {
  const asks = await db.ask.findMany({ where: { state: { in: ["AWAITING_GUARDIAN", "SUBMITTED", "IN_TEAM_REVIEW"] } }, include: { topic: true, participant: { include: { user: true } }, review: true, auths: true }, orderBy: { submittedAt: "asc" } }); // oldest first
  const now = new Date();
  const rows = asks.map((a) => {
    const answers = parseAnswers(a.answers);
    const minor = !!a.participant.user.dateOfBirth && isMinor(a.participant.user.dateOfBirth);
    const flags = (a.review?.flags ?? []).filter((f) => f !== "CONTACT_DETAILS") as ContentFlag[];
    const due = a.serviceWindowDue;
    return { id: a.id, title: answers.q1.split(/[.?!]/)[0]?.trim() || a.topic.name, ageLabel: a.participant.user.ageBand === "AGE_13_15" ? "Age 15" : a.participant.user.ageBand === "AGE_16_17" ? "Age 16 to 17" : "Adult", state: a.state, reason: a.reasonCode, due, atRisk: !!due && atRisk(due, now), overdue: !!due && isOverdue(due, now), minor, consent: a.state === "AWAITING_GUARDIAN" ? "Awaiting guardian" : minor ? "Authorized" : "Not needed", flag: flags.length ? ASK_FLAG_LABEL[flags[0]!] : "None", owner: a.review?.reviewerId ?? null, timeBound: answers.timeBound, returned: a.review?.decision === "RETURN_FOR_INFO" };
  });
  const keep = rows.filter((r) => (filter === "AT_RISK" ? r.atRisk || r.overdue : filter === "FLAGGED" ? r.flag !== "None" : filter === "AWAITING_GUARDIAN" ? r.state === "AWAITING_GUARDIAN" : filter === "TIME_BOUND" ? r.timeBound : true));
  const owners = await db.user.findMany({ where: { id: { in: rows.map((r) => r.owner).filter(Boolean) as string[] } }, select: { id: true, name: true } });
  return { counts: { all: rows.length, atRisk: rows.filter((r) => r.atRisk || r.overdue).length, flagged: rows.filter((r) => r.flag !== "None").length, awaitingGuardian: rows.filter((r) => r.state === "AWAITING_GUARDIAN").length, timeBound: rows.filter((r) => r.timeBound).length }, rows: keep.map((r) => ({ ...r, ownerName: r.owner ? owners.find((o) => o.id === r.owner)?.name ?? "Assigned" : r.flag !== "None" && r.reason === "R_FLAG" ? "Senior reviewer" : "Unassigned" })) };
}

export async function openAskCount() { return db.ask.count({ where: { state: { in: ["SUBMITTED", "IN_TEAM_REVIEW"] } } }); }

// ───────── A2 / A8 review record ─────────
export async function getReviewDetail(askId: string) {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { topic: true, participant: { include: { user: true } }, review: true, shortlist: { include: { mentor: { include: { user: true } } }, orderBy: { rank: "asc" } }, connection: true, auths: true } });
  if (!ask) return null;
  const u = ask.participant.user;
  const answers = parseAnswers(ask.answers);
  const links = await db.guardianLink.findMany({ where: { participantId: ask.participantId, active: true }, include: { guardian: { include: { user: true } } } });
  const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  const text = askText(answers);
  const withheld = [u.name, ...u.name.split(/\s+/), ...links.map((l) => l.guardian.user.name), ...(ask.review?.withheld ?? [])].filter((s) => s.length >= 2);
  const summary = ask.review?.mentorSummary ? safeJson(ask.review.mentorSummary) : null;
  return {
    ask: { id: ask.id, state: ask.state, reason: ask.reasonCode, topic: ask.topic.name, topicSlug: ask.topic.slug, due: ask.serviceWindowDue, releaseRound: ask.releaseRound, teamNote: ask.teamNote },
    participant: { first: firstName(u.name), ageBand: ageBandLabel(u.ageBand), age: u.dateOfBirth ? ageOn(u.dateOfBirth) : null, minor },
    answers, text, flags: (ask.review?.flags ?? []) as ContentFlag[], liveFlags: screenText(text),
    guardian: links[0] ? { name: links[0].guardian.user.name, attends: links[0].guardian.attendancePref === "ATTEND" } : null,
    authorizedAt: ask.auths.find((a) => a.kind === "ASK" && a.approved)?.decidedAt ?? null,
    review: ask.review ? { id: ask.review.id, decision: ask.review.decision, stepsDone: ask.review.stepsDone, expertiseNeeded: ask.review.expertiseNeeded, sessionLength: ask.review.sessionLength, summaryApprovedAt: ask.review.summaryApprovedAt, summary: summary as { question: string; whatWouldHelp: string } | null, withheld: ask.review.withheld, note: ask.review.note, reviewerId: ask.review.reviewerId } : null,
    withheldAuto: withheld,
    shortlist: ask.shortlist.map((s) => ({ id: s.id, mentorId: s.mentorId, name: s.mentor.user.name, headline: expertiseLabel(s.mentor.primaryExpertise), rank: s.rank, score: s.score, round: s.round, releasedAt: s.releasedAt, response: s.response, offeredTimes: s.offeredTimes, reason: s.reason, minorsOk: s.mentor.clearedForMinors, hoursLeft: Math.max(0, s.mentor.monthlyHours - s.mentor.hoursGivenThisMonth), monthlyHours: s.mentor.monthlyHours, hoursGiven: s.mentor.hoursGivenThisMonth })),
    connection: ask.connection ? { id: ask.connection.id, status: ask.connection.status, mentorApproved: ask.connection.guardianMentorApprovedAt, timeApproved: ask.connection.guardianTimeApprovedAt, scheduledAt: ask.connection.scheduledAt, offered: ask.connection.offeredTimes } : null,
  };
}
const safeJson = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

export async function claimReview(askId: string, reviewerId: string): Promise<R> {
  const ask = await db.ask.findUnique({ where: { id: askId } }); if (!ask) return fail("Ask not found.");
  if (!["IN_TEAM_REVIEW"].includes(ask.state)) return fail("This Ask isn't in team review.");
  await db.review.upsert({ where: { askId }, update: { reviewerId }, create: { askId, reviewerId } });
  return { ok: true };
}

export async function saveReview(askId: string, reviewerId: string, p: { stepsDone?: string[]; expertiseNeeded?: string[]; sessionLength?: number; reasonCode?: ReasonCode; withheld?: string[] }): Promise<R> {
  const ask = await db.ask.findUnique({ where: { id: askId } }); if (!ask || ask.state !== "IN_TEAM_REVIEW") return fail("This Ask isn't in team review.");
  await db.review.upsert({ where: { askId }, update: { reviewerId, ...(p.stepsDone ? { stepsDone: p.stepsDone } : {}), ...(p.expertiseNeeded ? { expertiseNeeded: p.expertiseNeeded } : {}), ...(p.sessionLength ? { sessionLength: p.sessionLength } : {}), ...(p.withheld ? { withheld: p.withheld.map((s) => s.trim()).filter(Boolean) } : {}) }, create: { askId, reviewerId } });
  if (p.reasonCode) await db.ask.update({ where: { id: askId }, data: { reasonCode: p.reasonCode } });
  return { ok: true };
}

// ───────── Step D: shortlist ─────────
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };

/** Ranked, never assigned. Mentors who are ineligible are excluded BEFORE scoring (BR-01, BR-04, BR-13). */
export async function buildShortlist(askId: string, o: { widen?: boolean; reviewerId?: string } = {}): Promise<R<{ count: number }>> {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { topic: true, participant: { include: { user: true } }, review: true, shortlist: true } });
  if (!ask) return fail("Ask not found.");
  if (ask.state !== "IN_TEAM_REVIEW") return fail("This Ask isn't in team review.");
  const u = ask.participant.user; const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
  const wanted = (ask.review?.expertiseNeeded?.length ? ask.review.expertiseNeeded : ask.topic.expertiseMap) ?? [];
  const mentors = await db.mentorProfile.findMany({ include: { user: true } });
  const since = monthStart();
  const counts = await db.shortlistEntry.groupBy({ by: ["mentorId"], where: { releasedAt: { gte: since } }, _count: true });
  const maxAsks = Math.max(1, ...counts.map((c) => c._count));
  const already = new Set(ask.shortlist.map((s) => s.mentorId));
  const pool = mentors.filter((m) => m.userId !== u.id && !already.has(m.id) && m.user.status === "ACTIVE" && mentorEligibleForAsk({ verification: m.verification, codeOfConductAt: m.codeOfConductAt, orientationDoneAt: m.orientationDoneAt, clearedForMinors: m.clearedForMinors, monthlyHours: m.monthlyHours, hoursGivenThisMonth: o.widen ? 0 : m.hoursGivenThisMonth, paused: parseAvailability(m.availability).paused }, minor));
  const inputs = pool.map((m) => {
    const mine = [m.primaryExpertise, ...m.extraExpertise];
    const exact = wanted.length === 0 ? 0.5 : mine.some((c) => wanted.includes(c)) ? (wanted.includes(m.primaryExpertise) ? 1 : 0.7) : o.widen ? 0.3 : 0;
    const shared = m.languages.some((l) => u.languages.includes(l)) || (!!u.countryOfOrigin && u.countryOfOrigin === m.user.countryOfOrigin);
    return { mentorId: m.id, fit: exact, hoursRemaining: m.monthlyHours - m.hoursGivenThisMonth, monthlyHours: m.monthlyHours, asksThisMonth: counts.find((c) => c.mentorId === m.id)?._count ?? 0, maxAsksThisMonth: maxAsks, affinity: shared ? 1 : 0, responsiveness: m.responseRate ?? 0.5 };
  }).filter((i) => i.fit > 0);
  const ranked = rankMentors(inputs, o.widen ? 8 : 6);
  const round = (ask.shortlist.reduce((n, s) => Math.max(n, s.round), 0) || 0) + (o.widen && ask.shortlist.length ? 1 : ask.shortlist.length ? 0 : 1);
  const base = ask.shortlist.length;
  for (const r of ranked) await db.shortlistEntry.create({ data: { askId, mentorId: r.mentorId, rank: base + r.rank, score: r.score, round: round || 1 } });
  return { ok: true, count: ranked.length };
}

export async function overrideShortlist(askId: string, reviewerId: string, mentorId: string, note: string): Promise<R> {
  if (note.trim().length < 5) return fail("Add a note. It is kept in the audit log.");
  const m = await db.mentorProfile.findUnique({ where: { id: mentorId } }); if (!m) return fail("Mentor not found.");
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { participant: { include: { user: true } } } }); if (!ask) return fail("Ask not found.");
  const minor = !!ask.participant.user.dateOfBirth && isMinor(ask.participant.user.dateOfBirth);
  if (!mentorEligibleForAsk({ verification: m.verification, codeOfConductAt: m.codeOfConductAt, orientationDoneAt: m.orientationDoneAt, clearedForMinors: m.clearedForMinors, monthlyHours: m.monthlyHours, hoursGivenThisMonth: m.hoursGivenThisMonth, paused: parseAvailability(m.availability).paused }, minor)) return fail("That mentor isn't eligible for this Ask.");
  const top = await db.shortlistEntry.findFirst({ where: { askId }, orderBy: { rank: "asc" } });
  await db.shortlistEntry.upsert({ where: { askId_mentorId: { askId, mentorId } }, update: { rank: 0, reason: note }, create: { askId, mentorId, rank: 0, score: top?.score ?? 0, reason: note } });
  await audit(reviewerId, "shortlist.override", "Ask", askId, undefined, { mentorId, note });
  return { ok: true };
}

// ───────── Step E: the mentor-facing summary ─────────
/** Blocks release if contact details, or any withheld name / school / employer, appear in what the mentor will see. */
export async function saveSummary(askId: string, reviewerId: string, input: { question: string; whatWouldHelp: string; sessionLength: 30 | 60; approve?: boolean; withheld?: string[] }) {
  const d = await getReviewDetail(askId); if (!d) return { ok: false as const, error: "Ask not found." };
  const draft = { askId, topic: d.ask.topic, question: input.question.trim(), whatWouldHelp: input.whatWouldHelp.trim(), ageBand: d.participant.ageBand, sessionLength: input.sessionLength };
  const withheldList = [...new Set([...d.withheldAuto, ...(input.withheld ?? [])])];
  const res = composeMentorSummary(draft, { names: withheldList, schools: [], employers: [] });
  await db.review.upsert({ where: { askId }, update: { reviewerId, mentorSummary: JSON.stringify({ question: draft.question, whatWouldHelp: draft.whatWouldHelp }), sessionLength: input.sessionLength, ...(input.withheld ? { withheld: input.withheld } : {}), summaryApprovedAt: res.ok && input.approve ? new Date() : null }, create: { askId, reviewerId, mentorSummary: JSON.stringify({ question: draft.question, whatWouldHelp: draft.whatWouldHelp }), sessionLength: input.sessionLength } });
  if (!res.ok) return { ok: false as const, error: "Release is blocked until the highlighted details are removed.", blocked: res.blocked };
  if (draft.question.length < 20 || draft.whatWouldHelp.length < 10) return { ok: false as const, error: "Write the summary before releasing." };
  return { ok: true as const };
}

// ───────── Step F: release ─────────
export async function releaseToMentors(askId: string, reviewerId: string, mentorIds: string[]): Promise<R<{ released: number }>> {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { review: true, shortlist: true } }); if (!ask) return fail("Ask not found.");
  if (!ask.review?.summaryApprovedAt || !ask.review.mentorSummary) return fail("The mentor-facing summary must be approved before release.");
  // Re-check the stored summary at release time: nothing changed since approval.
  const d = await getReviewDetail(askId); const s = d?.review?.summary;
  if (!d || !s) return fail("Write the summary before releasing.");
  const check = composeMentorSummary({ askId, topic: d.ask.topic, question: s.question, whatWouldHelp: s.whatWouldHelp, ageBand: d.participant.ageBand, sessionLength: ask.review.sessionLength as 30 | 60 }, { names: d.withheldAuto, schools: [], employers: [] });
  if (!check.ok) return fail("Release is blocked: contact details or names are in the summary.");
  const picked = ask.shortlist.filter((e) => mentorIds.includes(e.mentorId) && !e.releasedAt);
  const profs = await db.mentorProfile.findMany({ where: { id: { in: picked.map((e) => e.mentorId) } } });
  // BR-13: nobody paused or at their monthly hours has an Ask released to them.
  const chosen = picked.filter((e) => { const m = profs.find((x) => x.id === e.mentorId); return !!m && mentorHasCapacity({ verification: m.verification, codeOfConductAt: m.codeOfConductAt, orientationDoneAt: m.orientationDoneAt, clearedForMinors: m.clearedForMinors, monthlyHours: m.monthlyHours, hoursGivenThisMonth: m.hoursGivenThisMonth, paused: parseAvailability(m.availability).paused }); });
  if (chosen.length === 0) return fail(picked.length ? "Those mentors are paused or have given their hours this month. Choose another." : "Choose at least one mentor from the shortlist.");
  const m = await moveAsk(askId, "OPEN_TO_MENTORS", "ADMIN", { actorId: reviewerId, ctx: { reviewerReleased: true, summaryApproved: true }, data: { releaseRound: ask.releaseRound + 1, serviceWindowDue: addBusinessDays(new Date(), WINDOWS.shortlistDays) } });
  if (!m.ok) return m;
  const now = new Date();
  await db.shortlistEntry.updateMany({ where: { id: { in: chosen.map((c) => c.id) } }, data: { releasedAt: now } });
  await db.review.update({ where: { askId }, data: { decision: "RELEASE", decidedAt: now, reviewerId } });
  const mentors = await db.mentorProfile.findMany({ where: { id: { in: chosen.map((c) => c.mentorId) } } });
  for (const mp of mentors) await notify(mp.userId, "ask.released", "A new Ask matches your background", "Three small facts, no names. Step forward only where it feels right.", { link: `/mentor/asks/${askId}`, dedupeKey: `release-${askId}-${mp.id}-${m.ask.releaseRound}` });
  await audit(reviewerId, "ask.released", "Ask", askId, undefined, { mentors: chosen.length });
  return { ok: true, released: chosen.length };
}

// ───────── Decisions that end or return an Ask ─────────
export async function decideAsk(askId: string, reviewerId: string, d: { decision: "RETURN_FOR_INFO" | "ANSWERED_BY_RESOURCE" | "REDIRECT" | "NOT_PROCEEDING" | "FLAG"; note?: string; links?: { title: string; note?: string; url?: string }[] }): Promise<R> {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { participant: true } }); if (!ask) return fail("Ask not found.");
  const note = d.note?.trim() ?? "";
  if (["RETURN_FOR_INFO", "REDIRECT", "NOT_PROCEEDING"].includes(d.decision) && note.length < 10) return fail("Write a short plain note. The participant reads it.");
  const rev = (decision: ReviewDecision) => db.review.upsert({ where: { askId }, update: { decision, note, reviewerId, decidedAt: new Date() }, create: { askId, decision, note, reviewerId, decidedAt: new Date() } });
  const uid = ask.participant.userId;
  if (d.decision === "RETURN_FOR_INFO") {
    if (ask.state !== "IN_TEAM_REVIEW") return fail("This Ask isn't in team review.");
    await rev("RETURN_FOR_INFO");
    await db.ask.update({ where: { id: askId }, data: { reasonCode: "R_THIN", teamNote: note, serviceWindowDue: addHours(new Date(), 14 * 24) } });
    await db.askStateChange.create({ data: { askId, from: "IN_TEAM_REVIEW", to: "IN_TEAM_REVIEW", actorId: reviewerId, reason: "R_THIN", note } });
    await notify(uid, "ask.returned", "A few answers need a little more", "A team member read your Ask and left a note. Nothing is lost.", { link: `/asks/${askId}` });
  } else if (d.decision === "FLAG") {
    await db.ask.update({ where: { id: askId }, data: { reasonCode: "R_FLAG", serviceWindowDue: addHours(new Date(), WINDOWS.flaggedHours) } });
    await rev("PENDING");
    await db.askStateChange.create({ data: { askId, from: ask.state, to: ask.state, actorId: reviewerId, reason: "R_FLAG", note: "Escalated to a senior reviewer" } });
  } else {
    const to = d.decision === "REDIRECT" ? "REDIRECTED" : d.decision === "NOT_PROCEEDING" ? "NOT_PROCEEDING" : "ANSWERED_BY_RESOURCE";
    const m = await moveAsk(askId, to, "ADMIN", { actorId: reviewerId, reason: d.decision === "REDIRECT" ? "R_REFER" : undefined, note, data: { teamNote: note || null, redirectLinks: d.links ?? undefined } }); if (!m.ok) return m;
    await rev(d.decision === "REDIRECT" ? "REDIRECT" : d.decision === "NOT_PROCEEDING" ? "NOT_PROCEEDING" : "ANSWERED_BY_RESOURCE");
    await notify(uid, `ask.${to.toLowerCase()}`, "An update on your Ask", note || "We have an update on your Ask.", { link: `/asks/${askId}` });
  }
  await audit(reviewerId, `ask.${d.decision.toLowerCase()}`, "Ask", askId);
  return { ok: true };
}

// ───────── A9: choose among mentors who stepped forward ─────────
export async function confirmMentor(askId: string, reviewerId: string, mentorId: string): Promise<R<{ connectionId: string }>> {
  const ask = await db.ask.findUnique({ where: { id: askId }, include: { shortlist: true, review: true, participant: { include: { user: true } } } }); if (!ask) return fail("Ask not found.");
  const entry = ask.shortlist.find((e) => e.mentorId === mentorId && e.response === "STEPPED_FORWARD"); if (!entry) return fail("That mentor hasn't stepped forward.");
  const m = await moveAsk(askId, "CONNECTION_APPROVED", "ADMIN", { actorId: reviewerId, reason: ask.shortlist.filter((e) => e.response === "STEPPED_FORWARD").length > 1 ? "R_MANY" : undefined }); if (!m.ok) return m;
  const minor = !!ask.participant.user.dateOfBirth && isMinor(ask.participant.user.dateOfBirth);
  const guardian = (await db.guardianLink.findMany({ where: { participantId: ask.participantId, active: true }, include: { guardian: true } }))[0]?.guardian;
  const existing = await db.connection.findUnique({ where: { askId } });
  const data = { mentorId, participantId: ask.participantId, status: "PROPOSED" as const, offeredTimes: entry.offeredTimes, durationMinutes: entry.lengthMinutes ?? ask.review?.sessionLength ?? 30, guardianAttends: !!guardian && guardian.attendancePref === "ATTEND" && minor, scheduledAt: null, guardianMentorApprovedAt: null, guardianTimeApprovedAt: null, guardianApproved: false };
  const c = existing ? await db.connection.update({ where: { id: existing.id }, data }) : await db.connection.create({ data: { askId, ...data } });
  // The others are thanked, never declined. Nothing is recorded against them (BR-12).
  const others = ask.shortlist.filter((e) => e.response === "STEPPED_FORWARD" && e.mentorId !== mentorId);
  const mentors = await db.mentorProfile.findMany({ where: { id: { in: [mentorId, ...others.map((o) => o.mentorId)] } } });
  for (const mp of mentors) {
    if (mp.id === mentorId) await notify(mp.userId, "ask.confirmed", "You've been confirmed for an Ask", "The family will pick a time from the ones you offered.", { link: "/mentor" });
    else await notify(mp.userId, "ask.thanks_not_chosen", "Thank you for stepping forward", "Another mentor was the closer fit this time. We really appreciate you offering your hour.", { link: "/mentor", dedupeKey: `thanks-${askId}-${mp.id}` });
  }
  const pu = ask.participant.userId;
  await notify(pu, "ask.mentor_found", "A mentor will talk with you", minor ? "Your guardian will approve the mentor and the time." : "Pick a time that works for you.", { link: `/asks/${askId}/time` });
  if (minor && guardian) await notify(guardian.userId, "ask.approve_mentor", "Approve the mentor and the time", "A mentor stepped forward for your young person's Ask.", { link: `/guardian/approvals/${askId}` });
  await audit(reviewerId, "ask.mentor_confirmed", "Ask", askId, undefined, { mentorId });
  return { ok: true, connectionId: c.id };
}

// ───────── A26 / EX6 hand-matching ─────────
export async function handMatchOptions(askId: string, reviewerId: string, action: "WIDEN" | "ASK_PERSONALLY" | "SUGGEST_RESOURCE" | "LOG_AND_WAIT", p: { mentorId?: string; note?: string } = {}): Promise<R> {
  const ask = await db.ask.findUnique({ where: { id: askId } }); if (!ask || ask.state !== "IN_TEAM_REVIEW") return fail("This Ask isn't in team review.");
  if (action === "WIDEN") { const r = await buildShortlist(askId, { widen: true, reviewerId }); if (!r.ok) return r; if (r.count === 0) return fail("Nobody else is eligible yet. Try asking a mentor personally, or log it."); }
  if (action === "ASK_PERSONALLY") {
    if (!p.mentorId) return fail("Choose a mentor.");
    const r = await overrideShortlist(askId, reviewerId, p.mentorId, p.note?.trim() || "Asked personally by the team"); if (!r.ok) return r;
  }
  if (action === "SUGGEST_RESOURCE") return decideAsk(askId, reviewerId, { decision: "REDIRECT", note: p.note ?? "", links: [] });
  await db.review.upsert({ where: { askId }, update: { reviewerId }, create: { askId, reviewerId } });
  await db.askStateChange.create({ data: { askId, from: "IN_TEAM_REVIEW", to: "IN_TEAM_REVIEW", actorId: reviewerId, reason: "R_NOONE", note: `Hand-match: ${action}` } });
  await audit(reviewerId, `handmatch.${action.toLowerCase()}`, "Ask", askId);
  return { ok: true };
}

/** Demand report line for Asks nobody could take (A26). */
export async function unmetDemand() { return db.ask.count({ where: { reasonCode: "R_NOONE", state: "IN_TEAM_REVIEW" } }); }
export { queueForReview };
