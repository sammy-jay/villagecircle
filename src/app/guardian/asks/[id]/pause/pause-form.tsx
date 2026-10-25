"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { pauseAction, type ActionState } from "@/app/account-actions";

const EFFECTS = (first: string) => [
  `${first}'s account and open Asks are suspended`,
  "Booked conversations are cancelled and the mentor is told kindly",
  "Our safeguarding lead is told",
  "Nothing is deleted. You can resume with the team",
];

/** M24: a bottom sheet on the phone, a centred dialog on desktop. "Keep it going" and Escape go back without pausing. */
export function PauseForm({ askId, first, back }: { askId: string; first: string; back: string }) {
  const router = useRouter();
  const [state, action] = useFormState<ActionState, FormData>(pauseAction, {});
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.push(back); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [router, back]);
  const reasons = [`I am worried about something that was said`, "A mentor made us uncomfortable", `${first} asked to pause`, "Too much on right now", "Something else"].map((r) => ({ value: r, label: r }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <Link href={back} aria-label="Keep it going" tabIndex={-1} className="absolute inset-0 bg-[rgba(20,16,10,.55)]" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="pause-title"
        className="relative flex max-h-[92vh] w-full flex-col gap-3.5 overflow-y-auto rounded-t-[30px] bg-card px-5 pb-[22px] pt-3 lg:w-[620px] lg:gap-[18px] lg:rounded-[32px] lg:p-[30px] lg:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <span className="h-[5px] w-11 self-center rounded-[3px] bg-line lg:hidden" aria-hidden="true" />
        <div className="flex items-center gap-3 lg:gap-3.5">
          <span className="flex size-12 shrink-0 -rotate-[5deg] items-center justify-center rounded-[16px] bg-butter text-butter-ink lg:size-14 lg:rounded-[18px]"><Icon name="pause" size={24} className="lg:hidden" /><Icon name="pause" size={28} className="max-lg:hidden" /></span>
          <h2 id="pause-title" className="font-display text-[24px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[30px]">Pause {first}&apos;s connection?</h2>
        </div>
        <p className="text-[15px] leading-normal text-bark lg:text-[15.5px]">Here is what happens straight away:</p>
        <ul className="flex flex-col gap-2.5 lg:gap-3">
          {EFFECTS(first).map((e) => (
            <li key={e} className="flex items-start gap-3 text-[15.5px] leading-[1.45]">
              <span className="mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full bg-mint text-mint-ink"><Icon name="check" size={15} strokeWidth={3} /></span>{e}
            </li>
          ))}
        </ul>
        <form id="pause" action={action} className="flex flex-col gap-3.5">
          <input type="hidden" name="askId" value={askId} />
          <FieldWrap label="Tell us why (optional)" htmlFor="pause-why">
            <SelectField id="pause-why" name="reason" options={reasons} placeholder="Choose a reason" sayMore={{ name: "more", placeholder: "Say more (optional). Only the team reads this.", show: "always" }} />
          </FieldWrap>
          {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
          <div className="flex flex-col gap-3.5 lg:flex-row lg:gap-3">
            <SubmitButton icon="pause" className="h-14 w-full lg:h-[54px] lg:w-auto" pendingText="Pausing…">Pause the connection</SubmitButton>
            <Link href={back} className="dc-btn dc-btn-soft h-[54px] w-full lg:w-auto">Keep it going</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
