"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icons";

/* ───────── §4 Chips ───────── */

/** Filter / choice chip. Selected chips go forest with a check. */
export function Chip({ on, icon, children, className, ...rest }: { on?: boolean; icon?: IconName } & ComponentProps<"button">) {
  return (
    <button type="button" aria-pressed={on} className={cn("dc-chip", className)} {...rest}>
      {on ? <Icon name="check" size={16} /> : icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/* ───────── §5 Inputs ───────── */

/** Textarea with the "58 / 600" counter under its right edge. */
export function CountedTextarea({ max, className, defaultValue, value, onChange, ...rest }: { max: number } & ComponentProps<"textarea">) {
  const [len, setLen] = useState(String(value ?? defaultValue ?? "").length);
  useEffect(() => { if (value !== undefined) setLen(String(value).length); }, [value]);
  return (
    <div>
      <textarea className={cn("dc-textarea", className)} maxLength={max} defaultValue={defaultValue} value={value}
        onChange={(e) => { setLen(e.target.value.length); onChange?.(e); }} {...rest} />
      <p className="mt-2 text-right text-caption text-stone" aria-live="polite">{len} / {max}</p>
    </div>
  );
}

export type Option = { value: string; label: string };

/**
 * Dropdown from the board: 58px closed field, open list with a mint selected row, and an optional
 * dashed "Say more" box underneath. Works in plain forms through hidden inputs (name / sayMore.name).
 */
export function Select({ name, options, value: controlled, defaultValue, onChange, placeholder = "Choose one", sayMore, invalid, id, className }: {
  name?: string; options: Option[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string;
  sayMore?: { name?: string; placeholder?: string; defaultValue?: string; show?: "always" | "selected" }; invalid?: boolean; id?: string; className?: string;
}) {
  const auto = useId();
  const btnId = id ?? auto;
  const [inner, setInner] = useState(defaultValue ?? "");
  const value = controlled ?? inner;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (v: string) => { setInner(v); onChange?.(v); setOpen(false); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(Math.max(0, options.findIndex((o) => o.value === value))); return; }
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
    if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); pick(options[active]!.value); }
  };
  const showSayMore = sayMore && (sayMore.show === "always" || (sayMore.show ?? "selected") === "selected" && !!value);

  return (
    <div ref={wrap} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button id={btnId} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}
        className={cn("dc-input flex items-center justify-between gap-3 text-left", invalid && "border-clay")}>
        <span className={cn("truncate", !selected && "text-stone")}>{selected?.label ?? placeholder}</span>
        <Icon name="chevronDown" size={20} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul role="listbox" aria-labelledby={btnId} className="dc-menu absolute inset-x-0 top-[calc(100%+7px)] z-30 max-h-72 overflow-y-auto">
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o.value)} onMouseEnter={() => setActive(i)}
              className={cn("dc-option cursor-pointer", i === active && o.value !== value && "bg-sand")}>
              <span className="w-4 shrink-0">{o.value === value && <Icon name="check" size={16} />}</span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {showSayMore && <input name={sayMore.name} defaultValue={sayMore.defaultValue} placeholder={sayMore.placeholder ?? "Say more (optional)"} className="dc-saymore mt-[7px]" aria-label="Say more (optional)" />}
    </div>
  );
}

/**
 * Multi-select version of Select: the list stays open while you tick rows, and the closed field
 * reads "A, B" or "3 chosen". An `exclusive` option (like "Prefer not to say") clears the others.
 * Posts one hidden `name` input per choice.
 */
