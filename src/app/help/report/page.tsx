import { PublicFooter } from "@/components/public/footer";
import { ReportArea } from "@/components/public/forms";
import { PublicHeader } from "@/components/public/header";
import { Eyebrow, Gutter, H, NumberDot, OTag } from "@/components/public/kit";

export const metadata = { title: "Report a concern" };

const STEPS: [string, string][] = [
  ["The connection pauses", "Straight away. Nobody is contacted on your behalf."],
  ["Our safeguarding lead is told", "By email and SMS, any time of day."],
  ["The record is kept safe", "Messages and recordings are preserved."],
  ["We resolve it within 48 hours", "You are told what we found and what we did."],
];

/** HP4 How to report. Stays reachable during maintenance. */
export default function Report({ searchParams }: { searchParams: { ask?: string } }) {
  const steps = (
    <section className="rounded-[26px] bg-mint p-[22px] text-mint-ink lg:rounded-[30px] lg:p-[30px]">
      <H className="text-[22px] lg:text-[28px]">What happens when you report</H>
      <ol className="mt-4 flex flex-col gap-4 lg:mt-5">
        {STEPS.map(([t, s], i) => (
          <li key={t} className="flex items-start gap-3.5">
            <NumberDot n={i + 1} size={36} className="bg-card text-[16px]" />
            <div className="min-w-0"><p className="text-[16.5px] font-extrabold">{t}</p><p className="mt-0.5 text-[14px] leading-[1.4] opacity-85">{s}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
  return (
    <>
      <PublicHeader />
      <main id="main">
        <Gutter className="flex flex-col gap-4 lg:gap-0">
          <section className="pt-3 lg:pb-7 lg:pt-16">
            <Eyebrow className="max-lg:hidden">Report a concern</Eyebrow>
            <OTag icon="lock" className="text-mint-ink lg:hidden">Private</OTag>
            <h1 className="mt-3 font-display text-[38px] font-extrabold leading-[1.12] tracking-[-.02em] lg:max-w-[1060px] lg:text-[60px] lg:leading-[1.02] lg:tracking-[-.025em]">Report a concern. It takes one step.</h1>
            <p className="mt-2.5 text-[16px] leading-normal text-bark lg:mt-4 lg:max-w-[700px] lg:text-[19px]">If anything about a conversation or a person makes you uneasy, tell us. You do not need to be sure.</p>
          </section>
          <div className="lg:pt-4"><ReportArea steps={steps} askId={searchParams.ask} /></div>
        </Gutter>
      </main>
      <PublicFooter />
      <div className="h-[110px] lg:hidden" aria-hidden="true" />
    </>
  );
}
