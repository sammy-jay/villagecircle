"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { SubmitButton } from "@/components/forms/fields";
import { prefsAction, type SelfState } from "@/app/self-actions";
import { cn } from "@/lib/cn";

type Cell = "on" | "lock" | "none" | { pref: "resources" | "events" | "review" };
const ROWS: [string, string, Cell, Cell][] = [
  ["Ask updates", "A mentor steps forward, a time is set", "lock", "lock"],
  ["Safety messages from the team", "Always sent, to you and your guardian", "lock", "lock"],
  ["Call reminders", "1 day and 1 hour before", "lock", "lock"],
  ["Messages from my mentor", "Before your call, on the platform", "lock", "on"],
  ["Thank-you wall", "When your thank-you goes live", "on", "on"],
  ["New in the library", "Picks for your goals", "on", { pref: "resources" }],
  ["Events and Q&As", "Webinars, panels and workshops", "on", { pref: "events" }],
  ["Monthly review", "What you asked and did this month", "on", { pref: "review" }],
];

/** N10 Notification preferences. In-app updates are always on; the optional emails can be switched off. */
export function PrefsForm({ prefs }: { prefs: Record<"resources" | "events" | "review", boolean> }) {
  const [state, action] = useFormState<SelfState, FormData>(prefsAction, {});
  const [v, setV] = useState(prefs);
  const cell = (c: Cell, label: string) => {
    if (c === "lock") return <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-forest"><Icon name="lock" size={14} />Always on</span>;
    if (c === "on") return <span className="text-[12.5px] font-semibold text-stone">On</span>;
    if (c === "none") return <span className="text-[12.5px] text-stone">Not offered</span>;
    const on = v[c.pref];
    return (
      <>
        <input type="hidden" name={c.pref} value={on ? "on" : ""} />
        <button type="button" role="switch" aria-checked={on} aria-label={`${label} by email`} onClick={() => setV({ ...v, [c.pref]: !on })} className={cn("relative h-7 w-[46px] rounded-full transition-colors", on ? "bg-forest" : "bg-line")}>
          <span className={cn("absolute top-[3px] size-[22px] rounded-full bg-card shadow transition-[left]", on ? "left-[21px]" : "left-[3px]")} />
        </button>
      </>
    );
  };
  return (
    <form action={action} className="flex flex-col gap-4">
      <section className="rounded-card border border-line bg-card p-5 lg:p-[22px]">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Choose how we reach you</h2>
        <p className="mt-1 text-[14px] text-bark">Switch each optional email on or off.</p>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] items-center gap-x-4 lg:gap-x-8">
          <span /><span className="pb-2 text-[11.5px] font-extrabold tracking-[.05em] text-stone">IN THE APP</span><span className="pb-2 text-[11.5px] font-extrabold tracking-[.05em] text-stone">EMAIL</span>
          {ROWS.map(([t, s, app, email]) => (
            <div key={t} className="contents">
              <div className="border-t border-line py-3.5"><p className="text-[15px] font-bold">{t}</p><p className="text-[13px] text-stone">{s}</p></div>
              <div className="flex justify-center border-t border-line py-3.5">{cell(app, t)}</div>
              <div className="flex justify-center border-t border-line py-3.5">{cell(email, t)}</div>
            </div>
          ))}
        </div>
      </section>
      <p className="text-[13px] text-stone">The lock means always on. Ask updates and safety messages keep you and your guardian in the loop.</p>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      {state.ok && <p role="status" className="text-[14px] font-semibold text-forest">Saved.</p>}
      <div className="flex flex-col gap-2.5 lg:flex-row">
        <SubmitButton icon="check" className="h-[52px]" pendingText="Saving…">Save preferences</SubmitButton>
        <Link href="/settings" className="dc-btn dc-btn-soft h-[52px]">Back to settings</Link>
      </div>
    </form>
  );
}
