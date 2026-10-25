"use client";

import { useState } from "react";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

/**
 * Pick up to three times (D27 step forward, EX2 offer other times). Suggestions come from the mentor's weekly windows;
 * "Add a time" takes any date and time in the browser's own zone and posts it as an exact instant.
 */
export function TimePicker({ suggestions, name = "times", max = 3 }: { suggestions: { iso: string; label: string; sub: string }[]; name?: string; max?: number }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const all = [...picked, ...custom];
  const full = all.length >= max;
  const flip = (iso: string) => setPicked((p) => (p.includes(iso) ? p.filter((x) => x !== iso) : full ? p : [...p, iso]));
  const add = () => { if (!draft || full) return; const iso = new Date(draft).toISOString(); if (!all.includes(iso)) setCustom((c) => [...c, iso]); setDraft(""); };
  const show = (iso: string) => new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  return (
    <div className="flex flex-col gap-2.5">
      {all.map((iso) => <input key={iso} type="hidden" name={name} value={iso} />)}
      {suggestions.map((s) => {
        const on = picked.includes(s.iso);
        return (
          <button key={s.iso} type="button" role="checkbox" aria-checked={on} disabled={!on && full} onClick={() => flip(s.iso)}
            className={cn("flex items-center gap-3 rounded-field border-2 px-4 py-3 text-left disabled:opacity-50", on ? "border-forest bg-mint/40" : "border-line bg-card")}>
            <span className={cn("flex size-[24px] shrink-0 items-center justify-center rounded-check border-2", on ? "border-forest bg-forest text-forest-ink" : "border-line")}>{on && <Icon name="check" size={15} strokeWidth={3} />}</span>
            <span><span className="block text-[15px] font-bold">{s.label}</span><span className="block text-[13px] text-stone">{s.sub}</span></span>
          </button>
        );
      })}
      {custom.map((iso) => (
        <div key={iso} className="flex items-center gap-3 rounded-field border-2 border-forest bg-mint/40 px-4 py-3">
          <span className="flex size-[24px] shrink-0 items-center justify-center rounded-check border-2 border-forest bg-forest text-forest-ink"><Icon name="check" size={15} strokeWidth={3} /></span>
          <span className="flex-1 text-[15px] font-bold">{show(iso)}</span>
          <button type="button" onClick={() => setCustom((c) => c.filter((x) => x !== iso))} aria-label="Remove this time" className="text-stone"><Icon name="x" size={18} /></button>
        </div>
      ))}
      {!full && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="tp-add">Add a time</label>
          <input id="tp-add" type="datetime-local" value={draft} onChange={(e) => setDraft(e.target.value)} className="dc-input h-12 max-w-[260px] flex-1" />
          <button type="button" onClick={add} disabled={!draft} className="dc-btn dc-btn-soft h-12 disabled:opacity-50"><Icon name="plus" size={16} />Add a time</button>
        </div>
      )}
      <p className="text-[13px] text-stone">{all.length} of {max} chosen. Times show in your own time zone. At least an hour from now.</p>
    </div>
  );
}
