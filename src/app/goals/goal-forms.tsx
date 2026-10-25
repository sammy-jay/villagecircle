"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { FieldWrap, SubmitButton, TextField } from "@/components/forms/fields";
import { addGoalAction, goalProgressAction, type SelfState } from "@/app/self-actions";
import { cn } from "@/lib/cn";

export function AddGoal() {
  const [state, action] = useFormState<SelfState, FormData>(addGoalAction, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) form.current?.reset(); }, [state]);
  return (
    <form ref={form} action={action} className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-5 lg:p-[22px]">
      <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[22px]">Add a goal</h2>
      <FieldWrap label="What do you want to do?" htmlFor="g-st" error={state.field === "statement" ? state.error : undefined}>
        <TextField id="g-st" name="statement" maxLength={200} placeholder="For example: get a B in Chemistry by Christmas" />
      </FieldWrap>
      <FieldWrap label="When by? (optional)" htmlFor="g-date"><TextField id="g-date" name="targetDate" type="date" /></FieldWrap>
      <p className="text-[12.5px] text-stone">Your goal is never shown to anyone you do not choose.{" "}Your guardian can see this page.</p>
      {state.error && state.field !== "statement" && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      {state.ok && <p role="status" className="text-[14px] font-semibold text-forest">Goal added.</p>}
      <SubmitButton icon="plus" className="h-[50px] self-start" pendingText="Adding…">Add goal</SubmitButton>
    </form>
  );
}

const PROGRESS: [string, string][] = [["NOT_STARTED", "Not started"], ["IN_PROGRESS", "Started"], ["ACHIEVED", "Achieved"], ["PARKED", "Parked"]];

/** P06 progress pills: one tap saves. */
export function ProgressPills({ id, value }: { id: string; value: string }) {
  return (
    <form action={goalProgressAction} className="flex flex-wrap gap-1.5">
      <input type="hidden" name="id" value={id} />
      {PROGRESS.map(([v, l]) => (
        <button key={v} type="submit" name="progress" value={v} aria-pressed={value === v}
          className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", value === v ? "bg-forest text-forest-ink" : "bg-sand")}>{l}</button>
      ))}
    </form>
  );
}
