import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/dc/icons";
import { ApprovalSample, CheckDot, H, IconTile, Pill, RingAvatar, StatCard, TONE, cycle, type Tone } from "./kit";

/* Sections of the landing board (V-Main). Phone gutters here are 18px, as on the board. */

export const HOME_X = "px-[18px] lg:px-14";

/** Row that scrolls sideways on the phone and becomes a grid on desktop. */
export function Rail({ cols, children, className }: { cols: 3 | 4 | 5; children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      "-mx-[18px] flex snap-x scroll-px-[18px] gap-3 overflow-x-auto px-[18px] py-1.5 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none]",
      "lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:py-0 lg:[mask-image:none]",
      cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4", cols === 5 && "lg:grid-cols-5", className)}>
      {children}
    </div>
  );
}
const railItem = (w: string) => cn("flex-none snap-start lg:w-auto", w);

export function SectionHead({ eyebrow, title, phoneTitle, sub, phoneSub = true, center, className }: { eyebrow: string; title: string; phoneTitle?: string; sub?: string; phoneSub?: boolean; center?: boolean; className?: string }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-2.5 lg:mb-6", center && "items-center text-center", className)}>
      <p className="text-[13px] font-extrabold tracking-[.05em] text-clay">{eyebrow}</p>
      <H className="text-[28px] lg:text-[44px]">{phoneTitle ? <><span className="lg:hidden">{phoneTitle}</span><span className="max-lg:hidden">{title}</span></> : title}</H>
      {sub && <p className={cn("mt-0.5 max-w-[680px] text-[16px] leading-normal text-bark lg:text-[18px]", !phoneSub && "max-lg:hidden")}>{sub}</p>}
    </div>
  );
}

const shadow = "shadow-[0_14px_30px_rgba(60,40,10,.10)]";
const MENTORS: { initials: string; tone: Tone; name: string; role: string; city: string; tags: [string, string] }[] = [
  { initials: "KM", tone: "butter", name: "Kwame M.", role: "Emergency physician", city: "Ibadan", tags: ["Health", "Careers"] },
  { initials: "TA", tone: "mint", name: "Tomi A.", role: "Product designer", city: "Lagos", tags: ["Tech", "Arts"] },
  { initials: "IB", tone: "blush", name: "Ife B.", role: "Scholarship adviser", city: "Abuja", tags: ["School", "Money"] },
  { initials: "SE", tone: "butter", name: "Sam E.", role: "Civil engineer", city: "Abuja", tags: ["Careers", "Tech"] },
];

function Ticks({ items, size = 20 }: { items: string[]; size?: number }) {
  return (
    <div className="mt-3.5 flex flex-col gap-[7px] text-[13.5px] font-semibold">
      {items.map((t) => <p key={t} className="flex items-center gap-2"><CheckDot size={size} />{t}</p>)}
    </div>
  );
}

function AskCard({ className }: { className?: string }) {
  return (
    <div className={cn("dc-card rounded-[26px] p-[18px]", shadow, className)}>
      <div className="flex flex-wrap items-center gap-2"><Pill tone="butter" className="text-caption">College guidance</Pill><Pill tone="mint" icon="check" className="text-caption">Scheduled</Pill></div>
      <p className="mt-3 font-display text-[19px] font-extrabold leading-[1.12] lg:text-[21px]">How do I prepare for pre-med as a junior?</p>
      <p className="mt-1.5 text-caption leading-[1.4] text-stone">Asked by Amara, 16. Authorized by her guardian.</p>
      <Ticks items={["Submitted 28 Sep", "Read by the village team", "A mentor stepped forward"]} />
    </div>
  );
}
function ThanksMini({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[26px] bg-blush p-[18px] text-blush-ink", shadow, className)}>
      <p className="font-display text-[18px] font-bold leading-[1.2] lg:text-[21px]">&quot;I finally know what to do this year. I almost did not ask.&quot;</p>
      <p className="mt-2.5 text-[13px]"><b>Tunde, 17</b> thanked Sam E.</p>
      <div className="mt-3 flex gap-3.5 text-[14px] font-semibold"><span className="inline-flex items-center gap-1.5 text-clay"><Icon name="heart" filled size={20} />Helpful</span><span className="inline-flex items-center gap-1.5 text-stone"><Icon name="bookmark" size={20} />Save</span></div>
    </div>
  );
}
function MentorsMini({ className }: { className?: string }) {
  return (
    <div className={cn("dc-card p-4", shadow, className)}>
      <p className="mb-2.5 text-eyebrow font-extrabold text-stone">MENTORS WHO STEPPED FORWARD</p>
      <div className="flex justify-between gap-2.5">{MENTORS.map((m) => <RingAvatar key={m.initials} initials={m.initials} tone={m.tone} size={50} />)}</div>
    </div>
  );
}

