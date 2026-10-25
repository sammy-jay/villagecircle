"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { CheckRow, SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { afterAction, type AskFormState } from "@/app/asks/actions";
import { detectContactDetails } from "@/lib/domain/contact-detect";
import { cn } from "@/lib/cn";

const HELPED: [string, string, string][] = [["YES", "Really helpful", "I know my next step"], ["LITTLE", "Helpful", "Some things are clearer"], ["NOT_REALLY", "Not quite", "I still have questions"]];
export const STOOD_OUT = ["Clear advice", "Kind", "Gave me a plan", "Honest", "Made me feel less alone", "Practical tips", "Encouraging", "Explained it simply"];

/** D16 After the call: how it went, a thank-you, and next steps into My goals. */
export function AfterForm({ askId, mentor, steps, thanked, minor }: { askId: string; mentor: string; steps: string[]; thanked: boolean; minor: boolean }) {
  const [state, action] = useFormState<AskFormState, FormData>(afterAction, {});
  const [helped, setHelped] = useState("");
  const [body, setBody] = useState("");
  const [extra, setExtra] = useState<string[]>([]); const [add, setAdd] = useState("");
  const contact = detectContactDetails(body).length > 0;
  return (
    <form id="after" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="askId" value={askId} />
      <input type="hidden" name="helped" value={helped} />
      <div role="radiogroup" aria-label="How did it go?" className="grid grid-cols-3 gap-2.5">
        {HELPED.map(([v, t, s], i) => (
          <button key={v} type="button" role="radio" aria-checked={helped === v} onClick={() => setHelped(v)}
            className={cn("rounded-card p-3.5 text-left lg:p-[18px]", ["bg-mint text-mint-ink", "bg-butter text-butter-ink", "bg-blush text-blush-ink"][i], helped === v && "shadow-[0_0_0_3px_rgb(var(--forest))]")}>
            <span className="block font-display text-[16px] font-extrabold leading-tight lg:text-[19px]">{t}</span>
            <span className="mt-1 block text-[12.5px] opacity-85 max-lg:hidden">{s}</span>
          </button>
        ))}
      </div>
      {!thanked && (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-[22px]">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[22px]">Say thanks to {mentor}</h2>
          <p className="text-[14px] leading-normal text-bark max-lg:hidden">The team reads it first. If you tick the box it can appear on the Thank-you wall with your first name and age band.</p>
          <label htmlFor="a-body" className="text-[13px] font-bold text-bark">Your note</label>
          <textarea id="a-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={400} rows={3} aria-invalid={contact || state.field === "body"}
            className={cn("w-full rounded-field border-2 bg-card px-4 py-3.5 text-[16px] leading-normal focus:border-ink focus:outline-none", contact ? "border-clay" : "border-line")} />
          <div className="flex justify-between text-[12.5px] text-stone"><span className={cn(contact && "font-semibold text-clay")}>{contact ? "That looks like contact details. Take them out, please." : "First name only. No numbers or handles."}</span><span>{body.length} of 400</span></div>
          <CheckRow name="share" label="Show on the Thank-you wall" />
        </section>
      )}
      <section className="flex flex-col gap-2.5 rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[22px]">Your next steps</h2><span className="text-[12.5px] text-stone">{steps.length ? `From ${mentor}` : "Add your own"}</span></div>
        {[...steps, ...extra].map((s, i) => <CheckRow key={`${s}-${i}`} name="step" value={s} defaultChecked label={s} />)}
        <div className="flex gap-2">
          <input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Add a step" aria-label="Add a step" className="h-12 min-w-0 flex-1 rounded-field border-2 border-line bg-card px-3.5 text-[15px] focus:border-ink focus:outline-none" />
          <button type="button" onClick={() => { if (add.trim()) { setExtra([...extra, add.trim()]); setAdd(""); } }} className="dc-btn dc-btn-soft h-12 px-4"><Icon name="plus" size={18} />Add</button>
        </div>
        <p className="text-[12.5px] text-stone">Ticked steps are saved to My goals.</p>
      </section>
      {minor && <p className="text-[13.5px] text-bark lg:hidden">Your guardian can see this page. If something went wrong, <Link href={`/report?ask=${askId}`} className="font-bold text-clay underline">tell the team</Link> and we will follow up.</p>}
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex justify-end pb-7 max-lg:hidden"><SubmitButton icon="send" disabled={contact} className="h-[52px]" pendingText="Sending…">{thanked ? "Save" : "Send thanks"}</SubmitButton></div>
      <PhoneBar><SubmitButton form="after" icon="send" disabled={contact} className="h-14 w-full" pendingText="Sending…">{thanked ? "Save" : "Send thanks"}</SubmitButton></PhoneBar>
    </form>
  );
}

