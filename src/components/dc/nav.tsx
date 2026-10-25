"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icons";
import { activeHref, isActive, ADMIN_NAV, type NavGroup, type NavItem, type TabBarItem } from "./nav-config";

/* DSF §9 Navigation: side menu on desktop; breadcrumb plus menu and tab bar on the phone. Admin never uses tabs to change page. */

/* ───────── Brand ───────── */

/** Placeholder until the 01-BR1 brand mark is exported from Figma. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2 font-display text-[17px] font-extrabold leading-none text-ink", className)} aria-label="The Village Circle, home">
      <span className="flex size-9 items-center justify-center rounded-full bg-butter text-butter-ink"><Icon name="users" size={18} /></span>
      <span className="max-sm:hidden">Village<br /><span className="text-clay">Circle</span></span>
    </Link>
  );
}

/* ───────── Desktop side menu (participant, mentor) ───────── */

export function SidebarNav({ items, cta, label = "Main" }: { items: NavItem[]; cta?: { href: string; label: string }; label?: string }) {
  const path = usePathname() ?? "";
  const on = activeHref(path, items);
  return (
    <nav aria-label={label} className="flex flex-col gap-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} aria-current={on === i.href ? "page" : undefined}
          className={cn("flex h-11 items-center gap-3 rounded-tile px-3 text-[15px] text-ink hover:bg-sand", on === i.href ? "bg-sand font-bold" : "font-medium")}>
          <Icon name={i.icon} size={20} />
          <span className="flex-1">{i.label}</span>
          {!!i.count && <span className="dc-count">{i.count}</span>}
        </Link>
      ))}
      {cta && (
        <Link href={cta.href} className="dc-btn dc-btn-soft mt-4 h-11 text-[14px]">
          <Icon name="plus" size={16} />{cta.label}
        </Link>
      )}
    </nav>
  );
}

/* ───────── Admin nested menu (desktop) and breadcrumb (phone) ───────── */

function groupHas(path: string, g: NavGroup) {
  return g.href ? isActive(path, g.href, g.href === "/admin") : !!g.items?.some((i) => isActive(path, i.href, i.exact));
}

/** Groups expand to their pages. The open page is butter with a clay dot. Counts sit on the right. */
export function AdminMenu({ groups = ADMIN_NAV, onNavigate }: { groups?: NavGroup[]; onNavigate?: () => void }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(groups.map((g) => [g.label, groupHas(path, g)])));
  const allItems = groups.flatMap((g) => g.items ?? []);
  const on = activeHref(path, allItems);
  return (
    <nav aria-label="Admin" className="flex flex-col">
      {groups.map((g) => {
        const here = groupHas(path, g);
        const row = "flex h-[50px] w-full items-center gap-3.5 rounded-tile px-4 text-[16.5px] text-ink hover:bg-sand";
        if (g.href) {
          return (
            <Link key={g.label} href={g.href} onClick={onNavigate} aria-current={here ? "page" : undefined} className={cn(row, here ? "bg-butter font-bold text-butter-ink" : "font-semibold")}>
              <Icon name={g.icon} size={24} /><span className="flex-1">{g.label}</span>
            </Link>
          );
        }
        const expanded = open[g.label];
        return (
          <div key={g.label}>
            <button type="button" aria-expanded={expanded} onClick={() => setOpen((o) => ({ ...o, [g.label]: !o[g.label] }))} className={cn(row, "font-semibold")}>
              <Icon name={g.icon} size={24} />
              <span className="flex-1 text-left">{g.label}</span>
              {!expanded && !!g.count && <span className="dc-count">{g.count}</span>}
              <Icon name="chevronDown" size={16} className={cn("text-stone transition-transform", expanded && "rotate-180")} />
            </button>
            {expanded && (
              <ul className="mb-2 ml-[30px] border-l-2 border-line py-1">
                {g.items!.map((i) => {
                  const active = on === i.href;
                  return (
                    <li key={i.href} className="relative pl-[17px]">
                      <span className="absolute left-0 top-1/2 h-0.5 w-[13px] bg-line" aria-hidden="true" />
                      <Link href={i.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                        className={cn("flex h-[42px] items-center gap-2.5 rounded-tile px-3.5 text-btn", active ? "bg-butter font-bold text-butter-ink" : "font-medium text-ink hover:bg-sand")}>
                        <span className={cn("size-[7px] shrink-0 rounded-full", active ? "bg-clay" : "bg-line")} aria-hidden="true" />
                        <span className="flex-1">{i.label}</span>
                        {!!i.count && <span className="text-eyebrow font-extrabold tracking-normal">{i.count}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** Phone admin header: "Safety › Incidents" crumb that opens the same nested menu. */
export function AdminBreadcrumb({ groups = ADMIN_NAV }: { groups?: NavGroup[] }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const group = groups.find((g) => groupHas(path, g)) ?? groups[0]!;
  const page = group.items?.find((i) => isActive(path, i.href, i.exact));
  return (
    <div className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-[46px] w-full items-center gap-2 rounded-field bg-sand px-4 text-[15px] text-ink">
        <Icon name={group.icon} size={18} />
        <span className="font-semibold">{group.label}</span>
        {page && <><Icon name="chevronRight" size={14} className="text-stone" /><span className="truncate font-bold">{page.label}</span></>}
        <Icon name={open ? "x" : "menu"} size={18} className="ml-auto" />
      </button>
      {open && <div className="dc-menu absolute inset-x-0 top-[54px] z-40 p-2.5"><AdminMenu groups={groups} onNavigate={() => setOpen(false)} /></div>}
    </div>
  );
}

/* ───────── Phone tab bar ───────── */

/** The Ask button is raised, tilted and the only clay element in the bar. */
export function TabBar({ items }: { items: TabBarItem[] }) {
  const path = usePathname() ?? "";
  const on = activeHref(path, items.filter((i): i is NavItem => !("ask" in i)));
  return (
    <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
      <ul className="mx-auto flex h-[86px] max-w-[480px] items-start justify-around px-2 pt-[11px]">
        {items.map((i) => {
          if ("ask" in i) {
            return (
              <li key={i.href} className="-mt-5">
                <Link href={i.href} aria-label={i.label} className="flex size-[62px] -rotate-[8deg] items-center justify-center rounded-[20px] bg-clay text-clay-ink shadow-raised">
                  <Icon name="plus" size={30} />
                </Link>
              </li>
            );
          }
          const active = on === i.href;
          return (
            <li key={i.href}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={cn("flex w-16 flex-col items-center gap-[3px] text-[11.5px]", active ? "font-bold text-ink" : "font-medium text-stone")}>
                <span className="relative"><Icon name={i.icon} size={24} />{!!i.count && <span className="absolute -right-2 -top-1 size-2.5 rounded-full bg-clay" />}</span>
                {i.label}
                <span className={cn("mt-0.5 size-[5px] rounded-full", active ? "bg-ink" : "bg-transparent")} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
