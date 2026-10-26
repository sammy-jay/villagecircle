"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { CodeInput, Signature } from "@/components/dc/client";
import { CheckRow, FieldWrap, Note, PasswordField, SubmitButton, TextField } from "@/components/forms/fields";
import { ArtCard, HelpLink, StepBars, TiltTile } from "@/components/account/shells";
import { RingAvatar } from "@/components/public/kit";
import { initials } from "@/components/dc";
import { useCooldown } from "@/components/account/resend";
import { checkCodeAction, decideAction, inviteCodeAction, type ActionState } from "@/app/account-actions";
import { cn } from "@/lib/cn";
import { useConfirmSubmit } from "@/components/app/confirm";

export type InviteInfo = { token: string; firstName: string; age: number | null; guardianName: string; phoneHint: string; hasAccount: boolean; codeSent: boolean };

const AUTHORIZING = [
  "Conversations of 30 to 60 minutes through the platform",
  "Only mentors we have verified and cleared to work with young people",
  "You approve the specific mentor and the time before any contact",
  "You may attend, or stay reachable during the conversation",
  "Conversations are recorded, and you may request the recording",
  "No contact details are shared in either direction, and off-platform contact is prohibited",
  "You may raise a concern, or withdraw this authorization, at any time",
];
const STATEMENT = "I confirm everything above is true, that I have read and agree to the Code of Conduct and Safeguarding Policy, and that typing my legal name is my signature.";

function Tick() { return <span className="mt-px flex size-[26px] flex-none items-center justify-center rounded-full bg-mint text-mint-ink"><Icon name="check" size={15} strokeWidth={3} /></span>; }

