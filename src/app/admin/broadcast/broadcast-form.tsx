"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";
import type { CState } from "../content-actions";

function Btn({ children, name, value, variant = "dc-btn-primary", disabled }: { children: React.ReactNode; name?: string; value?: string; variant?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending || disabled} className={cn("dc-btn h-[50px] disabled:opacity-55", variant)}>{pending ? "Working…" : children}</button>;
}

/** A17 compose: audience, subject, message, when; then preview the count and confirm it before anything goes out. */
export function BroadcastForm({ action, audiences, zone }: { action: (s: CState, fd: FormData) => Promise<CState>; audiences: { value: string; label: string; n: number }[]; zone: string }) {
  const [state, run] = useFormState<CState, FormData>(action, {});
  const [aud, setAud] = useState(audiences[1]?.value ?? audiences[0]!.value);
  const [subject, setSubject] = useState(""); const [body, setBody] = useState(""); const [later, setLater] = useState(false);
  const preview = state.ok && state.done === "preview" && state.audience === aud ? (state.recipients as number) : null;
  const sent = state.ok && (state.done === "sent" || state.done === "scheduled" || state.done === "draft");
  const label = audiences.find((a) => a.value === aud)?.label ?? "";
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <form action={run} className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6">
        {typeof state.id === "string" && <input type="hidden" name="id" value={state.id} />}
        <fieldset><legend className="dc-label">Who gets it</legend>
          <div className="flex flex-wrap gap-2">{audiences.map((a) => <label key={a.value} className="cursor-pointer"><input type="radio" name="audience" value={a.value} checked={aud === a.value} onChange={() => setAud(a.value)} className="peer sr-only" /><span className="inline-block rounded-full bg-sand px-3.5 py-2 text-[14px] font-semibold peer-checked:bg-forest peer-checked:text-forest-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">{a.label} · {a.n}</span></label>)}</div>
        </fieldset>
        <div><label htmlFor="subject" className="dc-label">Subject</label><input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} className="dc-input" /></div>
        <div><label htmlFor="body" className="dc-label">Message</label><textarea id="body" name="body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} className="dc-textarea" /><span className="dc-hint">{body.length} characters. No names of young people, no contact details.</span></div>
        <fieldset><legend className="dc-label">When</legend>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[15px]"><input type="radio" checked={!later} onChange={() => setLater(false)} className="size-5 accent-[#2F6B4F]" />Send now</label>
            <label className="flex items-center gap-2 text-[15px]"><input type="radio" checked={later} onChange={() => setLater(true)} className="size-5 accent-[#2F6B4F]" />Pick a date and time</label>
            {later && <input name="scheduledFor" type="datetime-local" aria-label={`Send at (${zone})`} className="dc-input h-12 max-w-[240px]" />}
          </div>
          <span className="dc-hint">Times are in {zone}. Sent as a notification and email. You confirm the number of people before anything goes out.</span>
        </fieldset>
        {preview != null && <input type="hidden" name="confirmCount" value={preview} />}
        {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
        {sent && <p role="status" className="flex items-center gap-2 text-[14.5px] font-semibold text-forest"><Icon name="check" size={17} />{state.done === "draft" ? "Draft saved." : state.done === "scheduled" ? `Scheduled for ${state.recipients} people.` : `Sent to ${state.recipients} people.`}</p>}
        <div className="flex flex-wrap gap-2.5">
          {preview == null ? <Btn name="intent" value="preview"><Icon name="eye" size={18} />Preview and send</Btn> : <Btn name="intent" value="send" variant="dc-btn-primary"><Icon name="send" size={18} />{later ? "Schedule" : "Send"} to {preview} {label.toLowerCase()}</Btn>}
          <Btn name="intent" value="draft" variant="dc-btn-soft">Save draft</Btn>
        </div>
      </form>
      <aside className="flex flex-col gap-4 self-start">
        <section className="rounded-card bg-butter p-5 text-butter-ink">
          <p className="text-[13px] font-bold">How it looks</p>
          <p className="mt-2 text-[12.5px]">From The Village Circle team</p>
          <p className="mt-1 font-display text-[19px] font-extrabold">{subject || "Your subject"}</p>
          <p className="mt-1.5 line-clamp-6 whitespace-pre-line text-[14.5px] leading-normal">{body || "Your message appears here."}</p>
        </section>
        {preview != null && <section className="rounded-card bg-mint p-5 text-mint-ink"><p className="font-display text-[34px] font-extrabold leading-none">{preview}</p><p className="mt-1 text-[14px]">{label.toLowerCase()} will get this</p></section>}
        <p className="rounded-card border border-line bg-card p-5 text-[13.5px] leading-normal text-bark">Each person can mute non-essential announcements. Safeguarding messages to guardians cannot be muted.</p>
      </aside>
    </div>
  );
}
