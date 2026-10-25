"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { CountedTextarea, Select } from "@/components/dc/client";
import { resourceAction, type MState } from "../actions";
import { cn } from "@/lib/cn";

type Opt = { value: string; label: string };
type D = { type: string; title: string; body: string; topic: string; cohort: string; credit: string; askId: string };

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" name="intent" value="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name="send" size={18} />{pending ? "Sending…" : "Submit for review"}</button>;
}

/** D24 Contribute: two steps on one page. Step 1 picks the format, topic and (optionally) a conversation to start from; step 2 writes it. */
export function ContributeForm({ types, topics, audiences, credits, conversations, draft }: { types: Opt[]; topics: Opt[]; audiences: Opt[]; credits: Opt[]; conversations: { askId: string; label: string; notes: string }[]; draft: D }) {
  const [state, action] = useFormState<MState, FormData>(resourceAction, {});
  const [step, setStep] = useState(draft.title || draft.body ? 2 : 1);
  const [d, setD] = useState<D>(draft);
  const set = (k: keyof D) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const fromConv = (askId: string) => { const c = conversations.find((x) => x.askId === askId); setD((x) => ({ ...x, askId, body: x.body || (c?.notes ?? "") })); };
  const ready1 = !!d.type && !!d.topic;
  return (
    <form action={action} className="flex flex-col gap-4">
      {(["type", "topic", "askId", "cohort", "credit"] as const).map((k) => <input key={k} type="hidden" name={k} value={d[k]} />)}
      <section className={cn("flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6", step !== 1 && "opacity-90")}>
        <div className="flex items-center justify-between"><p className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-bark">Step 1 of 2</p>{step === 2 && <button type="button" onClick={() => setStep(1)} className="text-[13.5px] font-bold text-clay">Edit</button>}</div>
        <h2 className="font-display text-[22px] font-extrabold">What are you sharing?</h2>
        {step === 1 ? (
          <>
            <div><p className="dc-label">Format</p><Select options={types} value={d.type} onChange={set("type")} /></div>
            <div><p className="dc-label">Topic</p><Select options={topics} value={d.topic} onChange={set("topic")} /></div>
            {conversations.length > 0 && <div><p className="dc-label">Start from a conversation (optional)</p><Select options={[{ value: "", label: "Start from scratch" }, ...conversations.map((c) => ({ value: c.askId, label: c.label }))]} value={d.askId} onChange={fromConv} /><span className="dc-hint">We pull in the notes you wrote. Nothing reaches the library until you submit.</span></div>}
            <button type="button" disabled={!ready1} onClick={() => setStep(2)} className="dc-btn dc-btn-forest h-[50px] self-start disabled:opacity-50"><Icon name="arrowRight" size={18} />Continue</button>
          </>
        ) : <p className="text-[14.5px] text-bark">{types.find((t) => t.value === d.type)?.label} · {topics.find((t) => t.value === d.topic)?.label}</p>}
      </section>
      {step === 2 && (
        <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6">
          <div className="flex items-center justify-between"><p className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-bark">Step 2 of 2</p>{!!state.draft && <span className="text-[13px] font-semibold text-forest">Draft saved</span>}</div>
          <h2 className="font-display text-[22px] font-extrabold">Write it for them</h2>
          <div><label htmlFor="title" className="dc-label">Title</label><input id="title" name="title" value={d.title} onChange={(e) => set("title")(e.target.value)} maxLength={200} className="dc-input" placeholder="What a week in your job really looks like" /></div>
          <div><label htmlFor="body" className="dc-label">Your answer</label><CountedTextarea id="body" name="body" max={1500} rows={8} value={d.body} onChange={(e) => set("body")(e.target.value)} /></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="dc-label">Who is it for</p><Select options={audiences} value={d.cohort} onChange={set("cohort")} /></div>
            <div><p className="dc-label">Credit</p><Select options={credits} value={d.credit} onChange={set("credit")} /><span className="dc-hint">Shown on the resource.</span></div>
          </div>
          {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
          <div className="flex flex-wrap gap-2.5"><Submit /><button type="submit" name="intent" value="draft" className="dc-btn dc-btn-soft h-[52px]">Save draft</button></div>
          <p className="text-[13px] text-stone">Nothing is published without review. The team reads every resource, and you will be told when it is live.</p>
        </section>
      )}
    </form>
  );
}