export function HomeHero({ minAge }: { minAge: number }) {
  return (
    <section className={cn("mx-auto flex max-w-[1280px] items-center gap-[30px] overflow-hidden pb-[30px] pt-[26px] lg:overflow-visible lg:pb-5 lg:pt-10", HOME_X)}>
      <div className="min-w-0 flex-[1_1_560px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill tone="butter" icon="smile" className="text-[13px]">For ages {minAge} and up</Pill>
          <span className="text-[13.5px] font-bold text-clay">Ask the Village</span>
        </div>
        <h1 className="mt-[18px] font-display text-[60px] font-extrabold leading-[.96] tracking-[-.03em] lg:text-[88px]">Ask the<br />village<span className="text-clay">.</span></h1>
        <p className="mt-4 font-display text-[20px] font-extrabold leading-[1.15] text-forest lg:text-[26px]">Rebuilding the Village.<br />Empowering the Next Generation.</p>
        <p className="mt-4 max-w-[520px] text-[17px] leading-normal text-bark lg:text-[20px]">Ask a question about school, work or life. The village finds someone who has walked that road and is glad to give an hour.</p>
        <div className="mt-[22px] flex flex-col gap-2.5 lg:mt-7 lg:flex-row lg:gap-3">
          <Link href="/register" className="dc-btn dc-btn-primary h-[58px] lg:h-[60px]"><Icon name="arrowRight" size={18} />Start an Ask</Link>
          <Link href="/become-a-mentor" className="dc-btn dc-btn-ghost h-[54px] lg:h-[60px]">I would like to mentor</Link>
        </div>
        <Link href="/families" className="mt-[18px] inline-flex items-center gap-2 text-[15px] font-bold text-forest"><Icon name="shieldCheck" size={20} />I am a parent or guardian<Icon name="arrowRight" size={16} strokeWidth={2.5} /></Link>

        {/* Phone collage */}
        <div className="relative mt-[22px] flex flex-col gap-3 pt-2.5 lg:hidden" aria-hidden="true">
          <div className="absolute -left-[30px] top-[30px] size-[230px] rounded-full bg-mint" />
          <div className="absolute -right-5 top-[300px] size-[170px] rounded-full bg-butter" />
          <AskCard className="relative w-[300px] max-w-full -rotate-3" />
          <ThanksMini className="relative -mt-1.5 w-[290px] max-w-full rotate-3 self-end" />
          <MentorsMini className="relative w-[310px] max-w-full -rotate-2" />
        </div>
      </div>

      {/* Desktop collage, 520 x 700 */}
      <div className="relative h-[700px] w-[520px] flex-none max-lg:hidden" aria-hidden="true">
        <div className="absolute left-[30px] top-[60px] h-[480px] w-[440px] rounded-[200px_200px_60px_200px] bg-mint" />
        <div className="absolute right-0 top-0 size-[150px] rounded-full bg-butter" />
        <AskCard className="absolute left-0 top-5 w-[330px] -rotate-[4deg]" />
        <RingAvatar initials="SE" tone="butter" size={72} className="absolute right-0 top-11" />
        <ThanksMini className="absolute -right-2 top-[170px] w-[300px] rotate-[4deg]" />
        <MentorsMini className="absolute left-0 top-[372px] w-[330px] -rotate-2" />
        <div className={cn("dc-card absolute right-0 top-[575px] w-[320px] rotate-3 p-4", shadow)}>
          <div className="flex items-center gap-3.5">
            <div className="w-[58px] flex-none rounded-field bg-butter py-2 text-center font-display font-extrabold text-butter-ink"><p className="text-[12px]">OCT</p><p className="text-[26px] leading-none">24</p></div>
            <div><p className="text-[16px] font-extrabold">Careers in tech, live</p><p className="mt-0.5 text-[13px] text-stone">Sat, 4:00 pm WAT. With Tomi A.</p></div>
          </div>
          <div className="mt-3 flex gap-2"><Pill tone="mint" className="text-caption">Free</Pill><Pill tone="butter" className="text-caption">Guardian approves</Pill></div>
        </div>
        <Pill tone="mint" icon="check" className="absolute left-1.5 top-[530px] -rotate-3">Your guardian said yes</Pill>
      </div>
    </section>
  );
}

const TRUST: { icon: IconName; tone: Tone; title: string; sub: string }[] = [
  { icon: "coin", tone: "butter", title: "Free to join", sub: "No fees, ever" },
  { icon: "user", tone: "mint", title: "Guardian approved", sub: "Under 18s join with a guardian" },
  { icon: "lock", tone: "blush", title: "No contact details shared", sub: "No numbers, no emails, no DMs" },
  { icon: "video", tone: "butter", title: "Recorded for under 18s", sub: "Guardians can ask to see it" },
];
export function TrustStrip() {
  return (
    <section aria-label="Promises" className={cn("mx-auto grid max-w-[1280px] grid-cols-2 gap-2.5 py-1 lg:grid-cols-4 lg:gap-3.5 lg:py-2.5", HOME_X)}>
      {TRUST.map((t) => (
        <div key={t.title} className={cn("flex flex-col items-start gap-2 rounded-[22px] px-4 py-3.5 lg:flex-row lg:items-center lg:gap-3", TONE[t.tone].bg, TONE[t.tone].ink)}>
          <IconTile icon={t.icon} tone={t.tone} white size={38} iconSize={19} className="lg:hidden" />
          <IconTile icon={t.icon} tone={t.tone} white size={46} iconSize={23} className="max-lg:hidden" />
          <div><p className="text-[14.5px] font-extrabold leading-[1.2] lg:text-[15.5px]">{t.title}</p><p className="mt-0.5 text-caption opacity-85 lg:text-[13px]">{t.sub}</p></div>
        </div>
      ))}
    </section>
  );
}

