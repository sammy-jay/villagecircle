"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { sendHelp, sendReport, type FormState } from "@/app/help/actions";
import { H, OTag } from "./kit";

const fieldBox = "h-[54px] w-full rounded-field border-2 border-line bg-card px-4 text-[16px] text-ink placeholder:text-stone focus:border-ink focus:outline-none";
const areaBox = "w-full rounded-field border-2 border-line bg-card px-4 py-3.5 text-[16px] leading-normal text-ink placeholder:text-stone focus:border-ink focus:outline-none";

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return <label htmlFor={htmlFor} className="text-label font-bold text-bark">{children}</label>;
}

function Submit({ children, className, form }: { children: ReactNode; className?: string; form?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" form={form} disabled={pending} className={cn("dc-btn dc-btn-primary", className)}>
      <Icon name="send" size={18} />{pending ? "Sending…" : children}
    </button>
  );
}

const ABOUT = ["Guardian approval", "Signing up and the age check", "Asks and scheduling", "Mentor application", "Privacy and data", "Something else"].map((v) => ({ value: v, label: v }));

/** HP3 Contact the team. */
export function ContactForm() {
  const [state, action] = useFormState<FormState, FormData>(sendHelp, {});
  if (state.ok) {
    return (
      <div className="flex flex-col items-start gap-3" role="status">
        <span className="flex size-12 items-center justify-center rounded-field bg-mint text-mint-ink"><Icon name="check" size={24} strokeWidth={3} /></span>
        <H as="h3" className="text-[24px]">{state.escalated ? "Sent to our safeguarding lead" : "Message sent"}</H>
        <p className="text-[15.5px] leading-normal text-bark">{state.escalated ? "It sounded urgent, so a safeguarding lead will read it within 24 hours." : "A person on the team will reply within two business days."}</p>
      </div>
    );
  }
  return (
    <form action={action} className="mt-4 flex flex-col gap-3.5 lg:mt-5 lg:gap-4" noValidate>
      <div className="flex flex-col gap-3.5 lg:flex-row lg:gap-4">
        <div className="flex flex-1 flex-col gap-[7px]"><Label htmlFor="c-name">Your name</Label><input id="c-name" name="name" autoComplete="name" className={fieldBox} /></div>
        <div className="flex flex-1 flex-col gap-[7px]">
          <Label htmlFor="c-email">Email</Label>
          <div className="relative"><Icon name="mail" size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone" /><input id="c-email" name="email" type="email" autoComplete="email" className={cn(fieldBox, "pl-[45px]")} /></div>
        </div>
      </div>
      <div className="flex flex-col gap-[7px]">
        <Label htmlFor="c-about">What is it about?</Label>
        <Select id="c-about" name="about" options={ABOUT} className="[&>button]:h-[54px]" />
        <p className="text-caption text-stone"><span className="lg:hidden">Pick the closest one.</span><span className="max-lg:hidden">Pick the closest one. It helps us reply faster.</span></p>
      </div>
      <div className="flex flex-col gap-[7px]"><Label htmlFor="c-msg">Message</Label><textarea id="c-msg" name="message" rows={4} maxLength={3000} className={cn(areaBox, "min-h-[100px] lg:min-h-[110px]")} /></div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <Submit className="h-[54px] max-lg:w-full">Send message</Submit>
        <p className="flex-1 text-caption leading-[1.4] text-stone max-lg:text-center lg:text-[13px]">Never put passwords or card numbers in this form.</p>
      </div>
    </form>
  );
}

const WHO = ["A mentor I am matched with", "A young person", "A parent or guardian", "Someone on the team", "Someone else"].map((v) => ({ value: v, label: v }));
const KINDS = [
  { value: "contact", label: "Asked for or shared contact details" },
  { value: "outside", label: "Contact outside the platform" },
  { value: "unsafe", label: "I felt uncomfortable or unsafe" },
  { value: "other", label: "Something else" },
];
const COMMON: [string, string][] = [
  ["Asked for my phone number", "contact"], ["Asked to talk somewhere else", "outside"], ["Inappropriate language", "unsafe"],
  ["Pressure to share something private", "unsafe"], ["Felt unsafe", "unsafe"], ["Something else", "other"],
];

/**
 * HP4 report area: the steps card (passed in), Common concerns chips that fill the form, and the form.
 * On the phone the send button moves to a sticky bar under the content.
 */
