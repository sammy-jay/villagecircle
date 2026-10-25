"use client";

import { useFormState } from "react-dom";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { giveBackAction, type ExState } from "@/app/asks/exception-actions";

const TOPICS = ["Choosing a college or course", "JAMB and exams", "Writing a CV", "Starting something", "Money and scholarships", "Something else"].map((x) => ({ value: x, label: x }));
const HOW = ["Answer a question in writing", "Be a guest at a Q&A", "Share my story", "Mentor when I am 18"].map((x) => ({ value: x, label: x }));

/** EX17: a note of interest. Nothing is set up until the team gets in touch. */
export function GiveBackForm({ done }: { done: boolean }) {
  const [state, action] = useFormState<ExState, FormData>(giveBackAction, {});
  if (done || state.ok) return <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">Thank you. The team has your note and will be in touch when there is a good fit.</p>;
  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-[22px]">
      <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Offer an hour in something you know</h2>
      <FieldWrap label="What could you help with?" htmlFor="gb-topic"><SelectField id="gb-topic" name="topic" options={TOPICS} placeholder="Choose one" sayMore={{ name: "topicMore", show: "always" }} /></FieldWrap>
      <FieldWrap label="How would you like to help?" htmlFor="gb-how" hint="Only used for counts, so the team knows where the village needs help."><SelectField id="gb-how" name="how" options={HOW} placeholder="Choose one" sayMore={{ name: "howMore", show: "always" }} /></FieldWrap>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <SubmitButton icon="heart" className="h-[52px] self-start" pendingText="Sending…">Tell the team I am interested</SubmitButton>
    </form>
  );
}