/* ── How it works ── */
function Bubbles() {
  return <><div className="absolute -right-5 -top-[26px] size-[110px] rounded-full bg-white/45" /><div className="absolute -bottom-[30px] -left-[18px] size-[90px] rotate-[20deg] rounded-[30px] bg-white/35" /></>;
}
function Lines({ widths }: { widths: string[] }) { return <>{widths.map((w) => <div key={w} className="h-[7px] rounded bg-line" style={{ width: w }} />)}</>; }
function MiniDoc({ icon, tone, label, rotate, children }: { icon: IconName; tone: Tone; label: string; rotate: string; children: ReactNode }) {
  return (
    <div className={cn("relative flex w-[170px] flex-col gap-2 rounded-[18px] bg-white p-3.5 shadow-[0_8px_18px_rgba(60,40,10,.12)]", rotate)}>
      <div className="flex items-center gap-2"><IconTile icon={icon} tone={tone} size={30} iconSize={15} radius={10} /><p className="text-[12px] font-extrabold">{label}</p></div>
      {children}
    </div>
  );
}
const STEPS: { tone: Tone; rot: string; title: string; body: string; art: ReactNode }[] = [
  { tone: "butter", rot: "lg:-rotate-[1.2deg]", title: "Ask a real question", body: "Pick a topic and answer a few guided prompts. We show you what the library already knows first, so you only use a mentor's hour when you need one.",
    art: <MiniDoc icon="pencil" tone="butter" label="Your Ask" rotate="-rotate-[4deg]"><Lines widths={["90%", "70%", "80%"]} /></MiniDoc> },
  { tone: "mint", rot: "lg:rotate-[.8deg]", title: "A person reads it first", body: "A team member writes a short summary with no names, schools or contact details. Only that summary goes to mentors.",
    art: <MiniDoc icon="eye" tone="mint" label="Team summary" rotate="rotate-3"><Lines widths={["90%", "70%"]} /><div><Pill tone="mint" icon="lock" className="text-[11.5px]">No names</Pill></div></MiniDoc> },
  { tone: "blush", rot: "lg:-rotate-[.8deg]", title: "A mentor steps forward", body: "Mentors who fit see your Ask and volunteer. Nobody is assigned, and the team confirms the match.",
    art: <div className="relative flex -rotate-3 items-center"><RingAvatar initials="KM" tone="butter" size={58} /><RingAvatar initials="TA" tone="mint" size={58} className="-ml-2.5" /><RingAvatar initials="IB" tone="blush" size={58} className="-ml-2.5" /><span className="ml-1.5 flex size-[34px] items-center justify-center rounded-full bg-forest text-white"><Icon name="plus" size={18} strokeWidth={3} /></span></div> },
  { tone: "butter", rot: "lg:rotate-[1.2deg]", title: "Meet on the platform", body: "Guardians approve the mentor and the time. You meet through an approved link, and then say thanks or ask for a follow-up.",
    art: <div className="relative flex h-28 w-[190px] rotate-3 items-center justify-center rounded-[18px] bg-[#1D1914] shadow-[0_8px_18px_rgba(60,40,10,.18)]"><span className="flex size-[50px] items-center justify-center rounded-full bg-white/[.18] text-white"><Icon name="play" filled size={24} strokeWidth={2.4} /></span><Pill tone="mint" icon="check" className="absolute bottom-2.5 left-2.5 text-[11.5px]">Approved</Pill></div> },
];
export function HowItWorks() {
  return (
    <section id="how" className={cn("mx-auto max-w-[1280px] scroll-mt-20 py-5 lg:py-[30px]", HOME_X)}>
      <SectionHead eyebrow="HOW IT WORKS" title="From a question to a conversation in four plain steps" sub="Every Ask shows one plain status and what happens next, so nobody is left wondering." />
      <Rail cols={4} className="lg:gap-[18px]">
        {STEPS.map((s, i) => (
          <div key={s.title} className={cn(railItem("w-[300px]"), "rounded-[28px] p-[18px]", TONE[s.tone].bg, TONE[s.tone].ink, s.rot)}>
            <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-[22px] bg-white/40 lg:h-[140px]" aria-hidden="true"><Bubbles />{s.art}</div>
            <div className="mt-2.5 flex items-center gap-2.5 lg:mt-3.5">
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-white font-display text-[15px] font-extrabold">{i + 1}</span>
              <H as="h3" className="text-[21px]">{s.title}</H>
            </div>
            <p className="mt-2.5 text-[14.5px] leading-normal opacity-[.92]">{s.body}</p>
          </div>
        ))}
      </Rail>
      <div className="mt-3.5 grid gap-4 lg:mt-7 lg:grid-cols-2 lg:items-center lg:gap-7">
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">WHAT AN ASK LOOKS LIKE</p>
          <H className="text-[25px] lg:text-[30px]">Two minutes. A few guided prompts.</H>
          <p className="text-[16px] leading-normal text-bark">Every Ask shows one plain status and what happens next, so nobody is left wondering.</p>
        </div>
        <div className="dc-card p-5" aria-label="Example Ask">
          <div className="flex flex-wrap gap-2"><Pill tone="butter" className="text-caption">College guidance</Pill><Pill className="text-caption">60 minutes</Pill></div>
          <p className="mt-3 text-[13px] font-bold text-bark">What I most want to understand</p>
          <p className="mt-2 rounded-field border-2 border-line px-3.5 py-3 text-[15.5px]">I want to study medicine. What should I be doing now?</p>
          <p className="mt-3.5 flex justify-between text-[13px] font-bold"><span>Completeness</span><span className="text-forest">100%</span></p>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full w-full rounded-[10px] bg-forest" /></div>
        </div>
      </div>
    </section>
  );
}

