/** Overview "Needs you now" list: pure, so the ordering is testable. */
export type Tone = "danger" | "warn" | "clay" | "neutral";
export type ActionItem = { key: string; tone: Tone; title: string; detail: string; href: string; n: number };
export type OverviewCounts = { overdueIncidents: number; openIncidents: number; atRiskAsks: number; attentionAsks: number; awaitingGuardian: number; mentorApps: number; guardianApps: number; asksToReview: number; unmet: number; help: number; moderation: number; upcomingMinor: number };

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Safety first, then time-bound work, then queues. Zero-count items are left out. */
export function buildActions(c: OverviewCounts): ActionItem[] {
  const all: (ActionItem | null)[] = [
    c.overdueIncidents > 0 ? { key: "inc-overdue", tone: "danger", n: c.overdueIncidents, title: `${c.overdueIncidents} ${s(c.overdueIncidents, "incident is", "incidents are")} past ${s(c.overdueIncidents, "its", "their")} window`, detail: "Open the incident and record what has been done.", href: "/admin/incidents" } : null,
    c.openIncidents - c.overdueIncidents > 0 ? { key: "inc-open", tone: "warn", n: c.openIncidents - c.overdueIncidents, title: `${c.openIncidents - c.overdueIncidents} open ${s(c.openIncidents - c.overdueIncidents, "incident", "incidents")} inside the window`, detail: "Reports pause the connection first and ask questions second.", href: "/admin/incidents" } : null,
    c.atRiskAsks > 0 ? { key: "asks-risk", tone: "danger", n: c.atRiskAsks, title: `${c.atRiskAsks} ${s(c.atRiskAsks, "Ask", "Asks")} at risk of missing the service window`, detail: "Due within 4 hours or already overdue.", href: "/admin/asks?filter=AT_RISK" } : null,
    c.attentionAsks > 0 ? { key: "asks-attn", tone: "warn", n: c.attentionAsks, title: `${c.attentionAsks} ${s(c.attentionAsks, "Ask needs", "Asks need")} attention after review`, detail: "Missed conversations, no outcome recorded, or a mentor waiting.", href: "/admin/asks/all?f=ATTENTION" } : null,
    c.upcomingMinor > 0 ? { key: "minor-soon", tone: "clay", n: c.upcomingMinor, title: `${c.upcomingMinor} under-18 ${s(c.upcomingMinor, "conversation", "conversations")} in the next 72 hours`, detail: "Guardian involved. Check consent and the mentor's clearance.", href: "/admin/asks/all?f=UPCOMING" } : null,
    c.help > 0 ? { key: "help", tone: "clay", n: c.help, title: `${c.help} new help ${s(c.help, "request", "requests")}`, detail: "People asking the team for help are waiting for a reply.", href: "/admin/help" } : null,
    c.asksToReview > 0 ? { key: "asks-review", tone: "neutral", n: c.asksToReview, title: `${c.asksToReview} ${s(c.asksToReview, "Ask", "Asks")} to review`, detail: c.unmet > 0 ? `${c.unmet} with no eligible mentor yet.` : "Oldest first, against the service window.", href: "/admin/asks" } : null,
    c.mentorApps > 0 ? { key: "mentors", tone: "neutral", n: c.mentorApps, title: `${c.mentorApps} mentor ${s(c.mentorApps, "application", "applications")} waiting`, detail: "Review, screen and clear.", href: "/admin/mentors" } : null,
    c.guardianApps > 0 ? { key: "guardians", tone: "neutral", n: c.guardianApps, title: `${c.guardianApps} guardian ${s(c.guardianApps, "application", "applications")} waiting`, detail: "Verify the link to the young person.", href: "/admin/guardians" } : null,
    c.moderation > 0 ? { key: "mod", tone: "neutral", n: c.moderation, title: `${c.moderation} ${s(c.moderation, "item", "items")} in moderation`, detail: "Thank-you posts and resources waiting for a decision.", href: "/admin/moderation" } : null,
  ];
  return all.filter((x): x is ActionItem => !!x);
}

/** 14 daily buckets ending today (UTC), oldest first. */
export function dailyBuckets(dates: Date[], days = 14, now = new Date()): { day: string; n: number }[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out = Array.from({ length: days }, (_, i) => ({ day: new Date(end - (days - 1 - i) * 86400000).toISOString().slice(0, 10), n: 0 }));
  for (const d of dates) { const k = d.toISOString().slice(0, 10); const b = out.find((x) => x.day === k); if (b) b.n++; }
  return out;
}

export const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** "application.approve" -> "Application approve". */
export const actionText = (a: string) => { const t = a.replace(/[._:]+/g, " ").trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