/** N04 Thank a mentor: up to 3 chips, a short message, optional wall, live preview. */
export function ThanksForm({ askId, mentor, me, band }: { askId: string; mentor: string; me: string; band: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(afterAction, {});
  const [tags, setTags] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [share, setShare] = useState(false);
  const contact = detectContactDetails(body).length > 0;
  const toggle = (t: string) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : x.length < 3 ? [...x, t] : x));
  const preview = (
    <section className="rounded-card bg-blush p-5 text-blush-ink">
      <p className="text-[12px] font-extrabold tracking-[.05em] opacity-80">HOW IT WILL LOOK ON THE WALL</p>
      <p className="mt-2.5 font-display text-[19px] font-bold leading-[1.3]">&ldquo;{body.trim() || `${mentor} was kind and helpful.`}&rdquo;</p>
      {tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-full bg-card px-3 py-1.5 text-[12.5px] font-semibold">{t}</span>)}</div>}
      <p className="mt-3 text-[13px]">{me}, {band} · for {mentor}</p>
    </section>
  );
  return (
    <form id="thanks" action={action} className="flex flex-col gap-4 lg:gap-[18px]">
      <input type="hidden" name="askId" value={askId} /><input type="hidden" name="next" value="thanks" />
      {tags.map((t) => <input key={t} type="hidden" name="tag" value={t} />)}
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">What stood out?</h2><span className="text-[12.5px] font-semibold text-stone">{tags.length} of 3 picked</span></div>
        <p className="text-[13.5px] text-stone">Pick up to 3. {mentor} sees these and the team counts them.</p>
        <div className="flex flex-wrap gap-2">
          {STOOD_OUT.map((t) => { const on = tags.includes(t); return <button key={t} type="button" aria-pressed={on} onClick={() => toggle(t)} disabled={!on && tags.length >= 3} className={cn("inline-flex items-center gap-1.5 rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold disabled:opacity-50", on ? "bg-forest text-forest-ink" : "bg-sand")}>{on && <Icon name="check" size={16} />}{t}</button>; })}
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Add a few words</h2>
        <p className="rounded-saymore bg-butter px-3 py-2.5 text-[13.5px] leading-[1.45] text-butter-ink"><b>No names or numbers, please.</b> First names only. Leave out surnames, schools, phone numbers and social handles. The team takes them out if they slip in.</p>
        <label htmlFor="th-body" className="text-[13px] font-bold text-bark">Your message (optional)</label>
        <textarea id="th-body" name="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={200} rows={3} className={cn("w-full rounded-field border-2 bg-card px-4 py-3.5 text-[16px] leading-normal focus:border-ink focus:outline-none", contact ? "border-clay" : "border-line")} />
        <div className="flex justify-between text-[12.5px] text-stone"><span className={cn(contact && "font-semibold text-clay")}>{contact ? "That looks like contact details. Take them out and we will keep the rest." : ""}</span><span>{body.length} of 200 characters</span></div>
        <label className="flex items-start gap-3 text-[15px]"><input type="checkbox" name="share" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-1 size-5 accent-[rgb(var(--forest))]" /><span><b>Share on the Thank-you wall</b><span className="mt-0.5 block text-[13px] text-stone">Optional. Shown with your first name and age band after the team has read it. {mentor} gets your thanks either way.</span></span></label>
      </section>
      <div className="lg:hidden">{preview}</div>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <div className="flex items-center gap-3 pb-7 max-lg:hidden">
        <SubmitButton icon="heart" disabled={contact || (!body.trim() && !tags.length)} className="h-[52px]" pendingText="Sending…">Send thanks</SubmitButton>
        <Link href={`/asks/${askId}`} className="dc-btn dc-btn-soft h-[52px]">Skip for now</Link>
      </div>
      <PhoneBar><SubmitButton form="thanks" icon="heart" disabled={contact || (!body.trim() && !tags.length)} className="h-14 w-full" pendingText="Sending…">Send thanks</SubmitButton></PhoneBar>
      {/* The desktop board shows the preview beside the form; here it follows the buttons. */}
      <div className="max-lg:hidden">{preview}</div>
    </form>
  );
}
