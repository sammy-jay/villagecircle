"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { CONTINUE_AT, PROMPTS, completeness, promptDone } from "@/lib/domain/ask-answers";
import { resubmitAction, type AskFormState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

const TIPS = [
  "Try adding what you already know and what is worrying you. For example: which part of the road feels unclear?",
  "Say your class, what you enjoy, and anything you have already tried.",
  "Name one or two things you hope to leave the conversation with.",
];

/** EX5: the team returned the Ask. Thin answers are marked; small edits go straight back to the team. */
export function ReturnedForm({ askId, a, title }: { askId: string; a: { q1: string; q2: string; q3: string }; title: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(resubmitAction, {});
  const [v, setV] = useState(a);
  const pct = completeness(v, true);
  const ready = pct >= CONTINUE_AT;
  const meter = (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-card p-5">
      <div className="flex items-baseline justify-between"><p className="font-display text-[17px] font-extrabold">Completeness</p><span className="font-display text-[22px] font-extrabold">{pct}%</span></div>
      <div className="relative h-3 rounded-[12px] bg-sand">
        <div className={cn("h-full rounded-[inherit]", ready ? "bg-forest" : "bg-gold")} style={{ width: `${pct}%` }} />
        <span className="absolute -top-[5px] h-[22px] w-[3px] rounded-sm bg-ink" style={{ left: `${CONTINUE_AT}%` }} aria-hidden="true" />
      </div>
      <div className="flex justify-between text-[12.5px] text-stone"><span>Reach the line at {CONTINUE_AT}%.</span><span className="font-bold text-ink">{CONTINUE_AT}% line</span></div>
    </div>
  );
  return (
    <form id="returned" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="askId" value={askId} />
      <div className="lg:hidden">{meter}</div>
      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <div className="flex items-center justify-between gap-3 max-lg:hidden">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{title}</h2>
          <span className="rounded-full bg-butter px-[13px] py-[7px] text-[12.5px] font-semibold text-butter-ink">Needs your update</span>
        </div>
        {PROMPTS.map((p, i) => {
          const thin = !promptDone(v[p.key]);
          return (
            <div key={p.key} className="flex flex-col gap-[7px]">
              <label htmlFor={`r-${p.key}`} className="flex items-center justify-between gap-2 text-[15px] font-extrabold">
                {`${i + 1}. ${p.short}`}
                {thin ? <span className="flex size-[26px] items-center justify-center rounded-full bg-clay font-display text-[15px] text-clay-ink">!</span> : <span className="flex size-[26px] items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={15} strokeWidth={3} /></span>}
              </label>
              <textarea id={`r-${p.key}`} name={p.key} value={v[p.key]} maxLength={1500} rows={3} onChange={(e) => setV({ ...v, [p.key]: e.target.value })}
                className={cn("min-h-[70px] w-full rounded-field border-2 bg-card px-3.5 py-3 text-[15.5px] leading-normal focus:border-ink focus:outline-none", thin ? "border-clay" : "border-line")} />
              {thin && <div className="flex gap-2 rounded-saymore bg-blush px-3 py-2.5 text-[13.5px] leading-[1.4] text-blush-ink"><Icon name="pencil" size={17} className="shrink-0" /><p>{TIPS[i]}</p></div>}
            </div>
          );
        })}
      </section>
      <div className="max-lg:hidden">{meter}</div>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      {state.savedAt && <p role="status" className="text-[13.5px] text-stone">Saved. It is waiting for you.</p>}
      <div className="flex items-center justify-between pb-7 max-lg:hidden">
        <button type="submit" name="intent" value="save" className="dc-btn dc-btn-soft h-[52px]">Save for later</button>
        <div className="flex items-center gap-3">
          {!ready && <span className="text-[13.5px] text-stone">Reach the {CONTINUE_AT}% line to send it back</span>}
          <SubmitButton icon="send" disabled={!ready} className="h-[52px]" pendingText="Sending…">Update my Ask</SubmitButton>
        </div>
      </div>
      <PhoneBar>
        {!ready && <p className="mb-2 text-center text-[13px] text-stone">Reach the {CONTINUE_AT}% line to send it back</p>}
        <SubmitButton form="returned" icon="send" disabled={!ready} className="h-14 w-full" pendingText="Sending…">Update my Ask</SubmitButton>
        <button type="submit" form="returned" name="intent" value="save" className="mt-2 w-full text-center text-[14.5px] font-bold">Save for later</button>
      </PhoneBar>
    </form>
  );
}
