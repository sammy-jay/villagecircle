import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";
import { Icon, type IconName } from "@/components/dc/icons";
import { ApprovalSample, CheckDot, H, IconTile, Pill, RingAvatar, StatCard, TONE, cycle, type Tone } from "./kit";

/* Sections of the landing board (V-Main). Phone gutters here are 18px, as on the board. */

export const HOME_X = "px-[18px] lg:px-14";
/** Space above and below each landing section. Raise or lower it here to change the rhythm of the whole page. */
export const HOME_Y = "py-12 lg:py-24";

/** Row that scrolls sideways on the phone and becomes a grid on desktop. */
export function Rail({ cols, children, className, label }: { cols: 3 | 4 | 5; children: ReactNode; className?: string; label: string }) {
  return (
    <ScrollX label={label} controlsClassName="lg:hidden" className={cn(
      "-mx-[18px] flex snap-x scroll-px-[18px] gap-3 overflow-x-auto px-[18px] py-1.5 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none]",
      "lg:mx-0 lg:grid lg:overflow-visible lg:px-0 lg:py-0 lg:[mask-image:none]",
      cols === 3 && "lg:grid-cols-3", cols === 4 && "lg:grid-cols-4", cols === 5 && "lg:grid-cols-5", className)}>
      {children}
    </ScrollX>
  );
}
const railItem = (w: string) => cn("flex-none snap-start lg:w-auto", w);

export function SectionHead({ eyebrow, title, phoneTitle, sub, phoneSub = true, center, className }: { eyebrow: string; title: string; phoneTitle?: string; sub?: string; phoneSub?: boolean; center?: boolean; className?: string }) {
  return (
    <div className={cn("mb-7 flex flex-col gap-3 lg:mb-12", center && "items-center text-center", className)}>
      <p className="text-[13px] font-extrabold tracking-[.05em] text-clay">{eyebrow}</p>
      <H className="text-[28px] lg:text-[44px]">{phoneTitle ? <><span className="lg:hidden">{phoneTitle}</span><span className="max-lg:hidden">{title}</span></> : title}</H>
      {sub && <p className={cn("mt-1 max-w-[680px] text-[16px] leading-relaxed text-bark lg:text-[18px]", !phoneSub && "max-lg:hidden")}>{sub}</p>}
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
    <section className={cn("mx-auto flex max-w-[1280px] items-center gap-[30px] overflow-hidden pb-10 pt-8 lg:overflow-visible lg:pb-16 lg:pt-14", HOME_X)}>
      <div className="min-w-0 flex-[1_1_560px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill tone="butter" icon="smile" className="text-[13px]">For ages {minAge} and up</Pill>
          <span className="text-[13.5px] font-bold text-clay">Ask the Village</span>
        </div>
        <h1 className="mt-6 font-display text-[60px] font-extrabold leading-[.96] tracking-[-.03em] lg:text-[88px]">Ask the<br />village<span className="text-clay">.</span></h1>
        <p className="mt-5 font-display text-[20px] font-extrabold leading-[1.15] text-forest lg:text-[26px]">Rebuilding the Village.<br />Empowering the Next Generation.</p>
        <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-bark lg:text-[20px]">Ask a question about school, work or life. The village finds someone who has walked that road and is glad to give an hour.</p>
        <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:flex-row">
          <Link href="/register" className="dc-btn dc-btn-primary h-[58px] lg:h-[60px]"><Icon name="arrowRight" size={18} />Start an Ask</Link>
          <Link href="/become-a-mentor" className="dc-btn dc-btn-ghost h-[54px] lg:h-[60px]">I would like to mentor</Link>
        </div>
        <Link href="/families" className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold text-forest"><Icon name="shieldCheck" size={20} />I am a parent or guardian<Icon name="arrowRight" size={16} strokeWidth={2.5} /></Link>

        {/* Phone collage */}
        <div className="relative mt-10 flex flex-col gap-3 pt-2.5 lg:hidden" aria-hidden="true">
          <div className="absolute -left-[30px] top-[30px] size-[230px] rounded-full bg-mint" />
          <div className="absolute -right-5 top-[300px] size-[170px] rounded-full bg-butter" />
          <AskCard className="relative w-[300px] max-w-full -rotate-3" />
          <ThanksMini className="relative -mt-1.5 w-[290px] max-w-full rotate-3 self-end" />
        </div>
      </div>

      {/* Desktop collage: three cards on one shape, kept light so the headline leads. */}
      <div className="relative h-[560px] w-[520px] flex-none max-lg:hidden" aria-hidden="true">
        <div className="absolute left-[30px] top-[50px] h-[460px] w-[440px] rounded-[200px_200px_60px_200px] bg-mint" />
        <AskCard className="absolute left-0 top-5 w-[330px] -rotate-[4deg]" />
        <ThanksMini className="absolute -right-2 top-[200px] w-[300px] rotate-[4deg]" />
        <MentorsMini className="absolute left-0 top-[400px] w-[330px] -rotate-2" />
      </div>
    </section>
  );
}

