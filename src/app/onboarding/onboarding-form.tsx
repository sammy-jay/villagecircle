"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { ChipPicker, FieldError, FieldWrap, MultiSelectField, SelectField, SubmitButton, TextField, sayMoreClass } from "@/components/forms/fields";
import { StepBars } from "@/components/account/shells";
import { RingAvatar } from "@/components/public/kit";
import { initials } from "@/components/dc";
import { BACKGROUNDS, BACKGROUND_EXCLUSIVE, GOALS, INTERESTS, LANGUAGES, STAGES, opts, regionsFor } from "@/components/account/options";
import { onboardingAction, type ActionState } from "@/app/account-actions";
import { cn } from "@/lib/cn";

export type OnboardingData = { first: string; band: string; cohort?: string | null; country?: string | null; region?: string | null; town?: string | null; interests: string[]; goal?: string; goalMore?: string; background?: string[]; backgroundMore?: string; languages: string[] };

const HEAD: Record<number, { eyebrow: (f: string) => string; title: string; sub: string; subPhone: string }> = {
  1: { eyebrow: () => "STEP 1 OF 3", title: "Tell us a little about you", sub: "Only your name and age are needed. Everything else helps us find the right person and is up to you.", subPhone: "Only your name and age are needed. The rest is up to you." },
  2: { eyebrow: () => "STEP 2 OF 3", title: "What are you into?", sub: "Pick what you are curious about. You can change it any time.", subPhone: "Pick what you are curious about. You can change it any time." },
  3: { eyebrow: () => "STEP 3 OF 3", title: "Anything about your background?", sub: "This is optional and you can skip it. It helps the team make sure the village reaches everyone.", subPhone: "Optional. You can skip it." },
};

