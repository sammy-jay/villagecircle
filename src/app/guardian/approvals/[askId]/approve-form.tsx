"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { PhoneBar } from "@/components/account/shells";
import { useConfirmSubmit } from "@/components/app/confirm";
import { approveConnectionAction, type GState } from "../../actions";
import { cn } from "@/lib/cn";

function Radio({ on, title, sub, onClick }: { on: boolean; title: string; sub?: string; onClick: () => void }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick} className={cn("flex w-full items-start gap-3 rounded-[18px] border-2 bg-card px-4 py-3.5 text-left", on ? "border-forest" : "border-line")}>
      <span className={cn("flex size-[26px] shrink-0 items-center justify-center rounded-full border-2", on ? "border-forest" : "border-line")}>{on && <span className="size-3 rounded-full bg-forest" />}</span>
      <span className="text-[15px] font-semibold leading-[1.4]">{title}{sub && <span className="mt-0.5 block text-[13px] font-medium text-stone">{sub}</span>}</span>
    </button>
  );
}
function Submit({ name, value, className, children, form, onClick }: { name: string; value: string; className: string; children: React.ReactNode; form?: string; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { pending } = useFormStatus();
  return <button type="submit" form={form} name={name} value={value} disabled={pending} onClick={onClick} className={cn("disabled:opacity-60", className)}>{pending ? "Saving…" : children}</button>;
}

/** G2 steps 2 and 3: pick one of the offered times and how you will join, then approve both, or ask for a different mentor. */
export function ApproveForm({ askId, mentor, times, selected, attends, first }: { askId: string; mentor: string; times: { iso: string; label: string }[]; selected?: string; attends: boolean; first: string }) {
  const [state, action] = useFormState<GState, FormData>(approveConnectionAction, {});
  const [time, setTime] = useState(selected ?? times[0]?.iso ?? "");
  const [join, setJoin] = useState(attends ? "ATTEND" : "REACHABLE");
  const declining = useConfirmSubmit({ title: "Choose a different mentor?", body: `${mentor} is told kindly, with no reason given. ${first}'s Ask stays open and the team suggests someone else.`, confirmLabel: "Choose a different mentor" });
  const decline = declining.onClick;
  return (
    <form id="approve" action={action} className="flex flex-col gap-3.5">
      {declining.dialog}
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="time" value={time} /><input type="hidden" name="attends" value={join} />
      <div role="radiogroup" aria-label="Time" className="flex flex-col gap-2.5">
        {times.map((t) => <Radio key={t.iso} on={time === t.iso} title={t.label} sub={selected === t.iso ? `Mentor offered. ${first} picked this one` : "Mentor offered"} onClick={() => setTime(t.iso)} />)}
      </div>
      <p className="mt-1 text-[13px] font-bold text-bark">How will you join?</p>
      <div role="radiogroup" aria-label="How will you join?" className="flex flex-col gap-2.5">
        <Radio on={join === "ATTEND"} title="I will attend" onClick={() => setJoin("ATTEND")} />
        <Radio on={join === "REACHABLE"} title="I will be reachable, not present" onClick={() => setJoin("REACHABLE")} />
      </div>
      <div className="flex gap-3 rounded-[18px] bg-butter px-4 py-3.5 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="video" size={24} className="shrink-0" /><p>The conversation is recorded. You and {mentor} are told first, and you can ask for the recording at any time.</p></div>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3 max-lg:hidden">
        <Submit name="decision" value="approve" className="dc-btn dc-btn-primary h-[52px]">Approve {mentor.split(" ")[0]} and this time</Submit>
        <Submit name="decision" value="decline" className="dc-btn dc-btn-ghost h-[52px]" onClick={decline}>Choose a different mentor</Submit>
      </div>
      <PhoneBar>
        <Submit form="approve" name="decision" value="approve" className="dc-btn dc-btn-primary h-[52px] w-full">Approve {mentor.split(" ")[0]} and this time</Submit>
        <Submit form="approve" name="decision" value="decline" className="mt-2 w-full pt-1 text-center text-[14.5px] font-bold text-clay" onClick={decline}>Choose a different mentor</Submit>
      </PhoneBar>
    </form>
  );
}