const TRUST: { icon: IconName; tone: Tone; title: string; sub: string }[] = [
  { icon: "user", tone: "mint", title: "Guardian approved", sub: "Under 18s join with a guardian" },
  { icon: "lock", tone: "blush", title: "No contact details shared", sub: "No numbers, no emails, no DMs" },
  { icon: "video", tone: "butter", title: "Recorded for under 18s", sub: "Guardians can ask to see it" },
];
export function TrustStrip() {
  return (
    <section aria-label="Promises" className={cn("mx-auto grid max-w-[1280px] grid-cols-2 gap-3 py-4 lg:grid-cols-3 lg:gap-4 lg:py-8", HOME_X)}>
      {TRUST.map((t) => (
        <div key={t.title} className={cn("flex flex-col items-start gap-2 rounded-[22px] px-4 py-3.5 max-lg:last:col-span-2 lg:flex-row lg:items-center lg:gap-3", TONE[t.tone].bg, TONE[t.tone].ink)}>
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
    <section id="how" className={cn("mx-auto max-w-[1280px] scroll-mt-20", HOME_Y, HOME_X)}>
      <SectionHead eyebrow="HOW IT WORKS" title="From a question to a conversation in four plain steps" sub="Every Ask shows one plain status and what happens next, so nobody is left wondering." />
      <Rail cols={4} label="step" className="lg:gap-[18px]">
        {STEPS.map((s, i) => (
          <div key={s.title} className={cn(railItem("w-[300px]"), "rounded-[28px] p-[18px]", TONE[s.tone].bg, TONE[s.tone].ink, s.rot)}>
            <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-[22px] bg-white/40 lg:h-[140px]" aria-hidden="true"><Bubbles />{s.art}</div>
            <div className="mt-2.5 flex items-center gap-2.5 lg:mt-3.5">
              <span className="flex size-8 flex-none items-center justify-center rounded-full bg-white font-display text-[15px] font-extrabold">{i + 1}</span>
              <H as="h3" className="text-[21px]">{s.title}</H>
            </div>
            <p className="mt-3 text-[14.5px] leading-relaxed opacity-[.92]">{s.body}</p>
          </div>
        ))}
      </Rail>
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
    <section className={cn("mx-auto max-w-[1280px]", HOME_Y, HOME_X)}>
      <SectionHead eyebrow="WHO IT IS FOR" title="A mentor for every stage of the road" />
      <Rail cols={4} label="stage" className="lg:gap-4">
        {STAGES.map(([icon, age, title, body], i) => {
          const tone = cycle(i);
          return (
            <div key={title} className={cn(railItem("w-[236px]"), "rounded-[26px] p-3.5 lg:p-5", TONE[tone].bg, TONE[tone].ink)}>
              <div className="flex items-center gap-2.5"><IconTile icon={icon} tone={tone} white size={44} iconSize={22} radius={14} /><p className="text-[12px] font-extrabold tracking-[.04em] opacity-80">{i === 0 ? `AGES ${minAge} TO 17` : age}</p></div>
              <H as="h3" className="mt-3 text-[22px]">{title}</H>
              <p className="mt-2 text-[13.5px] leading-relaxed lg:text-[14.5px]">{body}</p>
            </div>
          );
        })}
      </Rail>
      <div className="mt-8 flex flex-wrap gap-3 lg:mt-12">
        <Link href="/families" className="dc-btn dc-btn-soft h-11">For families</Link>
        <Link href="/become-a-mentor" className="dc-btn dc-btn-soft h-11">For mentors</Link>
      </div>
    </section>
  );
}



export type WallCard = { id: string; quote: string; who: string };
export function ThanksWall({ cards }: { cards: WallCard[] }) {
  const rot = ["lg:-rotate-[1.5deg]", "lg:rotate-1", "lg:-rotate-[.8deg]"];
  return (
    <section className="bg-sand">
      <div className={cn("mx-auto max-w-[1280px]", HOME_Y, HOME_X)}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow="THANK-YOU WALL" title="Said by the village" />
          <div className="mb-7 lg:mb-12"><Pill tone="mint" icon="shieldCheck" className="text-[13px]">Reviewed by the team</Pill></div>
        </div>
        <Rail cols={3} label="thank-you" className="lg:gap-[22px] [&>*:nth-child(n+4)]:lg:hidden">
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




const SAFEGUARDS: [IconName, string, string][] = [
  ["user", "Guardian approval", "For under 18s, a guardian approves every Ask, then the mentor, then the time."],
  ["shieldCheck", "Mentor checks", "Identity check, a signed safeguarding commitment and orientation before any match."],
  ["lock", "No off-platform contact", "No DMs. Phone numbers and emails never pass through. Everything stays here."],
  ["flag", "Reporting", "Report a concern from any page. Our safeguarding lead reads every report."],
  ["video", "Recordings for under 18s", "Calls with under 18s are recorded. Guardians can ask to see them any time."],
  ["heart", "Crisis support", "Help is one tap away on every screen, with trusted helplines and a trained person."],
];
export function BuiltForSafety() {
  return (
    <section className="mx-auto my-12 max-w-[1280px] px-3.5 lg:my-24 lg:px-14">
      <div className="rounded-[32px] bg-forest px-5 py-10 text-white lg:rounded-[40px] lg:px-14 lg:py-16">
        <Icon name="shieldCheck" size={46} />
        <H className="mt-3 text-[34px] text-white lg:text-[48px]">Built for safety</H>
        <p className="mt-3 max-w-[640px] text-[16px] leading-relaxed text-white/[.92] lg:text-[18px]">Six safeguards sit behind every single conversation. Nobody has to take our word for it.</p>
        <div className="mt-8 grid gap-5 lg:mt-12 lg:grid-cols-3 lg:gap-5">
          {SAFEGUARDS.map(([icon, t, b]) => (
            <div key={t} className="flex items-start gap-3 lg:block lg:rounded-[26px] lg:border lg:border-white/[.22] lg:bg-white/[.12] lg:p-[22px]">
              <span className="flex size-[42px] flex-none items-center justify-center rounded-[14px] bg-white text-forest lg:size-12 lg:rounded-field"><Icon name={icon} size={22} className="lg:hidden" /><Icon name={icon} size={26} className="max-lg:hidden" /></span>
              <div>
                <H as="h3" className="text-[17px] text-white lg:mt-3.5 lg:text-[20px]">{t}</H>
                <p className="mt-0.5 text-[14px] leading-[1.45] text-white/90 lg:mt-2 lg:text-[14.5px] lg:leading-relaxed">{b}</p>
              </div>
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
    <section className="mx-auto mb-12 mt-6 max-w-[1280px] px-3.5 lg:mb-24 lg:mt-12 lg:px-14">
      <div className="relative overflow-hidden rounded-[32px] bg-[#1D1914] px-5 py-10 lg:rounded-[44px] lg:p-16">
        <div className="absolute -right-[60px] -top-[60px] size-[220px] rounded-full bg-[rgba(74,126,98,.45)]" aria-hidden="true" />
        <div className="absolute -bottom-[70px] -left-[50px] size-[200px] rotate-[18deg] rounded-[60px] bg-[rgba(168,71,43,.25)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-5 flex justify-center" aria-hidden="true"><RingAvatar initials="KM" tone="butter" size={56} /><RingAvatar initials="TA" tone="mint" size={56} className="-ml-3.5" /><RingAvatar initials="IB" tone="blush" size={56} className="-ml-3.5" /></div>
          <H className="mx-auto max-w-[820px] text-center text-[36px] text-white [text-wrap:balance] lg:text-[58px]">Your question already has a village waiting for it.</H>
          <p className="mt-5 text-center text-[16px] leading-relaxed text-white/85 lg:text-[19px]">Private and safe. Under 18? Join with a parent or guardian.</p>
          <div className="mt-8 flex flex-col gap-3 lg:mt-10 lg:flex-row lg:justify-center">
            <Link href="/register" className="dc-btn dc-btn-primary h-[58px] lg:h-[60px]"><Icon name="arrowRight" size={18} />Start an Ask</Link>
            <Link href="/become-a-mentor" className={outline}>Be a Mentor</Link>
            <Link href="/register?role=guardian" className={outline}>Set up as guardian</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