export function MultiSelect({ name, options, defaultValue = [], onChange, placeholder = "Choose any that apply", exclusive = [], sayMore, id, className }: {
  name?: string; options: Option[]; defaultValue?: string[]; onChange?: (v: string[]) => void; placeholder?: string; exclusive?: string[];
  sayMore?: { name?: string; placeholder?: string; defaultValue?: string }; id?: string; className?: string;
}) {
  const auto = useId();
  const btnId = id ?? auto;
  const [sel, setSel] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = (v: string) => {
    const next = sel.includes(v) ? sel.filter((x) => x !== v) : exclusive.includes(v) ? [v] : [...sel.filter((x) => !exclusive.includes(x)), v];
    setSel(next); onChange?.(next);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); setActive(0); return; }
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
    if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); toggle(options[active]!.value); }
  };
  const labels = options.filter((o) => sel.includes(o.value)).map((o) => o.label);
  const summary = labels.length === 0 ? placeholder : labels.length <= 2 ? labels.join(", ") : `${labels.length} chosen`;

  return (
    <div ref={wrap} className={cn("relative", className)}>
      {name && sel.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <button id={btnId} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)} onKeyDown={onKey}
        className="dc-input flex items-center justify-between gap-3 text-left">
        <span className={cn("truncate", !labels.length && "text-stone")}>{summary}</span>
        <Icon name="chevronDown" size={20} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="dc-menu absolute inset-x-0 top-[calc(100%+7px)] z-30">
          <ul role="listbox" aria-multiselectable="true" aria-labelledby={btnId} className="max-h-72 overflow-y-auto">
            {options.map((o, i) => {
              const on = sel.includes(o.value);
              return (
                <li key={o.value} role="option" aria-selected={on} onMouseDown={(e) => e.preventDefault()} onClick={() => toggle(o.value)} onMouseEnter={() => setActive(i)}
                  className={cn("dc-option cursor-pointer", i === active && !on && "bg-sand")}>
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2", on ? "border-forest bg-forest text-forest-ink" : "border-line bg-card")}>{on && <Icon name="check" size={13} strokeWidth={3} />}</span>
                  {o.label}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
            <span className="text-[13px] text-stone">{labels.length ? `${labels.length} chosen` : "Pick any that apply"}</span>
            <button type="button" onClick={() => setOpen(false)} className="dc-btn dc-btn-soft h-9 px-4 text-[14px]">Done</button>
          </div>
        </div>
      )}
      {sayMore && <input name={sayMore.name} defaultValue={sayMore.defaultValue} placeholder={sayMore.placeholder ?? "Say more (optional)"} className="dc-saymore mt-[7px]" aria-label="Say more (optional)" />}
    </div>
  );
}

/* ───────── §7 Toggles and choices ───────── */

/** 46×28 switch, forest when on. Renders a hidden input when name is set. */
export function Toggle({ checked: controlled, defaultChecked, onChange, name, label, sub, disabled, className }: { checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void; name?: string; label: ReactNode; sub?: ReactNode; disabled?: boolean; className?: string }) {
  const [inner, setInner] = useState(!!defaultChecked);
  const on = controlled ?? inner;
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4 py-[15px]", className)}>
      <div>
        <label htmlFor={id} className="block text-field font-semibold text-ink">{label}</label>
        {sub && <p className="text-chip text-stone">{sub}</p>}
      </div>
      {name && <input type="hidden" name={name} value={on ? "on" : ""} />}
      <button id={id} type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => { setInner(!on); onChange?.(!on); }}
        className={cn("relative h-7 w-[46px] shrink-0 rounded-full transition-colors disabled:opacity-60", on ? "bg-forest" : "bg-line")}>
        <span className={cn("absolute top-[3px] size-[22px] rounded-full bg-card shadow transition-[left]", on ? "left-[21px]" : "left-[3px]")} />
      </button>
    </div>
  );
}

