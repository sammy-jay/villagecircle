"use client";

import { useState } from "react";
import { Select, Signature } from "@/components/dc/client";
import { ActionForm, Submit, type FormResult } from "@/components/app/action-form";

/** A32 sign-off: the reviewer types their own legal name. Clearing stays off until all five requirements are done. */
export function SignOff({ id, left, action, declineReasons }: { id: string; left: number; action: (s: FormResult, fd: FormData) => Promise<FormResult>; declineReasons: string[] }) {
  const [sig, setSig] = useState({ name: "", attested: false });
  const signed = sig.attested && sig.name.trim().length > 2;
  return (
    <ActionForm action={action} className="mt-3" ok={{ cleared: "Cleared. The mentor is told and under-18 Asks can now reach them.", declined: "Recorded. The mentor sees only the reason." }} confirm={undefined}>
      <input type="hidden" name="id" value={id} />
      <Signature statement="I confirm everything above is true, and that typing my legal name is my signature." onChange={setSig} hint="Type your full legal name as it appears on your staff ID." />
      <p className="text-[13.5px] font-semibold text-stone">{left ? `${left} requirement${left === 1 ? "" : "s"} left before this mentor can be cleared.` : "Every requirement is done."}</p>
      <div className="flex flex-wrap gap-2.5"><Submit name="decision" value="clear" icon="shieldCheck" disabled={!!left || !signed}>Clear for under 18</Submit><Submit name="decision" value="decline" variant="outline">Decline</Submit></div>
      <div className="border-t border-line pt-3"><p className="dc-label">Reason for declining</p><Select name="reason" placeholder="Pick a reason (only if you decline)" options={declineReasons.map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", placeholder: "Say more (optional). The mentor sees only the reason.", show: "always" }} /></div>
    </ActionForm>
  );
}
