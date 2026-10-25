"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { XState } from "../settings-actions";

const WHY = ["Safeguarding follow-up", "Guardian asked us to call", "Data request", "Account security", "Something else"];

function Go() { const { pending } = useFormStatus(); return <button type="submit" disabled={pending} className="dc-btn dc-btn-forest h-10 px-4 disabled:opacity-55">{pending ? "Checking…" : "Show details"}</button>; }

/** A21 "Show full contact details": an extra click with a reason, and it is logged. */
export function Reveal({ userId, masked, action }: { userId: string; masked: string; action: (s: XState, fd: FormData) => Promise<XState> }) {
  const [open, setOpen] = useState(false);
  const [state, run] = useFormState<XState, FormData>(action, {});
  if (state.ok) return <span className="text-[13.5px]"><b>{String(state.email)}</b>{state.phone ? <><br />{String(state.phone)}</> : null}</span>;
  if (!open) return <span className="flex items-center gap-2 text-[13.5px]"><span className="font-mono">{masked}</span><button type="button" onClick={() => setOpen(true)} className="text-[13px] font-bold text-clay">Show</button></span>;
  return (
    <form action={run} className="flex flex-col gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select name="why" aria-label="Why you need it" defaultValue="" className="h-10 rounded-field border-2 border-line bg-card px-2 text-[13.5px]"><option value="" disabled>Pick why you need it</option>{WHY.map((w) => <option key={w}>{w}</option>)}</select>
      <div className="flex gap-1.5"><Go /><button type="button" onClick={() => setOpen(false)} className="dc-btn dc-btn-ghost h-10 px-3">Cancel</button></div>
      {state.error && <span role="alert" className="text-[12.5px] font-semibold text-clay">{state.error}</span>}
    </form>
  );
}