/** 30px rounded checkbox, forest with a white check when ticked. */
export function Checkbox({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-support text-ink", className)}>
      <span className="relative mt-[-4px] size-[30px] shrink-0">
        <input type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-check border-2 border-line bg-card checked:border-forest checked:bg-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" {...rest} />
        <Icon name="check" size={16} className="pointer-events-none absolute left-[7px] top-[7px] hidden text-forest-ink peer-checked:block" />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** Radio card ("30 minutes · A quick, focused chat"). */
export function RadioCard({ label, sub, className, ...rest }: { label: ReactNode; sub?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cn("group flex cursor-pointer items-center gap-3 rounded-field border-2 border-line bg-card px-4 py-3.5 has-[:checked]:border-forest", className)}>
      <span className="relative size-[26px] shrink-0">
        <input type="radio" className="peer absolute inset-0 cursor-pointer appearance-none rounded-full border-2 border-line checked:border-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" {...rest} />
        <span className="pointer-events-none absolute inset-[6px] hidden rounded-full bg-forest peer-checked:block" />
      </span>
      <span>
        <span className="block text-[15px] font-bold text-ink">{label}</span>
        {sub && <span className="block text-caption text-stone">{sub}</span>}
      </span>
    </label>
  );
}

/* ───────── §7 Tabs ───────── */

export type TabItem<T extends string> = { value: T; label: ReactNode; count?: number };

/** Pill tabs filter one list. */
export function PillTabs<T extends string>({ items, value, onChange, label, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={t.value === value} onClick={() => onChange(t.value)} className="dc-chip">
          {t.label}
          {!!t.count && <span className="dc-count ml-0.5">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Underline tabs switch a panel on the same page. Counts sit after the label. */
export function UnderlineTabs<T extends string>({ items, value, onChange, label, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-[22px] overflow-x-auto border-b border-line", className)}>
      {items.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.value)}
            className={cn("-mb-px flex shrink-0 items-start gap-1.5 border-b-2 pb-[13px] text-[15px]", on ? "border-ink font-bold text-ink" : "border-transparent font-medium text-stone hover:text-ink")}>
            {t.label}
            {!!t.count && <span className="dc-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── §5 Code entry and legal-name signature ───────── */

/** Six-box code entry. Accepts paste. Submits as one hidden field. */
export function CodeInput({ name = "code", length = 6, onComplete, invalid, autoFocus }: { name?: string; length?: number; onComplete?: (code: string) => void; invalid?: boolean; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (next: string[]) => { setDigits(next); if (next.every(Boolean)) onComplete?.(next.join("")); };
  const fill = (from: number, text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, length - from).split("");
    if (!clean.length) return;
    const next = [...digits]; clean.forEach((d, i) => (next[from + i] = d)); set(next);
    refs.current[Math.min(from + clean.length, length - 1)]?.focus();
  };
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))` }}>
      <input type="hidden" name={name} value={digits.join("")} />
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1} autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`} aria-invalid={invalid || undefined}
          onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v.length > 1) return fill(i, v); const next = [...digits]; next[i] = v; set(next); if (v) refs.current[i + 1]?.focus(); }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i]) refs.current[i - 1]?.focus(); if (e.key === "ArrowLeft") refs.current[i - 1]?.focus(); if (e.key === "ArrowRight") refs.current[i + 1]?.focus(); }}
          onPaste={(e) => { e.preventDefault(); fill(i, e.clipboardData.getData("text")); }}
          className="h-16 w-full min-w-0 rounded-field border-2 border-line bg-card text-center font-display text-[26px] font-extrabold text-ink focus:border-ink focus:outline-none aria-[invalid=true]:border-clay" />
      ))}
    </div>
  );
}

/**
 * Legal-name signature card. The typed name is the signature; the date fills itself once signed.
 * Posts `legalName` and `attest` (names configurable).
 */
