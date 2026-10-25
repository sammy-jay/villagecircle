"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Icon, type IconName } from "@/components/dc/icons";
import { CheckRow, FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { ChipRadio, LENGTHS, SOON_OPTIONS } from "@/components/app/ask-kit";
import { CONTINUE_AT, PROMPTS, completeness, promptDone } from "@/lib/domain/ask-answers";
import { sendAction, tellAction, topicAction, type AskFormState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

const TONES = ["bg-butter text-butter-ink", "bg-mint text-mint-ink", "bg-blush text-blush-ink"];
export const STAGES = ["JSS3", "SS1 (Year 10)", "SS2 (Year 11)", "SS3 (Year 12)", "Finished secondary school", "At university", "Graduated", "Working"].map((s) => ({ value: s, label: s }));
export const MENTOR_TYPES = ["A doctor or health worker", "An engineer or scientist", "Someone in business or finance", "A teacher or lecturer", "Someone in tech", "Someone who studied abroad", "No preference"].map((s) => ({ value: s, label: s }));
export const BEST_DAYS = ["Weekday evenings after 5:00 pm", "Weekday afternoons", "Saturdays", "Sundays", "Any time"].map((s) => ({ value: s, label: s }));

/* ───────── D10 Topic ───────── */
export function TopicStep({ askId, topics, more, current }: { askId?: string; topics: { slug: string; name: string; icon: IconName; blurb: string }[]; more: { value: string; label: string }[]; current?: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(topicAction, {});
  const [pick, setPick] = useState(current ?? "");
  return (
    <form id="topic" action={action} className="flex flex-col gap-[18px]">
      {askId && <input type="hidden" name="askId" value={askId} />}
      <input type="hidden" name="topic" value={pick} />
      <div role="radiogroup" aria-label="Topic" className="grid grid-cols-2 gap-3 lg:gap-3.5">
        {topics.map((t, i) => {
          const on = pick === t.slug;
          return (
            <button key={t.slug} type="button" role="radio" aria-checked={on} onClick={() => setPick(t.slug)}
              className={cn("relative min-h-[140px] rounded-card p-4 text-left lg:p-[18px]", TONES[i % 3], on && "shadow-[0_0_0_3px_rgb(var(--forest))]")}>
              {on && <span className="absolute right-3 top-3 flex size-[26px] items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={15} strokeWidth={3} /></span>}
              <span className="flex size-11 items-center justify-center rounded-[14px] bg-card"><Icon name={t.icon} size={24} /></span>
              <span className="mt-3 block font-display text-[17px] font-extrabold leading-[1.15] lg:text-[19px]">{t.name}</span>
              <span className="mt-1 block text-[13px] leading-[1.4] opacity-85 lg:text-[13.5px]">{t.blurb}</span>
            </button>
          );
        })}
      </div>
      {more.length > 0 && (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
          <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Not in the list?</h2>
          <FieldWrap label="More topic areas" htmlFor="t-more" hint="Choose the closest one if you are unsure. The team will find the right fit.">
            <SelectField id="t-more" options={more} value={more.some((m) => m.value === pick) ? pick : ""} onChange={setPick} placeholder="Pick one if none above fits" />
          </FieldWrap>
        </section>
      )}
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex items-center justify-between max-lg:hidden">
        <button type="submit" name="intent" value="save" className="dc-btn dc-btn-soft h-[52px]">Save and leave</button>
        <button type="submit" className="dc-btn dc-btn-primary h-[52px]" disabled={!pick}><Icon name="arrowRight" size={18} />Next</button>
      </div>
      <PhoneBar><button type="submit" form="topic" className="dc-btn dc-btn-primary h-14 w-full" disabled={!pick}><Icon name="arrowRight" size={18} />Next</button></PhoneBar>
    </form>
  );
}

/* ───────── D2 Tell us ───────── */
type Answers = { q1: string; q2: string; q3: string; sessionLength: number; stage?: string; soon?: string; soonMore?: string; mentorType?: string; mentorTypeMore?: string };
const PROGRESS_EVENT = "vc-ask-progress";

export function TellStep({ askId, a, topics, topicSlug }: { askId: string; a: Answers; topics: { value: string; label: string }[]; topicSlug: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(tellAction, {});
  const [v, setV] = useState({ q1: a.q1, q2: a.q2, q3: a.q3 });
  const pct = completeness(v, true);
  const firstThin = PROMPTS.findIndex((p) => !promptDone(v[p.key]));
  useEffect(() => { window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: { pct, done: PROMPTS.map((p) => promptDone(v[p.key])) } })); }, [pct, v]);
  const ready = pct >= CONTINUE_AT;
  const why = ready ? "" : `Add a little more to prompt ${firstThin + 1}`;

  return (
    <form id="tell" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="askId" value={askId} />
      <section className="flex flex-col gap-[18px] rounded-card border border-line bg-card p-[18px] lg:p-[22px]">
        {PROMPTS.map((p, i) => {
          const done = promptDone(v[p.key]); const flagged = !done && (state.field === p.key || (v[p.key].trim().length > 0 && i === firstThin));
          const hint = ["One or two sentences.", "Class, interests, what you have tried.", "The kind of person or advice that would make a difference."][i];
          return (
            <div key={p.key} className="flex flex-col gap-[7px]">
              <div className="flex items-start justify-between gap-2.5">
                <label htmlFor={`q-${p.key}`}><span className="block text-[15px] font-extrabold">{p.label.replace(/^(\d)\. /, "$1. ")}</span><span className="mt-0.5 block text-[13px] text-stone">{hint}</span></label>
                {done ? <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={15} strokeWidth={3} /></span>
                  : flagged ? <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-clay font-display text-[15px] font-extrabold text-clay-ink">!</span> : null}
              </div>
              <textarea id={`q-${p.key}`} name={p.key} value={v[p.key]} maxLength={1500} rows={i === 2 ? 2 : 3} onChange={(e) => setV({ ...v, [p.key]: e.target.value })}
                className={cn("min-h-[70px] w-full rounded-field border-2 bg-card px-3.5 py-3 text-[15.5px] leading-normal text-ink focus:border-ink focus:outline-none", flagged ? "border-clay" : "border-line")} />
              {flagged && <div className="flex gap-2 rounded-saymore bg-blush px-3 py-2.5 text-[13.5px] leading-[1.4] text-blush-ink"><Icon name="pencil" size={17} className="shrink-0" /><p>{p.nudge}</p></div>}
            </div>
          );
        })}
      </section>

      <div className="rounded-card border border-line bg-card p-5 lg:hidden"><Progress pct={pct} /></div>

      <section className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-[18px] lg:p-[22px]">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[22px]">A few quick details</h2>
        <p className="text-[14px] leading-normal text-bark">These help us find the right mentor and are only counted as totals. Your Ask above stays in your own words.</p>
        <div className="flex flex-col gap-4 lg:flex-row">
          <FieldWrap label="Topic area" htmlFor="d-topic" className="min-w-0 flex-1">
            <SelectField id="d-topic" name="topic" options={topics} defaultValue={topicSlug} />
          </FieldWrap>
          <FieldWrap label="Where are you now?" htmlFor="d-stage" className="min-w-0 flex-1"><SelectField id="d-stage" name="stage" options={STAGES} defaultValue={a.stage} placeholder="Choose one" /></FieldWrap>
        </div>
        <FieldWrap label="How soon do you need this?" htmlFor="d-soon" hint="Only used to plan; the team may move you up if time is short.">
          <SelectField id="d-soon" name="soon" options={SOON_OPTIONS} defaultValue={a.soon} placeholder="No rush" sayMore={{ name: "soonMore", defaultValue: a.soonMore, show: "always" }} />
        </FieldWrap>
        <div className="flex flex-col gap-2"><p className="text-[13px] font-bold text-bark">Conversation length</p><ChipRadio name="sessionLength" options={LENGTHS} defaultValue={String(a.sessionLength)} /></div>
        <FieldWrap label="Preferred mentor type (optional)" htmlFor="d-type" hint="The team decides whether to try them first.">
          <SelectField id="d-type" name="mentorType" options={MENTOR_TYPES} defaultValue={a.mentorType} placeholder="No preference" sayMore={{ name: "mentorTypeMore", defaultValue: a.mentorTypeMore, show: "always" }} />
        </FieldWrap>
      </section>
      {state.error && !state.field && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      {state.savedAt && <p role="status" className="text-[13.5px] text-stone">Draft saved. It waits for 30 days.</p>}

      <div className="flex items-center justify-between pb-7 max-lg:hidden">
        <button type="submit" name="intent" value="back" className="dc-btn dc-btn-soft h-[52px]"><Icon name="chevronLeft" size={18} />Back</button>
        <div className="flex items-center gap-3">
          {why && <span className="text-[13.5px] text-stone">{why}</span>}
          <button type="submit" className={cn("dc-btn dc-btn-primary h-[52px]", !ready && "opacity-[.42]")} aria-disabled={!ready}><Icon name="arrowRight" size={18} />Continue</button>
        </div>
      </div>
      <PhoneBar>
        {why && <p className="mb-2 text-center text-[13px] text-stone">{why.replace("Add a little more to prompt", "Prompt")} needs a little more</p>}
        <button type="submit" form="tell" className={cn("dc-btn dc-btn-primary h-14 w-full", !ready && "opacity-[.42]")} aria-disabled={!ready}><Icon name="arrowRight" size={18} />Continue</button>
      </PhoneBar>
    </form>
  );
}

function Progress({ pct }: { pct: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between"><p className="font-display text-[17px] font-extrabold">Completeness</p><span className="font-display text-[22px] font-extrabold">{pct}%</span></div>
      <div className="relative h-3 rounded-[12px] bg-sand">
        <div className={cn("h-full rounded-[inherit]", pct >= CONTINUE_AT ? "bg-forest" : "bg-gold")} style={{ width: `${pct}%` }} />
        <span className="absolute -top-[5px] h-[22px] w-[3px] rounded-sm bg-ink" style={{ left: `${CONTINUE_AT}%` }} aria-hidden="true" />
      </div>
      <div className="flex justify-between text-[12.5px] text-stone"><span>Reach the line at {CONTINUE_AT}%.</span><span className="whitespace-nowrap font-bold text-ink">{CONTINUE_AT}% line</span></div>
    </div>
  );
}

/** Desktop aside for D2: live completeness and the three prompts, fed by TellStep. */
export function TellAside({ initial }: { initial: { pct: number; done: boolean[] } }) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const on = (e: Event) => setS((e as CustomEvent<{ pct: number; done: boolean[] }>).detail);
    window.addEventListener(PROGRESS_EVENT, on); return () => window.removeEventListener(PROGRESS_EVENT, on);
  }, []);
  return (
    <>
      <section className="rounded-card border border-line bg-card p-5"><Progress pct={s.pct} /></section>
      <section className="flex flex-col gap-[9px] rounded-card border border-line bg-card p-5">
        <p className="text-[13px] font-bold text-bark">Your three prompts</p>
        {PROMPTS.map((p, i) => (
          <p key={p.key} className="flex items-center gap-2.5 text-[14px]">
            {s.done[i] ? <span className="flex size-[22px] items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={13} strokeWidth={3} /></span>
              : <span className="flex size-[22px] items-center justify-center rounded-full bg-blush text-blush-ink"><Icon name="alert" size={13} strokeWidth={3} /></span>}
            {p.short}
          </p>
        ))}
      </section>
    </>
  );
}

/* ───────── D12 Send ───────── */
export function SendForm({ askId, minor, a, children }: { askId: string; minor: boolean; a: { sessionLength: number; soon?: string; soonMore?: string; bestDays?: string; bestDaysMore?: string }; children: React.ReactNode }) {
  const [state, action] = useFormState<AskFormState, FormData>(sendAction, {});
  const label = minor ? "Send for approval" : "Send to the team";
  return (
    <form id="send" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="askId" value={askId} />
      <input type="hidden" name="needsChecks" value="1" />
      {children}
      {/* Phone (D12-M) lets you adjust length, timing and best days here. */}
      <section className="flex flex-col gap-4 lg:hidden">
        <div className="flex flex-col gap-2"><p className="text-[13px] font-bold text-bark">Call length</p><ChipRadio name="sessionLength" options={LENGTHS} defaultValue={String(a.sessionLength)} /></div>
        <FieldWrap label="When do you need this by?" htmlFor="s-soon" hint="Only used to plan. The team may move you up if time is short.">
          <SelectField id="s-soon" name="soon" options={SOON_OPTIONS} defaultValue={a.soon} placeholder="No rush" sayMore={{ name: "soonMore", defaultValue: a.soonMore, show: "always" }} />
        </FieldWrap>
        <FieldWrap label="Best days for a call" htmlFor="s-days">
          <SelectField id="s-days" name="bestDays" options={BEST_DAYS} defaultValue={a.bestDays} placeholder="Any time" sayMore={{ name: "bestDaysMore", defaultValue: a.bestDaysMore, show: "always" }} />
        </FieldWrap>
      </section>
      <div className="flex flex-col gap-1">
        <CheckRow name="noContact" label="I have not put phone numbers, emails or social handles in my Ask." />
        <CheckRow name="understand" label={minor ? "I understand the team reads my Ask first, and my guardian approves it before it goes to a mentor." : "I understand the team reads my Ask first, before it goes to a mentor."} />
      </div>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex items-center justify-between pb-7 max-lg:hidden">
        <button type="submit" name="intent" value="back" className="dc-btn dc-btn-soft h-[52px]"><Icon name="chevronLeft" size={18} />Back</button>
        <div className="flex gap-3">
          <button type="submit" name="intent" value="save" className="dc-btn dc-btn-ghost h-[52px]">Save draft</button>
          <SubmitButton icon="send" className="h-[52px]" pendingText="Sending…">{label}</SubmitButton>
        </div>
      </div>
      <PhoneBar><SubmitButton form="send" icon="upload" className="h-14 w-full" pendingText="Sending…">{minor ? "Send to the village" : label}</SubmitButton></PhoneBar>
    </form>
  );
}

export const EditLink = ({ href }: { href: string }) => <Link href={href} className="text-[13.5px] font-bold text-clay">Edit</Link>;