/** Left column of DK5 / top of M3. */
function Details({ v }: { v: InviteInfo }) {
  const each: [string, string, string, "butter" | "mint" | "blush", "message" | "users" | "clock"][] = [["Every Ask", "You read it before a mentor does", "bg-butter text-butter-ink", "butter", "message"], ["Every mentor", "You see who, and why them", "bg-mint text-mint-ink", "mint", "users"], ["Every time", "You pick or confirm the slot", "bg-blush text-blush-ink", "blush", "clock"]];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 lg:gap-3.5">
          <RingAvatar initials={initials(v.firstName)} tone="blush" size={48} className="lg:hidden" />
          <RingAvatar initials={initials(v.firstName)} tone="blush" size={56} className="max-lg:hidden" />
          <p className="text-[12.5px] font-extrabold tracking-[.05em] text-clay lg:text-[13px]">FOR {v.firstName.toUpperCase()}{v.age != null && ` · AGE ${v.age}`}</p>
        </div>
        <h1 className="font-display text-[34px] font-extrabold leading-[1.04] lg:text-[48px] lg:leading-[1.02] lg:tracking-[-.02em]">Authorize {v.firstName}&apos;s account</h1>
        <p className="text-[15.5px] leading-normal text-bark lg:text-[16.5px]">{v.firstName} would like to join The Village Circle and speak with a professional in the community. Before we connect them with anyone, we need your authorization as their parent or guardian, and you stay part of the process after it.</p>
      </div>
      <section className="dc-card p-5 lg:p-7">
        <h2 className="mb-3.5 font-display text-[21px] font-extrabold leading-[1.12] lg:mb-4 lg:text-[24px]">What you are authorizing</h2>
        <ul className="flex flex-col gap-3 lg:gap-[13px]">{AUTHORIZING.map((a) => <li key={a} className="flex items-start gap-3 text-[15.5px] leading-[1.45]"><Tick />{a}</li>)}</ul>
      </section>
      <section className="dc-card p-5 lg:p-7">
        <h2 className="font-display text-[21px] font-extrabold leading-[1.12] lg:text-[24px]"><span className="lg:hidden">You still say yes to each Ask</span><span className="max-lg:hidden">After this, you still say yes to each Ask</span></h2>
        <p className="mb-1 mt-1.5 text-[14.5px] leading-normal text-bark lg:mb-4 lg:text-[15.5px]">Authorizing the account does not approve any conversation. For every Ask you get a text and an email, and nothing goes ahead without your yes.</p>
        <div className="flex gap-3.5 max-lg:hidden">
          {each.map(([t, s, cls, , icon]) => <div key={t} className={cn("flex-1 rounded-[22px] p-[18px]", cls)}><Icon name={icon} size={26} /><p className="mt-2.5 font-display text-[18px] font-extrabold">{t}</p><p className="mt-[3px] text-[13.5px] leading-[1.4]">{s}</p></div>)}
        </div>
        <div className="lg:hidden">
          {each.map(([t, s, , tone, icon], i) => (
            <div key={t} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
              <span className={cn("flex size-[46px] flex-none items-center justify-center rounded-[15px]", { butter: "bg-butter text-butter-ink", mint: "bg-mint text-mint-ink", blush: "bg-blush text-blush-ink" }[tone])}><Icon name={icon} size={23} /></span>
              <div><p className="text-[15.5px] font-bold">{t}</p><p className="mt-0.5 text-[13.5px] text-stone">{s}</p></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Frame({ children, phoneHelp = true }: { children: ReactNode; phoneHelp?: boolean }) {
  return (
    <div className="min-h-screen">
      <header className="hidden h-[76px] items-center justify-between border-b border-line bg-card px-14 lg:flex">
        <Link href="/" aria-label="The Village Circle, home"><img src="/brand/logo.png" alt="The Village Circle" width={56} height={50} /></Link>
        <span className="text-[14.5px] text-stone"><HelpLink /></span>
      </header>
      <div className="flex h-[60px] items-center gap-2 px-4 lg:hidden">
        <img src="/brand/mark.png" alt="" width={38} height={37} />
        <span className="flex-1" />
        {phoneHelp && <span className="text-[13px] text-stone"><HelpLink short /></span>}
      </div>
      <main id="main" className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 pb-[18px] pt-1 lg:flex-row lg:items-start lg:gap-8 lg:px-14 lg:pb-14 lg:pt-10">{children}</main>
    </div>
  );
}

/** DK5 / M3 / M20: details, then the code, then the authorization. */
export function AuthorizeFlow({ v }: { v: InviteInfo }) {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "code" | "authorize" | "done">(v.codeSent ? "code" : "intro");
  const [code, setCode] = useState("");
  const [sendState, send] = useFormState<ActionState, FormData>(inviteCodeAction, {});
  const [checkState, check] = useFormState<ActionState, FormData>(checkCodeAction, {});
  const [decision, decideNow] = useFormState<ActionState, FormData>(decideAction, {});
  const cd = useCooldown(60, v.codeSent);

  useEffect(() => { if (sendState.ok) { setStep("code"); cd.restart(); } }, [sendState]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (checkState.ok) { setCode(String(checkState.code)); setStep("authorize"); } if (checkState.locked) router.refresh(); }, [checkState, router]);
  useEffect(() => { if (decision.ok) setStep("done"); if (decision.code === "LOCKED" || decision.code === "WRONG") { setStep("code"); } }, [decision]);

  const resend = (label: string, channel: "sms" | "email" = "sms") => (
    <form action={send} className="inline">
      <input type="hidden" name="token" value={v.token} /><input type="hidden" name="channel" value={channel} />
      {cd.left > 0 && channel === "sms" ? <span className="text-[14px] text-stone">Send again in <b className="text-clay">{cd.label}</b></span> : <button type="submit" className="text-[14px] font-bold text-clay">{label}</button>}
    </form>
  );

  if (step === "done") {
    const ok = decision.outcome === "AUTHORIZED";
    return (
      <Frame>
        <div className="mx-auto flex max-w-[640px] flex-col items-start gap-4 lg:pt-8">
          <TiltTile icon={ok ? "check" : "heart"} tone={ok ? "mint" : "blush"} />
          <h1 className="font-display text-[38px] font-extrabold leading-[1.04] lg:text-[48px]">{ok ? `Thank you. ${v.firstName}'s account is authorized.` : "Thank you for letting us know"}</h1>
          <p className="text-[16.5px] leading-normal text-bark">{ok ? "Our team does a quick check, then opens the account. This usually takes up to two business days. For every Ask, you will get a text and an email, and nothing goes ahead without your yes." : `${v.firstName}'s account has been closed and nothing was shared. You are welcome to talk with them about it.`}</p>
          {ok && <Link href="/login" className="dc-btn dc-btn-primary h-14"><Icon name="arrowRight" size={18} />Log in to your guardian account</Link>}
        </div>
      </Frame>
    );
  }

  if (step === "code") {
    return (
      <div className="min-h-screen lg:flex">
        <div className="flex flex-col gap-4 px-6 pb-[18px] lg:w-[640px] lg:flex-none lg:px-20 lg:py-11">
          <div className="flex h-[60px] items-center lg:hidden"><button type="button" onClick={() => setStep("intro")} aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-sand"><Icon name="chevronLeft" size={20} /></button></div>
          <img src="/brand/logo.png" alt="The Village Circle" width={62} height={56} className="max-lg:hidden" />
          <main id="main" className="flex flex-col gap-4 lg:flex-1 lg:justify-center lg:pb-10">
            <div className="lg:mt-6"><StepBars steps={[["1. Details", "1. Your details"], ["2. Code", "2. Your code"], ["3. Authorize", "3. Authorize"]].map(([p, d]) => <><span className="lg:hidden">{p}</span><span className="max-lg:hidden">{d}</span></>)} current={1} /></div>
            <div className="flex flex-col gap-2.5 lg:mt-2.5">
              <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">STEP 2 OF 3</p>
              <h1 className="font-display text-[34px] font-extrabold leading-[1.05] lg:text-[44px] lg:leading-[1.02] lg:tracking-[-.02em]">Enter the code we texted you</h1>
              <p className="text-[15.5px] leading-normal text-bark lg:text-[16.5px]">Sent to a number <b>{v.phoneHint}</b>. It takes up to a minute.</p>
            </div>
            <form id="code-form" action={check} className="flex flex-col gap-4">
              <input type="hidden" name="token" value={v.token} />
              <CodeInput name="code" autoFocus invalid={!!checkState.error} />
              <button type="submit" className="dc-btn dc-btn-primary h-14 w-full max-lg:hidden">Verify</button>
            </form>
            {(checkState.error || decision.error || sendState.error) && <p role="alert" className="text-[14px] font-semibold text-clay">{String(checkState.error ?? decision.error ?? sendState.error)}</p>}
            <p className="text-[14.5px] text-stone">Did not arrive? {resend("Send again")}</p>
            <div className="flex items-start gap-2.5 rounded-field bg-butter px-3.5 py-3 text-[13.5px] leading-[1.45] text-butter-ink">
              <Icon name="lock" size={18} /><p>{typeof checkState.attemptsLeft === "number" ? `${checkState.attemptsLeft} attempts left.` : "5 attempts."} After that you can try again in 15 minutes.</p>
            </div>
            <ArtCard rotate={-1.5} className="lg:hidden"><SmsPreview /></ArtCard>
          </main>
        </div>
        <aside aria-hidden="true" className="hidden flex-1 items-center justify-center overflow-hidden bg-butter p-10 lg:flex">
          <ArtCard rotate={-2} className="w-[380px] p-[22px]"><SmsPreview big /></ArtCard>
        </aside>
        <div className="h-[104px] lg:hidden" />
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden"><button type="submit" form="code-form" className="dc-btn dc-btn-primary h-14 w-full">Verify</button></div>
      </div>
    );
  }

  return (
    <Frame>
      <Details v={v} />
      <div className="flex w-full flex-col gap-3.5 lg:sticky lg:top-[30px] lg:w-[440px] lg:flex-none">
        {step === "intro" ? (
          <section className="dc-card flex flex-col gap-4 p-5 lg:gap-[18px] lg:p-7">
            <div className="flex items-center gap-2.5"><Icon name="shieldCheck" size={24} className="text-forest" /><h2 className="font-display text-[21px] font-extrabold leading-[1.12] lg:text-[24px]">Verify it is you</h2></div>
            <p className="text-[14.5px] leading-normal text-bark lg:text-[15px]">We will text a 6-digit code to the number {v.phoneHint}. It lasts 15 minutes and we never ask for it by phone.</p>
            <form action={send}><input type="hidden" name="token" value={v.token} /><SubmitButton icon="send" className="h-14 w-full" pendingText="Sending…">Text me the code</SubmitButton></form>
            {sendState.error && <p role="alert" className="text-[14px] font-semibold text-clay">{String(sendState.error)}</p>}
            <p className="text-center text-[14px] text-stone">No signal? {resend("Email it instead", "email")}</p>
            <p className="text-center text-[13.5px] leading-normal text-stone">This link is single-use and expires in 14 days.</p>
          </section>
        ) : (
          <form action={decideNow} className="flex flex-col gap-3.5">
            <input type="hidden" name="token" value={v.token} /><input type="hidden" name="code" value={code} />
            <div className="flex flex-col gap-3.5 lg:dc-card lg:gap-[18px] lg:p-7">
              <section className="dc-card flex flex-col gap-4 p-5 lg:border-0 lg:p-0">
                <div className="flex items-center gap-2.5"><Icon name="shieldCheck" size={24} className="text-forest" /><h2 className="font-display text-[21px] font-extrabold leading-[1.12] lg:text-[24px]">Verify it is you</h2></div>
                <div className="flex items-center justify-between"><span className="dc-pill bg-mint text-caption text-mint-ink"><Icon name="check" size={16} />Code matches</span><button type="button" onClick={() => setStep("code")} className="text-[14px] font-bold text-clay">Change code</button></div>
              </section>
              <hr className="border-line max-lg:hidden" />
              <fieldset className="dc-card flex flex-col gap-3 p-5 lg:border-0 lg:p-0">
                <legend className="mb-3 text-label font-bold text-bark">Your preference for conversations</legend>
                {([["ATTEND", "I will attend each conversation"], ["REACHABLE", "I will be reachable, not present"]] as const).map(([val, l], i) => (
                  <label key={val} className="flex cursor-pointer items-center gap-3 rounded-[18px] border-2 border-line bg-card px-4 py-3.5 has-[:checked]:border-forest">
                    <span className="relative size-[26px] flex-none">
                      <input type="radio" name="preference" value={val} defaultChecked={i === 0} className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border-2 border-line checked:border-forest" />
                      <span className="pointer-events-none absolute inset-[7px] hidden rounded-full bg-forest peer-checked:block" />
                    </span>
                    <span className="text-[15px] font-semibold leading-[1.4]">{l}</span>
                  </label>
                ))}
              </fieldset>
              {!v.hasAccount && (
                <>
                  <hr className="border-line max-lg:hidden" />
                  <section className="dc-card flex flex-col gap-4 p-5 lg:border-0 lg:p-0">
                    <FieldWrap label="Your name" htmlFor="a-name"><TextField id="a-name" name="name" defaultValue={v.guardianName} autoComplete="name" /></FieldWrap>
                    <FieldWrap label="Choose a password" htmlFor="a-pass" hint="At least 10 characters, with a letter and a number. This is for your guardian account." error={decision.code === "PASSWORD_REQUIRED" || decision.code === "WEAK_PASSWORD" ? String(decision.error) : undefined}>
                      <PasswordField id="a-pass" name="password" autoComplete="new-password" />
                    </FieldWrap>
                  </section>
                </>
              )}
              <hr className="border-line max-lg:hidden" />
              <CheckRow name="confirm" label={`I confirm I am ${v.firstName}'s parent or legal guardian, I have read the Code of Conduct and the family participation guidelines, and I authorize this account.`} />
              <Signature statement={STATEMENT} error={decision.field === "legalName" || decision.field === "attest" ? String(decision.error) : undefined} />
              {decision.error && !["legalName", "attest"].includes(String(decision.field)) && !["PASSWORD_REQUIRED", "WEAK_PASSWORD"].includes(String(decision.code)) && <p role="alert" className="text-[14px] font-semibold text-clay">{String(decision.error)}</p>}
              <div className="flex flex-col gap-3 max-lg:hidden">
                <SubmitButton icon="check" className="h-[58px] w-full" pendingText="Authorizing…">Authorize</SubmitButton>
                <DeclineButton className="dc-btn dc-btn-ghost h-[50px] w-full" />
                <p className="text-center text-[13.5px] leading-normal text-stone">This link is single-use and expires in 14 days.</p>
              </div>
            </div>
            <div className="h-[130px] lg:hidden" />
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">
              <SubmitButton icon="check" className="h-[58px] w-full" pendingText="Authorizing…">Authorize</SubmitButton>
              <DeclineButton className="mt-3 block w-full text-center text-[14.5px] font-bold text-ink" />
              <p className="mt-2 text-center text-caption text-stone">This link is single-use and expires in 14 days.</p>
            </div>
          </form>
        )}
        {step === "intro" && <Note tone="butter" icon="alert" className="lg:hidden">We never ask for a code by phone or message. If someone does, do not share it.</Note>}
      </div>
    </Frame>
  );
}

/** "I do not authorize this" posts decision=decline after the app's own dialog confirms it. */
function DeclineButton({ className }: { className: string }) {
  const declining = useConfirmSubmit({ title: "Not authorize this account?", body: "The account is closed and nothing is shared.", confirmLabel: "Do not authorize", cancelLabel: "Go back", danger: true });
  return (
    <>
      <button type="submit" name="decision" value="decline" className={className} onClick={declining.onClick}>I do not authorize this</button>
      {declining.dialog}
    </>
  );
}

function SmsPreview({ big }: { big?: boolean }) {
  return (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <span className={cn("flex items-center justify-center rounded-full bg-mint font-display font-bold text-mint-ink", big ? "size-[38px] text-[14px]" : "size-[34px] text-[12px]")}>VC</span>
        <div><p className={cn("font-extrabold", big ? "text-[14.5px]" : "text-[14px]")}>Village Circle</p><p className="text-[12px] text-stone">Text message · now</p></div>
      </div>
      <p className={cn("rounded-[18px] bg-sand leading-normal", big ? "px-4 py-3.5 text-[16px]" : "px-3.5 py-3 text-[14.5px]")}>Your Village Circle code is <b>●●● ●●●</b>. It lasts 15 minutes. We never ask for it by phone.</p>
    </>
  );
}
