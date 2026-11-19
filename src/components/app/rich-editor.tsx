"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { RichText } from "@/components/app/rich-text";
import { isAllowedLink, LINK_RULE } from "@/lib/domain/rich-text";
import { cn } from "@/lib/cn";

type Range = { from: number; to: number };
const LIST = /^(\s*)(- \[[ xX]\] |[-*•] |(\d{1,3})[.)] |> )/;
const ANY_PREFIX = /^(\s*)(- \[[ xX]\] |[-*•] |\d{1,3}[.)] |> |#{2,3} )/;

/**
 * A free-text box with formatting, for library resources: bold, italic, a heading, bullets, numbered steps, a
 * checklist, a tip and links to trusted sites, plus Write / Preview. What is stored is the plain formatted text
 * (lib/domain/rich-text.ts); readers only ever see it rendered. Enter carries a list on; Enter on an empty item ends it.
 * `name` posts the value with the form. `sections`: the heading button makes a page section (##), not a sub-heading.
 */
export function RichEditor({ id, name, value, onChange, max, rows = 6, placeholder, invalid, describedBy, sections, label }: {
  id: string; name?: string; value: string; onChange: (v: string) => void; max: number; rows?: number; placeholder?: string;
  invalid?: boolean; describedBy?: string; sections?: boolean; label: string;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [linkOpen, setLinkOpen] = useState<{ range: Range; text: string } | null>(null);
  const pendingSel = useRef<Range | null>(null);
  const uid = useId();

  // When an edit falls back to setting the value, put the selection back once React has rendered it.
  useEffect(() => {
    const r = pendingSel.current; const el = ta.current;
    if (r && el) { el.setSelectionRange(r.from, r.to); pendingSel.current = null; }
  });

  /** Replace [from, to) with text and select [selFrom, selTo) after. Uses the browser's own insert so Ctrl+Z undoes it. */
  const replace = (from: number, to: number, text: string, sel: Range) => {
    const el = ta.current; if (!el) return;
    el.focus(); el.setSelectionRange(from, to);
    const ok = typeof document !== "undefined" && document.execCommand?.("insertText", false, text);
    if (!ok) { onChange(el.value.slice(0, from) + text + el.value.slice(to)); pendingSel.current = sel; return; }
    el.setSelectionRange(sel.from, sel.to);
  };

  const wrap = (mark: string, sample: string) => {
    const el = ta.current; if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const inner = v.slice(s, e);
    if (inner.startsWith(mark) && inner.endsWith(mark) && inner.length >= mark.length * 2) {
      const bare = inner.slice(mark.length, inner.length - mark.length); replace(s, e, bare, { from: s, to: s + bare.length }); return;
    }
    if (v.slice(s - mark.length, s) === mark && v.slice(e, e + mark.length) === mark) {
      replace(s - mark.length, e + mark.length, inner, { from: s - mark.length, to: e - mark.length }); return;
    }
    const body = inner || sample;
    replace(s, e, `${mark}${body}${mark}`, { from: s + mark.length, to: s + mark.length + body.length });
  };

  /** Turn the selected lines into (or out of) a kind of line: heading, bullets, numbers, checklist, tip. */
  const lines = (kind: "h" | "ul" | "ol" | "check" | "tip") => {
    const el = ta.current; if (!el) return;
    const { selectionStart: s, selectionEnd: e, value: v } = el;
    const from = v.lastIndexOf("\n", s - 1) + 1;
    const endNl = v.indexOf("\n", e === s ? e : e - 1); const to = endNl === -1 ? v.length : endNl;
    const ls = v.slice(from, to).split("\n");
    const head = sections ? "## " : "### ";
    const prefixFor = (i: number) => ({ h: head, ul: "- ", ol: `${i + 1}. `, check: "- [ ] ", tip: "> " })[kind];
    const has = (l: string) => kind === "h" ? /^#{2,3} /.test(l) : kind === "ul" ? /^[-*•] (?!\[)/.test(l) : kind === "ol" ? /^\d{1,3}[.)] /.test(l) : kind === "check" ? /^- \[[ xX]\] /.test(l) : /^> /.test(l);
    const content = ls.filter((l) => l.trim());
    const allHave = content.length > 0 && content.every(has);
    let n = 0;
    const next = ls.map((l) => {
      if (!l.trim() && ls.length > 1) return l;
      const bare = l.replace(ANY_PREFIX, "$1");
      return allHave ? bare : `${prefixFor(n++)}${bare.trimStart()}`;
    }).join("\n");
    replace(from, to, next, { from: from + next.length, to: from + next.length });
  };

  const openLink = () => {
    const el = ta.current; if (!el) return;
    setLinkOpen({ range: { from: el.selectionStart, to: el.selectionEnd }, text: el.value.slice(el.selectionStart, el.selectionEnd) });
  };
  const addLink = (text: string, url: string) => {
    if (!linkOpen) return;
    const md = `[${text.trim() || url}](${url})`;
    setLinkOpen(null);
    requestAnimationFrame(() => replace(linkOpen.range.from, linkOpen.range.to, md, { from: linkOpen.range.from + md.length, to: linkOpen.range.from + md.length }));
  };

  const onKey = (ev: KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = ev.metaKey || ev.ctrlKey;
    if (mod && ev.key.toLowerCase() === "b") { ev.preventDefault(); wrap("**", "bold text"); return; }
    if (mod && ev.key.toLowerCase() === "i") { ev.preventDefault(); wrap("*", "italic text"); return; }
    if (mod && ev.key.toLowerCase() === "k") { ev.preventDefault(); openLink(); return; }
    if (ev.key !== "Enter" || ev.shiftKey || mod || ev.nativeEvent.isComposing) return;
    const el = ev.currentTarget; const { selectionStart: s, selectionEnd: e, value: v } = el;
    if (s !== e) return;
    const lineStart = v.lastIndexOf("\n", s - 1) + 1;
    const line = v.slice(lineStart, s);
    const m = LIST.exec(line); if (!m) return;
    ev.preventDefault();
    if (!line.slice(m[0].length).trim()) { replace(lineStart, s, "", { from: lineStart, to: lineStart }); return; } // empty item: end the list
    const nextPrefix = m[3] ? `${m[1]}${Number(m[3]) + 1}${m[2]!.trim().slice(-1)} ` : m[2]!.startsWith("- [") ? `${m[1]}- [ ] ` : `${m[1]}${m[2]}`;
    const ins = `\n${nextPrefix}`;
    replace(s, s, ins, { from: s + ins.length, to: s + ins.length });
  };

  const tools: { icon: IconName; label: string; run: () => void }[] = [
    { icon: "bold", label: "Bold (Ctrl+B)", run: () => wrap("**", "bold text") },
    { icon: "italic", label: "Italic (Ctrl+I)", run: () => wrap("*", "italic text") },
    { icon: "heading", label: sections ? "Section heading" : "Heading", run: () => lines("h") },
    { icon: "listBullet", label: "Bulleted list", run: () => lines("ul") },
    { icon: "listNumber", label: "Numbered steps", run: () => lines("ol") },
    { icon: "checklist", label: "Checklist", run: () => lines("check") },
    { icon: "sparkle", label: "Tip", run: () => lines("tip") },
    { icon: "link", label: "Link (Ctrl+K)", run: openLink },
  ];

  return (
    <div className={cn("rounded-field border-2 bg-card transition-colors focus-within:border-ink", invalid ? "border-clay" : "border-line")}>
      <div className="flex items-center gap-1 border-b border-line px-1.5 py-1.5">
        <div role="toolbar" aria-label={`Formatting for ${label}`} aria-controls={id} className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-0.5", mode === "preview" && "pointer-events-none opacity-40")}>
          {tools.map((t) => (
            <button key={t.icon} type="button" title={t.label} aria-label={t.label} disabled={mode === "preview"} onMouseDown={(e) => e.preventDefault()} onClick={t.run}
              className="flex size-9 items-center justify-center rounded-[10px] text-bark hover:bg-sand hover:text-ink focus-visible:bg-sand">
              <Icon name={t.icon} size={18} />
            </button>
          ))}
        </div>
        <div role="tablist" aria-label={`${label}: write or preview`} className="flex shrink-0 rounded-full bg-sand p-0.5">
          {(["write", "preview"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setLinkOpen(null); }}
              className={cn("h-8 rounded-full px-3 text-[13px] font-bold capitalize", mode === m ? "bg-card text-ink shadow-sm" : "text-stone")}>{m}</button>
          ))}
        </div>
      </div>

      {linkOpen && mode === "write" && <LinkPanel uid={uid} initialText={linkOpen.text} onCancel={() => { setLinkOpen(null); ta.current?.focus(); }} onAdd={addLink} />}

      <textarea ref={ta} id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKey} rows={rows} maxLength={max}
        placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        className={cn("block w-full resize-y rounded-b-field bg-transparent px-4 py-3.5 text-field leading-6 text-ink placeholder:text-stone focus:outline-none", mode === "preview" && "hidden")} />
      {mode === "preview" && (
        <div className="min-h-[120px] px-4 py-3.5">
          {value.trim() ? <RichText body={value} size="sm" /> : <p className="text-[14.5px] text-stone">Nothing to preview yet.</p>}
        </div>
      )}
      <p className="flex justify-between gap-3 border-t border-line px-4 py-2 text-caption text-stone" aria-live="polite">
        <span className="hidden sm:inline">Select text, then pick a format. Enter carries a list on.</span>
        <span className="ml-auto">{value.length.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>
      </p>
    </div>
  );
}

