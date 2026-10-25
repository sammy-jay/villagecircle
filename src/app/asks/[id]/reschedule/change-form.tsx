"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { changeAction, type ExState } from "@/app/asks/exception-actions";
import { cn } from "@/lib/cn";

const REASONS = ["A clash came up", "I need more time to prepare", "I am not feeling ready", "Something else"].map((x) => ({ value: x, label: x }));

/** EX1: two choices (another time, or cancel), a private reason, then confirm. */
export function ChangeForm({ askId, mentor }: { askId: string; mentor: string }) {
  const [state, action] = useFormState<ExState, FormData>(changeAction, {});
  const [kind, setKind] = useState<"RESCHEDULE" | "CANCEL">("RESCHEDULE");
  const label = kind === "RESCHEDULE" ? "Ask for another time" : "Cancel this conversation";
  return (
    <form id="change" action={action} className="flex flex-col gap-4">
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="kind" value={kind} />
      <div role="radiogroup" className="grid gap-3 lg:grid-cols-2">
        {([["RESCHEDULE", "Ask for another time", `The team offers new times from ${mentor}'s availability. Your guardian approves the new time.`, "calendar"], ["CANCEL", "Cancel this conversation", "Your Ask closes. No mentor time is lost, and you can start a new Ask.", "x"]] as const).map(([v, t, s, icon]) => (
          <button key={v} type="button" role="radio" aria-checked={kind === v} onClick={() => setKind(v)} className={cn("flex flex-col gap-2 rounded-card border-2 bg-card p-5 text-left", kind === v ? "border-forest" : "border-line")}>
            <span className="flex items-center gap-2 font-display text-[18px] font-extrabold"><Icon name={icon} size={20} />{t}</span>
            <span className="text-[14px] leading-normal text-bark">{s}</span>
          </button>
        ))}
      </div>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Tell us why</h2>
        <FieldWrap label="Reason" htmlFor="ch-why" hint={`Only our team reads this. ${mentor} is not told your reason.`}>
          <SelectField id="ch-why" name="reason" options={REASONS} placeholder="Choose one (optional)" sayMore={{ name: "note", show: "always" }} />
        </FieldWrap>
      </section>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex gap-3 max-lg:hidden">
        <SubmitButton icon={kind === "RESCHEDULE" ? "calendar" : "x"} className="h-[52px]" pendingText="Sending…">{label}</SubmitButton>
        <Link href={`/asks/${askId}`} className="dc-btn dc-btn-soft h-[52px]">Keep this booking</Link>
      </div>
      <PhoneBar><SubmitButton form="change" className="h-14 w-full" pendingText="Sending…">{label}</SubmitButton></PhoneBar>
    </form>
  );
}
