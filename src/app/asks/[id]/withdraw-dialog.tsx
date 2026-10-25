"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { withdrawAction, type AskFormState } from "@/app/asks/actions";

const REASONS = ["Found the answer in the Library", "I asked someone I know", "I do not need it any more", "It is taking too long", "Something else"].map((r) => ({ value: r, label: r }));

/** N05-D2 / N05-M2: a centred dialog on desktop, a bottom sheet on the phone. Escape or the backdrop keeps the Ask. */
export function WithdrawDialog({ askId, back, minor, shared }: { askId: string; back: string; minor: boolean; shared: boolean }) {
  const router = useRouter();
  const [state, action] = useFormState<AskFormState, FormData>(withdrawAction, {});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") router.push(back); };
    document.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [router, back]);
  const lead = `${minor ? "Your guardian will be told, and the" : "The"} team stops reading it. ${shared ? "Your mentor is told kindly, with no reason given." : "Nothing was shared with a mentor."}`;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <Link href={back} aria-label="Keep my Ask" tabIndex={-1} className="absolute inset-0 bg-[rgba(20,16,10,.55)]" />
      <form action={action} role="dialog" aria-modal="true" aria-labelledby="wd-title" className="relative w-full rounded-t-[30px] bg-card px-5 pb-[22px] pt-3 lg:w-[520px] lg:rounded-[32px] lg:p-[30px] lg:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <span className="mx-auto mb-3 block h-[5px] w-11 rounded-[3px] bg-line lg:hidden" aria-hidden="true" />
        <input type="hidden" name="askId" value={askId} />
        <h2 id="wd-title" className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[28px]">Withdraw this Ask?</h2>
        <p className="mt-2 text-[15.5px] leading-normal text-bark">{lead}</p>
        <FieldWrap label="Why are you withdrawing?" htmlFor="wd-why" className="mt-4">
          <SelectField id="wd-why" name="reason" options={REASONS} placeholder="Choose a reason (optional)" sayMore={{ name: "more", show: "always" }} />
        </FieldWrap>
        {state.error && <p role="alert" className="mt-3 text-[14.5px] font-semibold text-clay">{state.error}</p>}
        <div className="mt-[18px] flex flex-col-reverse gap-2.5 lg:flex-row lg:items-center">
          <Link href={back} className="dc-btn dc-btn-forest h-[50px] max-lg:w-full">Keep my Ask</Link>
          <SubmitButton variant="ghost" className="h-[50px] max-lg:w-full" pendingText="Withdrawing…">Withdraw Ask</SubmitButton>
        </div>
      </form>
    </div>
  );
}

/** D3: the same withdraw, as a card on the Ask page. */
export function WithdrawInline({ askId, booked }: { askId: string; booked: boolean }) {
  const [state, action] = useFormState<AskFormState, FormData>(withdrawAction, {});
  return (
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-[22px]">
      <input type="hidden" name="askId" value={askId} />
      <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Withdraw this Ask</h2>
      <p className="text-[14.5px] leading-normal text-bark">You can step back any time{booked ? " before the conversation" : ""}. Nothing counts against you.</p>
      <FieldWrap label="Reason (optional)" htmlFor="wi-why">
        <SelectField id="wi-why" name="reason" options={REASONS} placeholder="Choose a reason" sayMore={{ name: "more", show: "always" }} />
      </FieldWrap>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <SubmitButton variant="ghost" className="h-[46px] self-start" pendingText="Withdrawing…">Withdraw this Ask</SubmitButton>
    </form>
  );
}
