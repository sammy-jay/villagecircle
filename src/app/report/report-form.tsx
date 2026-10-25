"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { Select } from "@/components/dc/client";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { concernAction, type ActionState } from "@/app/account-actions";

/** Board labels (M16-D and M16-M2) mapped onto the four concern kinds the safety plan knows. The label goes with the report as detail. */
const WHAT: { label: string; kind: "contact" | "outside" | "unsafe" | "other" }[] = [
  { label: "Someone asked for or gave contact details", kind: "contact" },
  { label: "Someone tried to arrange something outside the platform", kind: "outside" },
  { label: "I felt uncomfortable or unsafe", kind: "unsafe" },
  { label: "Someone was rude or unkind", kind: "other" },
  { label: "A mentor asked me to keep a secret", kind: "unsafe" },
  { label: "Something in a call was not okay", kind: "unsafe" },
  { label: "Something on the site is wrong", kind: "other" },
  { label: "Something else", kind: "other" },
];

/** `after` is shown under the fields on the phone only (the desktop board puts it in the aside). */
export function ReportForm({ asks, askId, back, after }: { asks: { id: string; label: string }[]; askId?: string; back: string; after?: ReactNode }) {
  const [state, action] = useFormState<ActionState, FormData>(concernAction, {});
  const [what, setWhat] = useState("");
  const pick = WHAT[Number(what)];

  if (state.ok) return (
    <section role="status" className="dc-card flex flex-col gap-3 p-6">
      <span className="flex size-12 items-center justify-center rounded-[16px] bg-mint text-mint-ink"><Icon name="shieldCheck" size={24} /></span>
      <h2 className="font-display text-[24px] font-extrabold leading-[1.1]">Thank you for telling us</h2>
      <p className="text-[15.5px] leading-normal text-bark">Your report is with the safeguarding team. If it was about a conversation, that connection is paused while we look. We will reply within 48 hours, and we never share your report with the person involved.</p>
      <Link href={back} className="dc-btn dc-btn-soft mt-1 h-[52px] self-start">Done</Link>
    </section>
  );

  return (
    <form id="concern" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="kind" value={pick?.kind ?? ""} />
      <input type="hidden" name="detail" value={pick?.label ?? ""} />
      <div className="flex flex-col gap-4 lg:rounded-card lg:border lg:border-line lg:bg-card lg:p-6">
        <FieldWrap label="What happened?" htmlFor="r-what" error={state.field === "kind" ? state.error : undefined}>
          <Select id="r-what" options={WHAT.map((w, i) => ({ value: String(i), label: w.label }))} value={what} onChange={setWhat} placeholder="Choose what happened" invalid={state.field === "kind"}
            sayMore={{ name: "description", placeholder: "Say more (optional). Please do not include phone numbers or addresses.", show: "always" }} />
        </FieldWrap>
        <FieldWrap label="Which call or Ask is it about? (optional)" htmlFor="r-ask">
          <Select id="r-ask" name="askId" defaultValue={askId} options={[{ value: "", label: "Not about a call or Ask" }, ...asks.map((a) => ({ value: a.id, label: a.label }))]} placeholder="Choose a call or Ask" />
        </FieldWrap>
      </div>
      {state.error && state.field !== "kind" && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex items-center justify-between max-lg:hidden">
        <Link href={back} className="dc-btn dc-btn-soft h-[52px]">Cancel</Link>
        <SubmitButton icon="lock" className="h-14" pendingText="Sending…">Send privately</SubmitButton>
      </div>
      {after && <div className="lg:hidden">{after}</div>}
      <PhoneBar><SubmitButton form="concern" icon="lock" className="h-14 w-full" pendingText="Sending…">Send privately</SubmitButton></PhoneBar>
    </form>
  );
}
