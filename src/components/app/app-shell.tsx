import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/dc/icons";
import { SidebarNav } from "@/components/dc/nav";
import { GUARDIAN_NAV, PARTICIPANT_NAV, withCounts, type NavItem } from "@/components/dc/nav-config";
import { PhoneHeader } from "@/components/account/shells";
import { initials } from "@/components/dc";

export type ShellUser = { name: string; roleLabel: string; tone?: "blush" | "butter" | "mint" };
const TONE = { blush: "bg-blush text-blush-ink", butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink" };

/**
 * Signed-in frame from the D-series boards: 68px top bar (logo, search, bell, person) and a 262px side menu.
 * On the phone it collapses to the 60px header; the tab bar is added by the section that owns it.
 */
export function AppShell({ nav, cta, user, unread, search = "Search mentors, tips and events", phone, children, aside, wide }: {
  nav: NavItem[]; cta?: { href: string; label: string }; user: ShellUser; unread?: boolean; search?: string;
  phone?: { back?: string; title?: ReactNode; right?: ReactNode }; children: ReactNode; aside?: ReactNode; wide?: boolean;
}) {
  const tone = TONE[user.tone ?? "blush"];
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 hidden h-[68px] items-center gap-[18px] border-b border-line bg-card px-8 lg:flex">
        <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={51} height={46} priority /></Link>
        <form action="/search" role="search" className="mx-auto flex h-11 max-w-[460px] flex-1 items-center gap-2.5 rounded-full bg-sand px-[18px] text-[15px] text-stone focus-within:ring-2 focus-within:ring-ink">
          <Icon name="search" size={19} />
          <input type="search" name="q" placeholder={search} aria-label={search} className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
        </form>
        <Link href="/notifications" aria-label={unread ? "Notifications, new" : "Notifications"} className="relative flex size-11 items-center justify-center rounded-full bg-sand">
          <Icon name="bell" size={21} />
          {unread && <span className="absolute right-[9px] top-2 size-2.5 rounded-full border-2 border-sand bg-clay" />}
        </Link>
        <div className="flex items-center gap-2.5">
          <span className={`flex size-11 items-center justify-center rounded-full font-display text-[16px] font-bold ${tone}`} aria-hidden="true">{initials(user.name)}</span>
          <p className="text-[14px] leading-[1.25]"><b>{user.name}</b><br /><span className="text-stone">{user.roleLabel}</span></p>
        </div>
      </header>
      <PhoneHeader back={phone?.back} title={phone?.title} right={phone?.right} />
      <div className="flex lg:min-h-[calc(100vh-68px)]">
        <div className="hidden w-[262px] flex-none border-r border-line bg-card px-3 py-5 lg:block">
          <div className="sticky top-[88px]"><SidebarNav items={nav} cta={cta} /></div>
        </div>
        <div className="flex min-w-0 flex-1 justify-center gap-6 px-4 lg:px-5">
          <main id="main" className={`flex w-full min-w-0 ${wide ? "max-w-[940px]" : "max-w-[700px]"} flex-col gap-4 pb-[18px] pt-1 lg:gap-[18px] lg:py-5`}>{children}</main>
          {aside && <aside className="hidden w-[320px] flex-none flex-col gap-[18px] self-start py-5 lg:sticky lg:top-[76px] lg:flex">{aside}</aside>}
        </div>
      </div>
    </div>
  );
}

/** Participant frame with the "Ask the village" button and live counts. */
export function ParticipantShell({ ctx, children, aside, phone }: { ctx: { name: string; openCount: number; unread: boolean }; children: ReactNode; aside?: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode } }) {
  return (
    <AppShell nav={withCounts(PARTICIPANT_NAV, { "/asks": ctx.openCount })} cta={{ href: "/asks/new", label: "Ask the village" }} user={{ name: ctx.name, roleLabel: "Participant" }} unread={ctx.unread} aside={aside} phone={phone}>
      {children}
    </AppShell>
  );
}

export function GuardianShell({ name, of, approvals = 0, unread, children, phone }: { name: string; of?: string; approvals?: number; unread?: boolean; children: ReactNode; phone?: { back?: string; title?: ReactNode; right?: ReactNode } }) {
  return (
    <AppShell nav={withCounts(GUARDIAN_NAV, { "/guardian/approvals": approvals })} user={{ name, roleLabel: of ? `Guardian of ${of}` : "Guardian", tone: "butter" }} unread={unread} search="Search approvals and calls" phone={phone} wide>
      {children}
    </AppShell>
  );
}
