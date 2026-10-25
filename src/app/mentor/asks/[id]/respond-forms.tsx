"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { respondAction, type MState } from "../../actions";
import { TimePicker } from "../../time-picker";

function Btn({ label, busy, icon = "check" }: { label: string; busy: string; icon?: "check" | "send" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name={icon} size={18} />{pending ? busy : label}</button>;
}

/** D27 "Step forward": offer up to three times from your windows, then confirm. */
export function StepForward({ askId, suggestions }: { askId: string; suggestions: { iso: string; label: string; sub: string }[] }) {
  const [state, action] = useFormState<MState, FormData>(respondAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="action" value="STEP_FORWARD" />
      <TimePicker suggestions={suggestions} />
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap gap-2.5"><Btn label="Confirm I am willing" busy="Sending…" /><Link href={`/mentor/asks/${askId}`} className="dc-btn dc-btn-soft h-[52px]">Cancel</Link></div>
    </form>
  );
}

/** EX13 "Send it back kindly": a reason, an optional note and colleague. Never shown to the participant. */
export function ReturnAsk({ askId, reasons }: { askId: string; reasons: string[] }) {
  const [state, action] = useFormState<MState, FormData>(respondAction, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="action" value="REFER_ON" />
      <div>
        <p className="dc-label">Why are you returning it?</p>
        <Select name="reason" options={reasons.map((r) => ({ value: r, label: r }))} invalid={state.field === "reason"} sayMore={{ name: "note", placeholder: "Say more (optional)", show: "always" }} />
        <span className="dc-hint">We count reasons to improve matching. The participant never sees this.</span>
      </div>
      <div>
        <label htmlFor="colleague" className="dc-label">Suggest a colleague (optional)</label>
        <input id="colleague" name="colleague" maxLength={120} placeholder="Name and what they do" className="dc-input" />
        <span className="dc-hint">You know someone who could take it. The team checks they are eligible. Please do not add their phone or email.</span>
      </div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap gap-2.5"><Btn label="Return to the team" busy="Sending…" icon="send" /><Link href={`/mentor/asks/${askId}`} className="dc-btn dc-btn-soft h-[52px]">Back to the summary</Link></div>
    </form>
  );
}
