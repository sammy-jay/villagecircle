"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { changeTimeAction, completeAction, mentorJoinAction, type MState } from "../../actions";
import { TimePicker } from "../../time-picker";
import { useConfirmSubmit } from "@/components/app/confirm";
import { cn } from "@/lib/cn";

function Btn({ label, busy, icon, disabled, className }: { label: string; busy: string; icon: "video" | "check" | "send"; disabled?: boolean; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || disabled} className={cn("dc-btn dc-btn-primary h-[52px] disabled:opacity-50", className)}><Icon name={icon} size={18} />{pending ? busy : label}</button>;
}

/** CL4 "Join the conversation": off until the link opens ten minutes before. */
export function MentorJoin({ askId, open, note }: { askId: string; open: boolean; note?: string }) {
  const [state, action] = useFormState<MState, FormData>(mentorJoinAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="askId" value={askId} />
      <div className="flex flex-wrap gap-2.5">
        <Btn label="Join the conversation" busy="Joining…" icon="video" disabled={!open} className="max-lg:w-full" />
        <Link href={`/mentor/conversations/${askId}/change`} className="dc-btn dc-btn-soft h-[52px] max-lg:w-full">I cannot make it</Link>
      </div>
      {!open && note && <p className="text-[13.5px] text-stone">{note}</p>}
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}

const NEXT: [string, string, string][] = [
  ["END", "It ends here", "A complete, happy ending. Nothing more is asked of you."],
  ["FOLLOW_UP", "One follow-up", "A short second conversation, if you are willing. The team checks with the family."],
  ["ONGOING", "Ongoing mentorship", "You both agree. The team sets up a rhythm and keeps checking in."],
];

/** D8 After the call: notes and next steps, what happens next, time to log, a private rating, then one press to complete. */
export function CloseOut({ askId, minutes, defaultNotes, minor, children }: { askId: string; minutes: number; defaultNotes: string; minor: boolean; children?: React.ReactNode }) {
  const [state, action] = useFormState<MState, FormData>(completeAction, {});
  const [next, setNext] = useState("END");
  const [rate, setRate] = useState(0);
  if (state.ok) return (
    <section role="status" className="flex flex-col gap-3 rounded-[26px] bg-mint p-6 text-mint-ink">
      <p className="flex items-center gap-2 font-display text-[24px] font-extrabold"><Icon name="check" size={22} />Complete. Your hour is logged.</p>
      <p className="text-[15px] leading-normal">Your notes are shared with the participant{minor ? " and their guardian" : ""}. The team checks in with both of you in 30 days.</p>
      <div className="flex flex-wrap gap-2.5"><Link href="/mentor" className="dc-btn dc-btn-forest h-[50px]">Back to my inbox</Link><Link href={`/mentor/contribute?from=${askId}`} className="dc-btn dc-btn-soft h-[50px]">Draft a resource</Link></div>
    </section>
  );
  return (
    <form action={action} className="flex flex-col gap-4 lg:gap-5">
      <input type="hidden" name="askId" value={askId} />
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
        <h2 className="font-display text-[21px] font-extrabold">Notes and next steps</h2>
        <label htmlFor="notes" className="text-[14.5px] text-bark">What did you cover? Anything you would suggest next?</label>
        <textarea id="notes" name="notes" rows={5} maxLength={2000} defaultValue={defaultNotes} aria-invalid={state.field === "notes" || undefined} className="dc-textarea" />
        <label htmlFor="next-steps" className="text-[14.5px] text-bark">Next steps, one per line (optional)</label>
        <textarea id="next-steps" name="nextSteps" rows={3} maxLength={1000} placeholder={"Shadow a ward doctor for a week\nList three universities to compare"} className="dc-textarea" />
        <p className="text-[13px] text-stone">Shared with the participant{minor ? " and their guardian" : ""}. Please do not add contact details.</p>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
        <h2 className="font-display text-[21px] font-extrabold">What happens next?</h2>
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-2.5 lg:grid-cols-3" role="radiogroup" aria-label="What happens next">
          {NEXT.map(([v, t, b]) => (
            <button key={v} type="button" role="radio" aria-checked={next === v} onClick={() => setNext(v)} className={cn("flex flex-col gap-1 rounded-[18px] border-2 p-4 text-left", next === v ? "border-forest bg-mint/40" : "border-line bg-card")}>
              <span className="text-[15.5px] font-extrabold">{t}</span><span className="text-[13px] leading-snug text-bark">{b}</span>
            </button>
          ))}
        </div>
      </section>
      {children}
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
        <h2 className="font-display text-[21px] font-extrabold">Complete this conversation</h2>
        <p className="text-[14.5px] text-bark">One press. Your hour is logged and you are done.</p>
        <div><p className="dc-label">Time to log</p><Select name="minutes" defaultValue={String(minutes)} options={[15, 30, 45, 60, 75, 90].map((m) => ({ value: String(m), label: m === 60 ? "1 hour (60 minutes)" : `${m} minutes` }))} /><span className="dc-hint">Change it if the call ran shorter or longer.</span></div>
        <div>
          <p className="dc-label">How did it go for you?</p>
          <input type="hidden" name="feedback" value={rate || ""} />
          <div className="flex gap-2" role="radiogroup" aria-label="How did it go, 1 is rough, 5 is great">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rate === n} onClick={() => setRate(rate === n ? 0 : n)} className={cn("size-12 rounded-full text-[16px] font-extrabold", rate === n ? "bg-forest text-forest-ink" : "bg-sand")}>{n}</button>)}
          </div>
          <span className="dc-hint">Private to the team. It helps us support you. 1 is rough, 5 is great.</span>
        </div>
        {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
        <Btn label="Mark as complete" busy="Saving…" icon="check" className="w-full lg:w-auto lg:self-start" />
      </section>
    </form>
  );
}

