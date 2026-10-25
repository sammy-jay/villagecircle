"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { talkAction, volunteerAction, type MState } from "../actions";

function Btn({ label, busy, soft }: { label: string; busy: string; soft?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={`dc-btn h-[44px] disabled:opacity-60 ${soft ? "dc-btn-soft" : "dc-btn-forest"}`}>{pending ? busy : label}</button>;
}

/** D26 "Volunteer" on one event role. */
export function VolunteerButton({ eventId, role, mine, full }: { eventId: string; role: string; mine: boolean; full: boolean }) {
  const [state, action] = useFormState<MState, FormData>(volunteerAction, {});
  if (mine || state.ok) return <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[13.5px] font-semibold text-mint-ink"><Icon name="check" size={15} />You volunteered</span>;
  if (full) return <span className="rounded-full bg-sand px-3.5 py-2 text-[13.5px] font-semibold text-stone">Full</span>;
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="role" value={role} />
      <Btn label="Volunteer" busy="Sending…" />
      {state.error && <p role="alert" className="text-[12.5px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}

/** D26 "Share your story": propose a talk; the team helps shape it. */
export function ProposeTalk() {
  const [state, action] = useFormState<MState, FormData>(talkAction, {});
  if (state.ok) return <p role="status" className="text-[14.5px] font-semibold text-forest">Thank you. The team will be in touch to shape it with you.</p>;
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label htmlFor="talk" className="sr-only">Your talk idea</label>
      <textarea id="talk" name="note" rows={3} maxLength={1000} placeholder="What would you talk about, and who is it for?" className="dc-textarea" aria-invalid={state.field === "note" || undefined} />
      {state.error && <p role="alert" className="text-[13.5px] font-semibold text-clay">{state.error}</p>}
      <Btn label="Propose a talk" busy="Sending…" soft />
    </form>
  );
}
