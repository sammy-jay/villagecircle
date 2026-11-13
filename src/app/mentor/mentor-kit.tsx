import Image from "next/image";
import Link from "next/link";
import { initials } from "@/components/dc";
import { SignOutButton } from "@/components/app/sign-out";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

/** Small pieces shared by the mentor screens (D, DK, EX and P series). */

export const NEXT_STEPS: [string, string][] = [
  ["We read your sign-up", "Within 5 business days. If we need more, a person asks one question."],
  ["Orientation", "Within 30 days of approval. No Asks reach you until it is done."],
  ["Enhanced check for under 18s", "Up to 10 business days, then you are cleared for minors."],
  ["You are active", "Step forward when an Ask fits. Passing is private."],
];

export const Panel = ({ children }: { children: ReactNode }) => <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:gap-5 lg:p-7">{children}</section>;
export const Why = ({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) => (
  <section className="flex gap-3 rounded-card bg-mint p-5 text-mint-ink"><Icon name={icon} size={20} className="mt-0.5 shrink-0" /><div><h2 className="font-display text-[18px] font-extrabold">{title}</h2><p className="mt-1 text-[14px] leading-normal">{children}</p></div></section>
);
export const Note = ({ icon, tone, children }: { icon: IconName; tone: "butter" | "mint"; children: ReactNode }) => (
  <p className={cn("flex gap-3 rounded-card p-5 text-[14px] leading-normal", tone === "butter" ? "bg-butter text-butter-ink" : "bg-mint text-mint-ink")}><Icon name={icon} size={20} className="mt-px shrink-0" />{children}</p>
);
export function NextSteps({ current = 0 }: { current?: number }) {
  return (
    <ol className="mt-3 flex flex-col">
      {NEXT_STEPS.map(([t, b], i) => (
        <li key={t} className="relative flex gap-3 pb-4 last:pb-0">
          {i < NEXT_STEPS.length - 1 && <span className="absolute left-[13px] top-7 h-[calc(100%-24px)] w-0.5 bg-line" aria-hidden="true" />}
          <span className={cn("relative z-[1] mt-0.5 size-7 shrink-0 rounded-full", i < current ? "bg-forest" : i === current ? "bg-clay ring-4 ring-blush" : "border-2 border-dashed border-line bg-card")} aria-hidden="true">{i < current && <Icon name="check" size={16} className="m-[6px] text-forest-ink" />}</span>
          <span><span className="block text-[15px] font-extrabold">{t}</span><span className="block text-[13px] leading-snug text-stone">{b}</span></span>
        </li>
      ))}
    </ol>
  );
}
export const Review = ({ title, icon, edit, children }: { title: string; icon: IconName; edit: number; children: ReactNode }) => (
  <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:px-6">
    <div className="flex items-center gap-2.5"><Icon name={icon} size={20} className="text-forest" /><h2 className="flex-1 font-display text-[20px] font-extrabold">{title}</h2><Link href={`/mentor/apply?step=${edit}`} className="text-[14px] font-bold text-clay">Edit<span className="sr-only"> {title}</span></Link></div>
    {children}
  </section>
);
export const Rows = ({ rows }: { rows: [string, string][] }) => (
  <dl className="divide-y divide-line">{rows.map(([k, val]) => <div key={k} className="flex justify-between gap-4 py-2.5 text-[14.5px]"><dt className="text-bark">{k}</dt><dd className="text-right font-bold">{val || "Not given"}</dd></div>)}</dl>
);

/** DK11 / DK12 / M14 / M15: the frame before a mentor is active. Logo and the person on top, main column and a 300px side column. */
export function JoinShell({ name, role = "Mentor to be", title, children, aside }: { name: string; role?: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 hidden h-[68px] items-center justify-between border-b border-line bg-card px-8 lg:flex">
        <Link href="/mentor" aria-label="Dashboard home"><Image src="/brand/logo.png" alt="The Village Circle" width={51} height={46} priority /></Link>
        <div className="flex items-center gap-5">
          <SignOutButton className="text-[14px] font-bold text-stone hover:text-ink" />
          <div className="flex items-center gap-2.5"><span className="flex size-11 items-center justify-center rounded-full bg-mint font-display text-[16px] font-bold text-mint-ink" aria-hidden="true">{initials(name)}</span><p className="text-[14px] leading-[1.25]"><b>{name}</b><br /><span className="text-stone">{role}</span></p></div>
        </div>
      </header>
      <div className="flex h-[60px] items-center gap-2 px-4 lg:hidden">
        <Link href="/mentor" aria-label="Dashboard home"><Image src="/brand/mark.png" alt="" width={38} height={37} /></Link>
        <p className="ml-2 flex-1 font-display text-[20px] font-extrabold">{title}</p>
        <SignOutButton className="text-[14px] font-bold text-clay" />
      </div>
      <div className="mx-auto flex max-w-[1068px] gap-7 px-4 pb-10 pt-1 lg:px-0 lg:pt-8">
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[740px] lg:gap-5">{children}</main>
        {aside && <aside className="hidden w-[300px] flex-none flex-col gap-4 self-start lg:sticky lg:top-[100px] lg:flex">{aside}</aside>}
      </div>
    </div>
  );
}
/** Small section label above a card ("IF IT IS IN REVIEW" on the boards). */
export const Label = ({ children }: { children: ReactNode }) => <p className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-bark">{children}</p>;

/** The One Hour Challenge ring (D5, D7, D25): hours this year out of twelve. Yours to see, never a target. */
export function ChallengeRing({ hours, size = 76, label }: { hours: number; size?: number; label?: string }) {
  const pct = Math.min(100, Math.round((hours / 12) * 100));
  return (
    <span className="relative inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: `conic-gradient(#4A3A12 ${pct * 3.6}deg, #F5E4A8 0)` }} role="img" aria-label={label ?? `${hours} of 12 hours this year`}>
      <span className="absolute inset-[9px] flex items-center justify-center rounded-full bg-butter font-display text-[19px] font-extrabold text-butter-ink">{pct}%</span>
    </span>
  );
}

/** D5 side column: the challenge, this month's hours, and the privacy promise. */
export function HoursAside({ hoursYear, given, monthly }: { hoursYear: number; given: number; monthly: number }) {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return (
    <>
      <section className="rounded-card border border-line bg-card p-5">
        <div className="flex items-center gap-4"><ChallengeRing hours={hoursYear} /><div><h2 className="font-display text-[19px] font-extrabold leading-[1.12]">One Hour Challenge</h2><p className="text-[13.5px] text-bark">{fmt(hoursYear)} of 12 hours this year</p></div></div>
        <p className="mt-3 text-[12.5px] text-stone">Yours to see. Never a target or a ranking.</p>
      </section>
      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-[19px] font-extrabold">This month</h2>
        <Link href="/mentor/availability" className="mt-3 flex items-center justify-between"><span><b className="block text-[15px]">Hours given</b><span className="text-[13px] text-stone">{fmt(given)} of {monthly} hour{monthly === 1 ? "" : "s"}</span></span><span className="text-[14px] font-bold text-clay">{fmt(given)} hr</span></Link>
      </section>
      <p className="flex gap-3 rounded-card bg-butter p-5 text-[14px] leading-normal text-butter-ink"><Icon name="shieldCheck" size={20} className="mt-px shrink-0" />You only ever see a first name and an age band. No last names, schools or contact details.</p>
    </>
  );
}

export const ageLabel = (b: string) => (b === "15" ? "Age 15" : b === "16-17" ? "Age 16 to 17" : "18 and over");
