import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/dc/icons";
import { SidebarNav, TabBar } from "@/components/dc/nav";
import { GUARDIAN_NAV, GUARDIAN_TABS, MENTOR_NAV, MENTOR_TABS, PARTICIPANT_NAV, PARTICIPANT_TABS, withCounts, type NavItem, type TabBarItem } from "@/components/dc/nav-config";
import { PhoneHeader } from "@/components/account/shells";
import { initials } from "@/components/dc";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";

/** profileHref: where "Profile and settings" in the person menu goes. signOutTo: where they land after signing out. */
export type ShellUser = { name: string; roleLabel: string; tone?: "blush" | "butter" | "mint"; profileHref?: string; signOutTo?: string };
const TONE = { blush: "bg-blush text-blush-ink", butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink" };

/**
 * Signed-in frame from the D-series boards: 68px top bar (logo, search, bell, person) and a 262px side menu.
 * On the phone it collapses to the 60px header; the tab bar is added by the section that owns it.
 */
export function AppShell({ nav, cta, user, unread, search = "Search mentors, tips and events", searchAction = "/search", phone, children, aside, wide, tabs, sidebar, phoneSub }: {
  nav: NavItem[]; cta?: { href: string; label: string }; user: ShellUser; unread?: boolean; search?: string; searchAction?: string;
  phone?: { back?: string; title?: ReactNode; right?: ReactNode }; children: ReactNode; aside?: ReactNode; wide?: boolean; tabs?: TabBarItem[];
  /** The team console swaps the side menu for its nested menu, and adds the "Group › Page" bar under the phone header. */
  sidebar?: ReactNode; phoneSub?: ReactNode;
}) {
  const tone = TONE[user.tone ?? "blush"];
  return (
    <div className="min-h-screen">
      {/* The top bar is split like the page below: a 262px block over the side menu, then the same gutter as the content, so the search box lines up with the main column. */}
      <header className="sticky top-0 z-20 hidden h-[68px] items-center border-b border-line bg-card lg:flex">
        <div className="flex w-[262px] flex-none items-center px-8">
          <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={51} height={46} priority /></Link>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-[18px] px-10">
          <form action={searchAction} role="search" className={`flex h-11 w-full max-w-[460px] items-center gap-2.5 rounded-full bg-sand px-[18px] text-[15px] text-stone focus-within:ring-2 focus-within:ring-ink`}>
            <Icon name="search" size={19} />
            <input type="search" name="q" placeholder={search} aria-label={search} className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
          </form>
          <div className="ml-auto flex shrink-0 items-center gap-[18px]">
            <NotificationBell initialUnread={unread} />
            <UserMenu name={user.name} roleLabel={user.roleLabel} initials={initials(user.name)} tone={tone} profileHref={user.profileHref ?? "/settings"} signOutTo={user.signOutTo} />
          </div>
        </div>
      </header>
      <PhoneHeader back={phone?.back} title={phone?.title} right={phone?.right ?? (phone?.back ? undefined : <PhoneIcons unread={unread} />)} />
      {phoneSub && <div className="px-4 pb-1 pt-1 lg:hidden">{phoneSub}</div>}
      <div className="flex lg:min-h-[calc(100vh-68px)]">
        <div className="hidden w-[262px] flex-none border-r border-line bg-card px-3 py-5 lg:block">
          <div className="sticky top-[88px]">{sidebar ?? <SidebarNav items={nav} cta={cta} />}</div>
        </div>
        {/* Same gutter on every page: content starts a fixed distance from the side menu, whether or not there is an aside. */}
        <div className="flex min-w-0 flex-1 gap-8 px-5 lg:px-10">
          <main id="main" className={`flex w-full min-w-0 ${wide ? "max-w-[940px]" : "max-w-[700px]"} flex-col gap-4 pb-6 pt-2 lg:gap-5 lg:py-8`}>{children}</main>
          {aside && <aside className="hidden w-[320px] flex-none flex-col gap-5 self-start py-8 lg:sticky lg:top-[68px] lg:flex">{aside}</aside>}
        </div>
      </div>
      {tabs && <><div className="h-[86px] lg:hidden" aria-hidden="true" /><TabBar items={tabs} /></>}
    </div>
  );
}

/** Phone header right side on top-level screens: search and notifications (D1-M, N06). */
export function PhoneIcons({ unread, search = true }: { unread?: boolean; search?: boolean }) {
  const circle = "relative flex size-10 items-center justify-center rounded-full bg-sand text-ink";
  return (
    <div className="flex items-center gap-2">
      {search && <Link href="/search" aria-label="Search" className={circle}><Icon name="search" size={20} /></Link>}
      <Link href="/notifications" aria-label={unread ? "Notifications, new" : "Notifications"} className={circle}><Icon name="bell" size={20} />{unread && <span className="absolute right-2 top-[7px] size-2.5 rounded-full border-2 border-paper bg-clay" />}</Link>
    </div>
  );
}

/** Participant frame with the "Ask the village" button and live counts. */
export function ParticipantShell({ ctx, children, aside, phone, tabs = true }: { ctx: { name: string; openCount: number; unread: boolean }; children: ReactNode; aside?: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode }; tabs?: boolean }) {
  return (
    <AppShell nav={withCounts(PARTICIPANT_NAV, { "/asks": ctx.openCount })} cta={{ href: "/asks/new", label: "Ask the village" }} user={{ name: ctx.name, roleLabel: "Participant" }} unread={ctx.unread} aside={aside} phone={phone} tabs={tabs ? PARTICIPANT_TABS : undefined}>
      {children}
    </AppShell>
  );
}