const TOPICS: [IconName, string, string, string][] = [
  ["briefcase", "Careers", "What does a day as an engineer look like?", "Should I do an internship?"],
  ["graduation", "School and exams", "How do I revise for WAEC in 6 weeks?", "Is JAMB or Post-UTME harder?"],
  ["coin", "Money", "How do I save as a student?", "Is a scholarship worth the stress?"],
  ["rocket", "Starting something", "How do I test a business idea?", "Do I need a lot of money to start?"],
  ["smile", "Wellbeing", "How do I handle exam pressure?", "I feel behind my friends."],
  ["compass", "Life after school", "Gap year or go straight to uni?", "How do I pick a course?"],
  ["bolt", "Tech", "How do I start learning to code?", "What does a product designer do?"],
  ["heart", "Health", "How do I get into medicine?", "What do nurses wish they knew?"],
  ["clipboard", "Law", "What do lawyers do all day?", "Can I study law after science?"],
  ["pencil", "Arts", "Can I make a living from music?", "How do I build a portfolio?"],
];
export function WhatCanYouAsk() {
  return (
    <section className="bg-sand">
      <div className={cn("mx-auto max-w-[1280px] py-5 lg:py-[30px]", HOME_X)}>
        <SectionHead eyebrow="WHAT CAN YOU ASK" title="Anything on your mind. Really." sub="Pick a topic, then ask in your own words. Here are some questions young people have asked." phoneSub={false} />
        <Rail cols={5} className="lg:gap-3.5">
          {TOPICS.map(([icon, title, a, b], i) => {
            const tone = cycle(i);
            return (
              <div key={title} className={cn(railItem("w-[236px]"), "rounded-card p-4", TONE[tone].bg, TONE[tone].ink)}>
                <div className="flex items-center gap-2.5"><IconTile icon={icon} tone={tone} white size={44} iconSize={22} radius={14} /><H as="h3" className="text-[19px]">{title}</H></div>
                <div className="mt-3 flex flex-col items-start gap-[7px]">{[a, b].map((q) => <span key={q} className="rounded-[14px] bg-white/[.72] px-2.5 py-1.5 text-caption font-semibold leading-[1.3] text-ink">{q}</span>)}</div>
              </div>
            );
          })}
        </Rail>
        <p className="mt-2 flex items-center gap-2 text-[14.5px] text-bark lg:mt-5"><Icon name="info" size={18} className="text-forest" />Not sure where your question fits? The team will help you choose.</p>
      </div>
    </section>
  );
}

const STAGES: [IconName, string, string, string][] = [
  ["graduation", "AGES 15 TO 17", "High school students", "Careers, college preparation and leadership. They join with a parent or guardian."],
  ["briefcase", "AGES 18 AND UP", "College students", "Career guidance, internships, networking and graduate school."],
  ["rocket", "FIRST JOBS", "Recent graduates", "Job searches, interviews, workplace expectations and early decisions."],
  ["trend", "GROWING", "Early-career professionals", "Progression, leadership and starting something of their own."],
];
export function WhoItIsFor({ minAge }: { minAge: number }) {
  return (
    <section className={cn("mx-auto max-w-[1280px] py-[22px] lg:py-9", HOME_X)}>
      <SectionHead eyebrow="WHO IT IS FOR" title="A mentor for every stage of the road" />
      <Rail cols={4} className="lg:gap-4">
        {STAGES.map(([icon, age, title, body], i) => {
          const tone = cycle(i);
          return (
            <div key={title} className={cn(railItem("w-[236px]"), "rounded-[26px] p-3.5 lg:p-5", TONE[tone].bg, TONE[tone].ink)}>
              <div className="flex items-center gap-2.5"><IconTile icon={icon} tone={tone} white size={44} iconSize={22} radius={14} /><p className="text-[12px] font-extrabold tracking-[.04em] opacity-80">{i === 0 ? `AGES ${minAge} TO 17` : age}</p></div>
              <H as="h3" className="mt-3 text-[22px]">{title}</H>
              <p className="mt-1.5 text-[13.5px] leading-normal lg:text-[14.5px]">{body}</p>
            </div>
          );
        })}
      </Rail>
      <p className="mt-3 max-w-[760px] text-[17px] font-semibold leading-normal lg:mt-[26px]">Mentors are doctors, engineers, teachers, lawyers, founders, tradespeople and community leaders. A grand title is not required. Willingness is.</p>
    </section>
  );
}

export function MeetMentors() {
  const phoneRing: [string, Tone, string][] = [["KM", "butter", "Kwame"], ["TA", "mint", "Tomi"], ["IB", "blush", "Ife"], ["SE", "butter", "Sam"], ["BO", "mint", "Dr"], ["CN", "blush", "Chioma"]];
  return (
    <section className={cn("mx-auto max-w-[1280px] py-5 lg:py-[30px]", HOME_X)}>
      <SectionHead eyebrow="MEET SOME OF THE VILLAGE" title="Mentors who stepped forward" sub="People who have walked the road, and are glad to give an hour. Names shown are examples." phoneSub={false} />
      <div className="mb-1.5 flex gap-3 overflow-hidden lg:hidden" aria-hidden="true">
        {phoneRing.map(([i, t, n]) => <div key={i} className="flex flex-col items-center"><RingAvatar initials={i} tone={t} size={52} /><p className="mt-1.5 text-caption font-bold">{n}</p></div>)}
      </div>
      <Rail cols={4} className="lg:gap-[18px]">
        {MENTORS.map((m) => (
          <div key={m.name} className={cn(railItem("w-[270px]"), "dc-card rounded-[26px] p-5")}>
            <div className="flex items-center gap-3.5">
              <RingAvatar initials={m.initials} tone={m.tone} size={64} />
              <div className="min-w-0">
                <p className="font-display text-[20px] font-extrabold">{m.name}</p>
                <p className="mt-0.5 text-[14px] text-bark">{m.role}</p>
                <p className="mt-0.5 flex items-center gap-1 text-caption text-stone"><Icon name="pin" size={13} />{m.city}</p>
              </div>
            </div>
            <div className="mt-3.5 flex flex-wrap gap-1.5">{m.tags.map((t) => <Pill key={t} tone={m.tone} className="text-caption">{t}</Pill>)}</div>
            <p className="mt-3.5 flex items-center gap-1.5 text-caption font-bold text-forest"><Icon name="shieldCheck" size={16} />Cleared for young people</p>
          </div>
        ))}
      </Rail>
    </section>
  );
}

