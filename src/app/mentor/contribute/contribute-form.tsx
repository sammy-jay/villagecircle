"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { RichEditor } from "@/components/app/rich-editor";
import { RichText } from "@/components/app/rich-text";
import { checkResource, composeBody, initialSections, templateFor, type Sections } from "@/lib/domain/resource-templates";
import { resourceAction, type MState } from "../actions";
import { cn } from "@/lib/cn";

type Opt = { value: string; label: string };
type D = { type: string; title: string; body: string; topic: string; cohort: string; credit: string; askId: string };

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" name="intent" value="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name="send" size={18} />{pending ? "Sending…" : "Submit for review"}</button>;
}

/**
 * D24 Contribute: two steps on one page. Step 1 picks the format, topic and (optionally) a conversation to start from.
 * Step 2 is that format's structured template: one formatted box per section (lib/domain/resource-templates.ts),
 * joined into the resource body on send, with a preview of the whole thing as readers will see it.
 */
export function ContributeForm({ types, topics, audiences, credits, conversations, draft }: { types: Opt[]; topics: Opt[]; audiences: Opt[]; credits: Opt[]; conversations: { askId: string; label: string; notes: string }[]; draft: D }) {
  const [state, action] = useFormState<MState, FormData>(resourceAction, {});
  const [step, setStep] = useState(draft.title || draft.body ? 2 : 1);
  const [d, setD] = useState<D>(draft);
  const start = useMemo(() => initialSections(draft.type, draft.body), [draft.type, draft.body]);
  const [sections, setSections] = useState<Sections>(start.sections);
  const [link, setLink] = useState(start.link);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const t = templateFor(d.type);
  const body = composeBody(d.type, sections, link);
  const set = (k: keyof D) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const setSection = (k: string) => (v: string) => { setSections((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  /** Switching format keeps everything written: the old sections are joined, then split into the new template. */
  const setType = (type: string) => {
    const next = initialSections(type, composeBody(d.type, sections, link));
    setSections(next.sections); setLink(next.link || link); setD((x) => ({ ...x, type })); setErrors({});
  };
  const fromConv = (askId: string) => {
    const c = conversations.find((x) => x.askId === askId);
    setD((x) => ({ ...x, askId }));
    if (c?.notes) setSections((s) => { const k = t.catchAll; const cur = (s[k] ?? "").trim(); return cur && cur !== t.sections.find((x) => x.key === k)?.starter?.trim() ? s : { ...s, [k]: c.notes }; });
  };

  // A problem the server found goes next to its box, like the ones found here.
  useEffect(() => {
    if (state.error) { const f = typeof state.field === "string" ? state.field : "form"; setErrors({ [f]: state.error }); focusField(f); }
  }, [state]);
  const focusField = (f: string) => requestAnimationFrame(() => { const el = document.getElementById(f === "title" ? "title" : f === "link" ? "res-link" : `sec-${f}`); el?.focus(); el?.scrollIntoView({ block: "center", behavior: "smooth" }); });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const intent = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
    if (intent !== "submit") return; // drafts save as they are
    const problems = checkResource(d.type, d.title, sections, link);
    if (problems.length) { e.preventDefault(); setErrors(Object.fromEntries(problems.map((p) => [p.field, p.error]))); setPreview(false); focusField(problems[0]!.field); }
  };
  const ready1 = !!d.type && !!d.topic;
  const err = (f: string) => errors[f] ? <p id={`${f}-err`} role="alert" className="mt-2 text-[13.5px] font-semibold text-clay">{errors[f]}</p> : null;
  const kind = types.find((x) => x.value === d.type);

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {(["type", "topic", "askId", "cohort", "credit"] as const).map((k) => <input key={k} type="hidden" name={k} value={d[k]} />)}
      {/* Sent from state, so they post the same whether the writing boxes or the preview is showing. */}
      <input type="hidden" name="title" value={d.title} />
      <input type="hidden" name="body" value={body} />
      <section className={cn("flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6", step !== 1 && "opacity-90")}>
        <div className="flex items-center justify-between"><p className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-bark">Step 1 of 2</p>{step === 2 && <button type="button" onClick={() => setStep(1)} className="text-[13.5px] font-bold text-clay">Edit</button>}</div>
        <h2 className="font-display text-[22px] font-extrabold">What are you sharing?</h2>
        {step === 1 ? (
          <>
            <div><p className="dc-label">Format</p><Select options={types} value={d.type} onChange={setType} /><span className="dc-hint">Each format comes with a short template, so you only fill in the parts.</span></div>
            <div><p className="dc-label">Topic</p><Select options={topics} value={d.topic} onChange={set("topic")} /></div>
            {conversations.length > 0 && <div><p className="dc-label">Start from a conversation (optional)</p><Select options={[{ value: "", label: "Start from scratch" }, ...conversations.map((c) => ({ value: c.askId, label: c.label }))]} value={d.askId} onChange={fromConv} /><span className="dc-hint">We pull in the notes you wrote. Nothing reaches the library until you submit.</span></div>}
            <button type="button" disabled={!ready1} onClick={() => setStep(2)} className="dc-btn dc-btn-forest h-[50px] self-start disabled:opacity-50"><Icon name="arrowRight" size={18} />Continue</button>
          </>
        ) : <p className="text-[14.5px] text-bark">{kind?.label} · {topics.find((x) => x.value === d.topic)?.label}</p>}
      </section>

      {step === 2 && (
        <section className="flex flex-col gap-5 rounded-card border border-line bg-card p-5 lg:p-6">
          <div className="flex items-center justify-between"><p className="text-[12.5px] font-extrabold uppercase tracking-[.07em] text-bark">Step 2 of 2</p>{!!state.draft && <span className="text-[13px] font-semibold text-forest">Draft saved</span>}</div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="font-display text-[22px] font-extrabold">Write it for them</h2><p className="mt-1 text-[14.5px] text-bark">A {t.label.toLowerCase()} has {t.sections.length} parts. Fill in what you can; optional parts can stay empty.</p></div>
            <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className="dc-btn dc-btn-soft h-11 px-4 text-[14px]"><Icon name={preview ? "pencil" : "eye"} size={17} />{preview ? "Back to writing" : "Preview"}</button>
          </div>

          {preview ? (
            <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-line bg-paper p-4 lg:p-6">
              <p className="text-[12.5px] font-bold uppercase tracking-[.07em] text-stone">How it will look in the library</p>
              <span className="self-start rounded-full border-[1.5px] border-butter-ink px-3 py-[5px] text-[12.5px] font-bold text-butter-ink">{t.label}</span>
              <h3 className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">{d.title || "Your title"}</h3>
              <div className="rounded-card border border-line bg-card p-5">{body ? <RichText body={body} /> : <p className="text-stone">Nothing written yet.</p>}</div>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="title" className="dc-label">Title</label>
                <input id="title" value={d.title} onChange={(e) => { set("title")(e.target.value); setErrors((x) => ({ ...x, title: "" })); }} maxLength={200} className="dc-input" placeholder="What a week in your job really looks like" aria-invalid={!!errors.title || undefined} aria-describedby={errors.title ? "title-err" : undefined} />
                {err("title")}
              </div>
              {t.link && (
                <div>
                  <label htmlFor="res-link" className="dc-label">{t.link.label}</label>
                  <input id="res-link" value={link} onChange={(e) => { setLink(e.target.value); setErrors((x) => ({ ...x, link: "" })); }} inputMode="url" className="dc-input" placeholder="https://youtu.be/…" aria-invalid={!!errors.link || undefined} aria-describedby="res-link-hint" />
                  <span id="res-link-hint" className="dc-hint">{t.link.hint}</span>
                  {err("link")}
                </div>
              )}
              {t.sections.map((s, i) => (
                <div key={s.key}>
                  <label htmlFor={`sec-${s.key}`} className="dc-label mb-1"><span className="mr-1.5 text-stone">{i + 1}.</span>{s.heading}{!s.required && <span className="font-semibold text-stone"> (optional)</span>}</label>
                  <p id={`sec-${s.key}-hint`} className="mb-2 text-[13.5px] text-stone">{s.hint}</p>
                  <RichEditor id={`sec-${s.key}`} label={s.heading} value={sections[s.key] ?? ""} onChange={setSection(s.key)} max={s.max} rows={s.max >= 2500 ? 9 : 5} placeholder={s.placeholder}
                    invalid={!!errors[s.key]} describedBy={`sec-${s.key}-hint${errors[s.key] ? ` ${s.key}-err` : ""}`} />
                  {err(s.key)}
                </div>
              ))}
            </>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div><p className="dc-label">Who is it for</p><Select options={audiences} value={d.cohort} onChange={set("cohort")} /></div>
            <div><p className="dc-label">Credit</p><Select options={credits} value={d.credit} onChange={set("credit")} /><span className="dc-hint">Shown on the resource.</span></div>
          </div>
          {err("form")}
          <div className="flex flex-wrap gap-2.5"><Submit /><button type="submit" name="intent" value="draft" className="dc-btn dc-btn-soft h-[52px]">Save draft</button></div>
          <p className="text-[13px] text-stone">Nothing is published without review. The team reads every resource, and you will be told when it is live.</p>
        </section>
      )}
    </form>
  );
}
