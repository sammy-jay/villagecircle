import type { Role } from "@prisma/client";
import { defaultTeamRole, isTeamRole, type TeamRole } from "./admin-safety-1";

/**
 * What each team role may do in the console (A19). Console access still needs the ADMIN role;
 * this decides which pages and actions inside it are open. Read-only sees the overview and reports, nothing else.
 */
export type Perm =
  | "overview" | "asks.view" | "asks.triage" | "asks.release" | "applications.view" | "applications.decide" | "minors.clear" | "guardians.decide"
  | "safety.view" | "safety.act" | "recordings" | "moderation" | "data" | "help" | "audit" | "accounts.view" | "accounts.suspend" | "team"
  | "content" | "library.review" | "config" | "reports.view" | "reports.export" | "queue.view" | "bulk";

const ALL: TeamRole[] = ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD", "READ_ONLY"];
const TEAM: TeamRole[] = ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD"];
const PL_R: TeamRole[] = ["PROGRAM_LEAD", "REVIEWER"];
const PL_SG: TeamRole[] = ["PROGRAM_LEAD", "SAFEGUARDING_LEAD"];

export const PERMS: Record<Perm, TeamRole[]> = {
  overview: ALL,
  "asks.view": TEAM,
  "asks.triage": ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER"],
  "asks.release": PL_R,
  "applications.view": TEAM,
  "applications.decide": PL_R,
  "minors.clear": ["PROGRAM_LEAD", "REVIEWER", "SAFEGUARDING_LEAD"],
  "guardians.decide": PL_R,
  "safety.view": PL_SG,
  "safety.act": PL_SG,
  recordings: ["SAFEGUARDING_LEAD"],
  moderation: PL_R,
  data: PL_SG,
  help: ["PROGRAM_LEAD", "REVIEWER", "VOLUNTEER_REVIEWER", "SAFEGUARDING_LEAD"],
  audit: PL_SG,
  "accounts.view": ["PROGRAM_LEAD", "REVIEWER", "SAFEGUARDING_LEAD"],
  "accounts.suspend": PL_SG,
  team: ["PROGRAM_LEAD"],
  content: ["PROGRAM_LEAD"],
  "library.review": PL_R,
  config: ["PROGRAM_LEAD"],
  "reports.view": ALL,
  "reports.export": ["PROGRAM_LEAD", "READ_ONLY"],
  "queue.view": TEAM,
  bulk: PL_R,
};

export const can = (r: TeamRole, p: Perm) => PERMS[p].includes(r);

/** The team role for a signed-in user: their TeamMember row, or a default from their console roles. */
export function teamRoleOf(roles: readonly Role[], stored?: string | null): TeamRole {
  return stored && isTeamRole(stored) ? stored : defaultTeamRole(roles);
}

/** Which page each console address needs. The longest matching prefix wins. */
const PAGE_PERM: [string, Perm][] = [
  ["/admin/mentors", "applications.view"], ["/admin/guardians", "applications.view"],
  ["/admin/asks", "asks.view"], ["/admin/queue-health", "queue.view"], ["/admin/bulk", "bulk"],
  ["/admin/incidents", "safety.view"], ["/admin/moderation", "moderation"], ["/admin/data-requests", "data"], ["/admin/help", "help"], ["/admin/audit", "audit"],
  ["/admin/accounts", "accounts.view"], ["/admin/roles", "team"],
  ["/admin/library", "library.review"], ["/admin/events", "content"], ["/admin/taxonomy", "content"], ["/admin/templates", "config"], ["/admin/broadcast", "content"],
  ["/admin/reports", "reports.view"], ["/admin/config", "config"], ["/admin/playbook", "queue.view"], ["/admin/search", "queue.view"],
];
export function permForPath(path: string): Perm {
  let best: [string, Perm] | null = null;
  for (const e of PAGE_PERM) if ((path === e[0] || path.startsWith(e[0] + "/")) && (!best || e[0].length > best[0].length)) best = e;
  return best ? best[1] : "overview";
}

/** The A19 matrix, in the board's words. Each row is the permission that is actually enforced, so the page cannot drift from the rules. */
export const MATRIX: [string, Perm][] = [
  ["See Ask details", "asks.view"], ["Compose and release mentor summary", "asks.release"], ["Confirm a mentor", "asks.release"],
  ["Approve mentor applications", "applications.decide"], ["Clear a mentor for under-18s", "minors.clear"], ["See recordings", "recordings"],
  ["Act on incidents", "safety.act"], ["Suspend an account or connection", "accounts.suspend"], ["Moderate thanks, posts and resources", "moderation"],
  ["Edit configuration and templates", "config"], ["Export reports (CSV)", "reports.export"], ["Manage team roles", "team"],
];

/**
 * What a person may do: their team role, plus the safeguarding lead's permissions when they actually hold the
 * SAFEGUARDING_LEAD grant (it is given separately, by an admin). A one-person team at launch is program lead and lead at once.
 */
export function allows(teamRole: TeamRole, roles: readonly Role[], p: Perm) {
  return can(teamRole, p) || (roles.includes("SAFEGUARDING_LEAD") && can("SAFEGUARDING_LEAD", p));
}
