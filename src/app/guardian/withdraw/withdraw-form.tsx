"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField } from "@/components/forms/fields";
import { withdrawConsentAction, type GState } from "../actions";

const REASONS = ["needs a break", "I am worried about something", "We have the help we need", "Something else"];

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name="pause" size={18} />{pending ? "Pausing…" : "Pause the connection"}</button>;
}

/** G4 state 1: what happens, an optional reason, then confirm. */
export function WithdrawForm({ participantId, first, mentor }: { participantId: string; first: string; mentor: string | null }) {
  const [state, action] = useFormState<GState, FormData>(withdrawConsentAction, {});
  const effects = [`${first}'s account and open Asks are suspended`, `Any booked conversation is cancelled${mentor ? `, and ${mentor} is told kindly` : ", and the mentor is told kindly"}`, "Our safeguarding lead is told, so the team can talk with you", "Nothing is deleted. You can resume later, with the team"];
  return (
    <form action={action} className="flex flex-col gap-3.5 rounded-panel border border-line bg-card p-5 lg:p-[30px]">
      <input type="hidden" name="participantId" value={participantId} />
      <p className="text-[12.5px] font-extrabold tracking-[.05em] text-clay">WITHDRAW CONSENT</p>
      <div className="flex items-center gap-3"><span className="flex size-12 shrink-0 -rotate-[5deg] items-center justify-center rounded-[16px] bg-butter text-butter-ink"><Icon name="pause" size={24} /></span><h1 className="font-display text-[26px] font-extrabold leading-[1.1] tracking-[-.01em] lg:text-[30px]">Pause {first}&apos;s connection?</h1></div>
      <p className="text-[15.5px] text-bark">You can pause at any time. Here is what happens straight away:</p>
      <ul className="flex flex-col gap-2.5">{effects.map((e) => <li key={e} className="flex items-start gap-3 text-[15.5px] leading-[1.45]"><span className="mt-px flex size-[26px] shrink-0 items-center justify-center rounded-full bg-mint text-mint-ink"><Icon name="check" size={15} strokeWidth={3} /></span>{e}</li>)}</ul>
      <FieldWrap label="Tell us why (optional)" htmlFor="wd-why" hint="Only the team and safeguarding lead read this.">
        <SelectField id="wd-why" name="reason" options={REASONS.map((x, i) => ({ value: i === 0 ? `${first} needs a break` : x, label: i === 0 ? `${first} needs a break` : x }))} placeholder="Choose a reason" sayMore={{ name: "more", show: "always" }} />
      </FieldWrap>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-col gap-2.5 lg:flex-row"><Submit /><Link href="/guardian" className="dc-btn dc-btn-soft h-[52px]">Keep it going</Link></div>
    </form>
  );
}
