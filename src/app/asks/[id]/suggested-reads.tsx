import Link from "next/link";
import { Icon, type IconName } from "@/components/dc/icons";
import { PASTEL } from "@/components/app/feed";
import { cn } from "@/lib/cn";

type Read = { id: string; title: string; type: string; reviewed: Date | null };
const TONES = ["butter", "mint", "blush"] as const;
const isWatch = (t: string) => t === "VIDEO" || t === "EVENT_RECORDING";
const iconOf = (t: string): IconName => (isWatch(t) ? "play" : t === "TEMPLATE" ? "doc" : "book");
const kind = (t: string) => (isWatch(t) ? "Watch" : t === "TEMPLATE" ? "Template" : "Read");
const mins = (t: string) => (isWatch(t) ? "About 10 min" : t === "TEMPLATE" ? "Fill in before the call" : "About 5 min");

/**
 * D11 Suggested reads, on the Ask page. "booked": a call is booked, so these help you get more from it.
 * "urgent": the Ask needs an answer within a week, so a few reads help in the meantime. The call always stays the main thing.
 */
export function SuggestedReads({ mode, mentor, reads }: { mode: "booked" | "urgent"; mentor: string; reads: Read[] }) {
  const booked = mode === "booked";
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6" aria-labelledby="reads-h">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", booked ? PASTEL.mint.both : PASTEL.butter.both)}><Icon name={booked ? "book" : "clock"} size={22} /></span>
        <div className="min-w-0">
          <p className="text-[12px] font-extrabold tracking-[.05em] text-clay">{booked ? "OPTIONAL · BEFORE YOUR CALL" : "OPTIONAL · WHILE YOU WAIT"}</p>
          <h2 id="reads-h" className="mt-0.5 font-display text-[20px] font-extrabold leading-[1.15] tracking-[-.01em] lg:text-[22px]">{booked ? `Get more from your time with ${mentor}` : "Something to look at in the meantime"}</h2>
          <p className="mt-1 text-[14px] leading-normal text-bark">{booked ? "Picked for your topic. A quick look can help you decide what to ask first. Your call is still on, whatever you read." : "You said this is urgent, so here is a head start. Keep your Ask open: we are still finding you a mentor."}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2.5">
        {reads.map((x, i) => (
          <li key={x.id}>
            <Link href={`/village/library/${x.id}`} target="_blank" className="group flex items-center gap-3.5 rounded-field border-2 border-line p-3 hover:border-ink">
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[13px]", PASTEL[TONES[i % 3]!].both)}><Icon name={iconOf(x.type)} size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[16px] font-extrabold leading-[1.2]">{x.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-stone">{kind(x.type)} · {mins(x.type)}</span>
              </span>
              <Icon name="arrowRight" size={18} className="shrink-0 text-stone group-hover:text-ink" />
              <span className="sr-only"> (opens in a new tab)</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/village/library" className="self-start text-[14px] font-bold text-clay">More in the library</Link>
    </section>
  );
}
