"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

const QUIET_MS = 30 * 60_000;
const WARN_MS = 2 * 60_000;

/**
 * EX16 "Are you still there?". After 28 quiet minutes a dialog counts down 2 minutes, then signs out to P02.
 * Typing, clicking or scrolling resets the clock. Drafts are saved on the server, so nothing written is lost.
 */
export function IdleGuard() {
  const last = useRef(Date.now());
  const [left, setLeft] = useState<number | null>(null);
  const stay = useCallback(() => { last.current = Date.now(); setLeft(null); void fetch("/api/auth/session", { cache: "no-store" }); }, []);
  useEffect(() => {
    const bump = () => { if (left === null) last.current = Date.now(); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const t = setInterval(() => {
      const quiet = Date.now() - last.current;
      if (quiet >= QUIET_MS) { void signOut({ callbackUrl: "/signed-out" }); return; }
      setLeft(quiet >= QUIET_MS - WARN_MS ? Math.ceil((QUIET_MS - quiet) / 1000) : null);
    }, 1000);
    return () => { evs.forEach((e) => window.removeEventListener(e, bump)); clearInterval(t); };
  }, [left]);
  if (left === null) return null;
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(20,16,10,.55)] lg:items-center">
      <div role="alertdialog" aria-modal="true" aria-labelledby="idle-t" aria-describedby="idle-d" className="w-full rounded-t-[30px] bg-card px-5 pb-6 pt-5 text-center lg:w-[480px] lg:rounded-[32px] lg:p-[30px]">
        <h2 id="idle-t" className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">Are you still there?</h2>
        <p className="mt-3 font-display text-[56px] font-extrabold leading-none tabular-nums" aria-live="polite">{mm}</p>
        <p id="idle-d" className="mt-3 text-[15px] leading-normal text-bark">For your safety we sign you out after 30 minutes of quiet. We will sign you out in 2 minutes.</p>
        <p className="mt-3 rounded-field bg-mint px-4 py-3 text-[14px] text-mint-ink">Your draft is saved. It resumes for 30 days. Nothing you wrote is lost.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          <button type="button" onClick={stay} autoFocus className="dc-btn dc-btn-primary h-[52px] w-full">Stay signed in</button>
          <button type="button" onClick={() => void signOut({ callbackUrl: "/signed-out" })} className="dc-btn dc-btn-ghost h-[50px] w-full">Sign out</button>
        </div>
      </div>
    </div>
  );
}
