"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField } from "@/components/forms/fields";
import { ChipRadio, LENGTHS_SHORT, SOON_OPTIONS } from "@/components/app/ask-kit";
import { quickAskAction, type AskFormState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

const MAX = 600;
const HELPERS = ["What I have tried", "What I am deciding between", "My deadline"];

/** D2a Quick Ask. A dialog over Home on desktop, a full screen on the phone. */
export function QuickAsk({ first, minor, topics, initial }: { first: string; minor: boolean; topics: { value: string; label: string }[]; initial?: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(quickAskAction, {});
  const [text, setText] = useState(initial ?? "");
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { box.current?.focus(); document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const add = (h: string) => { const t = `${text.trim()}${text.trim() ? "\n" : ""}${h}: `; setText(t.slice(0, MAX)); box.current?.focus(); };
  const err = (f: string) => (state.field === f ? state.error : undefined);
  const hint = text.trim().length > 40 ? "Good. Specific questions get better matches." : "A sentence or two about what you want to decide or understand.";
  const note = minor
    ? <><b className="font-display text-[17px] font-extrabold lg:font-sans lg:text-[13.5px] lg:font-bold">Your guardian says yes first.</b> The team reads every Ask before mentors see it. They never see your name, school or contact details.</>
    : <><b>The team reads it first.</b> Mentors never see your name, school or contact details.</>;

  return (
    <div className="fixed inset-0 z-50 flex bg-paper lg:items-center lg:justify-center lg:bg-[rgba(20,16,10,.55)]">
      <form id="quick-ask" action={action} role="dialog" aria-modal="true" aria-labelledby="qa-title"
        className="flex w-full flex-col overflow-y-auto bg-paper lg:max-h-[92vh] lg:w-[720px] lg:rounded-[32px] lg:bg-card lg:p-[30px] lg:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        {/* Phone header */}
        <div className="flex h-[60px] shrink-0 items-center gap-2 px-4 lg:hidden">
          <Link href="/home" aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-sand"><Icon name="x" size={20} /></Link>
          <h1 id="qa-title" className="ml-2.5 flex-1 font-display text-[20px] font-extrabold tracking-[-.01em]">New Ask</h1>
          <button type="submit" name="intent" value="save" className="text-[14.5px] font-extrabold text-clay">Save draft</button>
        </div>
        {/* Desktop header */}
        <div className="mb-4 flex items-center justify-between max-lg:hidden">
          <div><p className="font-display text-[28px] font-extrabold leading-[1.12] tracking-[-.01em]">New Ask</p><p className="text-[12.5px] text-stone">Takes about 3 minutes. Nothing is sent until the last step.</p></div>
          <Link href="/home" aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-sand"><Icon name="x" size={20} /></Link>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-[18px] pt-1 lg:gap-0 lg:p-0">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink lg:size-11 lg:text-[16px]">{first.charAt(0)}</span>
            <div><p className="text-[15px] font-bold">Asking as {first}</p><p className="flex items-center gap-[5px] text-[12.5px] text-stone"><Icon name="lock" size={13} />Private. Mentors never see your name.</p></div>
          </div>
          <label htmlFor="qa-q1" className="sr-only">Your question</label>
          <textarea id="qa-q1" ref={box} name="q1" value={text} maxLength={MAX} onChange={(e) => setText(e.target.value)} rows={4} aria-invalid={!!err("q1")}
            placeholder={`What is on your mind, ${first}?`}
            className="min-h-[112px] w-full resize-none bg-transparent font-display text-[25px] font-bold leading-[1.22] tracking-[-.01em] text-ink caret-clay placeholder:text-stone focus:outline-none lg:mt-4 lg:text-[27px] lg:leading-[1.25]" />
          <div className="flex justify-between gap-4 text-[12.5px] text-stone">
            <span className={cn(err("q1") && "font-semibold text-clay")}>{err("q1") ?? <>{hint}<span className="max-lg:hidden"> No phone numbers or handles, please.</span></>}</span>
            <span className="shrink-0">{text.length} / {MAX}</span>
          </div>
          <div className="lg:hidden">
            <p className="text-[13px] font-bold text-bark">Add what helps a mentor help you</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {HELPERS.map((h) => <button key={h} type="button" onClick={() => add(h)} className="inline-flex items-center gap-1.5 rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="plus" size={16} />{h}</button>)}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:mt-3.5 lg:flex-row lg:items-start lg:gap-5">
            <FieldWrap label="Topic" htmlFor="qa-topic" error={err("topic")} hint="We only use this to match you and to count what students ask about." className="min-w-0 flex-1">
              <SelectField id="qa-topic" name="topic" options={topics} placeholder="Pick the closest one" invalid={!!err("topic")} />
            </FieldWrap>
            <FieldWrap label="When do you need it by?" htmlFor="qa-soon" className="lg:hidden">
              <SelectField id="qa-soon" name="soon" options={SOON_OPTIONS} placeholder="No rush" sayMore={{ name: "soonMore", placeholder: "Say more about your deadline (optional)", show: "always" }} />
            </FieldWrap>
            <div className="flex flex-col gap-2 lg:w-[220px] lg:flex-none lg:gap-[7px]">
              <p className="text-[13px] font-bold text-bark"><span className="lg:hidden">How long would you like?</span><span className="max-lg:hidden">Call length</span></p>
              <div className="lg:flex lg:h-[54px] lg:items-center"><ChipRadio name="sessionLength" options={LENGTHS_SHORT} defaultValue="60" /></div>
            </div>
          </div>

          <div className="flex gap-3 rounded-[18px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink lg:mt-4 lg:rounded-[20px] lg:px-4 lg:py-3.5 lg:text-[13.5px]">
            <Icon name="shieldCheck" size={24} className="shrink-0 lg:size-[22px]" /><p>{note}</p>
          </div>
          {state.error && !state.field && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}

          <div className="mt-5 flex items-center justify-between max-lg:hidden">
            <span className="text-[13px] text-stone">Nothing is sent until the last step.</span>
            <div className="flex gap-2.5">
              <button type="submit" name="intent" value="save" className="dc-btn dc-btn-soft h-[50px]">Save draft</button>
              <button type="submit" className="dc-btn dc-btn-primary h-[50px]"><Icon name="arrowRight" size={18} />Continue</button>
            </div>
          </div>
        </div>
        <div className="sticky bottom-0 mt-auto border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">
          <button type="submit" className="dc-btn dc-btn-primary h-14 w-full"><Icon name="arrowRight" size={18} />Continue</button>
        </div>
      </form>
    </div>
  );
}