export function ReportArea({ steps, askId }: { steps: ReactNode; askId?: string }) {
  const [state, action] = useFormState<FormState, FormData>(sendReport, {});
  const [kind, setKind] = useState("");
  const [contact, setContact] = useState(true);

  const common = (
    <section className="dc-card p-5 lg:p-[26px]">
      <H as="h2" className="text-[20px] lg:text-[22px]">Common concerns</H>
      <div className="mt-3 flex flex-wrap gap-2 lg:mt-3.5">
        {COMMON.map(([l, k]) => <button key={l} type="button" onClick={() => setKind(k)} className="dc-pill bg-sand text-ink hover:border-line">{l}</button>)}
      </div>
    </section>
  );

  if (state.ok) {
    return (
      <div className="dc-card flex flex-col items-start gap-3 p-6 lg:p-8" role="status">
        <span className="flex size-12 items-center justify-center rounded-field bg-mint text-mint-ink"><Icon name="check" size={24} strokeWidth={3} /></span>
        <H as="h2" className="text-[28px]">Thank you for telling us</H>
        <p className="max-w-[560px] text-[16px] leading-normal text-bark">The connection is paused and our safeguarding lead has been told. We will tell you what we found and what we did within 48 hours.</p>
        <Link href="/" className="dc-btn dc-btn-soft mt-2 h-[50px]">Back to the home page</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-7">
      <div className="flex flex-col gap-4 lg:w-[480px] lg:flex-none lg:gap-5">
        {steps}
        <div className="max-lg:hidden">{common}</div>
      </div>
      <div className="min-w-0 flex-1">
        <form id="report-form" action={action} className="dc-card p-5 lg:p-8">
          {askId && <input type="hidden" name="askId" value={askId} />}
          <OTag icon="lock" className="text-mint-ink max-lg:hidden">Private</OTag>
          <H as="h2" className="text-[26px] lg:mt-3 lg:text-[32px]">Report now</H>
          <div className="mt-4 flex flex-col gap-4 lg:mt-5 lg:gap-[18px]">
            <div className="flex flex-col gap-[7px]"><Label htmlFor="r-who">Who is it about?</Label><Select id="r-who" name="who" options={WHO} className="[&>button]:h-[54px]" /></div>
            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="r-kind">What kind of concern?</Label>
              <Select id="r-kind" name="kind" options={KINDS} value={kind} onChange={setKind} className="[&>button]:h-[54px]" />
              <p className="text-caption text-stone"><span className="lg:hidden">Pick the closest one.</span><span className="max-lg:hidden">Pick the closest one. We count these to spot patterns, never to name anyone.</span></p>
            </div>
            <div className="flex flex-col gap-[7px]">
              <Label htmlFor="r-more">Say more (optional)</Label>
              <textarea id="r-more" name="description" rows={4} maxLength={2000} className={cn(areaBox, "min-h-[100px] lg:min-h-[110px]")} />
              <p className="text-caption text-stone">You can leave this blank and we will contact you.</p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45]">
              <input type="checkbox" name="contact" value="yes" checked={contact} onChange={(e) => setContact(e.target.checked)} className="peer sr-only" />
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-check border-2 border-line bg-card text-forest-ink peer-checked:border-forest peer-checked:bg-forest peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
                {contact && <Icon name="check" size={16} strokeWidth={3} />}
              </span>
              You may contact me about this
            </label>
            {state.error && (
              <p role="alert" className="text-[14px] font-semibold text-clay">
                {state.error}{state.needsLogin && <> <Link href="/login?next=/help/report" className="underline">Log in</Link></>}
              </p>
            )}
            <div className="max-lg:hidden">
              <Submit className="h-14 w-full">Send report</Submit>
              <p className="mt-[18px] flex items-center justify-center gap-2 text-[13.5px] text-stone"><Icon name="lock" size={15} />The other person is not told who reported.</p>
            </div>
            <p className="rounded-[18px] bg-butter p-3.5 text-[13.5px] leading-normal text-butter-ink max-lg:hidden"><b>Not logged in?</b> We ask you to log in first, so we know which account to protect and pause. Cannot log in? Use Contact the team.</p>
          </div>
        </form>
      </div>
      <div className="lg:hidden">{common}</div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">
        <Submit form="report-form" className="h-14 w-full">Send report</Submit>
        <p className="mt-2 text-center text-caption text-stone">The other person is not told who reported.</p>
      </div>
    </div>
  );
}