/** EX2 Can't make it: offer up to three new windows, or hand the conversation back. Everything goes through the team. */
export function ChangeTime({ askId, suggestions, missed }: { askId: string; suggestions: { iso: string; label: string; sub: string }[]; missed?: boolean }) {
  const [state, action] = useFormState<MState, FormData>(changeTimeAction, {});
  const [mode, setMode] = useState<"OFFER" | "HAND_BACK">("OFFER");
  // Handing back ends this match for good, so it asks first. Offering times never does.
  const ask = useConfirmSubmit(mode === "HAND_BACK" ? { title: "Hand this conversation back?", body: "You will not be matched with this Ask again. The team finds another mentor, and the family is told kindly, with no blame on you. To rebook instead, offer new times.", confirmLabel: "Hand it back", cancelLabel: "Keep it", danger: true } : undefined);
  return (
    <form action={action} onSubmit={ask.onSubmit} className="flex flex-col gap-4">
      {ask.dialog}
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="action" value={mode} />
      <div className="grid gap-2.5 lg:grid-cols-2" role="radiogroup" aria-label="What do you need?">
        {([["OFFER", missed ? "Offer new times to rebook" : "Offer other times", "Pick up to three windows from your availability. The family picks one."], ["HAND_BACK", "Hand this conversation back", "The team finds another mentor instead. This cannot be undone."]] as const).map(([v, t, b]) => (
          <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={cn("flex flex-col gap-1 rounded-[18px] border-2 p-4 text-left", mode === v ? "border-forest bg-mint/40" : "border-line bg-card")}>
            <span className="text-[15.5px] font-extrabold">{t}</span><span className="text-[13px] leading-snug text-bark">{b}</span>
          </button>
        ))}
      </div>
      {mode === "OFFER" && <div><p className="dc-label">Pick up to three windows</p><TimePicker suggestions={suggestions} /></div>}
      <div>
        <p className="dc-label">Reason for the team</p>
        <Select name="reason" options={["Work shift at short notice", "Illness", "Family matter", "Travel", "Something else"].map((x) => ({ value: x, label: x }))} sayMore={{ name: "note", placeholder: "Say more (optional)", show: "always" }} />
        <span className="dc-hint">The participant never sees this.</span>
      </div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap gap-2.5"><Btn label={mode === "OFFER" ? "Send new times" : "Hand back to the team"} busy="Sending…" icon="send" /><Link href={`/mentor/conversations/${askId}`} className="dc-btn dc-btn-soft h-[52px]">Back</Link></div>
    </form>
  );
}
