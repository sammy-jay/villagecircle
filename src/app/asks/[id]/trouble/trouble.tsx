"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { SelectField, SubmitButton } from "@/components/forms/fields";
import { stuckAction, type ExState } from "@/app/asks/exception-actions";
import { cn } from "@/lib/cn";

const TRIES = ["Allow camera and microphone in your browser", "Refresh the page and rejoin", "Switch to another browser, or turn off a VPN", "Move closer to your router or switch to mobile data"];
const WHAT = ["My camera or mic is not found", "The call will not load", "I can see them but not hear them", "My internet keeps dropping", "Something else"].map((x) => ({ value: x, label: x }));

/** EX4 checklist (ticked in this browser) and "Tell the team I am stuck". */
export function Trouble({ askId, mentor }: { askId: string; mentor: string }) {
  const [done, setDone] = useState<boolean[]>(TRIES.map(() => false));
  const [state, action] = useFormState<ExState, FormData>(stuckAction, {});
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <section className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-card border border-line bg-card p-[22px]">
        <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Things to try</h2>
        {TRIES.map((t, i) => (
          <label key={t} className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45]">
            <input type="checkbox" checked={done[i]} onChange={() => setDone(done.map((d, j) => (j === i ? !d : d)))} className="sr-only" />
            <span className={cn("flex size-[26px] shrink-0 items-center justify-center rounded-check border-2", done[i] ? "border-forest bg-forest text-forest-ink" : "border-line bg-card")}>{done[i] && <Icon name="check" size={16} strokeWidth={3} />}</span>
            {t}
          </label>
        ))}
      </section>
      <form action={action} className="flex min-w-0 flex-1 flex-col gap-3 rounded-card border border-line bg-card p-[22px]">
        <input type="hidden" name="askId" value={askId} />
        <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Still stuck?</h2>
        <p className="text-[14.5px] leading-normal text-bark">Tell us here. Please do not share a phone number, email or another meeting link with {mentor}. Everything stays on the platform.</p>
        <label className="flex flex-col gap-[7px] text-[13px] font-bold text-bark">What is happening?<SelectField name="what" options={WHAT} placeholder="Choose one" sayMore={{ name: "more", show: "always" }} /></label>
        {state.ok ? <p role="status" className="rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink">The team knows. Someone will help you within 10 minutes.</p>
          : <SubmitButton variant="forest" icon="send" className="h-[52px]" pendingText="Sending…">Tell the team I am stuck</SubmitButton>}
        {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
        <p className="text-[12.5px] leading-[1.4] text-stone">If it cannot be fixed within 10 minutes, we reschedule at no cost.</p>
        <Link href={`/asks/${askId}/room`} className="dc-btn dc-btn-primary h-[50px]"><Icon name="refresh" size={18} />Try again</Link>
      </form>
    </div>
  );
}
