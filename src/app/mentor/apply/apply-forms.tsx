"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Signature } from "@/components/dc/client";
import { applyStepAction, submitApplicationAction, type MState } from "../actions";
import { cn } from "@/lib/cn";

function Go({ label, icon = "arrowRight" }: { label: string; icon?: "arrowRight" | "send" }) {
  const { pending } = useFormStatus();
  return <button type="submit" name="intent" value="continue" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full disabled:opacity-60 lg:w-auto"><Icon name={icon} size={18} />{pending ? "Saving…" : label}</button>;
}

/** Steps 1 to 3: one form, posted with Continue, Save draft or Save and close (the header button posts the same form). */
export function ApplyForm({ step, back, children }: { step: 1 | 2 | 3; back?: string; children: ReactNode }) {
  const [state, action] = useFormState<MState, FormData>(applyStepAction, {});
  return (
    <form id="apply-form" action={action} className="flex flex-col gap-4 lg:gap-5" noValidate>
      <input type="hidden" name="step" value={step} />
      {children}
      {state.error && <p role="alert" className="rounded-[16px] bg-blush px-4 py-3 text-[14.5px] font-semibold text-blush-ink">{state.error}</p>}
      {!!state.saved && !state.error && <p role="status" className="text-[14px] font-semibold text-forest">Draft saved. You can close this page and come back.</p>}
      <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-line max-lg:bg-paper max-lg:px-4 max-lg:pb-4 max-lg:pt-3 lg:flex lg:items-center lg:gap-2.5">
        {back && <Link href={back} className="dc-btn dc-btn-outline h-14 max-lg:hidden"><Icon name="chevronLeft" size={18} />Back</Link>}
        <span className="flex-1 max-lg:hidden" />
        <button type="submit" name="intent" value="draft" className="dc-btn dc-btn-soft h-14 max-lg:hidden">Save draft</button>
        <Go label="Continue" />
      </div>
      <div className="h-[88px] lg:hidden" aria-hidden="true" />
    </form>
  );
}

/** DK8 / M6 "Areas you can help with": up to three chips, posted as repeated `areas` fields. */
export function AreaChips({ options, defaultValue }: { options: string[]; defaultValue: string[] }) {
  const [on, setOn] = useState<string[]>(defaultValue);
  const flip = (a: string) => setOn((x) => (x.includes(a) ? x.filter((y) => y !== a) : x.length >= 3 ? x : [...x, a]));
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Areas you can help with, up to three">
      {on.map((a) => <input key={a} type="hidden" name="areas" value={a} />)}
      {options.map((a) => {
        const sel = on.includes(a);
        return (
          <button key={a} type="button" aria-pressed={sel} onClick={() => flip(a)} disabled={!sel && on.length >= 3}
            className={cn("inline-flex items-center gap-1.5 rounded-full px-[15px] py-[9px] text-[14.5px] font-semibold disabled:opacity-50", sel ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>
            {sel && <Icon name="check" size={16} />}{a}
          </button>
        );
      })}
    </div>
  );
}

/** A document to read before ticking a commitment: a download, and optionally the same text as a web page. */
export type CommitmentDoc = { title: string; href: string; meta: string; online?: string };

/** DK9 / M7 the four commitments (never pre-ticked) and the signature. Continue stays off until all are done. */
export function Commitments({ items, statement, accountName }: { items: [string, string, CommitmentDoc?][]; statement: string; accountName: string }) {
  const [ticks, setTicks] = useState<boolean[]>(items.map(() => false));
  const [sig, setSig] = useState({ name: "", attested: false });
  const ready = ticks.every(Boolean) && sig.attested && sig.name.trim().length > 2;
  return (
    <>
      <section className="rounded-card border border-line bg-card p-5 lg:px-[26px] lg:py-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-[20px] font-extrabold leading-[1.12]">Your commitments</h2><span className="rounded-full bg-sand px-3 py-1.5 text-[12.5px] font-semibold">All required</span></div>
        <ul className="mt-3 divide-y divide-line">
          {items.map(([t, body, doc], i) => (
            <li key={t} className="py-3.5">
              <label className="flex cursor-pointer items-start gap-3">
                <span className="relative mt-0.5 size-[30px] shrink-0">
                  <input type="checkbox" name={`c${i + 1}`} value="yes" checked={ticks[i]} onChange={(e) => setTicks((x) => x.map((v, j) => (j === i ? e.target.checked : v)))} className="peer absolute inset-0 cursor-pointer appearance-none rounded-check border-2 border-line bg-card checked:border-forest checked:bg-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" />
                  <Icon name="check" size={16} strokeWidth={3} className="pointer-events-none absolute left-[7px] top-[7px] hidden text-forest-ink peer-checked:block" />
                </span>
                <span><span className="block text-[16px] font-bold">{t}</span><span className="mt-0.5 block text-[13.5px] leading-normal text-bark">{body}</span></span>
              </label>
              {/* Outside the label, so opening the document never ticks the box by accident. */}
              {doc && (
                <div className="ml-[42px] mt-3 flex flex-wrap items-center gap-3 rounded-[16px] border border-line bg-paper px-3.5 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-butter text-butter-ink" aria-hidden="true"><Icon name="book" size={20} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[14.5px] font-bold">{doc.title}</span><span className="block text-[12.5px] text-stone">{doc.meta}</span></span>
                  <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <a href={doc.href} download className="dc-btn dc-btn-soft h-10 px-4 text-[14px]"><Icon name="download" size={16} />Download</a>
                    {doc.online && <Link href={doc.online} target="_blank" rel="noopener" className="text-[14px] font-bold text-clay">Read it online<span className="sr-only"> (opens in a new tab)</span></Link>}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <Signature statement={statement} onChange={setSig} hint="Type your full legal name exactly as it appears on your ID." />
      {!ready && <p className="text-[13.5px] font-semibold text-stone" aria-live="polite">{ticks.every(Boolean) ? (sig.name.trim().length > 2 ? "Tick the last box to sign." : "Type your full legal name to continue.") : "Tick all four commitments, then sign."}</p>}
      <p className="text-[13px] leading-normal text-stone">The attestation cannot be skipped, pre-ticked or defaulted. You will re-affirm it every 12 months. Date, time and statement version are saved automatically. Your account name is {accountName}.</p>
    </>
  );
}

function SendBtn() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full disabled:opacity-60 lg:w-auto"><Icon name="arrowRight" size={18} />{pending ? "Sending…" : "Send to the team"}</button>;
}

/** DK10 / M8 "Send to the team". */
export function SendForm() {
  const [state, action] = useFormState<MState>(submitApplicationAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.error && <p role="alert" className="rounded-[16px] bg-blush px-4 py-3 text-[14.5px] font-semibold text-blush-ink">{state.error}{typeof state.step === "number" && <> <Link href={`/mentor/apply?step=${state.step}`} className="underline">Go to step {state.step}</Link></>}</p>}
      <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-line max-lg:bg-paper max-lg:px-4 max-lg:pb-4 max-lg:pt-3 lg:flex lg:items-center lg:gap-2.5">
        <Link href="/mentor/apply?step=3" className="dc-btn dc-btn-outline h-14 max-lg:hidden"><Icon name="chevronLeft" size={18} />Back</Link>
        <span className="flex-1 max-lg:hidden" />
        <Link href="/?draft=saved" className="dc-btn dc-btn-soft h-14 max-lg:hidden">Finish later</Link>
        <SendBtn />
      </div>
      <div className="h-[88px] lg:hidden" aria-hidden="true" />
    </form>
  );
}
