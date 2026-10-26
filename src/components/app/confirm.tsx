"use client";

import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** What the dialog says. A plain string is split at its first "? " into a title and a line under it. */
export type ConfirmSpec = { title: string; body?: ReactNode; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
export type ConfirmInput = string | ConfirmSpec;

export function toSpec(c: ConfirmInput): ConfirmSpec {
  if (typeof c !== "string") return c;
  const i = c.indexOf("? ");
  return i < 0 ? { title: c } : { title: c.slice(0, i + 1), body: c.slice(i + 2) };
}

/** The app's own "are you sure?" dialog: centred on desktop, a bottom sheet on the phone. Escape or the backdrop cancels. */
export function ConfirmDialog({ spec, onConfirm, onCancel }: { spec: ConfirmSpec; onConfirm: () => void; onCancel: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  useEffect(() => {
    const onCancel = () => cancel.current();
    const before = document.activeElement as HTMLElement | null;
    cancelBtn.current?.focus(); // the safe choice has focus, so Enter never confirms by accident
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const els = panel.current.querySelectorAll<HTMLElement>("button");
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; before?.focus(); };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
      <button type="button" aria-label={spec.cancelLabel ?? "Cancel"} tabIndex={-1} onClick={onCancel} className="absolute inset-0 cursor-default bg-[rgba(20,16,10,.55)]" />
      <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={spec.body ? "confirm-body" : undefined}
        className="relative w-full rounded-t-[30px] bg-card px-5 pb-[22px] pt-3 lg:w-[480px] lg:rounded-[32px] lg:p-[30px] lg:shadow-[0_30px_80px_rgba(0,0,0,.35)]">
        <span className="mx-auto mb-3 block h-[5px] w-11 rounded-[3px] bg-line lg:hidden" aria-hidden="true" />
        <h2 id="confirm-title" className="font-display text-[24px] font-extrabold leading-[1.15] tracking-[-.01em] lg:text-[26px]">{spec.title}</h2>
        {spec.body && <p id="confirm-body" className="mt-2 text-[15.5px] leading-normal text-bark">{spec.body}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2.5 lg:flex-row lg:justify-end">
          <button ref={cancelBtn} type="button" onClick={onCancel} className="dc-btn dc-btn-soft h-[50px] max-lg:w-full">{spec.cancelLabel ?? "Cancel"}</button>
          <button type="button" onClick={onConfirm} className={cn("dc-btn h-[50px] max-lg:w-full", spec.danger ? "dc-btn-primary" : "dc-btn-forest")}>{spec.confirmLabel ?? "Yes, continue"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Ask before a form is sent. Put `onSubmit` on the form, or `onClick` on one submit button when only that button needs asking.
 * On "yes" the form is sent again with the same button, so server actions and `name`/`value` buttons work as before.
 */
export function useConfirmSubmit(c?: ConfirmInput) {
  const [pending, setPending] = useState<{ form: HTMLFormElement; submitter: HTMLButtonElement | null } | null>(null);
  const pass = useRef(false);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!c || pass.current) { pass.current = false; return; }
    e.preventDefault();
    const s = (e.nativeEvent as SubmitEvent).submitter;
    setPending({ form: e.currentTarget, submitter: s instanceof HTMLButtonElement ? s : null });
  };
  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (!c || !e.currentTarget.form) return;
    e.preventDefault();
    setPending({ form: e.currentTarget.form, submitter: e.currentTarget });
  };
  const confirm = () => {
    const p = pending; setPending(null); if (!p) return;
    pass.current = true;
    if (p.submitter) p.form.requestSubmit(p.submitter); else p.form.requestSubmit();
  };
  const dialog = pending && c ? <ConfirmDialog spec={toSpec(c)} onConfirm={confirm} onCancel={() => setPending(null)} /> : null;
  return { onSubmit, onClick, dialog };
}
