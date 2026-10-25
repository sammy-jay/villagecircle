import { PublicHeader } from "@/components/public/header";
import { PublicFooter } from "@/components/public/footer";
import { cn } from "@/lib/cn";
import { RecommendForm } from "./recommend-form";

export const metadata = { title: "Recommend a young person" };

const STEPS: [string, string, string, string][] = [
  ["You tell us who", "Their first name and a parent or guardian email. That is all we ask.", "First name and a guardian email.", "bg-butter text-butter-ink"],
  ["We email the guardian only", "A link to start. We never contact the young person first.", "We never contact the young person first.", "bg-mint text-mint-ink"],
  ["The family decides", "Nothing happens until the guardian chooses to begin.", "", "bg-blush text-blush-ink"],
];

/** P01 Recommend a young person (also covers M18, the trusted-adult version of the same form). Open to anyone, no account needed. */
export default function Recommend() {
  return (
    <>
      <PublicHeader />
      <main id="main" className="flex flex-col gap-3.5 px-4 pb-[18px] pt-5 lg:flex-row lg:items-start lg:justify-center lg:gap-16 lg:px-20 lg:pb-16 lg:pt-11">
        <div className="flex flex-col gap-3.5 lg:w-[440px] lg:flex-none lg:gap-[18px] lg:pt-1.5">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay max-lg:hidden">FOR TEACHERS, COACHES AND COMMUNITY LEADERS</p>
          <h1 className="font-display text-[31px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[54px]">Recommend a young person</h1>
          <p className="text-[15px] leading-normal text-bark lg:text-[17px]">Teachers, counsellors, coaches and community leaders can point a young person to the village. The next step always belongs to their family.</p>
          {STEPS.map(([t, s, phone, tone], i) => (
            <div key={t} className={cn("flex items-start gap-3.5 rounded-[22px] px-[18px] py-4", tone, !phone && "max-lg:hidden")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-card font-display text-[20px] font-extrabold">{i + 1}</span>
              <div>
                <p className="font-display text-[18px] font-extrabold leading-[1.15]">{t}</p>
                <p className="mt-[3px] text-[14px] leading-[1.45] opacity-90"><span className="lg:hidden">{phone}</span><span className="max-lg:hidden">{s}</span></p>
              </div>
            </div>
          ))}
          <p className="text-[12.5px] leading-[1.4] text-stone max-lg:hidden">First names and age bands only. The team reads everything before it is seen.</p>
        </div>
        <div className="lg:w-[600px] lg:flex-none"><RecommendForm /></div>
      </main>
      <div className="max-lg:hidden"><PublicFooter /></div>
    </>
  );
}
