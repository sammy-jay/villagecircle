import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { initials, StoryRing } from "@/components/dc";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";
import { GoingButton, HelpfulButton, SaveButton } from "./feed-actions";

/* Pieces of the participant Home feed (D1, N09). Server components; buttons that change data live in feed-actions. */

export type Pastel = "butter" | "mint" | "blush";
export const PASTEL: Record<Pastel, { bg: string; ink: string; both: string }> = {
  butter: { bg: "bg-butter", ink: "text-butter-ink", both: "bg-butter text-butter-ink" },
  mint: { bg: "bg-mint", ink: "text-mint-ink", both: "bg-mint text-mint-ink" },
  blush: { bg: "bg-blush", ink: "text-blush-ink", both: "bg-blush text-blush-ink" },
};
const CYCLE: Pastel[] = ["mint", "butter", "blush"];
export const pastelAt = (i: number) => CYCLE[i % CYCLE.length]!;

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <section className={cn("rounded-card border border-line bg-card p-4", className)}>{children}</section>;
export const CardHead = ({ title, href, link }: { title: string; href?: string; link?: string }) => (
  <div className="flex items-baseline justify-between">
    <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">{title}</h2>
    {href && <Link href={href} className="text-[13.5px] font-bold text-clay">{link}</Link>}
  </div>
);
export const Face = ({ name, size, tone, className }: { name: string; size: number; tone: Pastel; className?: string }) => (
  <span className={cn("flex shrink-0 items-center justify-center rounded-full font-display font-bold", PASTEL[tone].both, className)} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">{initials(name)}</span>
);
export const Pill = ({ children, className, icon }: { children: ReactNode; className?: string; icon?: IconName }) => (
  <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[13px] py-[7px] text-[12.5px] font-semibold", className)}>{icon && <Icon name={icon} size={16} />}{children}</span>
);

/** "What is on your mind" composer with starter chips. Every part opens the Quick Ask. */
export function Composer({ first, chips = true }: { first: string; chips?: boolean }) {
  const starters = ["Which course?", "Interview prep", "Starting something", "Money talk"];
  return (
    <Card>
      <Link href="/asks/new" className="flex items-center gap-3">
        <Face name={first} size={44} tone="blush" />
        <span className="flex h-[46px] min-w-0 flex-1 items-center rounded-full bg-sand px-[18px] text-[15.5px] text-stone">What is on your mind, {first}?</span>
      </Link>
      {chips && (
        <ScrollX variant="chips" fade="from-card" label="starters" wrapClassName="mt-3.5" className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {starters.map((s) => <Link key={s} href={`/asks/new?q=${encodeURIComponent(s)}`} className="whitespace-nowrap rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">{s}</Link>)}
        </ScrollX>
      )}
    </Card>
  );
}

/** Row of story rings: your Ask first, then mentors, then the next live event. */
export function Stories({ first, askId, mentors, live }: { first: string; askId?: string; mentors: { id: string; name: string }[]; live?: string }) {
  return (
    <ScrollX variant="chips" bleed={5} label="stories" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:px-0">
      {askId && <StoryRing name={first} caption="Your Ask" href={`/asks/${askId}`} tone="blush" />}
      {mentors.map((m, i) => <StoryRing key={m.id} name={m.name} caption={m.name.startsWith("Dr ") ? m.name.split(" ").slice(0, 2).join(" ") : m.name} href={`/village/directory/${m.id}`} tone={pastelAt(i)} ring={i < 3 ? "gold" : "none"} />)}
      {live && <StoryRing name="Live" caption="Live Q&A" href={live} tone="blush" ring="none" />}
    </ScrollX>
  );
}