export function RealAnswers() {
  return (
    <section className={cn("mx-auto grid max-w-[1280px] gap-2 py-5 lg:grid-cols-2 lg:gap-12 lg:py-[30px]", HOME_X)}>
      <div className="flex flex-col justify-center gap-3.5">
        <SectionHead eyebrow="REAL QUESTIONS, REAL ANSWERS" title="Questions like yours, answered by people who have been there." sub="Every answer is written up with no names, schools or contact details, then read by the team before it joins the library." />
        <div className="flex flex-col gap-2.5 max-lg:hidden">
          {["A person reads every Ask first", "Nobody is assigned", "Your question stays private"].map((t) => <p key={t} className="flex items-center gap-2.5 text-[15.5px] font-semibold"><Icon name="check" size={18} strokeWidth={3} className="text-forest" />{t}</p>)}
        </div>
      </div>
      <figure className="dc-card rounded-[30px] p-[18px] shadow-[0_18px_40px_rgba(60,40,10,.10)] lg:rotate-1 lg:p-7" aria-label="Example question and answer from the library">
        <div className="mb-4 flex flex-wrap gap-2"><Pill tone="butter" icon="book" className="text-caption">From the library</Pill><Pill icon="lock" className="text-caption">Names removed</Pill></div>
        <div className="flex items-start gap-3">
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-blush font-display text-[16px] font-bold text-blush-ink">AO</span>
          <div className="flex-1 rounded-[22px_22px_22px_6px] bg-blush px-[18px] py-4 text-[16px] leading-[1.45] text-blush-ink"><b>Amara, 16 asked</b><p className="mt-1">How do I prepare for pre-med as a junior? I want to study medicine but I do not know what I should be doing now.</p></div>
        </div>
        <div className="mt-4 flex items-start gap-3">
          <RingAvatar initials="KM" tone="mint" size={44} />
          <div className="flex-1 rounded-[22px_22px_6px_22px] bg-mint px-[18px] py-4 text-[16px] leading-[1.45] text-mint-ink"><b>Kwame M., emergency physician</b><p className="mt-1">Start with your sciences and keep your grades steady. Spend one afternoon shadowing someone at a clinic, then write down what surprised you. You do not need to decide today.</p></div>
        </div>
        <div className="mt-[18px] flex flex-wrap items-center gap-3 lg:gap-[18px]">
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-clay"><Icon name="heart" filled size={20} />Helpful</span>
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-stone"><Icon name="bookmark" size={20} />Save</span>
          <span className="flex-1" />
          <Pill tone="mint" icon="shieldCheck" className="text-caption">Reviewed by the team</Pill>
        </div>
      </figure>
    </section>
  );
}

export type WallCard = { id: string; quote: string; who: string };
export function ThanksWall({ cards }: { cards: WallCard[] }) {
  const rot = ["lg:-rotate-[1.5deg]", "lg:rotate-1", "lg:-rotate-[.8deg]"];
  return (
    <section className="bg-sand">
      <div className={cn("mx-auto max-w-[1280px] pt-5 lg:pt-[30px]", HOME_X)}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="THANK-YOU WALL" title="Said by the village" />
          <div className="mb-4 lg:mb-6"><Pill tone="mint" icon="shieldCheck" className="text-[13px]">Reviewed by the team</Pill></div>
        </div>
        <Rail cols={3} className="lg:gap-[22px] [&>*:nth-child(n+4)]:lg:hidden">
          {cards.map((c, i) => {
            const tone = cycle(i);
            return (
              <figure key={c.id} className={cn(railItem("w-[280px]"), "rounded-[28px] p-6", TONE[tone].bg, TONE[tone].ink, rot[i % 3])}>
                <blockquote className="font-display text-[21px] font-bold leading-[1.2] lg:text-[24px]">{c.quote}</blockquote>
                <figcaption className="mt-3.5 text-[13.5px]">{c.who}</figcaption>
              </figure>
            );
          })}
        </Rail>
      </div>
    </section>
  );
}