/** M12 / M12-D profile builder, one step at a time. */
export function OnboardingStep({ step, data }: { step: 1 | 2 | 3; data: OnboardingData }) {
  const [state, action] = useFormState<ActionState, FormData>(onboardingAction, {});
  const [cohort, setCohort] = useState(data.cohort ?? "");
  const [interests, setInterests] = useState(data.interests);
  const [goal, setGoal] = useState(data.goal ?? "");
  const stage = STAGES.find(([v]) => v === cohort)?.[1].replace(/ \(.*\)$/, "");
  const h = HEAD[step]!;
  const lock = <Icon name="lock" size={18} />;
  const regions = regionsFor(data.country ?? "Nigeria"); // accounts from before the country picker were all Nigeria

  return (
    <div className="flex flex-col gap-11 lg:flex-row lg:items-start">
      <form id="onboarding-form" action={action} className="flex min-w-0 flex-1 flex-col gap-3.5 lg:gap-5" noValidate>
        <input type="hidden" name="step" value={step} />
        <StepBars steps={[["1. Where", "1. Where you are"], ["2. Likes", "2. What you like"], ["3. Background", "3. Background"]].map(([p, d]) => <><span className="lg:hidden">{p}</span><span className="max-lg:hidden">{d}</span></>)} current={step - 1} />
        <div className="flex flex-col gap-2 lg:mt-1.5">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay">{step === 1 ? <><span className="lg:hidden">WELCOME, {data.first.toUpperCase()}</span><span className="max-lg:hidden">{h.eyebrow(data.first)}</span></> : <span className="max-lg:hidden">{h.eyebrow(data.first)}</span>}</p>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-.01em] lg:text-[42px] lg:leading-[1.04] lg:tracking-[-.02em]">{h.title}</h1>
          <p className="text-[15.5px] leading-normal text-bark lg:text-[16.5px]"><span className="lg:hidden">{h.subPhone}</span><span className="max-lg:hidden">{h.sub}</span></p>
        </div>

        <div className="flex flex-col gap-4 lg:dc-card lg:gap-5 lg:p-7">
          {step === 1 && (
            <>
              <FieldWrap label="Where are you right now?" htmlFor="o-stage" hint="Pick the one closest to you."><SelectField id="o-stage" name="cohort" options={STAGES.map(([value, label]) => ({ value, label }))} value={cohort} onChange={setCohort} /></FieldWrap>
              <FieldWrap label="Which state are you in?" htmlFor="o-state" hint="Used for anonymous counts only. Mentors never see it.">
                {regions ? <SelectField id="o-state" name="region" options={opts(regions)} defaultValue={data.region ?? undefined} /> : <TextField id="o-state" name="region" maxLength={60} defaultValue={data.region ?? ""} placeholder="Country and state or region" />}
                <input name="town" defaultValue={data.town ?? ""} placeholder="Say more (optional), for example your city" aria-label="Say more about where you are (optional)" className={sayMoreClass} />
              </FieldWrap>
              <div className="flex items-start gap-2.5 rounded-field bg-mint px-3.5 py-3 text-[13.5px] leading-[1.45] text-mint-ink">{lock}<p>We never ask for your school, address or last name.</p></div>
            </>
          )}
          {step === 2 && (
            <>
              <FieldWrap label="What are you curious about?" hint={`Pick at least 1 and up to 5. ${interests.length} chosen.`}>
                <ChipPicker name="interests" options={INTERESTS} defaultValue={data.interests} max={5} onChange={setInterests} />
              </FieldWrap>
              {state.field === "interests" && <FieldError>{state.error}</FieldError>}
              <FieldWrap label="A goal you have (optional)" htmlFor="o-goal">
                <SelectField id="o-goal" name="goal" options={opts(GOALS)} value={goal} onChange={setGoal} placeholder="Choose one" sayMore={{ name: "goalMore", show: "always", defaultValue: data.goalMore, placeholder: "Say more (optional), for example the course you have in mind" }} />
              </FieldWrap>
            </>
          )}
          {step === 3 && (
            <>
              <FieldWrap label="Community background (optional)" htmlFor="o-bg" hint="Pick any that apply.">
                <MultiSelectField id="o-bg" name="background" options={opts(BACKGROUNDS)} exclusive={BACKGROUND_EXCLUSIVE} defaultValue={data.background} placeholder="Choose any that apply" sayMore={{ name: "backgroundMore", defaultValue: data.backgroundMore }} />
              </FieldWrap>
              <div className="flex items-start gap-2.5 rounded-field bg-mint px-3.5 py-3 text-[13.5px] leading-[1.45] text-mint-ink">{lock}<p>Used only for anonymous counts, so the team can see who the village is reaching. It is never shown on your profile or to mentors.</p></div>
              <FieldWrap label="Languages you speak (optional)"><ChipPicker name="languages" options={LANGUAGES} defaultValue={data.languages} /></FieldWrap>
            </>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between max-lg:hidden">
          {step > 1 ? <Link href={`/onboarding?step=${step - 1}`} className="dc-btn dc-btn-soft h-[54px]"><Icon name="chevronLeft" size={18} />Back</Link> : <span />}
          <div className="flex items-center gap-3.5">
            {step === 3 && <button type="submit" name="skip" value="1" className="text-[15px] font-bold text-stone">Skip this step</button>}
            <SubmitButton icon="arrowRight" className="h-[54px]" pendingText="Saving…">{step === 3 ? "Show me my village" : "Continue"}</SubmitButton>
          </div>
        </div>
      </form>

      <aside className="w-[340px] flex-none flex-col gap-4 max-lg:hidden lg:sticky lg:top-[30px] lg:flex" aria-label="How mentors see you">
        <p className="mb-2 text-caption font-extrabold tracking-[.05em] text-stone">HOW MENTORS SEE YOU</p>
        <div className="-rotate-[1.2deg] rounded-card border border-line bg-card p-[22px] shadow-[0_14px_30px_rgba(40,30,10,.10)]">
          <div className="flex items-center gap-3.5">
            <RingAvatar initials={initials(data.first)} tone="blush" size={60} />
            <div><p className="font-display text-[22px] font-extrabold">{data.first}</p><p className="text-[13.5px] text-stone">{[data.band, stage].filter(Boolean).join(" · ")}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {interests.length ? interests.map((i) => <span key={i} className="dc-pill bg-mint text-[13px] text-mint-ink">{i}</span>) : <span className="text-[13.5px] text-stone">Interests will show up here</span>}
          </div>
          {goal && <p className="mt-3 text-[14px] text-bark"><b>Goal:</b> {goal}</p>}
        </div>
        <div className="flex gap-3 rounded-[20px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="eye" size={24} /><p>Mentors only ever see your first name, age band, stage, interests and goal.</p></div>
      </aside>
    </div>
  );
}

/** Phone bar for M12: Continue alone on step 1, Back + Continue after, Skip under step 3. */
export function OnboardingPhoneBar({ step }: { step: number }) {
  return (
    <>
      <div className={cn("flex items-center gap-2.5")}>
        {step > 1 && <Link href={`/onboarding?step=${step - 1}`} className="dc-btn dc-btn-soft h-14">Back</Link>}
        <SubmitButton form="onboarding-form" icon="arrowRight" className="h-14 flex-1" pendingText="Saving…">{step === 3 ? "Show me my village" : "Continue"}</SubmitButton>
      </div>
      {step === 3 && <button type="submit" form="onboarding-form" name="skip" value="1" className="mt-2.5 w-full text-center text-[14.5px] font-bold text-stone">Skip this step</button>}
    </>
  );
}
