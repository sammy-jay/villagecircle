"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { inviteCodeAction, renewInviteAction, type ActionState } from "@/app/account-actions";

/** M19 "Send me a new link". The phone board puts the button in the sticky bar; desktop keeps it in the column. */
export function RenewLink({ token }: { token: string }) {
  const [state, action] = useFormState<ActionState, FormData>(renewInviteAction, {});
  if (state.ok) return <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">A new link is on its way to your email and phone. It works for 14 days.</p>;
  return (
    <form id="renew" action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      <SubmitButton icon="send" className="h-14 w-full max-lg:hidden" pendingText="Sending…">Send me a new link</SubmitButton>
      <PhoneBar><SubmitButton form="renew" icon="send" className="h-14 w-full" pendingText="Sending…">Send me a new link</SubmitButton></PhoneBar>
    </form>
  );
}

const clock = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s?([ap])m/i, " $1m");
const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** Ticks every second until the lock lifts, then reloads so the page shows the code step again. */
function useLock(until: string, totalMinutes: number) {
  const router = useRouter();
  const end = new Date(until).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = now == null ? null : end - now;
  const open = left != null && left <= 0;
  return { left, open, at: clock(new Date(end)), done: left == null ? 0 : Math.min(100, Math.max(0, 100 - (left / (totalMinutes * 60_000)) * 100)), refresh: () => router.refresh() };
}

/** M21 inline "Try again at" line (desktop) and card (phone). */
export function LockedTime({ until, minutes, variant }: { until: string; minutes: number; variant: "line" | "card" | "panel" }) {
  const l = useLock(until, minutes);
  if (variant === "line") return <p className="text-[16px] text-bark">Try again at <b suppressHydrationWarning>{l.at}</b>. Your approval link stays valid.</p>;
  const bar = <div className="h-2.5 overflow-hidden rounded-[10px] bg-sand lg:h-3"><div className="h-full rounded-[inherit] bg-forest transition-[width]" style={{ width: `${l.done}%` }} /></div>;
  if (variant === "card") return (
    <div className="rounded-card border border-line bg-card p-[22px]">
      <p className="text-[12px] font-extrabold tracking-[.05em] text-stone">TRY AGAIN AT</p>
      <p className="mb-2.5 mt-1 font-display text-[54px] font-extrabold leading-[1.05]" suppressHydrationWarning>{l.at}</p>
      {bar}
      <p className="mt-2.5 text-[13.5px] text-stone">Your approval link stays valid.</p>
    </div>
  );
  return (
    <div className="w-[400px] rounded-card bg-card p-[34px] text-center shadow-[0_14px_30px_rgba(40,30,10,.10)]" style={{ transform: "rotate(-2deg)" }}>
      <p className="text-[12.5px] font-extrabold tracking-[.05em] text-stone">TRY AGAIN IN</p>
      <p className="mb-3.5 mt-2.5 font-display text-[92px] font-extrabold leading-none tracking-[-.03em] tabular-nums">{l.left == null ? `${minutes}:00` : mmss(l.left)}</p>
      {bar}
      <p className="mt-3 text-[14px] text-stone">Your approval link stays valid. Nothing is lost.</p>
    </div>
  );
}

/** M21 "Email me a new code instead": waits for the lock to lift, sends the code by email, then reopens the flow. */
export function EmailCodeInstead({ token, until, minutes }: { token: string; until: string; minutes: number }) {
  const l = useLock(until, minutes);
  const [state, action] = useFormState<ActionState, FormData>(inviteCodeAction, {});
  useEffect(() => { if (state.ok) l.refresh(); }, [state.ok]); // eslint-disable-line react-hooks/exhaustive-deps
  const button = (
    <SubmitButton form="email-code" icon="mail" disabled={!l.open} className="h-14 w-full" pendingText="Sending…">
      {l.open ? "Email me a new code instead" : <>Email me a new code at <span suppressHydrationWarning>{l.at}</span></>}
    </SubmitButton>
  );
  return (
    <form id="email-code" action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="channel" value="email" />
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error === "LOCKED" ? "This step is still paused. Try again shortly." : state.error}</p>}
      <div className="max-lg:hidden">{button}</div>
      <PhoneBar>{button}</PhoneBar>
    </form>
  );
}

export const NeverShare = () => (
  <div className="flex gap-3 rounded-[20px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="alert" size={24} /><p>We never ask for a code by phone or message. If someone does, do not share it.</p></div>
);
