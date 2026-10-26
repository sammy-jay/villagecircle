import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { PublicFooter } from "@/components/public/footer";
import { PublicHeader } from "@/components/public/header";
import { ApprovalSample, CheckList, CtaBand, Gutter, H, NumberDot, OTag, PhoneActionBar, PAGE_STACK, SECTION_STACK } from "@/components/public/kit";
import { cn } from "@/lib/cn";

export const metadata = { title: "For families" };

const GUARDIAN = "/register?role=guardian";
const DECIDE: [string, string][] = [
  ["Each Ask", "You authorize every question your child sends, one by one."],
  ["Each mentor", "You see who they are and approve the specific person."],
  ["Each time", "You approve when it happens, and you may attend."],
];
const SAFE = [
  "Mentors are verified, screened and oriented before any Ask reaches them",
  "Conversations with under-18s are recorded, and you can ask for the recording",
  "No phone numbers or emails are ever exchanged",
  "Report a concern in one tap, and a safeguarding lead is told",
];

/** HP10 For families. */
export default function Families() {
  const sample = (
    <ApprovalSample className="p-6" header={
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink">AO</span>
        <span className="text-[13px] text-stone">What a guardian sees</span>
      </div>
    } />
  );
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className={PAGE_STACK}>
          <section className="flex items-center gap-12 pt-8 lg:pt-14">
            <div className="flex-1">
              <OTag icon="heart" className="text-mint-ink">For families</OTag>
              <h1 className="mt-3 font-display text-[38px] font-extrabold leading-[1.12] tracking-[-.02em] lg:mt-4 lg:text-[64px] lg:leading-[1.02] lg:tracking-[-.025em]">You are not handing your child to strangers.</h1>
              <p className="mt-2.5 max-w-[560px] text-[16.5px] leading-relaxed text-bark lg:mt-[18px] lg:text-[20px]">You are building a village around them. You stay in charge at every step.</p>
              <div className="mt-7 flex gap-3 max-lg:hidden">
                <Link href={GUARDIAN} className="dc-btn dc-btn-primary h-[58px]"><Icon name="arrowRight" size={18} />Set up as a guardian</Link>
                <Link href="/policies/family-guidelines" className="dc-btn dc-btn-soft h-[58px]">Read the family guidelines</Link>
              </div>
            </div>
            <div className="w-[470px] flex-none max-lg:hidden">{sample}</div>
          </section>

          <section className={SECTION_STACK}>
            <H className="text-[26px] lg:text-[40px]">Where you decide</H>
            <div className="dc-card px-5 py-0.5 lg:hidden">
              {DECIDE.map(([t, s], i) => (
                <div key={t} className={cn("flex items-start gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
                  <NumberDot n={i + 1} size={40} className="bg-mint text-mint-ink" />
                  <div className="flex-1"><p className="font-display text-[20px] font-extrabold">{t}</p><p className="mt-0.5 text-[14.5px] leading-normal text-bark">{s}</p></div>
                </div>
              ))}
            </div>
            <div className="flex gap-[18px] max-lg:hidden">
              {DECIDE.map(([t, s], i) => (
                <div key={t} className="dc-card flex-1 p-7">
                  <NumberDot n={i + 1} size={44} className="bg-mint text-mint-ink" />
                  <H as="h3" className="mt-4 text-[26px]">{t}</H>
                  <p className="mt-2 text-[16px] leading-normal text-bark">{s}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="lg:hidden">{sample}</div>

          <section className="flex flex-col gap-4 rounded-[30px] bg-mint p-6 text-mint-ink lg:flex-row lg:items-center lg:gap-11 lg:rounded-[36px] lg:p-11">
            <div className="lg:w-[400px] lg:flex-none">
              <Icon name="shieldCheck" size={36} className="lg:hidden" /><Icon name="shieldCheck" size={44} className="max-lg:hidden" />
              <H className="mt-2.5 text-[28px] lg:mt-3.5 lg:text-[40px]">How we keep your child safe</H>
            </div>
            <CheckList className="flex-1 gap-3.5 lg:gap-4" textClass="text-[15px] lg:text-[17px]" items={SAFE} />
          </section>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-7 lg:pt-12">
            <figure className="dc-card flex-1 p-[22px] lg:p-[34px]">
              <OTag className="text-blush-ink">A guardian&apos;s words</OTag>
              <blockquote className="mt-3 font-display text-[26px] font-bold leading-[1.2] lg:mt-4 lg:text-[34px]">&quot;I could see everything. That is why I said yes.&quot;</blockquote>
              <figcaption className="mt-2.5 text-caption leading-[1.4] text-stone lg:mt-3.5 lg:text-[13px]">Guardian in Ibadan. Sample text until a consented quote is ready.</figcaption>
            </figure>
            <div className="flex flex-col gap-4 lg:w-[380px] lg:flex-none lg:gap-[18px]">
              <section className="rounded-card bg-butter p-5 text-butter-ink lg:rounded-[28px] lg:p-6">
                <p className="text-[13px] font-bold">Questions from other guardians</p>
                <H as="h2" className="mt-1 text-[21px] lg:mt-1.5 lg:text-[22px] lg:leading-[1.2]"><span className="max-lg:hidden">&quot;</span>Can I be in the conversation?<span className="max-lg:hidden">&quot;</span></H>
                <p className="mt-1.5 text-[14.5px] leading-normal opacity-90 lg:mt-2 lg:text-[15px]">Yes. You may attend any conversation, and you approve each one first. See the <Link href="/faq" className="underline">FAQ</Link>.</p>
              </section>
              <section className="rounded-card bg-blush p-5 text-blush-ink lg:rounded-[28px] lg:p-6">
                <H as="h2" className="text-[21px] lg:text-[22px]">Withdraw consent at any time</H>
                <p className="mt-1.5 text-[14.5px] leading-normal opacity-90 lg:text-[15px]">One tap pauses the connection and alerts our safeguarding lead.</p>
              </section>
            </div>
          </div>

          <CtaBand tone="butter" className="max-lg:hidden" title="A village for your child starts with your yes." sub="Set up a guardian account first. Your child can join once you have said yes.">
            <Link href={GUARDIAN} className="dc-btn dc-btn-primary h-14"><Icon name="arrowRight" size={18} />Set up as a guardian</Link>
            <Link href="/help#contact" className="dc-btn dc-btn-outline h-14">Talk to the team</Link>
          </CtaBand>
        </Gutter>
      </main>
      <PublicFooter />
      <PhoneActionBar><Link href={GUARDIAN} className="dc-btn dc-btn-primary h-14 w-full"><Icon name="arrowRight" size={18} />Set up as a guardian</Link></PhoneActionBar>
    </>
  );
}