export function Signature({ statement, nameField = "legalName", attestField = "attest", error, onChange, defaultName = "", hint = "Your full legal name." }: { statement: ReactNode; nameField?: string; attestField?: string; error?: ReactNode; onChange?: (s: { name: string; attested: boolean }) => void; defaultName?: string; hint?: ReactNode }) {
  const [name, setName] = useState(defaultName);
  const [attested, setAttested] = useState(false);
  const id = useId();
  const signed = name.trim().length > 1;
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  useEffect(() => { onChange?.({ name, attested }); }, [name, attested, onChange]);
  return (
    <div className="flex flex-col gap-3.5 rounded-[22px] border-2 border-line bg-card px-5 py-[18px]">
      <div className="flex items-center gap-2.5">
        <Icon name="signature" size={22} className="text-forest" />
        <h3 className="font-display text-[19px] font-extrabold leading-[1.12]">Sign with your legal name</h3>
      </div>
      <p className="text-[14px] leading-normal text-bark">{statement}</p>
      <div className="flex min-h-[54px] items-end border-b-2 border-ink px-1 pb-1.5">
        <label htmlFor={id} className="sr-only">Type your full legal name</label>
        <input id={id} name={nameField} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Type your full legal name" aria-invalid={!!error || undefined}
          className={cn("w-full bg-transparent text-ink placeholder:font-sans placeholder:text-field placeholder:font-normal placeholder:text-stone focus:outline-none", signed ? "font-hand text-[38px] font-semibold leading-none" : "text-field")} />
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-caption text-stone">
        <span>{error ? <span className="font-semibold text-clay">{error}</span> : hint}</span>
        <span>{signed ? `Signed ${today}` : "Signed today, automatically"}</span>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45]">
        <span className="relative mt-px size-[26px] shrink-0">
          <input type="checkbox" name={attestField} value="yes" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="peer absolute inset-0 cursor-pointer appearance-none rounded-check border-2 border-line bg-card checked:border-forest checked:bg-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" />
          <Icon name="check" size={16} strokeWidth={3} className="pointer-events-none absolute left-[5px] top-[5px] hidden text-forest-ink peer-checked:block" />
        </span>
        I understand this is a legally binding attestation and is stored with a time stamp.
      </label>
    </div>
  );
}

/* ───────── §10 Modal (desktop) / bottom sheet (phone) ───────── */

/** "A modal asks one question. On the phone it becomes a bottom sheet." */
export function Modal({ open, onClose, title, children, actions, labelledBy }: { open: boolean; onClose: () => void; title: ReactNode; children?: ReactNode; actions?: ReactNode; labelledBy?: string }) {
  const auto = useId();
  const titleId = labelledBy ?? auto;
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea, button, [href]");
    first?.focus();
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-panel bg-card px-5 pb-5 pt-[29px] shadow-toast sm:max-w-[420px] sm:rounded-panel sm:p-[26px]">
        <span className="absolute left-1/2 top-3 h-[5px] w-11 -translate-x-1/2 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <h2 id={titleId} className="font-display text-[22px] font-extrabold leading-[1.2]">{title}</h2>
        {children && <div className="mt-4 text-support text-bark">{children}</div>}
        {actions && <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row [&>*]:max-sm:w-full">{actions}</div>}
      </div>
    </div>
  );
}

/* ───────── §10 Toasts ───────── */

type ToastTone = "mint" | "butter" | "blush";
export type ToastInput = { title: string; sub?: string; tone?: ToastTone; icon?: IconName; action?: { label: string; onClick: () => void } };
type ToastItem = ToastInput & { id: number };

const ToastCtx = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const TOAST_TONE: Record<ToastTone, { icon: IconName; cls: string }> = {
  mint: { icon: "check", cls: "bg-mint text-mint-ink" },
  butter: { icon: "clock", cls: "bg-butter text-butter-ink" },
  blush: { icon: "alert", cls: "bg-blush text-blush-ink" },
};

/** Toasts: pastel icon tile for tone, one short clay action, gone after 6 seconds. Sits clear of the tab bar's Ask button. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((t: ToastInput) => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { ...t, id }]);
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-center gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:items-end" aria-live="polite">
        {items.map((t) => {
          const tone = t.tone ?? "mint";
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-card border border-line bg-card py-[13px] pl-[15px] pr-5 shadow-toast">
              <span className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-tile", TOAST_TONE[tone].cls)}><Icon name={t.icon ?? TOAST_TONE[tone].icon} size={21} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold leading-[18px] text-ink">{t.title}</p>
                {t.sub && <p className="truncate text-caption text-stone">{t.sub}</p>}
              </div>
              {t.action && <button type="button" className="text-chip font-bold text-clay" onClick={() => { t.action!.onClick(); dismiss(t.id); }}>{t.action.label}</button>}
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
