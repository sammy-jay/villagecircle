import type { AskState, Cohort } from "@prisma/client";
import { db } from "./db";
import { EXPERTISE, expertiseLabel } from "./domain/expertise";

/** A4: aggregates only. Nothing here returns a name, an email or a phone number. */
export const RANGES = [[30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 12 months"]] as const;
export const COHORTS: [string, string][] = [["", "All cohorts"], ["HIGH_SCHOOL", "High school"], ["COLLEGE", "College"], ["GRADUATE", "Graduate"], ["EARLY_CAREER", "Early career"]];
const MATCHED: AskState[] = ["CONNECTION_APPROVED", "SCHEDULED", "HELD", "COMPLETE", "FOLLOW_UP_REQUESTED", "ONGOING_MENTORSHIP"];
export const STATE_LABEL: Partial<Record<AskState, string>> = { DRAFT: "Draft", AWAITING_GUARDIAN: "Awaiting guardian", SUBMITTED: "Submitted", IN_TEAM_REVIEW: "In team review", OPEN_TO_MENTORS: "Open to mentors", MENTOR_STEPPED_FORWARD: "Mentor stepped forward", CONNECTION_APPROVED: "Connection approved", SCHEDULED: "Scheduled", HELD: "Held", COMPLETE: "Complete", FOLLOW_UP_REQUESTED: "Follow-up requested", ONGOING_MENTORSHIP: "Ongoing mentorship", WITHDRAWN: "Withdrawn", ANSWERED_BY_RESOURCE: "Answered by a resource", REDIRECTED: "Redirected", NOT_PROCEEDING: "Not proceeding", GUARDIAN_DECLINED: "Guardian declined", LAPSED: "Lapsed" };

export function median(xs: number[]) { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; }
export function hoursLabel(h: number | null) { if (h === null) return "No data"; return h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.round((h / 24) * 10) / 10} d`; }

export interface Report { range: number; cohort: string; submitted: number; matchedPct: number | null; hoursHeld: number; conversations: number; thanksShared: number; medianFirstResponseH: number | null; mentorHoursGiven: number; byState: { state: string; label: string; n: number }[]; areas: { code: string; name: string; demand: number; supply: number; demandBar: number; supplyBar: number; note: string }[] }

export async function buildReport(rangeDays: number, cohort: string): Promise<Report> {
  const range = RANGES.some(([d]) => d === rangeDays) ? rangeDays : 90;
  const coh = COHORTS.some(([c]) => c === cohort) ? cohort : "";
  const since = new Date(Date.now() - range * 86400000);
  const pWhere = coh ? { participant: { cohort: coh as Cohort } } : {};
  const asks = await db.ask.findMany({ where: { submittedAt: { gte: since }, ...pWhere }, select: { id: true, state: true, submittedAt: true, topic: { select: { expertiseMap: true } }, review: { select: { expertiseNeeded: true } } } });
  const ids = asks.map((a) => a.id);
  const [conns, steps, mentors, thanks, supplyMentors] = await Promise.all([
    db.connection.findMany({ where: { status: "HELD", scheduledAt: { gte: since }, ...pWhere }, select: { durationMinutes: true } }),
    ids.length ? db.shortlistEntry.findMany({ where: { askId: { in: ids }, respondedAt: { not: null }, response: { not: "NONE" } }, select: { askId: true, respondedAt: true } }) : Promise.resolve([]),
    db.mentorProfile.aggregate({ _sum: { hoursGivenThisMonth: true } }),
    db.thanks.count({ where: { moderation: "APPROVED", sharePublicly: true, publishedAt: { gte: since } } }),
    db.mentorProfile.findMany({ where: { verification: "APPROVED" }, select: { primaryExpertise: true, monthlyHours: true } }),
  ]);
  const first = new Map<string, number>();
  for (const s of steps) { const t = s.respondedAt!.getTime(); if (!first.has(s.askId) || t < first.get(s.askId)!) first.set(s.askId, t); }
  const gaps = asks.filter((a) => first.has(a.id) && a.submittedAt).map((a) => Math.max(0, first.get(a.id)! - a.submittedAt!.getTime()) / 3600000);
  const stateN = new Map<string, number>(); for (const a of asks) stateN.set(a.state, (stateN.get(a.state) ?? 0) + 1);
  const dem = new Map<string, number>(); for (const a of asks) { const codes = a.review?.expertiseNeeded?.length ? a.review.expertiseNeeded : a.topic.expertiseMap; for (const c of new Set(codes)) dem.set(c, (dem.get(c) ?? 0) + 1); }
  const sup = new Map<string, number>(); for (const m of supplyMentors) sup.set(m.primaryExpertise, (sup.get(m.primaryExpertise) ?? 0) + m.monthlyHours);
  const dMax = Math.max(1, ...dem.values()), sMax = Math.max(1, ...sup.values()), dTot = Math.max(1, [...dem.values()].reduce((a, b) => a + b, 0)), sTot = Math.max(1, [...sup.values()].reduce((a, b) => a + b, 0));
  const areas = EXPERTISE.map(([code]) => code).filter((c) => (dem.get(c) ?? 0) + (sup.get(c) ?? 0) > 0).map((code) => {
    const d = dem.get(code) ?? 0, s = sup.get(code) ?? 0, diff = d / dTot - s / sTot;
    return { code, name: expertiseLabel(code), demand: d, supply: s, demandBar: Math.round((d / dMax) * 100), supplyBar: Math.round((s / sMax) * 100), note: diff > 0.08 ? "Short of mentors" : diff < -0.08 ? "Plenty of hours" : "Balanced" };
  }).sort((a, b) => b.demand - a.demand).slice(0, 8);
  const matched = asks.filter((a) => MATCHED.includes(a.state)).length;
  return { range, cohort: coh, submitted: asks.length, matchedPct: asks.length ? Math.round((matched / asks.length) * 100) : null, hoursHeld: Math.round((conns.reduce((a, c) => a + c.durationMinutes, 0) / 60) * 10) / 10, conversations: conns.length, thanksShared: thanks, medianFirstResponseH: median(gaps), mentorHoursGiven: Math.round((mentors._sum.hoursGivenThisMonth ?? 0) * 10) / 10,
    byState: [...stateN.entries()].map(([state, n]) => ({ state, label: STATE_LABEL[state as AskState] ?? state, n })).sort((a, b) => b.n - a.n), areas };
}
export function reportCsv(r: Report): string {
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [["Section", "Measure", "Value"],
    ["Summary", "Range (days)", r.range], ["Summary", "Cohort", r.cohort || "All"], ["Summary", "Asks submitted", r.submitted], ["Summary", "Matched to a mentor (%)", r.matchedPct ?? ""], ["Summary", "Hours of conversation", r.hoursHeld], ["Summary", "Conversations held", r.conversations],
    ["Summary", "Median time to first response (hours)", r.medianFirstResponseH === null ? "" : Math.round(r.medianFirstResponseH * 10) / 10], ["Summary", "Mentor hours given this month", r.mentorHoursGiven], ["Summary", "Thanks shared publicly", r.thanksShared],
    ...r.byState.map((s) => ["Asks by state", s.label, s.n]), ...r.areas.flatMap((a) => [["Demand (Asks)", a.name, a.demand], ["Supply (mentor hours per month)", a.name, a.supply]])];
  return rows.map((x) => x.map(q).join(",")).join("\n") + "\n";
}
