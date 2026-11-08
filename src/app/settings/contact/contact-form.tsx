"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { FieldWrap, SelectField, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { contactAction, type SelfState } from "@/app/self-actions";
import { cn } from "@/lib/cn";

const ABOUT = ["A call or time I booked", "My Ask", "My account or guardian", "Something on the site is not working", "A question about the village", "Something else"].map((x) => ({ value: x, label: x }));
const SOON = ["Today if possible", "This week", "No rush"].map((x) => ({ value: x, label: x }));

/** N11 Talk to the team. Safety words in the message are escalated to the safeguarding lead by the help desk. */
export function ContactForm() {
  const [state, action] = useFormState<SelfState, FormData>(contactAction, {});
  const [msg, setMsg] = useState("");
  if (state.ok) return (
    <section role="status" className="flex flex-col gap-2 rounded-card bg-mint p-5 text-mint-ink">
      <h2 className="font-display text-[22px] font-extrabold">Sent. Thank you.</h2>
      <p className="text-[15px]">{state.escalated ? "This sounds serious, so our safeguarding lead has it now and will reply within 24 hours. If you are in danger, call 911." : "A team member reads it within 1 working day and replies here in the app."}</p>
      <Link href="/home" className="dc-btn dc-btn-soft mt-1 h-11 self-start bg-card">Back to Home</Link>
    </section>
  );
  return (
    <form id="contact" action={action} className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-[22px]">
      <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Tell us what is up</h2>
      <FieldWrap label="What is this about?" htmlFor="c-about"><SelectField id="c-about" name="about" options={ABOUT} placeholder="Choose one" sayMore={{ name: "aboutMore", placeholder: "Say more about the topic (optional)", show: "always" }} /></FieldWrap>
      <FieldWrap label="Your message" htmlFor="c-msg" error={state.field === "message" ? state.error : undefined}>
        <textarea id="c-msg" name="message" value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} maxLength={1000} className={cn("w-full rounded-field border-2 bg-card px-4 py-3.5 text-[16px] leading-normal focus:border-ink focus:outline-none", state.field === "message" ? "border-clay" : "border-line")} />
        <span className="self-end text-[12.5px] text-stone">{msg.length} / 1000</span>
      </FieldWrap>
      <FieldWrap label="How soon do you need us?" htmlFor="c-soon" hint="We reply here in the app. You never need to give us your phone number."><SelectField id="c-soon" name="soon" options={SOON} placeholder="Choose one" /></FieldWrap>
      <p className="text-[13.5px] text-bark"><b>We reply within 1 working day</b> (Monday to Friday). Urgent about safety? Use the numbers above, do not wait for a reply.</p>
      {state.error && state.field !== "message" && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex gap-3 max-lg:hidden"><SubmitButton icon="send" className="h-[52px]" pendingText="Sending…">Send to the team</SubmitButton><Link href="/settings" className="dc-btn dc-btn-soft h-[52px]">Cancel</Link></div>
      <PhoneBar><SubmitButton form="contact" icon="send" className="h-14 w-full" pendingText="Sending…">Send to the team</SubmitButton></PhoneBar>
    </form>
  );
}
