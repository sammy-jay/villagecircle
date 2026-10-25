"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { newTimesAction, pickTimeAction, type AskFormState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

export type Day = { key: string; wd: string; d: string; mon: string; times: { iso: string; label: string; long: string }[] };
const WHY = ["School or lessons at those times", "Exams that week", "Family plans", "I would rather a weekend", "Something else"].map((x) => ({ value: x, label: x }));

/** D14: day columns of offered times (rows on the phone), confirm, or ask the mentor for new times. */
export function TimePicker({ askId, days, guardian, mentor }: { askId: string; days: Day[]; guardian: string | null; mentor: string }) {
  const [pick, setPick] = useState<{ iso: string; long: string } | null>(null);
  const [state, action] = useFormState<AskFormState, FormData>(pickTimeAction, {});
  const [ns, nsAction] = useFormState<AskFormState, FormData>(newTimesAction, {});
  const short = pick ? pick.long.replace(/^(\w+day) (\d+) (\w+)/, (_, w: string, d: string, m: string) => `${w.slice(0, 3)} ${d} ${m.slice(0, 3)}`) : "";
  const confirm = pick ? `Confirm ${short}` : "Pick a time";

  return (
    <div className="flex flex-col gap-4 lg:gap-[18px]">
      <form id="pick" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
        <input type="hidden" name="askId" value={askId} />
        <input type="hidden" name="time" value={pick?.iso ?? ""} />
        <div role="radiogroup" aria-label="Offered times" className="flex flex-col gap-2.5 lg:grid lg:grid-cols-5 lg:gap-2.5">
          {days.map((d) => (
            <div key={d.key} className="flex items-center gap-3 rounded-card border border-line bg-card p-3 lg:flex-col lg:items-stretch lg:gap-2 lg:p-3">
              <div className="w-12 shrink-0 text-center lg:w-auto">
                <p className="text-[11px] font-extrabold tracking-[.06em] text-stone">{d.wd}</p>
                <p className="font-display text-[24px] font-extrabold leading-none">{d.d}</p>
                <p className="text-[12px] text-stone max-lg:hidden">{d.mon}</p>
              </div>
              <div className="flex flex-1 flex-wrap gap-2 lg:flex-col">
                {d.times.length ? d.times.map((t) => {
                  const on = pick?.iso === t.iso;
                  return (
                    <button key={t.iso} type="button" role="radio" aria-checked={on} onClick={() => setPick({ iso: t.iso, long: t.long })}
                      className={cn("h-11 rounded-full px-4 text-[14.5px] font-bold lg:px-2", on ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>{t.label}</button>
                  );
                }) : <p className="py-2 text-[13px] text-stone lg:text-center">No times</p>}
              </div>
            </div>
          ))}
        </div>
        {pick && (
          <div role="status" className="flex gap-3 rounded-[20px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink">
            <Icon name="check" size={22} className="shrink-0" />
            <p>You picked <b>{pick.long}</b>. {guardian ? <><b>{guardian} will get a message to approve.</b> The call only goes ahead once they say yes. You will hear back within a day.</> : "We will book it and send you the link."}</p>
          </div>
        )}
        {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      </form>

      <form action={nsAction} className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <input type="hidden" name="askId" value={askId} />
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">None of these work?</h2>
        {ns.ok ? <p role="status" className="text-[14.5px] text-bark">Done. The team has asked {mentor} for new times. We will tell you when they arrive.</p> : (
          <>
            <p className="text-[14.5px] leading-normal text-bark">No problem. Tell us why and the team will ask {mentor} for new times. Nothing counts against you.</p>
            <FieldWrap label="What is in the way?" htmlFor="nt-why" hint={`Only used to plan better times. ${mentor} does not see it.`}>
              <SelectField id="nt-why" name="why" options={WHY} placeholder="Choose one (optional)" sayMore={{ name: "more", show: "always" }} />
            </FieldWrap>
            {ns.error && <p role="alert" className="text-[14px] font-semibold text-clay">{ns.error}</p>}
            <SubmitButton variant="ghost" className="h-[46px] self-start" pendingText="Asking…">Ask for new times</SubmitButton>
          </>
        )}
      </form>

      <div className="flex items-center justify-between pb-7 max-lg:hidden">
        <Link href={`/asks/${askId}`} className="dc-btn dc-btn-soft h-[52px]"><Icon name="chevronLeft" size={18} />Back to my Ask</Link>
        <SubmitButton form="pick" icon="check" disabled={!pick} className="h-[52px]" pendingText="Confirming…">{confirm}</SubmitButton>
      </div>
      <PhoneBar><SubmitButton form="pick" icon="check" disabled={!pick} className="h-14 w-full" pendingText="Confirming…">{confirm}</SubmitButton></PhoneBar>
    </div>
  );
}