export function Numbers() {
  return (
    <section className="bg-sand">
      <div className={cn("mx-auto max-w-[1280px] py-[22px] lg:py-9", HOME_X)}>
        <SectionHead eyebrow="THE VILLAGE IN NUMBERS" title="What we count, and what we never will" phoneTitle="What we count" />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          <StatCard tone="butter" icon="users" value="120" label="Mentors cleared to date" badge="Example number" />
          <StatCard tone="mint" icon="clock" value="340" label="Hours given this term" badge="Example number" />
          <StatCard tone="blush" icon="heart" value="85" label="Thank-yous on the wall" badge="Example number" />
          <StatCard tone="mint" icon="lock" value="0" label="Private messages, always" className="max-lg:px-5 max-lg:py-[18px] max-lg:[&>p:first-of-type]:text-[44px]" />
        </div>
        <p className="mt-[18px] max-w-[760px] text-[13.5px] text-stone">Numbers marked Example are placeholders to show the layout. Real figures appear here once the village is open. We count hours given and conversations held. There are no league tables and no star ratings.</p>
      </div>
    </section>
  );
}

export type HomeEvent = { id: string; month: string; day: string; title: string; meta: string };
export function Events({ events }: { events: HomeEvent[] }) {
  return (
    <section id="events" className={cn("mx-auto max-w-[1280px] scroll-mt-20 py-5 lg:py-[30px]", HOME_X)}>
      <SectionHead eyebrow="EVENTS AND CHALLENGES" title="Join something live" />
      {events.length ? (
        <Rail cols={3} className="lg:gap-[18px]">
          {events.map((e, i) => {
            const tone = cycle(i);
            return (
              <Link key={e.id} href={`/login?next=/village/events/${e.id}`} className={cn(railItem("w-[300px]"), "dc-card flex flex-col rounded-[26px] p-5")}>
                <div className="flex items-center gap-4">
                  <div className={cn("w-[70px] flex-none rounded-[20px] py-2.5 text-center font-display font-extrabold", TONE[tone].bg, TONE[tone].ink)}><p className="text-[13px]">{e.month.toUpperCase()}</p><p className="text-[32px] leading-none">{e.day}</p></div>
                  <div className="min-w-0"><p className="text-[17px] font-extrabold leading-[1.2]">{e.title}</p><p className="mt-1 text-[13.5px] text-stone">{e.meta}</p></div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4"><Pill tone={tone} className="text-caption">Free</Pill><Pill className="text-caption">Under 18s: guardian approves</Pill></div>
                <p className="mt-3 flex items-center gap-1.5 text-[14px] font-extrabold text-forest">Save a seat<Icon name="arrowRight" size={16} strokeWidth={2.5} /></p>
              </Link>
            );
          })}
        </Rail>
      ) : (
        <p className="dc-card p-6 text-[15.5px] text-bark">New live sessions are posted here. Join the village to hear first.</p>
      )}
      <div className="h-3 lg:h-[26px]" />
      <div className="rounded-[36px] bg-butter p-5 text-butter-ink lg:p-9">
        <div className="grid gap-[18px] lg:grid-cols-2 lg:gap-10">
          <div>
            <p className="text-[13px] font-extrabold tracking-[.05em]">THE ONE HOUR CHALLENGE</p>
            <H className="mt-2.5 text-[28px] lg:text-[44px]">One hour a month. Twelve a year.</H>
            <p className="mt-3 max-w-[520px] text-[16px] leading-normal lg:text-[17.5px]">We count hours given and conversations held. There are no league tables and no star ratings. Gratitude is the reward.</p>
            <Link href="/become-a-mentor" className="dc-btn dc-btn-forest mt-[18px] h-[52px] max-lg:w-full">Apply to mentor</Link>
            <p className="mt-3.5 text-[14px]"><b>What mentors are asked to sign:</b> a safeguarding commitment and the code of conduct, before any match.</p>
          </div>
          <div className="flex items-center">
            <div className="dc-card rounded-[28px] p-5 text-ink lg:-rotate-[1.5deg] lg:p-[26px]">
              <div className="flex items-center gap-2.5"><IconTile icon="clock" tone="butter" size={42} iconSize={21} radius={14} /><H as="h3" className="text-[20px]">A mentor&apos;s own tally</H></div>
              <div className="mt-[18px] grid grid-cols-6 justify-items-center gap-2 lg:gap-2.5" aria-label="One of twelve months given">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} className={cn("flex size-[30px] items-center justify-center rounded-full lg:size-9", i === 0 ? "bg-forest text-white" : "bg-sand")}>{i === 0 && <Icon name="check" size={18} strokeWidth={3} />}</span>
                ))}
              </div>
              <H as="p" className="mt-[18px] text-[24px]">One month given, eleven to go.</H>
              <p className="mt-1.5 text-[13.5px] leading-[1.4] text-stone">Seen only by the mentor and the team. Never ranked against anyone else.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export type HomeResource = { id: string; topic: string; title: string };