/** Guardian frame (G1): same layout as the participant app, with approvals counted in the menu and four phone tabs. */
export function GuardianShell({ name, of, approvals = 0, unread, children, phone, aside, tabs = true }: { name: string; of?: string; approvals?: number; unread?: boolean; children: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode }; aside?: ReactNode; tabs?: boolean }) {
  return (
    <AppShell nav={withCounts(GUARDIAN_NAV, { "/guardian/approvals": approvals })} user={{ name, roleLabel: of ? `Guardian of ${of}` : "Guardian", tone: "butter" }} unread={unread} search="Search approvals and calls" phone={phone} aside={aside} tabs={tabs ? withCountsTabs(approvals) : undefined}>
      {children}
    </AppShell>
  );
}
const withCountsTabs = (approvals: number) => GUARDIAN_TABS.map((t) => ("ask" in t || t.href !== "/guardian/approvals" ? t : { ...t, count: approvals }));

/** Mentor frame (D5): six menu items with "Share something", open Asks counted on Inbox, five phone tabs. */
export function MentorShell({ ctx, children, aside, phone, tabs = true, wide }: { ctx: { short: string; open: number; unread: boolean }; children: ReactNode; aside?: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode }; tabs?: boolean; wide?: boolean }) {
  const counted = (items: TabBarItem[]) => items.map((t) => ("ask" in t || t.href !== "/mentor" ? t : { ...t, count: ctx.open }));
  return (
    <AppShell nav={withCounts(MENTOR_NAV, { "/mentor": ctx.open })} cta={{ href: "/mentor/contribute", label: "Share something" }} user={{ name: ctx.short, roleLabel: "Mentor", tone: "mint", profileHref: "/mentor/settings" }} unread={ctx.unread} search="Search your conversations and resources" phone={phone} aside={aside} wide={wide} tabs={tabs ? counted(MENTOR_TABS) : undefined}>
      {children}
    </AppShell>
  );
}

/** The settings pages (D21, N10, EX14, P2) are shared by every role: this picks the right frame for whoever is signed in. */
export function RoleShell({ c, children, phone, tabs = false, aside }: { c: { role: "PARTICIPANT" | "MENTOR" | "GUARDIAN"; name: string; openCount: number; unread: boolean; kids: string[]; needs: number }; children: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode }; tabs?: boolean; aside?: ReactNode }) {
  if (c.role === "PARTICIPANT") return <ParticipantShell ctx={{ name: c.name, openCount: c.openCount, unread: c.unread }} phone={phone} tabs={tabs} aside={aside}>{children}</ParticipantShell>;
  if (c.role === "GUARDIAN") return <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} phone={phone} tabs={tabs} aside={aside}>{children}</GuardianShell>;
  const p = c.name.trim().split(/\s+/); const short = p.length > 1 ? `${p[0]} ${p[p.length - 1]![0]!.toUpperCase()}.` : c.name;
  return <MentorShell ctx={{ short, open: 0, unread: c.unread }} phone={phone} tabs={tabs} aside={aside}>{children}</MentorShell>;
}
