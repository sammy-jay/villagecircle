"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Signature } from "@/components/dc/client";
import { discloseAction, reaffirmAction, type MState } from "./actions";
import { cn } from "@/lib/cn";

const SIGN = "I confirm everything above is true, that I have read and agree to the Code of Conduct and Safeguarding Policy, and that typing my legal name is my signature.";

function Go({ label, ready }: { label: string; ready: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || !ready} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-50 max-lg:w-full"><Icon name="check" size={18} />{pending ? "Saving…" : label}</button>;
}

/** P04 / EX11 / D7: affirm the statement (never pre-ticked) and sign with the legal name on the account. */
export function ReaffirmForm({ label = "Affirm and resume mentoring", inline, affirmText = "I affirm the statement above and agree to tell The Village Circle immediately if my circumstances change." }: { label?: string; inline?: boolean; affirmText?: string }) {
  const [state, action] = useFormState<MState, FormData>(reaffirmAction, {});
  const [affirm, setAffirm] = useState(false);
  const [sig, setSig] = useState({ name: "", attested: false });
  const ready = affirm && sig.attested && sig.name.trim().length > 2;
  if (state.ok) return <p role="status" className="flex items-center gap-2 rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />Re-affirmed. Thank you. The next one is due in 12 months.</p>;
  return (
    <form action={action} className="flex flex-col gap-4">
      {inline && <input type="hidden" name="back" value="1" />}
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45]">
        <span className="relative mt-px size-[26px] shrink-0">
          <input type="checkbox" name="affirm" value="yes" checked={affirm} onChange={(e) => setAffirm(e.target.checked)} className="peer absolute inset-0 cursor-pointer appearance-none rounded-check border-2 border-line bg-card checked:border-forest checked:bg-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" />
          <Icon name="check" size={16} strokeWidth={3} className="pointer-events-none absolute left-[5px] top-[5px] hidden text-forest-ink peer-checked:block" />
        </span>
        {affirmText}
      </label>
      <Signature statement={SIGN} onChange={setSig} error={state.field === "legalName" ? state.error : undefined} hint="Type your full legal name exactly as it appears on your ID." />
      {state.error && state.field !== "legalName" && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3"><Go label={label} ready={ready} />{!ready && <span className="text-[13.5px] text-stone">Sign above to turn this on.</span>}</div>
    </form>
  );
}

/** EX11 "If your circumstances have changed": goes to the safeguarding lead in confidence and pauses new Asks. */
export function Disclose() {
  const [state, action] = useFormState<MState, FormData>(discloseAction, {});
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="dc-btn dc-btn-soft h-[48px] self-start">Tell us now</button>;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label htmlFor="disclose" className="text-[14px] font-semibold">What has changed?</label>
      <textarea id="disclose" name="note" rows={3} maxLength={2000} className={cn("dc-textarea", state.field === "note" && "border-clay")} />
      <p className="text-[12.5px] text-stone">Only the safeguarding lead reads this. New Asks pause straight away; open conversations are kept.</p>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex gap-2"><button type="submit" className="dc-btn dc-btn-primary h-[48px]"><Icon name="send" size={17} />Send in confidence</button><button type="button" onClick={() => setOpen(false)} className="dc-btn dc-btn-soft h-[48px]">Cancel</button></div>
    </form>
  );
}
