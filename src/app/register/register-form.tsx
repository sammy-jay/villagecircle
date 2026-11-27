"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFormState } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";
import { CheckRow, FieldWrap, PasswordField, SelectField, SubmitButton, TextField } from "@/components/forms/fields";
import { HEARD_FROM, RELATIONSHIPS, SIGNUP_COUNTRIES, opts, regionsFor } from "@/components/account/options";
import { PhoneBar } from "@/components/account/shells";
import { registerAction, type ActionState } from "@/app/account-actions";
import type { SignupRole } from "@/lib/register";

type Band = "" | "under" | "minor" | "adult";
const BANDS: [Band, string][] = [["under", "Under 15"], ["minor", "15 to 17"], ["adult", "18 or older"]];

/** M1 / DK1 form. Participants pick an age band before anything else: under 15 leaves straight away; 15 to 17 adds the guardian block. */
export function RegisterForm({ role, minAge }: { role: SignupRole; minAge: number }) {
  const router = useRouter();
  const [state, action] = useFormState<ActionState, FormData>(registerAction, {});
  const [band, setBand] = useState<Band>(role === "participant" ? "" : "adult");
  const [country, setCountry] = useState("Nigeria");
  const regions = regionsFor(country);
  const err = (f: string) => (state.field === f ? state.error : undefined);
  const pickBand = (b: Band) => { if (b === "under") router.push("/under-15"); else setBand(b); };

  return (
    <form id="register-form" action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="role" value={role} />
      {role === "participant" && (
        <FieldWrap label="How old are you?" hint={<span className="max-lg:hidden">We ask so we can keep you safe. This is never shown to other people.</span>}>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How old are you?">
            {BANDS.map(([b, l]) => (
              <button key={b} type="button" role="radio" aria-checked={band === b} onClick={() => pickBand(b)}
                className={cn("dc-pill text-[15px]", band === b ? "bg-forest text-forest-ink" : "bg-sand text-ink")}>
                {band === b && <Icon name="check" size={16} />}{b === "under" ? `Under ${minAge}` : b === "minor" ? `${minAge} to 17` : l}
              </button>
            ))}
          </div>
        </FieldWrap>
      )}

      {band === "" ? (
        <p className="rounded-[18px] bg-sand px-[18px] py-4 text-[14.5px] leading-[1.45] text-bark">Pick your age first. The rest of the form changes with it.</p>
      ) : <>
      <FieldWrap label="Date of birth" htmlFor="r-dob" hint="Used to check your age band and when you turn 18. Never shown to anyone." error={err("dob")}>
        <TextField id="r-dob" name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} aria-invalid={!!err("dob") || undefined} />
      </FieldWrap>

      {band === "minor" && (
        <div className="rounded-[22px] bg-mint p-4">
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2.5 text-[14.5px] font-extrabold text-mint-ink"><Icon name="shieldCheck" size={22} />Under 18? A parent or guardian says yes first.</p>
            <FieldWrap label="Parent or guardian name" htmlFor="r-gname" error={err("guardianName")}><TextField id="r-gname" name="guardianName" autoComplete="off" aria-invalid={!!err("guardianName") || undefined} /></FieldWrap>
            <FieldWrap label="Parent or guardian email" htmlFor="r-gemail" hint="We email them a link to approve. They never get marketing emails." error={err("guardianEmail")}>
              <TextField id="r-gemail" name="guardianEmail" type="email" icon="mail" autoComplete="off" aria-invalid={!!err("guardianEmail") || undefined} />
            </FieldWrap>
            <FieldWrap label="Their mobile" htmlFor="r-gmobile" hint="With the country code. We text them a 6-digit code to confirm it is really them." error={err("guardianMobile")}>
              <TextField id="r-gmobile" name="guardianMobile" type="tel" icon="phone" placeholder="+234" autoComplete="off" aria-invalid={!!err("guardianMobile") || undefined} />
            </FieldWrap>
            <FieldWrap label="They are your..." htmlFor="r-rel" error={err("relationship")}><SelectField id="r-rel" name="relationship" options={opts(RELATIONSHIPS)} invalid={!!err("relationship")} /></FieldWrap>
          </div>
        </div>
      )}

      <FieldWrap label="First name" htmlFor="r-name" hint={<span className="max-lg:hidden">First name only. No last name needed.</span>} error={err("name")}>
        <TextField id="r-name" name="name" autoComplete="given-name" required aria-invalid={!!err("name") || undefined} />
      </FieldWrap>
      <FieldWrap label={<><span className="lg:hidden">Email</span><span className="max-lg:hidden">Your email</span></>} htmlFor="r-email" error={err("email")}>
        <TextField id="r-email" name="email" type="email" icon="mail" autoComplete="email" required aria-invalid={!!err("email") || undefined} />
      </FieldWrap>
      <FieldWrap label="Password" htmlFor="r-pass" hint="At least 10 characters" error={err("password")}>
        <PasswordField id="r-pass" name="password" autoComplete="new-password" required minLength={10} aria-invalid={!!err("password") || undefined} />
      </FieldWrap>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-3.5">
        <FieldWrap label={<><span className="lg:hidden">Where do you live?</span><span className="max-lg:hidden">Country</span></>} htmlFor="r-country" className="min-w-0 flex-1"><SelectField id="r-country" name="country" options={opts(SIGNUP_COUNTRIES)} value={country} onChange={setCountry} /></FieldWrap>
        <FieldWrap label="State or region" htmlFor="r-region" hint="State only. We never ask for your address." className="min-w-0 flex-1">
          {regions ? <SelectField key={country} id="r-region" name="region" options={opts(regions)} /> : <TextField key={country} id="r-region" name="region" maxLength={60} placeholder="State or region" />}
        </FieldWrap>
      </div>

      <FieldWrap label="How did you hear about us?" htmlFor="r-heard" hint={<span className="max-lg:hidden">Only used for counts, never shown on your profile.</span>}>
        <SelectField id="r-heard" name="heardFrom" options={opts(HEARD_FROM)} sayMore={{ name: "heardFromMore", show: "always" }} />
      </FieldWrap>

      {band === "minor" && (
        <div className="flex gap-3 rounded-[18px] bg-mint px-[18px] py-4 text-[14.5px] leading-[1.45] text-mint-ink lg:hidden">
          <Icon name="shieldCheck" size={24} />
          <div><p className="mb-[3px] font-display text-[17px] font-extrabold">Next, a parent or guardian says yes.</p>You can browse while you wait.</div>
        </div>
      )}

      <div className="dc-card flex flex-col gap-3 p-4">
        <CheckRow name="agreeTerms" required label={<>I have read and agree to the <Link href="/policies/terms" className="font-bold text-clay">Terms of Use</Link>, <Link href="/policies/privacy" className="font-bold text-clay">Privacy Policy</Link> and <Link href="/policies/code-of-conduct" className="font-bold text-clay">Code of Conduct</Link>.</>} />
        {band === "minor" && <CheckRow name="agreeReview" label="I understand the team reads every Ask, and my guardian approves each one." />}
        <CheckRow name="marketing" label="Email me tips and events (optional)." />
      </div>
      </>}

      {state.error && !["dob", "guardianName", "guardianEmail", "guardianMobile", "relationship", "name", "email", "password"].includes(state.field ?? "") && (
        <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>
      )}

      <div className="flex flex-col gap-4 max-lg:hidden">
        <SubmitButton className="h-14 w-full" pendingText="Creating your account…" disabled={!band}>Create my account</SubmitButton>
        <p className="text-center text-[14.5px] text-stone">Already here? <Link href="/login" className="font-bold text-clay">Log in</Link></p>
        {role === "participant" && <p className="text-center text-caption text-stone">Under {minAge}? We cannot make an account for you yet.</p>}
      </div>

      <PhoneBar>
        <SubmitButton className="h-14 w-full" pendingText="Creating your account…" disabled={!band}>Create my account</SubmitButton>
        <p className="mt-2.5 text-center text-[14.5px] text-stone">Already here? <Link href="/login" className="font-bold text-clay">Log in</Link></p>
      </PhoneBar>
    </form>
  );
}
