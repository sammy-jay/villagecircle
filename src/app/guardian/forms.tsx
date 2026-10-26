"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { useConfirmSubmit } from "@/components/app/confirm";
import { dataRequestAction, decideAskAction, requestRecordingAction, type GState } from "./actions";
import { cn } from "@/lib/cn";

function Btn({ children, className, name, value, onClick }: { children: React.ReactNode; className: string; name?: string; value?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending} onClick={onClick} className={cn("dc-btn h-[46px] disabled:opacity-60", className)}>{children}</button>;
}

/** G1 / G2 step 1: authorize or decline an Ask. Declining asks for confirmation first. */
export function AskDecision({ askId, first, review }: { askId: string; first: string; review?: string }) {
  const [state, action] = useFormState<GState, FormData>(decideAskAction, {});
  const declining = useConfirmSubmit({ title: "Decline this Ask?", body: `${first} is told you did not authorize it. We do not share why.`, confirmLabel: "Decline Ask", danger: true });
  if (state.ok) return <p role="status" className="rounded-[16px] bg-card/80 px-4 py-3 text-[14.5px] font-semibold">{state.decided === "approved" ? `Authorized. The team reads ${first}'s Ask next, usually within 2 working days.` : `Declined. ${first} is told kindly and can edit it with you.`}</p>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2.5">
      <input type="hidden" name="askId" value={askId} />
      <Btn name="decision" value="approve" className="dc-btn-primary">Authorize this Ask</Btn>
      <Btn name="decision" value="decline" className="border-2 border-line bg-card" onClick={declining.onClick}>Decline</Btn>
      {declining.dialog}
      {review && <Link href={review} className="dc-btn dc-btn-soft h-[46px]">Review</Link>}
      {state.error && <p role="alert" className="w-full text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}

export function RequestRecording({ connectionId }: { connectionId: string }) {
  const [state, action] = useFormState<GState, FormData>(requestRecordingAction, {});
  if (state.ok) return <p role="status" className="text-[14px] font-semibold text-forest">Requested. We will tell you when it is ready.</p>;
  return (
    <form action={action}>
      <input type="hidden" name="connectionId" value={connectionId} />
      <Btn className="dc-btn-ghost h-11 w-full"><Icon name="video" size={18} />Request the recording</Btn>
      {state.error && <p role="alert" className="mt-1 text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}

/** G3 "Export or delete": both go to the team, who confirm with the guardian before anything changes. */
export function DataRequests({ participantId, first }: { participantId: string; first: string }) {
  const [state, action] = useFormState<GState, FormData>(dataRequestAction, {});
  const [del, setDel] = useState(false);
  if (state.ok) return <p role="status" className="rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink">{state.kind === "DELETE" ? `We have your request to delete ${first}'s account. A team member will confirm it with you before anything changes.` : `We have your request for a copy of ${first}'s data. A team member will confirm it with you and send it within 30 days.`}</p>;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="participantId" value={participantId} />
      <Btn name="kind" value="EXPORT" className="dc-btn-ghost w-full"><Icon name="download" size={18} />Request a copy of their data</Btn>
      {!del ? <button type="button" onClick={() => setDel(true)} className="dc-btn dc-btn-ghost h-[46px] w-full"><Icon name="trash" size={18} />Delete the account and data</button> : (
        <div className="flex flex-col gap-2 rounded-field border-2 border-clay p-3.5">
          <label htmlFor="g-del" className="text-[14px] font-bold">Type DELETE to ask the team to close {first}&apos;s account and remove their Asks, notes and recordings.</label>
          <input id="g-del" name="confirm" autoComplete="off" className="h-12 rounded-field border-2 border-line bg-card px-3.5 text-[16px] focus:border-ink focus:outline-none" />
          <Btn name="kind" value="DELETE" className="dc-btn-primary w-full">Send the delete request</Btn>
        </div>
      )}
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}