export function LibraryPeek({ items }: { items: HomeResource[] }) {
  return (
    <section className="bg-sand">
      <div className={cn("mx-auto max-w-[1280px] py-5 lg:py-[30px]", HOME_X)}>
        <div className="mb-4 flex flex-col gap-4">
          <SectionHead eyebrow="THE LIBRARY" title="Someone may have already asked it" sub="We show you what the library already knows first, so you only use a mentor's hour when you need one." />
          <form action="/library" role="search" className="flex items-center gap-3">
            <label className="flex h-12 items-center gap-2.5 rounded-full border-2 border-line bg-card px-[18px] text-[15px] text-stone focus-within:border-ink max-lg:flex-1 lg:w-[540px]">
              <Icon name="search" size={19} />
              <input type="search" name="q" placeholder="Search questions and answers" aria-label="Search questions and answers" className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-stone focus:outline-none" />
            </label>
            <Link href="/library" className="dc-btn dc-btn-ghost h-12 max-lg:hidden"><Icon name="arrowRight" size={18} />Browse the library</Link>
          </form>
        </div>
        {items.length ? (
          <Rail cols={4} className="lg:gap-[18px] [&>*:nth-child(n+4)]:max-lg:hidden">
            {items.map((r, i) => (
              <Link key={r.id} href={`/library/${r.id}`} className={cn(railItem("w-[250px]"), "dc-card rounded-[26px] p-5")}>
                <div className="flex items-center justify-between"><Pill tone={(["mint", "blush", "butter", "mint"] as const)[i % 4]} className="text-caption">{r.topic || "Library"}</Pill><Icon name="bookmark" size={20} className="text-stone" /></div>
                <H as="h3" className="mt-4 text-[20px] lg:min-h-[72px]">{r.title}</H>
                <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-stone"><span className="flex-1" /><Icon name="shieldCheck" size={15} className="text-forest" /><span className="font-bold text-forest">Reviewed</span></p>
              </Link>
            ))}
          </Rail>
        ) : (
          <p className="dc-card p-6 text-[15.5px] text-bark">The first answers are being written now. <Link href="/library" className="font-bold text-clay">Open the library</Link></p>
        )}
      </div>
    </section>
  );
}

