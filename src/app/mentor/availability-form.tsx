"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Select, Toggle } from "@/components/dc/client";
import { availabilityAction, raiseHourAction, type MState } from "./actions";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS: [number, string][] = [[8, "8 am"], [12, "12 pm"], [18, "6 pm"], [20, "8 pm"]];

function Save() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name="check" size={18} />{pending ? "Saving…" : "Save changes"}</button>;
}

/** D23 weekly windows, limits and pause (also the "How much, and when" card on D7). Times are WAT, like the rest of the platform. */
export function AvailabilityForm({ grid, monthlyHours, length, paused, lastSaved, compact }: { grid: string[]; monthlyHours: number; length: number; paused: boolean; lastSaved?: string; compact?: boolean }) {
  const [state, action] = useFormState<MState, FormData>(availabilityAction, {});
  const [on, setOn] = useState<string[]>(grid);
  const flip = (k: string) => setOn((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  const hours = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  return (
    <form action={action} className="flex flex-col gap-4 lg:gap-5">
      {on.map((k) => <input key={k} type="hidden" name="grid" value={k} />)}
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-[21px] font-extrabold">Weekly windows</h2><span className="rounded-full bg-mint px-3 py-1.5 text-[12.5px] font-semibold text-mint-ink">{on.length} window{on.length === 1 ? "" : "s"} set</span></div>
        <ScrollX variant="table" label="days" className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[420px] border-separate border-spacing-1.5 text-center">
            <thead><tr><th scope="col" className="w-14"><span className="sr-only">Time</span></th>{DAYS.map((d) => <th key={d} scope="col" className="text-[13px] font-bold text-bark">{d}</th>)}</tr></thead>
            <tbody>
              {SLOTS.map(([h, l]) => (
                <tr key={h}>
                  <th scope="row" className="whitespace-nowrap pr-1 text-right text-[12.5px] font-semibold text-stone">{l}</th>
                  {DAYS.map((d) => {
                    const k = `${d}-${h}`; const sel = on.includes(k);
                    return <td key={k}><button type="button" aria-pressed={sel} aria-label={`${d} ${l}`} onClick={() => flip(k)} className={cn("h-10 w-full rounded-[10px] border-2", sel ? "border-forest bg-forest" : "border-line bg-sand hover:border-stone")} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
        <p className="text-[13px] text-stone">Green is when you are usually free. Tap a block to change it. Times are West Africa Time (WAT).</p>
      </section>
      {!compact && (
        <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6">
          <h2 className="font-display text-[21px] font-extrabold">Your limits</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="dc-label">Hours a month</p><Select name="monthlyHours" defaultValue={String(monthlyHours)} options={hours.map((h) => ({ value: String(h), label: h === 1 ? "1 hour" : `${h} hours` }))} /><span className="dc-hint">The One Hour Challenge default is one.</span></div>
            <div><p className="dc-label">Conversation length</p><Select name="length" defaultValue={String(length)} options={[{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }]} /><span className="dc-hint">30 or 60 minutes.</span></div>
          </div>
        </section>
      )}
      {compact && <><input type="hidden" name="monthlyHours" value={monthlyHours} /><input type="hidden" name="length" value={length} /></>}
      <section className="rounded-card border border-line bg-card px-5 lg:px-6">
        <Toggle name="paused" defaultChecked={paused} label="Pause all routing" sub="No new Asks reach you until you turn this off. It is never shown to anyone and never affects your standing." />
      </section>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3"><Save />{state.ok ? <span role="status" className="text-[14px] font-semibold text-forest">Saved</span> : lastSaved && <span className="text-[13px] text-stone">Last saved {lastSaved}</span>}</div>
    </form>
  );
}

/** EX12 "Add one hour this month": once per month, reopens the shortlist straight away. */
export function RaiseHour() {
  const [state, action] = useFormState<MState>(raiseHourAction, {});
  if (state.ok) return <p role="status" className="text-[14.5px] font-semibold text-forest">One more hour added for this month. New Asks can reach you again.</p>;
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5"><button type="submit" className="dc-btn dc-btn-primary h-[52px]"><Icon name="plus" size={18} />Add one hour this month</button><a href="#windows" className="dc-btn dc-btn-soft h-[52px]">Leave it</a></div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}
