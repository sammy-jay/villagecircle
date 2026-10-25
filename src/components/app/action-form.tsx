"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/dc/icons";
import { cn } from "@/lib/cn";

export type FormResult = { ok?: boolean; error?: string; field?: string; done?: string; [k: string]: unknown };

/**
 * A console form posted to a server action that returns { ok, error, done }. Shows the error under the fields,
 * and a confirmation (`ok` text, or one per `done` value). `confirm` asks before sending, for actions that change accounts or Asks.
 */
export function ActionForm({ action, children, className, ok, confirm, hideOnOk, id }: {
  action: (s: FormResult, fd: FormData) => Promise<FormResult>; children: ReactNode; className?: string; ok?: string | Record<string, string>; confirm?: string; hideOnOk?: boolean; id?: string;
}) {
  const [state, run] = useFormState<FormResult, FormData>(action, {});
  const okText = state.ok ? (typeof ok === "string" ? ok : ok && state.done ? ok[state.done] : undefined) : undefined;
  if (state.ok && hideOnOk && okText) return <p role="status" className="flex items-center gap-2 rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />{okText}</p>;
  return (
    <form id={id} action={run} onSubmit={confirm ? (e) => { if (!window.confirm(confirm)) e.preventDefault(); } : undefined} className={cn("flex gap-3", !className?.includes("flex-row") && "flex-col", className)}>
      {children}
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      {okText && <p role="status" className="flex items-center gap-2 text-[14px] font-semibold text-forest"><Icon name="check" size={16} />{okText}</p>}
    </form>
  );
}

const VARIANT = { primary: "dc-btn-primary", forest: "dc-btn-forest", soft: "dc-btn-soft", outline: "dc-btn-outline", ghost: "dc-btn-ghost" } as const;

/** Submit button that shows it is working. `name`/`value` say which of several buttons was pressed. */
export function Submit({ children, variant = "primary", icon, name, value, className, busy = "Saving…", disabled }: { children: ReactNode; variant?: keyof typeof VARIANT; icon?: IconName; name?: string; value?: string; className?: string; busy?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending || disabled} className={cn("dc-btn h-[50px] disabled:opacity-55", VARIANT[variant], className)}>{icon && <Icon name={icon} size={18} />}{pending ? busy : children}</button>;
}
