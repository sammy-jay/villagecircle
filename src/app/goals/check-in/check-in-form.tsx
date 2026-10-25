"use client";

import { useFormState } from "react-dom";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { checkInAction, type SelfState } from "@/app/self-actions";

const ANSWERS: [string, string][] = [["TOOK_STEP", "Yes, I took a next step"], ["THINKING", "I am thinking about it"], ["NOT_REALLY", "Not really"]];
const FEELING = ["Going well", "Okay", "Hard at the moment", "I would rather not say"].map((x) => ({ value: x, label: x }));

/** D22 30-day check-in after a conversation. Only the team sees the answers. */
export function CheckInForm({ id, mentor }: { id: string; mentor: string }) {
  const [state, action] = useFormState<SelfState, FormData>(checkInAction, {});
  if (state.ok) return <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Thank you. The team has your check-in.</p>;
  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-[22px]">
      <input type="hidden" name="id" value={id} />
      <p className="text-[12px] font-extrabold tracking-[.05em] text-clay">30-DAY CHECK-IN</p>
      <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">A month ago you spoke with {mentor}. Did anything change?</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Did anything change?</legend>
        {ANSWERS.map(([v, l], i) => (
          <label key={v} className="flex cursor-pointer items-center gap-3 rounded-field border-2 border-line px-4 py-3.5 has-[:checked]:border-forest has-[:checked]:bg-mint/40">
            <input type="radio" name="answer" value={v} defaultChecked={i === 0} className="size-5 accent-[rgb(var(--forest))]" /><span className="text-[15.5px] font-semibold">{l}</span>
          </label>
        ))}
      </fieldset>
      <FieldWrap label="Anything to add? (optional)" htmlFor="ci-note"><textarea id="ci-note" name="note" rows={2} maxLength={1000} className="w-full rounded-field border-2 border-line bg-card px-4 py-3 text-[16px] focus:border-ink focus:outline-none" /></FieldWrap>
      <FieldWrap label="How are things going?" htmlFor="ci-feel" hint="Only the team sees this. It helps us look after the village.">
        <SelectField id="ci-feel" name="feeling" options={FEELING} placeholder="Choose one (optional)" sayMore={{ name: "feelingMore", show: "always" }} />
      </FieldWrap>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <SubmitButton icon="send" className="h-[52px] self-start" pendingText="Sending…">Send my check-in</SubmitButton>
    </form>
  );
}