/** The butter "Your Ask" card with the four-step strip. */
export function AskCard({ a, guardian }: { a: { id: string; state: string; title: string; mentor: string | null; scheduledAt: Date | null; step: number }; guardian?: string | null }) {
  const m = a.mentor ?? "A mentor";
  const copy: Record<string, [string, string]> = {
    AWAITING_GUARDIAN: [`Waiting for ${guardian ?? "your guardian"} to say yes`, `${a.title}. Once they approve, the team reads it.`],
    SUBMITTED: ["The team is reading your Ask", `${a.title}. We check every Ask before mentors see it.`],
    IN_TEAM_REVIEW: ["The team is reading your Ask", `${a.title}. We check every Ask before mentors see it.`],
    OPEN_TO_MENTORS: ["Mentors can see your Ask", `${a.title}. We will tell you when someone steps forward.`],
    MENTOR_STEPPED_FORWARD: [`${m} stepped forward for your Ask`, `${a.title}? Pick a time that works.${guardian ? " Your guardian approves it before anything is booked." : ""}`],
    CONNECTION_APPROVED: [`Pick a time with ${m}`, `${a.title}.${guardian ? " Your guardian approves the time before anything is booked." : ""}`],
    SCHEDULED: [`Your call with ${m} is booked`, a.scheduledAt ? `${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(a.scheduledAt)}.` : a.title],
  };
  const [title, body] = copy[a.state] ?? ["Your Ask", a.title];
  const pick = a.state === "MENTOR_STEPPED_FORWARD" || a.state === "CONNECTION_APPROVED";
  const labels = ["Sent", "Team read it", `${a.mentor ?? "Mentor"} said yes`, "Call"];
  return (
    <section className="rounded-[28px] bg-butter p-5 text-butter-ink">
      <div className="flex items-center justify-between">
        <span className="rounded-full border-[1.5px] border-current px-3 py-1.5 text-[12.5px] font-bold">Your Ask</span>
        <span className="text-[13px] font-bold">Step {a.step} of 4</span>
      </div>
      <h2 className="mt-3 font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">{title}</h2>
      <p className="mt-1.5 text-[15px] leading-normal opacity-[.92]">{body}</p>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">{labels.map((l, i) => <span key={l} className={cn("h-2 flex-1 rounded", i < a.step ? "bg-butter-ink" : "bg-black/[.14]")} />)}</div>
      <div className="mt-1.5 flex justify-between text-[12px] opacity-80 max-lg:hidden">{labels.map((l) => <span key={l}>{l}</span>)}</div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {pick && <Link href={`/asks/${a.id}/time`} className="dc-btn dc-btn-primary h-[50px]"><Icon name="calendar" size={18} />Pick a time</Link>}
        {a.state === "SCHEDULED" && <Link href={`/asks/${a.id}/call`} className="dc-btn dc-btn-primary h-[50px]"><Icon name="video" size={18} />Before the call</Link>}
        <Link href={`/asks/${a.id}`} className={cn("inline-flex h-[50px] items-center gap-[7px] whitespace-nowrap rounded-full border-[1.5px] border-current px-4 text-[14px] font-bold", pick && "max-lg:hidden")}><Icon name="message" size={16} />See my Ask</Link>
      </div>
    </section>
  );
}

/** Mentor tip from the library: big number or mark, title, actions. */
export function TipCard({ t, i, saved }: { t: { id: string; kind: string; title: string; credit: string; topic: string }; i: number; saved: boolean }) {
  const tone = pastelAt(i);
  const mark = t.title.match(/^\d+/)?.[0] ?? (/\?$/.test(t.title) ? "?" : "“");
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <Face name={t.credit} size={40} tone={tone} />
        <div className="min-w-0 flex-1"><p className="text-[15px] font-bold">{t.credit}</p><p className="text-[12.5px] text-stone">{[t.topic, t.kind].filter(Boolean).join(" · ")}</p></div>
      </div>
      <Link href={`/village/library/${t.id}`} className={cn("relative mt-3 block overflow-hidden rounded-[20px] px-[18px] pb-4 pt-[18px]", PASTEL[tone].both)}>
        <span className="absolute -right-1.5 -top-[26px] font-display text-[150px] font-extrabold leading-none opacity-[.12]" aria-hidden="true">{mark}</span>
        <span className="relative block max-w-[90%] font-display text-[24px] font-extrabold leading-[1.12] tracking-[-.01em]">{t.title}</span>
      </Link>
      <div className="mt-3.5 flex items-center gap-4">
        <HelpfulButton id={t.id} />
        <SaveButton id={t.id} saved={saved} />
        <Link href={`/asks/new?about=${t.id}`} className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-line px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="message" size={16} />Ask about this</Link>
      </div>
    </Card>
  );
}

