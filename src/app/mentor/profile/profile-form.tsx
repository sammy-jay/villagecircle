"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { CountedTextarea, Select } from "@/components/dc/client";
import { profileAction, type MState } from "../actions";
import { cn } from "@/lib/cn";

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name="check" size={18} />{pending ? "Saving…" : "Save profile"}</button>;
}

/** D28 "Your profile": bio and fields of expertise. A changed bio is read by the team again before it shows. */
export function ProfileForm({ p, options }: { p: { bio: string; primaryExpertise: string; extraExpertise: string[]; expertiseOther: string; languages: string[]; linkedinUrl: string }; options: { value: string; label: string }[] }) {
  const [state, action] = useFormState<MState, FormData>(profileAction, {});
  const [primary, setPrimary] = useState(p.primaryExpertise);
  const [extra, setExtra] = useState<string[]>(p.extraExpertise);
  const flip = (v: string) => setExtra((x) => (x.includes(v) ? x.filter((y) => y !== v) : x.length >= 2 ? x : [...x, v]));
  return (
    <form action={action} className="flex flex-col gap-4">
      <div><label htmlFor="bio" className="dc-label">Bio</label><CountedTextarea id="bio" name="bio" max={600} rows={4} defaultValue={p.bio} /><span className="dc-hint">If you change your bio, the team looks at it again before it shows. Until then your last cleared bio stays visible.</span></div>
      <div><p className="dc-label">Main field of expertise</p><Select name="primaryExpertise" options={options} value={primary} onChange={(v) => { setPrimary(v); setExtra((x) => x.filter((y) => y !== v)); }} sayMore={{ name: "expertiseOther", defaultValue: p.expertiseOther, placeholder: "If Other, tell us your field", show: "selected" }} /></div>
      <div>
        <p className="dc-label">Up to two more fields</p>
        {extra.map((x) => <input key={x} type="hidden" name="extraExpertise" value={x} />)}
        <div className="flex flex-wrap gap-2">
          {options.filter((o) => o.value !== primary).map((o) => {
            const on = extra.includes(o.value);
            return <button key={o.value} type="button" aria-pressed={on} disabled={!on && extra.length >= 2} onClick={() => flip(o.value)} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-semibold disabled:opacity-45", on ? "bg-forest text-forest-ink" : "bg-sand")}>{on && <Icon name="check" size={15} />}{o.label}</button>;
          })}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div><label htmlFor="langs" className="dc-label">Languages you can mentor in</label><input id="langs" name="languages" defaultValue={p.languages.join(", ")} placeholder="English, Yoruba" className="dc-input" /></div>
        <div><label htmlFor="li" className="dc-label">LinkedIn (optional, team only)</label><input id="li" name="linkedinUrl" defaultValue={p.linkedinUrl} placeholder="linkedin.com/in/yourname" className="dc-input" /></div>
      </div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex items-center gap-3"><Save />{!!state.ok && <span role="status" className="text-[14px] font-semibold text-forest">Saved</span>}</div>
    </form>
  );
}
