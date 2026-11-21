"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { useCallClock, type CallClock } from "@/components/app/call-clock";
import { guardianJoinAction, type GState } from "../../../actions";

function Submit({ open, opensAt }: { open: boolean; opensAt: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={!open || pending} className="dc-btn dc-btn-primary h-[52px] w-full disabled:opacity-50 lg:w-auto lg:self-start"><Icon name="video" size={18} />{pending ? "Joining…" : open ? "Join the conversation" : `Opens ${opensAt}`}</button>;
}

/** P07 join: turns itself on when the link opens, ten minutes before the start, without a refresh. */
export function GuardianJoin({ askId, clock, paused, opensAt }: { askId: string; clock: CallClock; paused: boolean; opensAt: string }) {
  const [state, action] = useFormState<GState, FormData>(guardianJoinAction, {});
  const open = useCallClock(clock).open && !paused;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="askId" value={askId} />
      <Submit open={open} opensAt={opensAt} />
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}
