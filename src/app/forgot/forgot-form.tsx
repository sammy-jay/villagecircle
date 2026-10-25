"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormState } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, Note, SubmitButton, TextField } from "@/components/forms/fields";
import { TiltTile } from "@/components/account/shells";
import { useCooldown } from "@/components/account/resend";
import { inboxUrl } from "@/components/account/inbox";
import { forgotAction, type ActionState } from "@/app/account-actions";

function StepHead({ n, tone, title, tag }: { n: number; tone: string; title: string; tag: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex size-[30px] items-center justify-center rounded-tile font-display font-extrabold", tone)}>{n}</span>
      <span className="text-[15px] font-extrabold">{title}</span>
      <span className="dc-pill ml-auto bg-sand text-caption">{tag}</span>
    </div>
  );
}

/** M11. Phone: one screen that gains the "check your email" notes. Desktop: the three-step page from M11-D. */
export function ForgotFlow() {
  const [state, action] = useFormState<ActionState, FormData>(forgotAction, {});
  const cd = useCooldown(60, false);
  useEffect(() => { if (state.ok) cd.restart(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const sent = !!state.ok;

  const field = (id: string) => (
    <FieldWrap label="Email" htmlFor={id} error={state.error}><TextField id={id} name="email" type="email" icon="mail" autoComplete="email" required /></FieldWrap>
  );
  const again = <p className="text-center text-[13.5px] leading-normal text-stone">Did not get it? {cd.left > 0 ? <b className="text-clay">Send again in {cd.label}</b> : <button type="submit" className="font-bold text-clay">Send again</button>}</p>;

  return (
    <>
      {/* Phone (M11) */}
      <form id="forgot-form" action={action} className="flex flex-col gap-4 lg:hidden" noValidate>
        {field("f-email-m")}
        {sent && <Note tone="mint" icon="check">Check your email. If an account exists for that address, a link is on its way. It works once.</Note>}
        {sent && again}
        <Note tone="butter" icon="clock"><b>Link too old?</b> Reset links work once, for one hour. You can always ask for a new one.</Note>
        <p className="text-center text-[13.5px] leading-normal text-stone">Remembered it? <Link href="/login" className="font-bold text-clay">Log in</Link></p>
      </form>

      {/* Desktop (M11-D) */}
      <form action={action} className="flex items-stretch gap-6 max-lg:hidden" noValidate>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <StepHead n={1} tone="bg-butter text-butter-ink" title="Ask for a link" tag="Start" />
          <div className={cn("dc-card flex flex-1 flex-col gap-4 p-[26px]", sent && "opacity-60")}>
            <TiltTile icon="lock" tone="butter" size={64} rotate={-5} />
            <h2 className="font-display text-[30px] font-extrabold leading-[1.12]">Reset your password</h2>
            <p className="text-[15px] leading-normal text-bark">Enter the email you joined with. If it matches an account, we will send a link that works for one hour.</p>
            {field("f-email-d")}
            <SubmitButton className="h-[54px] w-full" pendingText="Sending…" disabled={sent && cd.left > 0}>Send reset link</SubmitButton>
            <p className="text-center text-[13.5px] text-stone">Remembered it? <Link href="/login" className="font-bold text-clay">Log in</Link></p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <StepHead n={2} tone="bg-mint text-mint-ink" title="Check your email" tag="After sending" />
          <div className={cn("dc-card flex flex-1 flex-col gap-4 p-[26px]", !sent && "opacity-60")} aria-live="polite">
            <TiltTile icon="mail" tone="mint" size={64} rotate={5} />
            <h2 className="font-display text-[30px] font-extrabold leading-[1.12]">Check your email</h2>
            <Note tone="mint" icon="check">If an account exists for that address, a link is on its way. It works once.</Note>
            <p className="text-[15px] leading-normal text-bark">It can take a minute. Check your spam folder if you do not see it.</p>
            <OpenInbox />
            {sent && again}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <StepHead n={3} tone="bg-blush text-blush-ink" title="Choose a new password" tag="From the link" />
          <div className="dc-card flex flex-1 flex-col gap-4 p-[26px] opacity-60">
            <TiltTile icon="lock" tone="blush" size={64} rotate={6} />
            <h2 className="font-display text-[30px] font-extrabold leading-[1.12]">Choose a new password</h2>
            <p className="text-[15px] leading-normal text-bark">The link opens this step. Use at least 10 characters, with a letter and a number, and something you have not used on other sites.</p>
          </div>
        </div>
      </form>
    </>
  );
}

function OpenInbox() {
  // The address is only in the input, so read it when clicked.
  return (
    <button type="button" className="dc-btn dc-btn-soft h-[54px] w-full"
      onClick={(e) => { const v = (e.currentTarget.form?.querySelector("input[name=email]") as HTMLInputElement | null)?.value ?? ""; const u = inboxUrl(v); if (u) window.open(u, "_blank", "noreferrer"); }}>
      <Icon name="mail" size={18} />Open my email
    </button>
  );
}
