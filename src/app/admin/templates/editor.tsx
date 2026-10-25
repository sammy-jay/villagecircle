"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { renderParts, templateDef, validateParts, type TemplateParts } from "@/lib/domain/templates";
import { cn } from "@/lib/cn";
import type { CState } from "../content-actions";

type Field = keyof TemplateParts;
function Btn({ children, name, value, variant = "dc-btn-primary", disabled }: { children: React.ReactNode; name?: string; value?: string; variant?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending || disabled} className={cn("dc-btn h-[50px] disabled:opacity-55", variant)}>{pending ? "Working…" : children}</button>;
}

/** P05 editor: edit the words, tap a placeholder to add it where the cursor is, and see the sample rendered. Rules are checked as you type. */
export function TemplateEditor({ tkey, initial, save, test }: { tkey: string; initial: TemplateParts; save: (s: CState, fd: FormData) => Promise<CState>; test: (s: CState, fd: FormData) => Promise<CState> }) {
  const def = templateDef(tkey)!;
  const [p, setP] = useState<TemplateParts>(initial);
  const [focus, setFocus] = useState<Field>("body");
  const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const [s1, saveRun] = useFormState<CState, FormData>(save, {});
  const [s2, testRun] = useFormState<CState, FormData>(test, {});
  const errs = validateParts(def, p);
  let out: ReturnType<typeof renderParts> | null = null; try { out = renderParts(def, p, def.sample); } catch { out = null; }
  const insert = (v: string) => {
    const el = refs.current[focus]; const cur = p[focus] ?? ""; const tag = `{{${v}}}`;
    const at = el?.selectionStart ?? cur.length; const next = cur.slice(0, at) + tag + cur.slice(el?.selectionEnd ?? at);
    setP({ ...p, [focus]: next }); requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tag.length, at + tag.length); });
  };
  const field = (k: Field, label: string, area = false) => p[k] === undefined && def.defaults[k] === undefined ? null : (
    <div key={k}><label htmlFor={`t-${k}`} className="dc-label">{label}</label>
      {area ? <textarea id={`t-${k}`} name={k} rows={def.channel === "SMS" ? 4 : 7} value={p[k] ?? ""} onFocus={() => setFocus(k)} onChange={(e) => setP({ ...p, [k]: e.target.value })} ref={(el) => { refs.current[k] = el; }} className="dc-textarea" />
        : <input id={`t-${k}`} name={k} value={p[k] ?? ""} onFocus={() => setFocus(k)} onChange={(e) => setP({ ...p, [k]: e.target.value })} ref={(el) => { refs.current[k] = el; }} className="dc-input" />}
      {k === "body" && def.channel === "SMS" && <span className="dc-hint">{(p.body ?? "").length} / 320</span>}
    </div>
  );
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <form action={saveRun} className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 lg:p-6">
        <input type="hidden" name="key" value={tkey} />
        {def.channel === "EMAIL" && field("subject", "Subject")}{def.channel === "EMAIL" && field("preheader", "Preview line")}
        {field("body", def.channel === "SMS" ? "Text message" : "Message", true)}
        <div><p className="dc-label">Placeholders you can use. Tap to add.</p><div className="flex flex-wrap gap-1.5">{def.vars.map((v) => <button key={v} type="button" onClick={() => insert(v)} className="rounded-full bg-butter px-3 py-1.5 font-mono text-[12.5px] font-bold text-butter-ink">{`{{${v}}}`}</button>)}</div><span className="dc-hint">First names only, and no contact details.{def.required.length ? ` ${def.required.map((x) => `{{${x}}}`).join(", ")} ${def.required.length === 1 ? "is" : "are"} required.` : ""}</span></div>
        {def.channel === "EMAIL" && field("cta", "Button")}{def.channel === "EMAIL" && field("footer", "Footer")}
        {errs.length > 0 && <ul role="alert" className="flex flex-col gap-1 rounded-[16px] bg-blush px-4 py-3 text-[13.5px] font-semibold text-blush-ink">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
        {s1.error && <p role="alert" className="text-[14px] font-semibold text-clay">{s1.error}</p>}
        {s1.ok && <p role="status" className="flex items-center gap-2 text-[14px] font-semibold text-forest"><Icon name="check" size={16} />{s1.done === "reset" ? "Back to the standard text." : "Saved. New messages use it straight away."}</p>}
        <div className="flex flex-wrap gap-2.5"><Btn disabled={errs.length > 0}>Save template</Btn><Btn name="intent" value="reset" variant="dc-btn-ghost">Reset to default</Btn></div>
      </form>
      <aside className="flex flex-col gap-3 self-start">
        <section className="rounded-card bg-sand p-5">
          <p className="text-[13px] font-bold text-bark">Preview · sample data</p>
          {out ? (
            def.channel === "SMS" ? <p className="mt-3 rounded-[18px] rounded-bl-[6px] bg-card px-4 py-3 text-[14.5px] leading-normal">{out.body}</p> : (
              <div className="mt-3 rounded-[18px] bg-card p-4 text-[14px] leading-normal">
                <p><b>Subject:</b> {out.subject}</p>{out.preheader && <p className="text-stone">{out.preheader}</p>}
                <p className="mt-3 whitespace-pre-line">{out.body}</p>{out.cta && <span className="mt-3 inline-block rounded-full bg-clay px-4 py-2 font-bold text-clay-ink">{out.cta}</span>}
                {out.footer && <p className="mt-3 text-[12px] text-stone">{out.footer}</p>}
              </div>
            )
          ) : <p className="mt-2 text-[14px] text-clay">This would not send. Fix the rules first.</p>}
        </section>
        {def.channel === "EMAIL" && <form action={testRun}><input type="hidden" name="key" value={tkey} /><Btn variant="dc-btn-outline">Send a test to my email</Btn>{s2.ok && <p role="status" className="mt-2 text-[13.5px] font-semibold text-forest">Test sent (saved text, sample data).</p>}{s2.error && <p role="alert" className="mt-2 text-[13.5px] text-clay">{s2.error}</p>}</form>}
      </aside>
    </div>
  );
}
