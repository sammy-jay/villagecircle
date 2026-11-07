import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { Field, Input, initials } from "@/components/dc";
import { CountedTextarea, Select } from "@/components/dc/client";
import { COUNTRIES, EXPERIENCE_YEARS, MENTOR_AREAS, MENTOR_HEARD, MONTHLY_HOURS, SENIORITY, TIME_ZONES, opts } from "@/components/account/options";
import { mentorHome, mentorPage } from "@/lib/mentor-ctx";
import { applyView } from "@/lib/mentor";
import { EXPERTISE, expertiseLabel } from "@/lib/domain/expertise";
import { ATTESTATION_VERSION } from "@/lib/domain/mentor-application";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";
import { AreaChips, ApplyForm, Commitments, SendForm, type CommitmentDoc } from "./apply-forms";
import { NextSteps, Note, Panel, Review, Rows, Why } from "../mentor-kit";

export const metadata = { title: "Become a mentor" };
export const dynamic = "force-dynamic";

const STEPS = ["1. About you", "2. Your experience", "3. Safeguarding", "4. Review and send"];
const SHORT = ["About you", "Your experience", "Safeguarding", "Review and send"];
const COMMITMENTS: [string, string, CommitmentDoc?][] = [
  ["No child-safety history", "I have never been charged with or convicted of any offence involving child endangerment, abuse, neglect or exploitation, and I am on no child abuse or sex offender register anywhere. A false statement ends my place at once and may be reported to the authorities."],
  ["Code of Conduct", "I have read and accept the Mentor Code of Conduct, and will finish safeguarding orientation before my first conversation.",
    { title: "Mentor Code of Conduct", meta: "Word document · 18 KB · please read before you tick", href: "/docs/mentor-code-of-conduct.docx" }],
  ["Background check", "I agree to the team running a background check through an approved provider, and to tell them straight away if my circumstances change."],
  ["No contact details", "I will never swap phone numbers, emails or social handles with a young person, or move a conversation off the platform."],
];
const SIGN_STATEMENT = "I confirm everything above is true, that I have read and agree to the Code of Conduct and Safeguarding Policy, and that typing my legal name is my signature.";
const longDate = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "long", year: "numeric" }).format(d);
const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), hour: "numeric", minute: "2-digit" }).format(d);

type Rec = Record<string, unknown>;
const s = (o: Rec | null | undefined, k: string) => (o && o[k] != null ? (Array.isArray(o[k]) ? (o[k] as string[]).join(", ") : String(o[k])) : "");

