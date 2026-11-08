"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Toggle } from "@/components/dc/client";
import { Icon } from "@/components/dc/icons";
import { ChipPicker, FieldWrap, MultiSelectField, SelectField, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { BACKGROUNDS, BACKGROUND_EXCLUSIVE, GOALS, INTERESTS, STAGES, opts, parseBackground, regionsFor } from "@/components/account/options";
import { profileAction, type SelfState } from "@/app/self-actions";

type P = { first: string; band: string; cohort: string | null; country: string | null; region: string | null; interests: string[]; goal: string; goalMore: string; background: string; show: Record<string, boolean>; updatedAt: string };

/** N07 My profile and privacy: the form, the switches, and a live preview of what a mentor sees. */
export function ProfileForm({ p, minor }: { p: P; minor: boolean }) {
  const [state, action] = useFormState<SelfState, FormData>(profileAction, {});
  const [show, setShow] = useState(p.show);
  const [cohort, setCohort] = useState(p.cohort ?? "");
  const [region, setRegion] = useState(p.region ?? "");
  const regions = regionsFor(p.country ?? "Nigeria");
  const [interests, setInterests] = useState(p.interests);
  const [goal, setGoal] = useState(p.goal);
  const stage = STAGES.find(([v]) => v === cohort)?.[1];
  const bg = parseBackground(p.background);
  const sw: [string, string, string][] = [
    ["ageBand", "Show my age band", `Mentors see "${p.band}", never your exact age`],
    ["stage", "Show my stage", stage ?? "Not set"],
    ["interests", "Show what I am curious about", "Your interest chips"],
    ["goal", "Show my goal", goal ? `"${goal}"` : "Not set"],
    ["state", "Show my state", region ? `${region}. Your town and school are never shown` : "Not set"],
  ];
  const preview = (
    <section className="flex flex-col gap-3 rounded-card bg-butter p-5 text-butter-ink">
      <p className="text-[12px] font-extrabold tracking-[.05em] opacity-80">HOW MENTORS SEE YOU</p>
      <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-card font-display text-[17px] font-bold">{p.first.charAt(0)}</span><div><p className="text-[17px] font-bold">{p.first}</p><p className="text-[13px]">{[show.ageBand && `Age ${p.band}`, show.stage && stage].filter(Boolean).join(" · ") || "No details shown"}</p></div></div>
      {show.goal && goal && <div><p className="text-[11.5px] font-extrabold tracking-[.05em] opacity-80">GOAL</p><p className="text-[14.5px] font-semibold">{goal}</p></div>}
      {show.interests && interests.length > 0 && <div><p className="text-[11.5px] font-extrabold tracking-[.05em] opacity-80">CURIOUS ABOUT</p><div className="mt-1 flex flex-wrap gap-1.5">{interests.map((i) => <span key={i} className="rounded-full bg-card px-3 py-1 text-[12.5px] font-semibold text-ink">{i}</span>)}</div></div>}
      <p className="text-[12.5px]">{show.state && region ? region : "State hidden"} · Never shown to mentors: last name, school, contact details, community background.</p>
    </section>
  );

  return (
    <form id="profile" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">About you</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <FieldWrap label="First name" hint="Only your first name is ever shown."><p className="flex h-[54px] items-center rounded-field border-2 border-line bg-sand px-4 text-[16px]">{p.first}</p></FieldWrap>
          <FieldWrap label="Age band" hint="We show a band, never your birthday."><p className="flex h-[54px] items-center rounded-field border-2 border-line bg-sand px-4 text-[16px]">{p.band}</p></FieldWrap>
          <FieldWrap label="Where are you right now?" htmlFor="pf-stage"><SelectField id="pf-stage" name="cohort" options={STAGES.map(([value, label]) => ({ value, label }))} value={cohort} onChange={setCohort} placeholder="Choose one" /></FieldWrap>
          <FieldWrap label="State or region" htmlFor="pf-state" hint="Not your town or school.">{regions ? <SelectField id="pf-state" name="region" options={opts(regions)} value={region} onChange={setRegion} placeholder="Choose one" /> : <input id="pf-state" name="region" maxLength={60} value={region} onChange={(e) => setRegion(e.target.value)} className="dc-input" />}</FieldWrap>
        </div>
        <FieldWrap label="What are you curious about? Pick any"><ChipPicker name="interests" options={[...new Set([...INTERESTS, ...p.interests])]} defaultValue={p.interests} max={8} onChange={setInterests} /></FieldWrap>
        <FieldWrap label="Your goal" htmlFor="pf-goal"><SelectField id="pf-goal" name="goal" options={opts([...new Set([...(p.goal ? [p.goal] : []), ...GOALS])])} value={goal} onChange={setGoal} placeholder="Choose one" sayMore={{ name: "goalMore", defaultValue: p.goalMore, placeholder: "Say more (optional). For example: medicine or engineering?", show: "always" }} /></FieldWrap>
        <FieldWrap label="Community background (optional)" htmlFor="pf-bg" hint="Anonymous counts only, never shown. Mentors never see it.">
          <MultiSelectField id="pf-bg" name="background" options={opts(BACKGROUNDS)} exclusive={BACKGROUND_EXCLUSIVE} defaultValue={bg.picks} placeholder="Choose any that apply" sayMore={{ name: "backgroundMore", defaultValue: bg.more }} />
        </FieldWrap>
      </section>
      <section className="flex flex-col rounded-card border border-line bg-card px-5 pb-2 pt-5 lg:px-[22px]">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">What mentors can see</h2>
        <p className="mt-1 text-[14px] text-bark">Switch off anything you would rather keep to yourself. The preview updates as you go.</p>
        {sw.map(([k, l, s]) => <Toggle key={k} name={`show_${k}`} label={l} sub={s} checked={show[k]} onChange={(v) => setShow({ ...show, [k]: v })} className="border-t border-line first-of-type:border-t-0" />)}
      </section>
      <div className="lg:hidden">{preview}</div>
      {minor && <p className="text-[13.5px] text-bark"><b>Your guardian can see this page.</b> The team reads any change to your goal before a mentor sees it.</p>}
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      {state.ok && <p role="status" className="text-[14px] font-semibold text-forest">Saved.</p>}
      <div className="flex items-center gap-3 max-lg:hidden">
        <SubmitButton icon="check" className="h-[52px]" pendingText="Saving…">Save changes</SubmitButton>
        <Link href="/settings" className="dc-btn dc-btn-soft h-[52px]">Cancel</Link>
        <span className="text-[12.5px] text-stone">Last saved {p.updatedAt}</span>
      </div>
      <div className="max-lg:hidden">{preview}</div>
      <p className="flex items-center gap-1.5 text-[13px] text-stone"><Icon name="lock" size={14} />Email and password are in <Link href="/settings" className="font-bold text-clay">Settings</Link>.</p>
      <PhoneBar><SubmitButton form="profile" icon="check" className="h-14 w-full" pendingText="Saving…">Save changes</SubmitButton></PhoneBar>
    </form>
  );
}
