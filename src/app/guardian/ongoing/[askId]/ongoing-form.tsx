"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PhoneBar } from "@/components/account/shells";
import { ongoingAction, ongoingQuestionAction, type GState } from "../../actions";
import { cn } from "@/lib/cn";

const CHOICES: [string, string, string?][] = [
  ["THREE_MONTHS", "Authorize for three months", "Each conversation still needs the time approved by you."],
  ["ONE_MORE", "Authorize one more conversation only"],
  ["NOT_NOW", "Not now", "They are told you need more time."],
];

function Submit({ form, className, children }: { form?: string; className: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" form={form} disabled={pending} className={cn("disabled:opacity-60", className)}>{pending ? "Saving…" : children}</button>;
}

/** G6 decision and "Ask the team a question". */
export function OngoingForm({ askId }: { askId: string }) {
  const [state, action] = useFormState<GState, FormData>(ongoingAction, {});
  const [q, qAction] = useFormState<GState, FormData>(ongoingQuestionAction, {});
  const [pick, setPick] = useState("THREE_MONTHS");
  const [asking, setAsking] = useState(false);
  if (state.ok) return <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">{state.decision === "NOT_NOW" ? "Saved. Nothing is booked, and you can decide again later." : "Saved. The team will arrange the next conversation, and each time still comes to you to approve."}</p>;
  return (
    <>
      <form id="ongoing" action={action} className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <input type="hidden" name="askId" value={askId} /><input type="hidden" name="decision" value={pick} />
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Your decision</h2>
        <div role="radiogroup" className="flex flex-col gap-2.5">
          {CHOICES.map(([v, t, s]) => (
            <button key={v} type="button" role="radio" aria-checked={pick === v} onClick={() => setPick(v)} className={cn("flex items-start gap-3 rounded-[18px] border-2 bg-card px-4 py-3.5 text-left", pick === v ? "border-forest" : "border-line")}>
              <span className={cn("flex size-[26px] shrink-0 items-center justify-center rounded-full border-2", pick === v ? "border-forest" : "border-line")}>{pick === v && <span className="size-3 rounded-full bg-forest" />}</span>
              <span className="text-[15px] font-semibold leading-[1.4]">{t}{s && <span className="mt-0.5 block text-[13px] font-medium text-stone">{s}</span>}</span>
            </button>
          ))}
        </div>
        {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
        <div className="flex flex-wrap items-center gap-3 max-lg:hidden">
          <Submit className="dc-btn dc-btn-primary h-[52px]">Confirm my decision</Submit>
          <button type="button" onClick={() => setAsking(true)} className="text-[14.5px] font-bold text-clay">Ask the team a question</button>
        </div>
      </form>
      {asking || q.error ? (
        <form action={qAction} className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-5">
          <input type="hidden" name="askId" value={askId} />
          {q.ok ? <p role="status" className="text-[14.5px] font-semibold text-forest">Sent. A team member will reply within one working day.</p> : (
            <>
              <label htmlFor="og-q" className="text-[13px] font-bold text-bark">Your question</label>
              <textarea id="og-q" name="question" rows={3} maxLength={300} className="w-full rounded-field border-2 border-line bg-card px-4 py-3 text-[16px] focus:border-ink focus:outline-none" />
              {q.error && <p role="alert" className="text-[14px] font-semibold text-clay">{q.error}</p>}
              <Submit className="dc-btn dc-btn-soft h-11 self-start">Send to the team</Submit>
            </>
          )}
        </form>
      ) : null}
      <PhoneBar>
        <Submit form="ongoing" className="dc-btn dc-btn-primary h-[52px] w-full">Confirm my decision</Submit>
        <button type="button" onClick={() => setAsking(true)} className="mt-2 w-full pt-1 text-center text-[14.5px] font-bold text-clay">Ask the team a question</button>
      </PhoneBar>
    </>
  );
}
