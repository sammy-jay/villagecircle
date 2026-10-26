import Link from "next/link";
import { Icon, type IconName } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { CheckList, Gutter, H, IconTile, NumberDot, OTag, PhoneActionBar, StepTrail, TONE, PAGE_STACK, SECTION_STACK } from "@/components/public/kit";
import { MIN_AGE } from "@/lib/domain/age";
import { cn } from "@/lib/cn";

export const metadata = { title: "Become a mentor" };

const APPLY = "/register?role=mentor";
const ASKS: { icon: IconName; title: string; body: string }[] = [
  { icon: "user", title: "Tell us about you", body: "A short bio and the areas you know best. A resume or LinkedIn is optional and never counts against you." },
  { icon: "shieldCheck", title: "Sign a safeguarding commitment", body: "A short statement you re-affirm each year, and our code of conduct." },
  { icon: "video", title: "Do a short orientation", body: "About an hour on how to talk with young people and what to avoid." },
  { icon: "clock", title: "Choose your hours", body: "From one hour a month. You decide, and you can pause any time." },
];
const SIGN = [
  "Conversations stay on the platform, at the time the family approved.",
  "I never ask for or give contact details.",
  "I offer shared experience, not licensed professional advice.",
  "I report anything that feels wrong, in one tap.",
];

function Challenge({ className }: { className?: string }) {
  return (
    <section id="challenge" className={cn("dc-card scroll-mt-6 p-6", className)}>
      <H as="h2" className="text-[22px]">One Hour Challenge</H>
      <div className="mt-3.5 flex items-center gap-4">
        <IconTile icon="clock" tone="butter" size={72} iconSize={36} radius={16} />
        <p className="text-[14.5px] leading-[1.45] text-bark"><b className="text-ink">One month given, eleven to go.</b><br />Seen only by you and the team. Never ranked against anyone else.</p>
      </div>
    </section>
  );
}

/** HP9 Become a mentor. */
export default function BecomeAMentor() {
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          <section className="flex flex-col gap-10 rounded-[32px] bg-mint p-6 text-mint-ink max-lg:mt-8 lg:mt-14 lg:flex-row lg:items-center lg:rounded-[40px] lg:p-14">
            <div className="flex-1">
              <OTag icon="heart">Become a mentor</OTag>
              <h1 className="mt-3.5 font-display text-[50px] font-extrabold leading-[.98] tracking-[-.03em] lg:mt-4 lg:text-[84px]">Give an hour.<br />Change a week.</h1>
              <p className="mt-3.5 max-w-[560px] text-[16.5px] leading-normal opacity-90 lg:mt-[18px] lg:text-[20px] lg:opacity-100">You do not need a grand title. You need experience worth sharing and the willingness to share it kindly.</p>
              <div className="mt-5 flex flex-col gap-3 lg:mt-7 lg:flex-row">
                <Link href={APPLY} className="dc-btn dc-btn-primary h-[58px] max-lg:hidden"><Icon name="arrowRight" size={18} />Apply to mentor</Link>
                <Link href="#sign" className="dc-btn dc-btn-outline h-[52px] lg:h-[58px]">What mentors are asked to sign</Link>
              </div>
            </div>
            <Challenge className="w-[330px] flex-none text-ink max-lg:hidden" />
          </section>
          <Challenge className="lg:hidden" />

          <section className={SECTION_STACK}>
            <H className="text-[26px] lg:text-[40px]">What we ask of you</H>
            <div className="flex flex-col gap-4 lg:flex-row">
              {ASKS.map((a, i) => {
                const tone = (["butter", "mint", "blush", "butter"] as const)[i]!;
                return (
                  <div key={a.title} className={cn("flex flex-1 gap-3.5 rounded-[26px] p-5 lg:flex-col lg:gap-0 lg:rounded-[28px] lg:p-[26px]", TONE[tone].bg, TONE[tone].ink)}>
                    <NumberDot n={i + 1} size={40} className="bg-card lg:hidden" />
                    <IconTile icon={a.icon} tone={tone} white size={52} iconSize={26} radius={16} className="max-lg:hidden" />
                    <div className="min-w-0 flex-1">
                      <p className="mt-4 font-display text-[15px] font-extrabold opacity-70 max-lg:hidden">STEP {i + 1}</p>
                      <H as="h3" className="text-[20px] lg:mt-1 lg:text-[24px]">{a.title}</H>
                      <p className="mt-1.5 text-[14.5px] leading-normal opacity-90 lg:mt-2 lg:text-[15px]">{a.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-7 lg:pt-10">
            <section className="dc-card min-w-0 flex-1 p-[22px] lg:p-8">
              <H className="text-[24px] lg:text-[30px]">What happens after you apply</H>
              <div className="mt-[18px] lg:mt-[22px]">
                <StepTrail steps={[
                  { title: "We read your application", sub: "Within 5 business days", state: "done" },
                  { title: "You are welcomed in", sub: "Or we ask one specific question", state: "current" },
                  { title: "You complete orientation", sub: "Within 30 days", state: "next" },
                  { title: "Asks arrive in your inbox", sub: "Never more than your hours", state: "next" },
                ]} />
              </div>
            </section>
            <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
              <section id="sign" className="dc-card scroll-mt-6 p-[26px]">
                <div className="flex items-center gap-2.5"><Icon name="signature" size={22} className="text-forest" /><H className="text-[22px]">What mentors are asked to sign</H></div>
                <CheckList className="mt-4" items={SIGN} />
                <p className="mt-4 border-t border-line pt-3.5 text-[13.5px] leading-normal text-bark">You sign with your full legal name, typed once. The date is added for you.</p>
                <Link href="/policies/code-of-conduct" className="mt-2.5 inline-block text-[14px] font-bold text-clay">Read the full commitment</Link>
              </section>
              <section className="rounded-card bg-butter p-5 text-butter-ink lg:rounded-[28px] lg:p-6">
                <H className="text-[21px] lg:text-[22px]">Working with {MIN_AGE} to 17 year olds</H>
                <p className="mt-1.5 text-[14.5px] leading-normal opacity-90 lg:mt-2 lg:text-[15px]">This is optional. It adds enhanced screening, a guardian who may attend, and recorded conversations. You can decide later.</p>
              </section>
            </div>
          </div>

          <section className="flex items-center gap-[30px] rounded-[36px] bg-blush px-11 py-10 text-blush-ink max-lg:hidden">
            <div className="min-w-0 flex-1">
              <H className="text-[38px] [text-wrap:balance]">One hour a month. Twelve a year.</H>
              <p className="mt-2 text-[16.5px] leading-normal opacity-90">No league tables and no star ratings. Gratitude is the reward.</p>
            </div>
            <Link href={APPLY} className="dc-btn dc-btn-primary h-14"><Icon name="arrowRight" size={18} />Apply to mentor</Link>
            <Link href="/policies/code-of-conduct" className="dc-btn dc-btn-outline h-14">Read the code of conduct</Link>
          </section>
        </Gutter>
      </main>
      <PublicFooter />
      <PhoneActionBar><Link href={APPLY} className="dc-btn dc-btn-primary h-14 w-full"><Icon name="arrowRight" size={18} />Apply to mentor</Link></PhoneActionBar>
    </>
  );
}
