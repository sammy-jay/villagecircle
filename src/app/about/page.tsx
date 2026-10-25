import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { CtaBand, Gutter, H, Hero, NumberDot, RingAvatar, StatCard, TONE, cycle, type Tone } from "@/components/public/kit";
import { cn } from "@/lib/cn";

export const metadata = { title: "About us" };

const BELIEFS: { title: string; body: string; phone?: string }[] = [
  { title: "Experience is a gift", body: "Mentors are doctors, teachers, founders and tradespeople. A grand title is not required. Willingness is." },
  { title: "Safety comes first", body: "Every question is read by a person. Young people are only ever introduced with a guardian's say-so, at every step.", phone: "Every question is read by a person. Young people are only introduced with a guardian's say-so." },
  { title: "Gratitude is the reward", body: "No star ratings and no leaderboards. We count hours given, and we say thank you." },
];
const OTHERS = ["Message strangers directly", "Phone numbers and emails swapped", "Software matches you", "Stars and leaderboards"];
const OURS = ["Nobody can contact anyone directly", "Nothing like that is ever exchanged", "A team member reads every Ask and every application", "Hours given, and a thank you"];
const PEOPLE: { initials: string; tone: Tone; name: string; role: string }[] = [
  { initials: "MR", tone: "blush", name: "Maya R.", role: "Program lead" },
  { initials: "SL", tone: "mint", name: "Safeguarding lead", role: "Reviews every concern" },
  { initials: "TR", tone: "butter", name: "Team reviewers", role: "Read every Ask" },
];

/** HP1 About. */
export default function About() {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className="flex flex-col gap-4 lg:gap-0">
          <Hero eyebrow="About us" title="A village is how young people have always grown up." size={[40, 66]}
            sub="The Village Circle connects people who have walked a road with people about to start it. One hour at a time, with a team reading every question and a guardian beside every young person."
            aside={
              <div className="flex gap-2.5 lg:w-[330px] lg:flex-none lg:flex-col lg:gap-3.5">
                <StatCard tone="butter" icon="clock" value="1" label="hour at a time" className="flex-1 max-lg:[&>span]:hidden" />
                <StatCard tone="mint" icon="eye" value="Every" label="Ask read by a person" className="flex-1 max-lg:hidden" />
                <StatCard tone="blush" icon="lock" value="0" label="private messages" className="flex-1 max-lg:[&>span]:hidden" />
              </div>
            } />

          <section className="flex flex-col gap-4 lg:gap-5 lg:pt-7">
            <H className="text-[26px] lg:text-[40px]">What we believe</H>
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-[18px]">
              {BELIEFS.map((b, i) => {
                const t = TONE[cycle(i)];
                return (
                  <div key={b.title} className={cn("flex flex-1 gap-3.5 rounded-[26px] p-5 lg:flex-col lg:gap-0 lg:rounded-[30px] lg:p-7", t.bg, t.ink)}>
                    <NumberDot n={i + 1} size={40} className="bg-card lg:hidden" />
                    <NumberDot n={i + 1} size={44} className="bg-card max-lg:hidden" />
                    <div className="min-w-0 flex-1">
                      <H as="h3" className="text-[20px] lg:mt-[18px] lg:text-[27px]">{b.title}</H>
                      <p className="mt-1.5 text-[14.5px] leading-normal opacity-90 lg:mt-2 lg:text-[16px]">
                        {b.phone ? <><span className="lg:hidden">{b.phone}</span><span className="max-lg:hidden">{b.body}</span></> : b.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-4 lg:pt-14">
            <H className="text-[26px] lg:text-[40px]">How we are different</H>
            <div className="dc-card p-5 text-[15.5px] leading-[1.55] text-bark lg:hidden">
              <p>Most mentoring sites let you message strangers. We do not. Nobody can contact anyone directly, and no phone numbers or emails are ever exchanged. Every connection runs through us.</p>
              <p className="mt-6">We are small on purpose. A team member reads every Ask and every application. That is slower than software, and it is the point.</p>
            </div>
            <p className="max-w-[760px] text-[18px] leading-normal text-bark max-lg:hidden">Most mentoring sites let you message strangers. We do not. Every connection runs through us. We are small on purpose, and that is slower than software. It is the point.</p>
            <div className="flex gap-6 max-lg:hidden">
              <div className="dc-card flex-1 p-7">
                <p className="text-[13px] font-bold text-bark">MOST MENTORING SITES</p>
                <ul>{OTHERS.map((o) => <li key={o} className="flex items-center gap-3 border-t border-line py-3.5 text-[16px] text-stone first:mt-0"><Icon name="x" size={18} />{o}</li>)}</ul>
              </div>
              <div className="flex-1 rounded-card border-2 border-forest bg-card p-7">
                <p className="text-[13px] font-bold text-forest">THE VILLAGE CIRCLE</p>
                <ul>{OURS.map((o) => <li key={o} className="flex items-center gap-3 border-t border-line py-3.5 text-[16px] font-bold"><Icon name="check" size={18} strokeWidth={3} className="text-forest" />{o}</li>)}</ul>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 lg:gap-5 lg:pb-10 lg:pt-14">
            <H className="text-[26px] lg:text-[40px]">The people behind it</H>
            <div className="dc-card px-5 py-0.5 lg:hidden">
              {PEOPLE.map((p, i) => (
                <div key={p.name} className={cn("flex items-center gap-3.5 py-3", i > 0 && "border-t border-line")}>
                  <RingAvatar initials={p.initials} tone={p.tone} size={52} />
                  <div><p className="text-[16px] font-extrabold">{p.name}</p><p className="text-[13.5px] text-stone">{p.role}</p></div>
                </div>
              ))}
            </div>
            <div className="flex gap-[18px] max-lg:hidden">
              {PEOPLE.map((p) => (
                <div key={p.name} className="dc-card flex flex-1 items-center gap-4 p-6">
                  <RingAvatar initials={p.initials} tone={p.tone} size={64} />
                  <div><p className="font-display text-[22px] font-extrabold">{p.name}</p><p className="mt-0.5 text-[15px] text-stone">{p.role}</p></div>
                </div>
              ))}
            </div>
          </section>

          <CtaBand tone="butter" title="Ready to ask, or to give an hour?" sub="Join free in two minutes. Under 18s join with a parent or guardian.">
            <Link href="/register" className="dc-btn dc-btn-primary h-[54px] lg:h-14"><Icon name="arrowRight" size={18} />Start an Ask</Link>
            <Link href="/become-a-mentor" className="dc-btn dc-btn-outline h-[50px] lg:h-14">Apply to mentor</Link>
          </CtaBand>
        </Gutter>
      </main>
      <PublicFooter />
    </>
  );
}
