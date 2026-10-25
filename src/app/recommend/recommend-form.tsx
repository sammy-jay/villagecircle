"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { CountedTextarea } from "@/components/dc/client";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { StepTrail } from "@/components/public/kit";
import { recommendAction, type ActionState } from "@/app/account-actions";

const ROLES = ["Teacher", "School counsellor", "Coach or club leader", "Faith or community leader", "Youth worker", "Doctor, nurse or other professional", "Other"].map((r) => ({ value: r, label: r }));

const Consent = () => (
  <div className="flex gap-3 rounded-[22px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="shieldCheck" size={24} className="shrink-0" /><p>A recommendation never replaces a guardian&apos;s consent. Nothing happens until the guardian chooses to begin.</p></div>
);
const Section = ({ children }: { children: string }) => <p className="text-[12.5px] font-extrabold tracking-[.05em] text-stone">{children}</p>;

/** P01 form and P01-D2 / P01-M2 sent state. `form` keys re-mount the form for "Recommend someone else". */
export function RecommendForm() {
  const [round, setRound] = useState(0);
  return <Inner key={round} again={() => setRound((r) => r + 1)} />;
}

function Inner({ again }: { again: () => void }) {
  const [state, action] = useFormState<ActionState, FormData>(recommendAction, {});
  const err = (f: string) => (state.field === f ? state.error : undefined);

  if (state.ok) {
    const today = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date());
    const buttons = (
      <>
        <button type="button" onClick={again} className="dc-btn dc-btn-primary h-[54px] max-lg:w-full"><Icon name="plus" size={18} />Recommend someone else</button>
        <Link href="/" className="dc-btn dc-btn-ghost h-12 max-lg:w-full lg:h-[54px]">Back to the home page</Link>
      </>
    );
    return (
      <div className="flex flex-col gap-3.5" role="status">
        <section className="flex flex-col gap-[18px] rounded-card border border-line bg-card p-5 lg:p-[30px]">
          <div className="flex items-center gap-4">
            <span className="flex size-[72px] shrink-0 -rotate-[5deg] items-center justify-center rounded-card bg-mint text-mint-ink"><Icon name="check" size={38} strokeWidth={3} /></span>
            <h2 className="font-display text-[25px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[30px]">Thank you. The guardian has a link.</h2>
          </div>
          <p className="text-[16.5px] leading-normal text-bark">We have sent the guardian a link to start. We have not contacted the young person.</p>
          <Consent />
          <div className="px-1 py-1.5">
            <StepTrail steps={[
              { title: "You sent the recommendation", sub: `Today, ${today}`, state: "done" },
              { title: "The guardian gets a link", sub: "Usually within the hour", state: "current" },
              { title: "The family decides", sub: "Only if the guardian chooses to begin", state: "next" },
            ]} />
          </div>
        </section>
        <div className="flex gap-3 max-lg:hidden">{buttons}</div>
        <PhoneBar><div className="flex flex-col gap-2">{buttons}</div></PhoneBar>
      </div>
    );
  }

  return (
    <form id="recommend" action={action} noValidate className="rounded-card border border-line bg-card p-[18px] lg:p-[30px]">
      <div className="flex flex-col gap-[18px]">
        <Section>ABOUT YOU</Section>
        <FieldWrap label="Your name" htmlFor="rc-name" error={err("name")}><TextField id="rc-name" name="name" autoComplete="name" aria-invalid={!!err("name")} required /></FieldWrap>
        <FieldWrap label="Your role" htmlFor="rc-role" error={err("role")} hint="Pick the closest one. We use it for counts only.">
          <SelectField id="rc-role" name="role" options={ROLES} placeholder="Choose your role" invalid={!!err("role")} sayMore={{ name: "roleMore", placeholder: "Say more (optional)", show: "always" }} />
        </FieldWrap>
        <FieldWrap label="Your email" htmlFor="rc-email" error={err("email")}><TextField id="rc-email" name="email" type="email" autoComplete="email" aria-invalid={!!err("email")} required /></FieldWrap>
        <div className="my-1 h-px bg-line" />
        <Section>THE YOUNG PERSON</Section>
        <FieldWrap label="Young person's first name" htmlFor="rc-first" error={err("first")}><TextField id="rc-first" name="first" autoComplete="off" aria-invalid={!!err("first")} required /></FieldWrap>
        <FieldWrap label="Parent or guardian email" htmlFor="rc-gemail" error={err("guardianEmail")} hint={<span className="lg:hidden">We&apos;ll send them a link to start. We won&apos;t contact the young person first.</span>}>
          <TextField id="rc-gemail" name="guardianEmail" type="email" autoComplete="off" aria-invalid={!!err("guardianEmail")} required />
        </FieldWrap>
        <FieldWrap label="Why you're recommending them (optional)" htmlFor="rc-why"><CountedTextarea id="rc-why" name="why" max={600} rows={3} className="min-h-[100px]" /></FieldWrap>
        <Consent />
        {state.error && !state.field && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      </div>
      <SubmitButton icon="send" className="mt-5 h-14 w-full max-lg:hidden" pendingText="Sending…">Send to guardian</SubmitButton>
      <PhoneBar><SubmitButton form="recommend" icon="send" className="h-14 w-full" pendingText="Sending…">Send to guardian</SubmitButton></PhoneBar>
    </form>
  );
}
