import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { Pill } from "@/components/app/feed";
import { ageLabel } from "../../mentor-kit";

/** D6 / EX13 / D27: the Ask as the team wrote it for mentors. No name, school, place or contact details (BR-09). */
export function AskHero({ s, minor, guardianAttends, back = "/mentor", backLabel = "Back to inbox" }: {
  s: { topic: string; question: string; ageBand: string; sessionLength: number }; minor: boolean; guardianAttends: boolean; back?: string; backLabel?: string;
}) {
  return (
    <>
      <Link href={back} className="inline-flex items-center gap-1.5 self-start text-[14.5px] font-bold max-lg:hidden"><Icon name="chevronLeft" size={17} />{backLabel}</Link>
      <section className="rounded-[28px] bg-blush p-6 text-blush-ink lg:px-8 lg:py-7">
        <div className="flex items-center gap-3">
          <span className="flex size-[52px] items-center justify-center rounded-full border-[3px] border-gold bg-card font-display text-[17px] font-bold text-ink" aria-hidden="true">{s.topic[0]}</span>
          <p className="leading-tight"><b className="block text-[16px]">{minor ? "A young person" : "A participant"}</b><span className="text-[13.5px]">{ageLabel(s.ageBand)}</span></p>
        </div>
        <h1 className="mt-4 font-display text-[28px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[36px]">{s.question}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill className="bg-card/70">{s.topic}</Pill>
          <Pill icon="clock" className="bg-card/70">{s.sessionLength} minutes</Pill>
          {minor && <Pill icon="shieldCheck" className="bg-card/70">{guardianAttends ? "Guardian will attend" : "Guardian approves"}</Pill>}
        </div>
      </section>
    </>
  );
}
