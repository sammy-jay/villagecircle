"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { goingAction, helpedAction, saveAction, type FeedState } from "@/app/participant-actions";
import { cn } from "@/lib/cn";

/** Plain icon + label buttons from the D1 tip card footer. Each is its own tiny form so it works before JavaScript loads. */
function Btn({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={cn("inline-flex items-center gap-1.5 text-[14px] font-bold disabled:opacity-60", className)}>{children}</button>;
}

export function HelpfulButton({ id, count, tone = "clay" }: { id: string; count?: number; tone?: "clay" | "blush" }) {
  const [s, action] = useFormState<FeedState, FormData>(helpedAction, {});
  const on = !!s.on;
  const color = tone === "blush" ? "text-blush-ink" : on ? "text-clay" : "text-stone";
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Btn className={color}><Icon name="heart" size={20} filled={on || tone === "blush"} />{count == null ? (on ? "Helped" : "Helpful") : tone === "blush" ? count + (on ? 1 : 0) : `Helpful ${count + (on ? 1 : 0)}`}</Btn>
    </form>
  );
}

export function SaveButton({ id, saved }: { id: string; saved: boolean }) {
  const [s, action] = useFormState<FeedState, FormData>(saveAction, { on: saved });
  const on = !!s.on;
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <Btn className={on ? "text-ink" : "text-stone"}><Icon name="bookmark" size={20} filled={on} />{on ? "Saved" : "Save"}</Btn>
    </form>
  );
}

export function GoingButton({ id, going }: { id: string; going: boolean }) {
  const [s, action] = useFormState<FeedState, FormData>(goingAction, { on: going });
  const on = !!s.on;
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="on" value={on ? "0" : "1"} />
      <SubmitPill on={on} />
      {s.error && <p role="alert" className="mt-1 text-[13px] font-semibold text-clay">{s.error}</p>}
    </form>
  );
}
function SubmitPill({ on }: { on: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-pressed={on} className={cn("dc-btn h-11 px-[22px]", on ? "dc-btn-forest" : "dc-btn-soft")}>
      <Icon name="check" size={18} />{on ? "I am going" : "Go to this"}
    </button>
  );
}