export function ThanksWallCard({ t }: { t: { quote: string; who: string; tag: string } }) {
  return (
    <section className="rounded-[26px] bg-blush p-[18px] text-blush-ink">
      <div className="flex items-center gap-2">
        <Pill icon="heart" className="bg-blush px-0">Thank-you wall</Pill>
        <span className="inline-flex items-center gap-[5px] text-[12.5px] opacity-85"><Icon name="shieldCheck" size={15} />Reviewed by the team</span>
      </div>
      <p className="mt-3.5 font-display text-[24px] font-bold leading-[1.2] tracking-[-.01em]">{t.quote}</p>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex size-[38px] items-center justify-center rounded-full bg-card font-display text-[14px] font-bold">{t.who.charAt(0)}</span>
        <p className="text-[14px]"><b>{t.who}</b>{t.tag && ` · ${t.tag}`}</p>
      </div>
      <div className="mt-3.5 flex justify-end">
        <Link href="/village/community#thanks" className="inline-flex h-10 items-center rounded-full border-[1.5px] border-current px-4 text-[14px] font-bold">Say thanks too</Link>
      </div>
    </section>
  );
}

/** Day tile used by events and the "Coming up" list. */
export function DateTile({ month, day, tone = "forest", size = "lg" }: { month: string; day: string; tone?: "forest" | Pastel | "sand"; size?: "lg" | "sm" }) {
  const t = tone === "forest" ? "bg-forest text-forest-ink" : tone === "sand" ? "bg-sand text-ink" : PASTEL[tone].both;
  return (
    <span className={cn("flex shrink-0 flex-col items-center justify-center rounded-[15px] font-display", t, size === "lg" ? "h-[72px] w-16" : "h-[54px] w-12")}>
      <span className="text-[10.5px] font-bold tracking-[.06em]">{month}</span>
      <span className="text-[21px] font-extrabold leading-none">{day}</span>
    </span>
  );
}

export function EventCard({ e }: { e: { id: string; month: string; day: string; title: string; meta: string; registered: boolean } }) {
  const [kind, ...rest] = e.title.split(": ");
  return (
    <Card>
      <Link href={`/village/events/${e.id}`} className="flex items-center gap-3.5">
        <DateTile month={e.month} day={e.day} />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-bold uppercase text-clay">{rest.length ? kind : "Event"}</p>
          <p className="mt-[3px] font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">{rest.length ? rest.join(": ") : e.title}</p>
          <p className="mt-1 text-[13px] text-stone">{e.meta}</p>
        </div>
      </Link>
      <div className="mt-3.5 flex gap-2.5"><GoingButton id={e.id} going={e.registered} /></div>
    </Card>
  );
}