const SAFEGUARDS: [IconName, string, string][] = [
  ["user", "Guardian approval", "For under 18s, a guardian approves every Ask, then the mentor, then the time."],
  ["shieldCheck", "Mentor checks", "Identity check, a signed safeguarding commitment and orientation before any match."],
  ["lock", "No off-platform contact", "No DMs. Phone numbers and emails never pass through. Everything stays here."],
  ["flag", "Reporting", "Report a concern from any page. Our safeguarding lead reads every report."],
  ["video", "Recordings for under 18s", "Calls with under 18s are recorded. Guardians can ask to see them any time."],
  ["heart", "Crisis support", "Help is one tap away on every screen, with trusted helplines and a trained person."],
];
const PROMISES: [string, string][] = [["Nobody is assigned", "Eligible mentors choose to step forward."], ["A person reads first", "Our team reads every Ask before a mentor does."], ["No private contact", "Phone numbers and emails never pass through."], ["Guardians decide", "For under 18s, at every step."]];
export function BuiltForSafety() {
  return (
    <section className="mx-auto my-3 max-w-[1280px] px-3.5 lg:my-4 lg:px-14">
      <div className="rounded-[32px] bg-forest px-5 py-6 text-white lg:rounded-[40px] lg:px-14 lg:py-12">
        <Icon name="shieldCheck" size={46} />
        <H className="mt-3 text-[34px] text-white lg:text-[48px]">Built for safety</H>
        <p className="mt-2.5 max-w-[640px] text-[16px] leading-normal text-white/[.92] lg:text-[18px]">Six safeguards sit behind every single conversation. Nobody has to take our word for it.</p>
        <div className="mt-[26px] grid gap-4 lg:mt-[34px] lg:grid-cols-3 lg:gap-[18px]">
          {SAFEGUARDS.map(([icon, t, b]) => (
            <div key={t} className="flex items-start gap-3 lg:block lg:rounded-[26px] lg:border lg:border-white/[.22] lg:bg-white/[.12] lg:p-[22px]">
              <span className="flex size-[42px] flex-none items-center justify-center rounded-[14px] bg-white text-forest lg:size-12 lg:rounded-field"><Icon name={icon} size={22} className="lg:hidden" /><Icon name={icon} size={26} className="max-lg:hidden" /></span>
              <div>
                <H as="h3" className="text-[17px] text-white lg:mt-3.5 lg:text-[20px]">{t}</H>
                <p className="mt-0.5 text-[14px] leading-[1.45] text-white/90 lg:mt-1.5 lg:text-[14.5px] lg:leading-normal">{b}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3.5 border-t border-white/25 pt-[18px] lg:mt-[26px] lg:grid-cols-4 lg:gap-[18px] lg:pt-[22px]">
          {PROMISES.map(([t, b]) => <div key={t} className="flex gap-2.5 text-[14.5px] leading-[1.4]"><Icon name="check" size={20} strokeWidth={3} /><div><b>{t}</b><p className="opacity-90">{b}</p></div></div>)}
        </div>
      </div>
    </section>
  );
}

const PARENT_POINTS: [string, string][] = [
  ["A guardian authorizes every Ask", "Then the specific mentor, then the time."],
  ["Mentors are verified before any match", "Identity check, a signed safeguarding commitment and orientation."],
  ["No private contact, ever", "Everything stays on the platform."],
  ["Withdraw consent at any time", "One tap pauses the connection and alerts our safeguarding lead."],
];
export function ForParents() {
  return (
    <section className="mx-auto mt-3 max-w-[1280px] px-3.5 lg:my-4 lg:px-14">
      <div className="grid gap-[22px] rounded-[32px] bg-mint p-5 text-mint-ink lg:grid-cols-2 lg:gap-12 lg:rounded-[40px] lg:p-11">
        <div>
          <Pill tone="outline" icon="heart" className="text-[13px] text-mint-ink">For parents and guardians</Pill>
          <H className="mt-4 text-[29px] lg:text-[40px]">Parents are not handing their children to strangers.</H>
          <H as="p" className="mt-1 text-[29px] text-forest lg:text-[40px]">They are building a village around them.</H>
          <div className="mt-[18px] flex flex-col gap-3 lg:mt-[26px] lg:gap-4">
            {PARENT_POINTS.map(([t, s]) => (
              <div key={t} className="flex items-start gap-3 text-[16px] leading-[1.4]"><CheckDot className="mt-px" /><div><b>{t}</b><p className="mt-0.5 text-[14.5px] opacity-[.88] max-lg:hidden">{s}</p></div></div>
            ))}
          </div>
          <Link href="/register?role=guardian" className="dc-btn dc-btn-forest mt-7 h-[54px] max-lg:w-full">Set up as guardian</Link>
        </div>
        <div className="flex flex-col gap-4">
          <ApprovalSample compact className="rounded-[28px] p-[18px] text-ink shadow-[0_18px_40px_rgba(30,70,50,.14)] lg:rotate-[1.2deg] lg:p-6" header={<Pill tone="butter" icon="alert" className="text-caption">Needs your approval</Pill>} />
          <div className="dc-card rounded-[22px] p-[18px] text-ink max-lg:hidden">
            <p className="text-eyebrow font-extrabold text-stone">WHAT YOU SEE AS A GUARDIAN</p>
            {["Submitted 28 Sep", "Read by the village team: summary written, no names", "A mentor stepped forward: nobody was assigned"].map((t) => <p key={t} className="mt-2.5 flex items-center gap-2.5 text-[14px] font-semibold"><CheckDot size={20} />{t}</p>)}
            <p className="mt-2.5 flex items-center gap-2.5 text-[14px] font-extrabold"><span className="flex size-5 items-center justify-center rounded-full bg-butter text-[12px] text-butter-ink">4</span>Time booked: Thursday 29 October, 6:00 pm WAT</p>
          </div>
        </div>
      </div>
    </section>
  );
}

const PERKS: [IconName, string, string][] = [
  ["clock", "One hour, once a month", "Fit it around your week. Twelve hours a year."],
  ["heart", "Real thanks", "Notes from young people, read by the team first."],
  ["shieldCheck", "A safe set-up", "Verified, supported and never alone with a young person."],
  ["users", "A village of peers", "Meet other mentors at live events."],
  ["clipboard", "No pressure to be perfect", "Short guides and orientation before your first call."],
  ["globe", "Give from anywhere", "Meet on the platform from Ibadan, Lagos, or abroad."],
];
export function ForMentors() {
  return (
    <section className="mx-auto mt-3 max-w-[1280px] px-3.5 lg:mb-4 lg:mt-10 lg:px-14">
      <div className="grid gap-5 rounded-[32px] bg-blush p-5 text-blush-ink lg:grid-cols-2 lg:gap-11 lg:rounded-[40px] lg:p-12">
        <div>
          <Pill tone="outline" icon="sparkle" className="text-[13px] text-blush-ink">Become a mentor</Pill>
          <H className="mt-4 text-[29px] lg:text-[40px]">You have walked a road. Someone is about to start it.</H>
          <p className="mt-3 text-[17px] leading-normal">A grand title is not required. Willingness is. Give one hour a month and see what it does for a young person.</p>
          <Link href="/become-a-mentor" className="dc-btn dc-btn-forest mt-6 h-[54px] max-lg:w-full">Apply to mentor</Link>
        </div>
        <div className="grid gap-3.5 lg:grid-cols-2 lg:gap-5">
          {PERKS.map(([icon, t, s], i) => (
            <div key={t} className={cn("flex items-start gap-3", i > 3 && "max-lg:hidden")}>
              <IconTile icon={icon} tone="blush" white size={44} iconSize={22} radius={14} />
              <div><p className="text-[16px] font-extrabold">{t}</p><p className="mt-0.5 text-[14px] opacity-90">{s}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const outline = "dc-btn h-[54px] border-white/45 text-white hover:bg-white/10 lg:h-[60px] lg:px-6";
  return (
    <section className="mx-auto mb-5 mt-3 max-w-[1280px] px-3.5 lg:mb-12 lg:mt-6 lg:px-14">
      <div className="relative overflow-hidden rounded-[32px] bg-[#1D1914] px-5 py-7 lg:rounded-[44px] lg:p-14">
        <div className="absolute -right-[60px] -top-[60px] size-[220px] rounded-full bg-[rgba(74,126,98,.45)]" aria-hidden="true" />
        <div className="absolute -bottom-[70px] -left-[50px] size-[200px] rotate-[18deg] rounded-[60px] bg-[rgba(168,71,43,.25)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-5 flex justify-center" aria-hidden="true"><RingAvatar initials="KM" tone="butter" size={56} /><RingAvatar initials="TA" tone="mint" size={56} className="-ml-3.5" /><RingAvatar initials="IB" tone="blush" size={56} className="-ml-3.5" /></div>
          <H className="mx-auto max-w-[820px] text-center text-[36px] text-white [text-wrap:balance] lg:text-[58px]">Your question already has a village waiting for it.</H>
          <p className="mt-4 text-center text-[16px] leading-normal text-white/85 lg:text-[19px]">Free, private and safe. Under 18? Join with a parent or guardian.</p>
          <div className="mt-[26px] flex flex-col gap-2.5 lg:mt-[30px] lg:flex-row lg:justify-center lg:gap-3">
            <Link href="/register" className="dc-btn dc-btn-primary h-[58px] lg:h-[60px]"><Icon name="arrowRight" size={18} />Start an Ask</Link>
            <Link href="/become-a-mentor" className={outline}>Apply to mentor</Link>
            <Link href="/register?role=guardian" className={outline}>Set up as guardian</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