/** The editor for a server-rendered form: keeps its own value and posts it as `name`. Give it a `key` to reset it. */
export function RichEditorField({ defaultValue = "", ...rest }: Omit<Parameters<typeof RichEditor>[0], "value" | "onChange"> & { name: string; defaultValue?: string }) {
  const [v, setV] = useState(defaultValue);
  return <RichEditor {...rest} value={v} onChange={setV} />;
}

/** Add a link without leaving the page: the words to show and the address, checked against the trusted sites. */
function LinkPanel({ uid, initialText, onAdd, onCancel }: { uid: string; initialText: string; onAdd: (text: string, url: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const urlRef = useRef<HTMLInputElement>(null);
  useEffect(() => { urlRef.current?.focus(); }, []);
  const add = () => {
    const u = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    if (!url.trim()) { setErr("Paste the address of the page."); return; }
    if (!isAllowedLink(u)) { setErr(LINK_RULE); return; }
    onAdd(text, u);
  };
  return (
    <div className="flex flex-col gap-2.5 border-b border-line bg-paper px-3 py-3" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); onCancel(); } if (e.key === "Enter") { e.preventDefault(); add(); } }}>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <div><label htmlFor={`${uid}-u`} className="mb-1 block text-[12.5px] font-bold text-bark">Address</label><input ref={urlRef} id={`${uid}-u`} value={url} onChange={(e) => { setUrl(e.target.value); setErr(""); }} placeholder="https://studentaid.gov" inputMode="url" aria-invalid={!!err || undefined} aria-describedby={`${uid}-e`} className="h-11 w-full rounded-[12px] border-2 border-line bg-card px-3 text-[15px] focus:border-ink focus:outline-none" /></div>
        <div><label htmlFor={`${uid}-t`} className="mb-1 block text-[12.5px] font-bold text-bark">Words to show</label><input id={`${uid}-t`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Apply for financial aid" className="h-11 w-full rounded-[12px] border-2 border-line bg-card px-3 text-[15px] focus:border-ink focus:outline-none" /></div>
      </div>
      <p id={`${uid}-e`} className={cn("text-[12.5px]", err ? "font-semibold text-clay" : "text-stone")}>{err || LINK_RULE}</p>
      <div className="flex gap-2"><button type="button" onClick={add} className="dc-btn dc-btn-forest h-10 px-4 text-[14px]">Add link</button><button type="button" onClick={onCancel} className="dc-btn dc-btn-soft h-10 px-4 text-[14px]">Cancel</button></div>
    </div>
  );
}