export function LibraryCard({ t }: { t: { id: string; kind: string; title: string; credit: string; reviewed: string } }) {
  return (
    <Card className="p-[18px]">
      <div className="flex items-center gap-2.5">
        <Pill icon="book" className="bg-butter text-butter-ink">New in the Library</Pill>
        <span className="text-[12.5px] text-stone">Reviewed {t.reviewed}</span>
      </div>
      <h2 className="mt-3 font-display text-[23px] font-extrabold leading-[1.12] tracking-[-.01em]">{t.title}</h2>
      <p className="mt-1.5 text-[14.5px] leading-normal text-bark">From {t.credit}. Keep it on your phone or print it.</p>
      <div className="mt-3.5 flex items-center gap-2.5">
        <span className="rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">{t.kind}</span>
        <Link href={`/village/library/${t.id}`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="arrowRight" size={16} />Open</Link>
      </div>
    </Card>
  );
}

/** Goal ring card ("This week"). */
export function GoalCard({ g, compact }: { g: { statement: string; label: string; pct: number; target: string | null }; compact?: boolean }) {
  const ring = (
    <span className="flex size-[84px] shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(rgb(var(--forest)) 0 ${g.pct}%, rgb(var(--sand)) ${g.pct}% 100%)` }}>
      <span className="flex size-[62px] items-center justify-center rounded-full bg-card font-display text-[20px] font-extrabold">{g.pct}%</span>
    </span>
  );
  const text = <p className="text-[14px] leading-[1.45] text-bark"><b className="text-ink">{g.statement}</b><br />{g.label}{g.target ? `. Aim for ${g.target}.` : "."}</p>;
  if (compact) return (
    <Link href="/goals" className="flex items-center gap-4 rounded-card border border-line bg-card p-4">
      {ring}<div><p className="text-[12px] font-extrabold tracking-[.05em] text-stone">THIS WEEK, MY GOALS</p>{text}</div>
    </Link>
  );
  return (
    <Card className="p-[18px]">
      <CardHead title="This week" href="/goals" link="My goals" />
      <div className="mt-3.5 flex items-center gap-4">{ring}{text}</div>
    </Card>
  );
}

export function ComingUp({ events }: { events: { id: string; month: string; day: string; title: string; meta: string }[] }) {
  return (
    <Card className="p-[18px]">
      <CardHead title="Coming up" href="/village/events" link="Events" />
      <ul className="mt-3 flex flex-col gap-3">
        {events.map((e, i) => (
          <li key={e.id}><Link href={`/village/events/${e.id}`} className="flex items-center gap-3">
            <DateTile month={e.month} day={e.day} size="sm" tone={(["butter", "sand", "mint"] as const)[i % 3]} />
            <div className="min-w-0 text-[14px]"><b className="line-clamp-1">{e.title}</b><p className="line-clamp-1 text-[12.5px] text-stone">{e.meta}</p></div>
          </Link></li>
        ))}
      </ul>
    </Card>
  );
}

export function Villagers({ mentors, title = "Villagers to meet", ring }: { mentors: { id: string; name: string; role: string; country: string }[]; title?: string; ring?: boolean }) {
  return (
    <Card className="p-[18px]">
      <CardHead title={title} href="/village/directory" link="See all" />
      <ul className="mt-3 flex flex-col gap-3">
        {mentors.map((m, i) => (
          <li key={m.id} className="flex items-center gap-3">
            {ring ? <span className="rounded-full bg-[linear-gradient(135deg,rgb(var(--clay)),#C99A2E)] p-[3px]"><span className="block rounded-full bg-paper p-[3px]"><Face name={m.name} size={46} tone={pastelAt(i)} /></span></span> : <Face name={m.name} size={42} tone={pastelAt(i)} />}
            <div className="min-w-0 flex-1 text-[14px]"><b>{m.name}</b><p className="text-[12.5px] text-stone">{[m.role, m.country].filter(Boolean).join(" · ")}</p></div>
            <Link href={`/village/directory/${m.id}`} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">View</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Phone-only horizontal rail of mentor cards ("Villagers to meet" in D1-M). */
export function VillagerRail({ mentors }: { mentors: { id: string; name: string; role: string }[] }) {
  return (
    <section>
      <CardHead title="Villagers to meet" href="/village/directory" link="See all" />
      <ScrollX label="mentor" className="-mx-5 mt-2.5 flex gap-3 overflow-x-auto px-5 [scrollbar-width:none]">
        {mentors.map((m, i) => (
          <Link key={m.id} href={`/village/directory/${m.id}`} className={cn("flex w-[150px] shrink-0 flex-col items-start gap-2 rounded-[22px] p-4", PASTEL[pastelAt(i)].both)}>
            <span className="flex size-12 items-center justify-center rounded-full bg-card font-display text-[17px] font-bold">{initials(m.name)}</span>
            <span className="text-[15px] font-bold leading-tight">{m.name}</span>
            <span className="text-[12.5px] opacity-85">{m.role}</span>
            <span className="mt-1 text-[13px] font-bold underline">See profile</span>
          </Link>
        ))}
      </ScrollX>
    </section>
  );
}

export function GuardianNote({ first, children }: { first: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-[20px] bg-mint px-4 py-3.5 text-[13.5px] leading-[1.45] text-mint-ink">
      <Icon name="shieldCheck" size={22} className="shrink-0" />
      <p><b>{first} is your guardian.</b> {children ?? "They approve each call and time."}</p>
    </div>
  );
}
