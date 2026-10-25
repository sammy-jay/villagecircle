"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/dc/icons";
import { resendVerifyAction, type ActionState } from "@/app/account-actions";
import { inboxUrl } from "./inbox";

/** "Send again in 0:42": a minute's cooldown between resends. */
export function useCooldown(seconds = 60, startOn = true) {
  const [left, setLeft] = useState(startOn ? seconds : 0);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);
  return { left, restart: () => setLeft(seconds), label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` };
}

/** Resend control for verification emails, as a line of text (phone) or a soft button (desktop). */
export function ResendVerify({ email, variant = "text", className }: { email: string; variant?: "text" | "button" | "primary"; className?: string }) {
  const [state, action] = useFormState<ActionState, FormData>(resendVerifyAction, {});
  const cd = useCooldown(60, variant !== "primary");
  useEffect(() => { if (state.ok) cd.restart(); }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const waiting = cd.left > 0;
  return (
    <form action={action} className={className}>
      <input type="hidden" name="email" value={email} />
      {variant === "text" ? (
        <p className="text-[14.5px] leading-normal text-stone">Did not get it? {waiting ? <b className="text-clay">Send again in {cd.label}</b> : <button type="submit" className="font-bold text-clay underline-offset-2 hover:underline">Send again</button>}</p>
      ) : (
        <>
          <button type="submit" disabled={waiting} className={cn("dc-btn", variant === "primary" ? "dc-btn-primary h-14 w-full" : "dc-btn-soft h-[54px]", waiting && variant === "button" && "text-stone")}>
            {variant === "primary" && <Icon name="send" size={18} />}{variant === "primary" ? "Send a new verification email" : "Send the link again"}
          </button>
          {variant === "button" && waiting && <p className="mt-3 text-[14.5px] text-stone">You can ask again in {cd.left} seconds</p>}
        </>
      )}
      {state.ok && <p role="status" className="mt-2 text-[14px] font-semibold text-forest">Sent. Check your inbox and spam folder.</p>}
      {state.error && <p role="alert" className="mt-2 text-[14px] font-semibold text-clay">{state.error}</p>}
    </form>
  );
}
