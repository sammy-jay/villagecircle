"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/dc/icons";
import { Select, type Option } from "@/components/dc/client";

/* Form parts at the size every account and app board uses: 54px fields, 13px bold labels, 12.5px hints. */

export const fieldClass = "h-[54px] w-full rounded-field border-2 border-line bg-card px-4 text-[16px] text-ink placeholder:text-stone focus:border-ink focus:outline-none aria-[invalid=true]:border-clay";
export const areaClass = "w-full rounded-field border-2 border-line bg-card px-4 py-3.5 text-[16px] leading-normal text-ink placeholder:text-stone focus:border-ink focus:outline-none aria-[invalid=true]:border-clay";
export const sayMoreClass = "min-h-[46px] w-full rounded-saymore border-2 border-dashed border-line bg-card px-4 py-3 text-support text-ink placeholder:text-stone focus:border-solid focus:border-ink focus:outline-none";

export function FieldWrap({ label, htmlFor, hint, error, children, className }: { label?: ReactNode; htmlFor?: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-[7px]", className)}>
      {label && <label htmlFor={htmlFor} className="text-label font-bold text-bark">{label}</label>}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <p className="text-caption text-stone">{hint}</p> : null}
    </div>
  );
}

export function FieldError({ children }: { children: ReactNode }) {
  return <p role="alert" className="flex items-start gap-1.5 text-[13.5px] font-semibold text-clay"><Icon name="alert" size={16} className="mt-px" />{children}</p>;
}

export function TextField({ icon, className, ...rest }: { icon?: IconName } & ComponentProps<"input">) {
  if (!icon) return <input className={cn(fieldClass, className)} {...rest} />;
  return (
    <div className="relative">
      <Icon name={icon} size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone" />
      <input className={cn(fieldClass, "pl-[45px]", className)} {...rest} />
    </div>
  );
}

/** Password with the eye toggle from M1 and M9. */
export function PasswordField({ className, ...rest }: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} className={cn(fieldClass, "pr-12", className)} {...rest} />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
        className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-stone hover:text-ink">
        <Icon name="eye" size={20} />
      </button>
    </div>
  );
}

export function SelectField(props: { id?: string; name?: string; options: Option[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; invalid?: boolean; sayMore?: { name?: string; placeholder?: string; defaultValue?: string; show?: "always" | "selected" } }) {
  return <Select {...props} className="[&>button]:h-[54px] [&>input.dc-saymore]:min-h-[46px] [&>input.dc-saymore]:rounded-saymore" />;
}

/** 26px square checkbox from the account boards. */
export function CheckRow({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-[15px] leading-[1.45]", className)}>
      <span className="relative mt-px size-[26px] shrink-0">
        <input type="checkbox" className="peer absolute inset-0 cursor-pointer appearance-none rounded-check border-2 border-line bg-card checked:border-forest checked:bg-forest focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-gold" {...rest} />
        <Icon name="check" size={16} strokeWidth={3} className="pointer-events-none absolute left-[5px] top-[5px] hidden text-forest-ink peer-checked:block" />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** Chip group that posts as hidden inputs. `max` limits multi-select. */
export function ChipPicker({ name, options, defaultValue = [], multi = true, max, onChange, size = "md" }: { name: string; options: string[]; defaultValue?: string[]; multi?: boolean; max?: number; onChange?: (v: string[]) => void; size?: "md" | "lg" }) {
  const [sel, setSel] = useState<string[]>(defaultValue);
  const toggle = (o: string) => {
    const next = sel.includes(o) ? sel.filter((x) => x !== o) : multi ? (max && sel.length >= max ? sel : [...sel, o]) : [o];
    setSel(next); onChange?.(next);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group">
      {sel.map((s) => <input key={s} type="hidden" name={name} value={s} />)}
      {options.map((o) => {
        const on = sel.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => toggle(o)} className={cn("dc-pill", size === "lg" ? "text-[14.5px] lg:text-[15px]" : "text-[14.5px]", on ? "bg-forest text-forest-ink" : "bg-sand text-ink hover:border-line")}>
            {on && <Icon name="check" size={16} />}{o}
          </button>
        );
      })}
    </div>
  );
}

export function SubmitButton({ children, icon, className, pendingText = "Please wait…", disabled, form, variant = "primary" }: { children: ReactNode; icon?: IconName; className?: string; pendingText?: string; disabled?: boolean; form?: string; variant?: "primary" | "forest" | "soft" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" form={form} disabled={pending || disabled} className={cn("dc-btn", `dc-btn-${variant}`, className)}>
      {icon && <Icon name={icon} size={18} />}{pending ? pendingText : children}
    </button>
  );
}

/** Pastel note with a leading icon (radius 20, 16/18 padding). */
export function Note({ tone = "mint", icon, children, className }: { tone?: "mint" | "butter" | "blush"; icon: IconName; children: ReactNode; className?: string }) {
  const t = { mint: "bg-mint text-mint-ink", butter: "bg-butter text-butter-ink", blush: "bg-blush text-blush-ink" }[tone];
  return <div className={cn("flex gap-3 rounded-[20px] px-[18px] py-4 text-[14.5px] leading-[1.45]", t, className)}><Icon name={icon} size={24} /><div className="min-w-0">{children}</div></div>;
}
