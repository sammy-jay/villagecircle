import type { IconName } from "./icons";

/** Plain (server-safe) navigation data. Rendered by nav.tsx. */

export type NavItem = { href: string; label: string; icon: IconName; count?: number; exact?: boolean };
export type NavGroup = { label: string; icon: IconName; href?: string; count?: number; items?: NavItem[] };

export const isActive = (path: string, href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
/** Longest matching href wins, so /asks/new does not also light up /asks. */
export const activeHref = (path: string, hrefs: { href: string; exact?: boolean }[]) =>
  hrefs.filter((h) => isActive(path, h.href, h.exact)).sort((a, b) => b.href.length - a.href.length)[0]?.href;

/* ───────── Route maps ───────── */

export const PARTICIPANT_NAV: NavItem[] = [
  { href: "/home", label: "Home", icon: "home", exact: true },
  { href: "/village/directory", label: "Explore", icon: "compass" },
  { href: "/asks", label: "My Asks", icon: "message" },
  { href: "/goals", label: "My goals", icon: "target" },
  { href: "/village/library", label: "Library", icon: "book" },
  { href: "/village/events", label: "Events", icon: "calendar" },
  { href: "/village/saved", label: "Saved", icon: "bookmark" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export const MENTOR_NAV: NavItem[] = [
  { href: "/mentor", label: "Inbox", icon: "inbox", exact: true },
  { href: "/mentor/availability", label: "Hours", icon: "clock" },
  { href: "/mentor/impact", label: "Impact", icon: "chart" },
  { href: "/mentor/contribute", label: "Resources", icon: "book" },
  { href: "/mentor/settings", label: "Me", icon: "user" },
];

export const ADMIN_NAV: NavGroup[] = [
  { label: "Overview", icon: "grid", href: "/admin" },
  { label: "Applications", icon: "user", items: [
    { href: "/admin/mentors", label: "Mentor applications", icon: "user" },
    { href: "/admin/guardians", label: "Guardian queue", icon: "shield" },
  ] },
  { label: "Asks", icon: "message", items: [
    { href: "/admin/asks", label: "Ask queue", icon: "message", exact: true },
    { href: "/admin/asks/all", label: "All Asks", icon: "message" },
  ] },
  { label: "Safety", icon: "shield", items: [
    { href: "/admin/incidents", label: "Incidents", icon: "alert" },
    { href: "/admin/moderation", label: "Moderation", icon: "flag" },
    { href: "/admin/data-requests", label: "Data requests", icon: "download" },
    { href: "/admin/help", label: "Help requests", icon: "info" },
    { href: "/admin/audit", label: "Audit log", icon: "lock" },
  ] },
  { label: "People", icon: "users", items: [
    { href: "/admin/accounts", label: "Accounts", icon: "users" },
    { href: "/admin/roles", label: "Team roles", icon: "lock" },
  ] },
  { label: "Content", icon: "book", items: [
    { href: "/admin/library", label: "Library", icon: "book" },
    { href: "/admin/events", label: "Events", icon: "calendar" },
    { href: "/admin/taxonomy", label: "Taxonomy", icon: "grid" },
    { href: "/admin/templates", label: "Email and SMS", icon: "mail" },
    { href: "/admin/broadcast", label: "Broadcast", icon: "bell" },
  ] },
  { label: "Reports", icon: "chart", href: "/admin/reports" },
  { label: "Settings", icon: "settings", items: [
    { href: "/admin/config", label: "Configuration", icon: "settings" },
    { href: "/admin/queue-health", label: "Queue health", icon: "chart" },
    { href: "/admin/playbook", label: "Reviewer playbook", icon: "book" },
    { href: "/admin/search", label: "Search", icon: "search" },
    { href: "/admin/bulk", label: "Bulk actions", icon: "grid" },
  ] },
];

/** Fill counts into a nav map by href, e.g. withCounts(ADMIN_NAV, { "/admin/incidents": 1 }). */
export function withCounts<T extends NavItem | NavGroup>(nav: T[], counts: Record<string, number>): T[] {
  return nav.map((n) => {
    if ("items" in n && n.items) {
      const items = n.items.map((i) => ({ ...i, count: counts[i.href] ?? i.count }));
      return { ...n, items, count: items.reduce((a, i) => a + (i.count ?? 0), 0) };
    }
    return "href" in n && n.href ? { ...n, count: counts[n.href] ?? n.count } : n;
  });
}

export type TabBarItem = NavItem | { ask: true; href: string; label: string };

export const PARTICIPANT_TABS: TabBarItem[] = [
  { href: "/home", label: "Home", icon: "home", exact: true },
  { href: "/village/directory", label: "Explore", icon: "compass" },
  { ask: true, href: "/asks/new", label: "Ask the village" },
  { href: "/asks", label: "My Asks", icon: "message" },
  { href: "/me", label: "Me", icon: "user" },
];
export const MENTOR_TABS: TabBarItem[] = MENTOR_NAV;
export const ADMIN_TABS: TabBarItem[] = [
  { href: "/admin", label: "Overview", icon: "grid", exact: true },
  { href: "/admin/asks", label: "Asks", icon: "message" },
  { href: "/admin/incidents", label: "Safety", icon: "shield" },
  { href: "/admin/accounts", label: "People", icon: "users" },
  { href: "/admin/more", label: "More", icon: "more" },
];