/** M5–M8 (phone) and DK7–DK10 (desktop): the four-step mentor sign-up. Each step is saved on Continue; drafts keep half-typed work. */
export default async function Apply({ searchParams }: { searchParams: { step?: string } }) {
  const r = await mentorPage("/mentor/apply", "any");
  if ("to" in r) redirect(r.to);
  if (r.ctx.gate !== "APPLY") redirect(mentorHome(r.ctx.gate));
  const v = await applyView(r.ctx.userId);
  if (!v) redirect("/login");
  const max = !v.step1 ? 1 : !v.step2 ? 2 : !v.sign ? 3 : 4;
  const step = Math.min(Math.max(1, Number(searchParams.step) || max), max) as 1 | 2 | 3 | 4;
  const d = (v.draft ?? {}) as Rec;
  const s1 = { ...((d.s1 as Rec) ?? {}), ...(v.step1 ?? {}) } as Rec;
  const s2 = { ...((d.s2 as Rec) ?? {}), ...(v.step2 ?? {}) } as Rec;
  const bio = String(d.bio ?? s2.bio ?? "");
  const u = v.user;
  const minors = s2.optedForMinors === true || s2.optedForMinors === "yes";

  let body: ReactNode; let aside: ReactNode;
  if (step === 1) {
    aside = <><Why icon="info" title="Why we ask">Country, languages and time zone help us match you with Asks. They are used for counts and matching only, never shown with your name.</Why><Note icon="users" tone="butter">You can also hold a participant account with the same login, and switch between the two.</Note></>;
    body = (
      <ApplyForm step={1}>
        <Panel>
          <div className="flex items-center gap-4">
            <span className="flex size-[84px] shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-gold bg-butter font-display text-[30px] font-extrabold text-butter-ink">{initials(u.name)}</span>
            <div><p className="text-[17px] font-extrabold">Your initials, {initials(u.name)}</p><p className="text-[14px] text-bark">This is what young adults see. No photo is needed or shown.</p></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Full legal name" htmlFor="name" hint="From your account."><Input id="name" value={u.name} readOnly aria-readonly /></Field>
            <Field label="Email" htmlFor="email"><Input id="email" value={u.email} readOnly aria-readonly /></Field>
            <Field label="Date of birth" htmlFor="dob" hint="Mentors must be 21 or older."><Input id="dob" value={u.dateOfBirth ? new Intl.DateTimeFormat("en-GB", { timeZone: "UTC" }).format(u.dateOfBirth) : "Not given"} readOnly aria-readonly /></Field>
            <Field label="Mobile number" htmlFor="phone" hint="Only the team can see this."><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+234 801 234 5678" defaultValue={s(s1, "phone") || u.phone || ""} /></Field>
            <Field label="Country of residence"><Select name="country" options={opts(COUNTRIES)} defaultValue={s(s1, "country") || u.countryOfResidence || ""} /></Field>
            <Field label="State or region" htmlFor="region"><Input id="region" name="region" placeholder="For example, Lagos or Texas" defaultValue={s(s1, "region")} /></Field>
          </div>
          <Field label="Languages you can mentor in" htmlFor="languages">
            <Input id="languages" name="languages" placeholder="English, Yoruba" defaultValue={s(s1, "languages") || u.languages.join(", ")} />
            <input name="languagesMore" defaultValue={s(s1, "languagesMore")} placeholder="Say more (optional), for example: I can switch to Pidgin" aria-label="Say more about languages (optional)" className="dc-saymore mt-[7px]" />
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Time zone" hint="Young adults see your times in WAT."><Select name="timeZone" options={opts(TIME_ZONES)} defaultValue={s(s1, "timeZone")} /></Field>
            <Field label="Years of experience"><Select name="experience" options={opts(EXPERIENCE_YEARS)} defaultValue={s(s1, "experience")} /></Field>
          </div>
          <Field label="How did you hear about us?"><Select name="heard" options={opts(MENTOR_HEARD)} defaultValue={s(s1, "heard")} sayMore={{ name: "heardMore", defaultValue: s(s1, "heardMore"), show: "always" }} /></Field>
          <Field label="Short bio" htmlFor="bio" hint="Shown to the team, and in short on your profile. Write like you talk.">
            <CountedTextarea id="bio" name="bio" max={600} rows={4} defaultValue={bio} placeholder="What you do, the road you took, and what you are happy to talk about." />
          </Field>
        </Panel>
        <p className="flex items-center gap-2.5 rounded-[18px] bg-mint px-4 py-3 text-[13.5px] text-mint-ink lg:hidden"><Icon name="info" size={18} className="shrink-0" />Country, languages and time zone are used for matching and counts only.</p>
      </ApplyForm>
    );
  } else if (step === 2) {
    aside = <><Why icon="info" title="Why we ask">Areas, industry and hours are counted so the team knows where more mentors are needed. Nothing here is a target or a ranking.</Why>
      <section className="rounded-card border border-line bg-card p-5"><h2 className="font-display text-[18px] font-extrabold">The ten areas</h2><div className="mt-3 flex flex-wrap gap-1.5">{MENTOR_AREAS.map((a) => <span key={a} className="rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold">{a}</span>)}</div></section></>;
    body = (
      <ApplyForm step={2} back="/mentor/apply?step=1">
        <Panel>
          <Field label="Areas you can help with (pick up to three)" hint="Choose from our list so young adults can find you."><AreaChips options={MENTOR_AREAS} defaultValue={Array.isArray(s2.areas) ? (s2.areas as string[]) : []} /></Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Industry"><Select name="primaryExpertise" options={EXPERTISE.map(([value, label]) => ({ value, label }))} defaultValue={s(s2, "primaryExpertise")} sayMore={{ name: "expertiseOther", defaultValue: s(s2, "expertiseOther"), placeholder: "If Other, tell us your field", show: "selected" }} /></Field>
            <Field label="Seniority"><Select name="seniority" options={opts(SENIORITY)} defaultValue={s(s2, "seniority")} /></Field>
            <Field label="Hours a month" hint="One hour is enough. Change it any time."><Select name="monthlyHours" options={MONTHLY_HOURS.map(([value, label]) => ({ value, label }))} defaultValue={s(s2, "monthlyHours") || "1"} /></Field>
            <Field label="Conversation length"><Select name="conversationLength" options={[{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }]} defaultValue={s(s2, "conversationLength") || "60"} /></Field>
          </div>
          <Field label="LinkedIn page (optional)" htmlFor="li" hint="A CV or LinkedIn never blocks you. If the team needs more, a person asks you."><Input id="li" name="linkedinUrl" placeholder="linkedin.com/in/yourname" defaultValue={s(s2, "linkedinUrl")} /></Field>
          <fieldset className="rounded-[20px] bg-sand p-4 lg:p-5">
            <legend className="sr-only">Meet young adults under 18</legend>
            <p className="text-[16px] font-extrabold">Meet young adults under 18, with a guardian?</p>
            <p className="mt-1 text-[13.5px] leading-normal text-bark">A guardian approves every conversation and may stay for it. Conversations with under 18s are recorded. This adds an enhanced check of up to 10 business days. It is your choice, and you can change it later.</p>
            <div className="mt-3 flex gap-2">
              {[["yes", "Yes, I would like to"], ["no", "Adults only for now"]].map(([val, l]) => (
                <label key={val} className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-field border-2 border-line bg-card px-3.5 py-3 text-[14.5px] font-semibold has-[:checked]:border-forest">
                  <input type="radio" name="optedForMinors" value={val} defaultChecked={(val === "yes") === minors} className="size-5 accent-[#2F6B4F]" />{l}
                </label>
              ))}
            </div>
          </fieldset>
        </Panel>
      </ApplyForm>
    );
  } else if (step === 3) {
    aside = <><Why icon="info" title="Why we ask">Every mentor makes the same promises, in the same words. It protects young adults, and it protects you.</Why>
      <section className="rounded-card border border-line bg-card p-5"><h2 className="font-display text-[18px] font-extrabold">What happens to your name</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">Your legal name is kept by the team for the record. Young adults only ever see your first name and your title.</p></section></>;
    body = (
      <ApplyForm step={3} back="/mentor/apply?step=2">
        {minors && <p className="flex items-start gap-3 rounded-[20px] bg-mint px-5 py-4 text-[14.5px] text-mint-ink"><Icon name="shieldCheck" size={20} className="mt-px shrink-0" />You chose to meet under 18s. That adds an enhanced check of up to 10 business days. A guardian approves every conversation.</p>}
        <Commitments items={COMMITMENTS} statement={SIGN_STATEMENT} accountName={u.name} />
      </ApplyForm>
    );
  } else {
    const signedAt = v.sign ? new Date(v.sign.at) : new Date();
    const areas = Array.isArray(s2.areas) ? (s2.areas as string[]) : [];
    aside = <><section className="rounded-card border border-line bg-card p-5"><h2 className="font-display text-[19px] font-extrabold">What happens next</h2><NextSteps /></section><Note icon="heart" tone="butter">Passing on an Ask is private and never counts against you.</Note></>;
    body = (
      <>
        <Review title="About you" icon="user" edit={1}>
          <div className="flex items-center gap-3 border-b border-line pb-3"><span className="flex size-[52px] items-center justify-center rounded-full bg-butter font-display text-[19px] font-bold text-butter-ink">{initials(u.name)}</span><div><p className="text-[18px] font-extrabold">{u.name}</p><p className="text-[13px] text-stone">{u.email}</p></div></div>
          <Rows rows={[["Based in", [s(s1, "region"), s(s1, "country")].filter(Boolean).join(", ")], ["Languages", s(s1, "languages")], ["Time zone", s(s1, "timeZone").replace(/, UTC.*$/, "")], ["Experience", s(s1, "experience")]]} />
        </Review>
        <Review title="Your experience" icon="target" edit={2}>
          {areas.length > 0 && <div className="flex flex-wrap gap-2 border-b border-line pb-3">{areas.map((a) => <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-[14px] font-semibold text-forest-ink"><Icon name="check" size={15} />{a}</span>)}</div>}
          <Rows rows={[["Industry", s2.primaryExpertise ? expertiseLabel(String(s2.primaryExpertise)) : ""], ["Seniority", s(s2, "seniority")], ["Time", `${s(s2, "monthlyHours") || 1} hour${s(s2, "monthlyHours") === "1" || !s2.monthlyHours ? "" : "s"} a month, ${s(s2, "conversationLength") || 60} minutes`], ["Under 18s, with a guardian", minors ? "Yes" : "No"]]} />
        </Review>
        <Review title="Safeguarding" icon="shieldCheck" edit={3}>
          <div className="rounded-[18px] bg-mint px-[18px] py-4 text-mint-ink">
            <p className="text-[11.5px] font-extrabold uppercase tracking-[.08em]">Signed with your legal name</p>
            <p className="mt-1 font-hand text-[40px] font-semibold leading-none">{v.sign?.typedLegalName}</p>
            <p className="mt-1.5 text-[13px]">{longDate(signedAt)} · Statement version {v.sign?.version ?? ATTESTATION_VERSION}</p>
          </div>
          <Rows rows={[["No child-safety history", "Confirmed"], ["Code of Conduct", "Accepted"], ["Background check", "Consent given"], ["No contact details", "Promised"]]} />
        </Review>
        <SendForm />
      </>
    );
  }

  const titles = ["Tell us about yourself", "What do you do, and what could you help with?", "Keeping young adults safe", "Ready to step into the village?"];
  const subs = ["You do not need a perfect profile. We only ask what helps us place you well and keep young adults safe.", "Pick from the list so the right Asks find you. Takes about two minutes.", "Someone will trust you with a real question. These four commitments are how we honour that trust.", "Have a last look. You can edit anything before you send."];
  const phoneSubs = ["Only what helps us place you well and keep young adults safe.", "Pick from the list so the right Asks find you.", "Four promises, then sign with your legal name.", "Have a last look before you send."];
  const saved = v.savedAt && v.state === "DRAFT";
  const closeBtn = step < 4
    ? <button type="submit" form="apply-form" name="intent" value="close" className="text-[15px] font-bold max-lg:text-clay">Save and close</button>
    : <Link href="/?draft=saved" className="text-[15px] font-bold max-lg:text-clay">Save and close</Link>;
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 hidden h-[68px] items-center justify-between border-b border-line bg-card px-8 lg:flex">
        <Link href="/" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={51} height={46} priority /></Link>
        <div className="flex items-center gap-[18px]">
          {saved && <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-2 text-[13px] font-semibold text-mint-ink"><Icon name="check" size={15} />Draft saved {time(v.savedAt!)}</span>}
          {closeBtn}
        </div>
      </header>
      <div className="flex h-[60px] items-center gap-2 px-4 lg:hidden">
        <Link href="/" aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand"><Icon name="x" size={20} /></Link>
        <p className="ml-2 flex-1 font-display text-[19px] font-extrabold">Mentor sign-up</p>
        {closeBtn}
      </div>
      <div className="mx-auto flex max-w-[1068px] gap-7 px-4 pb-10 lg:px-0 lg:pt-8">
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[740px] lg:gap-5">
          <div className="lg:hidden">
            <ol className="flex gap-1.5" aria-label="Steps">{STEPS.map((x, i) => <li key={x} className={cn("h-1.5 flex-1 rounded", i <= step - 1 ? "bg-forest" : "bg-sand")} aria-current={i === step - 1 ? "step" : undefined}><span className="sr-only">{x}</span></li>)}</ol>
            <p className="mt-2 flex justify-between text-[13px]"><b>Step {step} of 4 · {SHORT[step - 1]}</b><span className="text-stone">About ten minutes</span></p>
          </div>
          <div>
            <p className="text-[13px] font-extrabold uppercase tracking-[.06em] text-clay max-lg:hidden">Become a mentor · Step {step} of 4</p>
            <h1 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-[-.02em] lg:mt-2 lg:text-[40px]">{titles[step - 1]}</h1>
            <p className="mt-2 text-[15.5px] text-bark lg:max-w-[600px] lg:text-[17px]"><span className="max-lg:hidden">{subs[step - 1]}</span><span className="lg:hidden">{phoneSubs[step - 1]}</span></p>
          </div>
          <ol className="hidden gap-2.5 lg:flex" aria-label="Steps">
            {STEPS.map((x, i) => (
              <li key={x} className="flex flex-1 flex-col gap-[7px]" aria-current={i === step - 1 ? "step" : undefined}>
                <span className={cn("h-2 rounded", i <= step - 1 ? "bg-forest" : "bg-sand")} />
                {i + 1 < step ? <Link href={`/mentor/apply?step=${i + 1}`} className="text-[13px] font-semibold text-stone hover:underline">{x}</Link> : <span className={cn("text-[13px]", i === step - 1 ? "font-extrabold" : "font-semibold text-stone")}>{x}</span>}
              </li>
            ))}
          </ol>
          {body}
        </main>
        <aside className="hidden w-[300px] flex-none flex-col gap-4 self-start lg:sticky lg:top-[100px] lg:flex">{aside}</aside>
      </div>
    </div>
  );
}

