import type { ReactNode } from "react";
import { AdminBreadcrumb, AdminMenu } from "@/components/dc/nav";
import { ADMIN_NAV, ADMIN_TABS, type NavGroup } from "@/components/dc/nav-config";
import { permForPath, type Perm } from "@/lib/domain/admin-perms";
import { AppShell } from "./app-shell";

export type AdminShellCtx = { short: string; roleLabel: string; perms: Perm[]; counts: { mentors: number; guardians: number; asks: number; incidents: number; help: number; moderation: number } };

/** The menu this team role can open, with the waiting counts from the board (Applications, Asks, Safety). */
export function adminNav(c: AdminShellCtx): NavGroup[] {
  const count: Record<string, number> = { "/admin/mentors": c.counts.mentors, "/admin/guardians": c.counts.guardians, "/admin/asks": c.counts.asks, "/admin/incidents": c.counts.incidents, "/admin/moderation": c.counts.moderation, "/admin/help": c.counts.help };
  const allowed = (href: string) => c.perms.includes(permForPath(href));
  return ADMIN_NAV.map((g) => {
    if (g.href) return allowed(g.href) ? g : null;
    const items = g.items!.filter((i) => allowed(i.href)).map((i) => ({ ...i, count: count[i.href] || undefined }));
    if (!items.length) return null;
    const total = g.label === "Applications" ? c.counts.mentors + c.counts.guardians : g.label === "Asks" ? c.counts.asks : g.label === "Safety" ? c.counts.incidents : 0;
    return { ...g, items, count: total || undefined };
  }).filter(Boolean) as NavGroup[];
}

/**
 * Team console frame (A3 and every admin board): the same top bar as the app with "Team console" under the name,
 * the nested eight-group menu, a 940px main column (wide) or 600 + 320 with an aside, and on the phone the
 * "Group › Page" bar plus the Overview, Asks, Safety, People, More tabs.
 */
export function AdminShell({ ctx, children, aside, phone, wide = true }: { ctx: AdminShellCtx; children: ReactNode; aside?: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode }; wide?: boolean }) {
  const nav = adminNav(ctx);
  const tabs = ADMIN_TABS.filter((t) => "ask" in t || t.href === "/admin/more" || ctx.perms.includes(permForPath(t.href)));
  return (
    <AppShell nav={[]} home="/admin" sidebar={<AdminMenu groups={nav} />} phoneSub={<AdminBreadcrumb groups={nav} />} user={{ name: ctx.short, roleLabel: "Team console", tone: "butter", profileHref: "/admin/profile", signOutTo: "/admin/sign-in" }}
      search="Search Asks, people, mentors" searchAction="/admin/search" phone={phone} aside={aside} wide={wide && !aside} tabs={tabs}>
      {children}
    </AppShell>
  );
}

/** The heading block on every console page: clay eyebrow, display title, one line under it. */
export function AdminHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="text-[13px] font-extrabold uppercase tracking-[.06em] text-clay max-lg:hidden">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.02em] lg:mt-1 lg:text-[40px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-[640px] text-[14.5px] leading-normal text-bark lg:text-[16px]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
