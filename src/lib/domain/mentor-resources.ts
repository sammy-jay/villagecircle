/** Pure helpers for the mentor's "Resources I've shared" list. */
export type ResourceState = "PENDING" | "APPROVED" | "REJECTED" | "REMOVED";
export type StatusTone = "warn" | "good" | "neutral" | "bad";
export const RESOURCE_FILTERS = ["ALL", "PENDING", "APPROVED", "NOT_PUBLISHED"] as const;
export type ResourceFilter = (typeof RESOURCE_FILTERS)[number];

export const RESOURCE_STATUS: Record<ResourceState, { label: string; tone: StatusTone; note: string }> = {
  PENDING: { label: "With the team", tone: "warn", note: "The team reads everything before it is published." },
  APPROVED: { label: "Published", tone: "good", note: "People in the village can read this now." },
  REJECTED: { label: "Not published", tone: "neutral", note: "The team did not publish this one. You are welcome to share something new." },
  REMOVED: { label: "Taken down", tone: "neutral", note: "This has been taken down and is no longer visible." },
};
export const TYPE_LABEL: Record<string, string> = { ARTICLE: "Answer", GUIDE: "Guide", TEMPLATE: "Template", VIDEO: "Recording", EVENT_RECORDING: "Event recording" };
export const CREDIT_LABEL: Record<string, string> = { FULL: "Full name", FIRST: "First name only", ANON: "Anonymous" };

export const parseFilter = (v: string | undefined): ResourceFilter => ((RESOURCE_FILTERS as readonly string[]).includes(v ?? "") ? (v as ResourceFilter) : "ALL");
export function matchesResourceFilter(state: ResourceState, f: ResourceFilter): boolean {
  if (f === "ALL") return true;
  if (f === "NOT_PUBLISHED") return state === "REJECTED" || state === "REMOVED";
  return state === f;
}
export function resourceCounts(states: ResourceState[]) {
  return { ALL: states.length, PENDING: states.filter((s) => s === "PENDING").length, APPROVED: states.filter((s) => s === "APPROVED").length, NOT_PUBLISHED: states.filter((s) => s === "REJECTED" || s === "REMOVED").length };
}
/** A one-line preview of the body, cut on a word boundary. */
export function preview(body: string | null | undefined, max = 160): string {
  const t = (body ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max); const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}
