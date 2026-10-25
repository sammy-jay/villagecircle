"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { RELATIONSHIPS, opts } from "@/components/account/options";
import { changeInviteAction, resendInviteAction, type ActionState } from "@/app/account-actions";

function Status({ s }: { s: ActionState }) {
  if (s.error) return <p role="alert" className="text-[14px] font-semibold text-clay">{s.error}</p>;
  if (s.ok) return <p role="status" className="text-[14px] font-semibold text-forest">{String(s.message ?? "Done.")}</p>;
  return null;
}

/** "Resend to Ngozi" (M13 sticky bar, DK6 primary button). */
export function ResendInvite({ guardianFirst, className, block }: { guardianFirst: string; className?: string; block?: boolean }) {
  const [state, action] = useFormState<ActionState, FormData>(resendInviteAction, {});
  return (
    <form action={action} className={className}>
      <SubmitButton icon="send" className={block ? "h-[54px] w-full" : "h-[54px]"} pendingText="Sending…">Resend to {guardianFirst}</SubmitButton>
      <div className="mt-2"><Status s={state} /></div>
    </form>
  );
}

/** DK6 "Change their email or mobile": opens the edit card in place. */
export function ChangeInvite({ initial, startOpen }: { initial: { guardianName: string; relationship: string }; startOpen?: boolean }) {
  const [open, setOpen] = useState(!!startOpen);
  const [state, action] = useFormState<ActionState, FormData>(changeInviteAction, {});
  const err = (f: string) => (state.field === f ? state.error : undefined);
  return (
    <>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="dc-btn dc-btn-ghost h-[54px]"><Icon name="pencil" size={18} />Change their email or mobile</button>
      {open && (
        <form action={action} className="dc-card basis-full p-[26px]">
          <div className="flex items-center justify-between"><h2 className="font-display text-[22px] font-extrabold leading-[1.12]">Change their email or mobile</h2><span className="dc-pill bg-sand text-caption">Opened</span></div>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:gap-3.5">
              <FieldWrap label="Guardian name" htmlFor="c-gname" className="min-w-0 flex-1" error={err("guardianName")}><TextField id="c-gname" name="guardianName" defaultValue={initial.guardianName} /></FieldWrap>
              <FieldWrap label="Relationship" htmlFor="c-rel" className="min-w-0 flex-1" error={err("relationship")}><SelectField id="c-rel" name="relationship" options={opts(RELATIONSHIPS)} defaultValue={RELATIONSHIPS.includes(initial.relationship) ? initial.relationship : undefined} /></FieldWrap>
            </div>
            <FieldWrap label="Guardian email" htmlFor="c-gemail" error={err("guardianEmail")}><TextField id="c-gemail" name="guardianEmail" type="email" icon="mail" /></FieldWrap>
            <FieldWrap label="Guardian mobile" htmlFor="c-gmobile" hint="With the country code. We text them a 6-digit code to confirm it is really them." error={err("guardianMobile")}><TextField id="c-gmobile" name="guardianMobile" type="tel" icon="phone" placeholder="+234" /></FieldWrap>
            <div><SubmitButton icon="send" variant="forest" className="h-[52px]" pendingText="Sending…">Send the invitation</SubmitButton></div>
            {!state.field && <Status s={state} />}
          </div>
        </form>
      )}
    </>
  );
}
