"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { cn } from "@/lib/cn";
import { callPhase, canJoin, sinceText, untilText, type CallPhase } from "@/lib/domain/call-clock";

/** What a before-the-call screen passes down: the start, the length and the server's time when it rendered. */
export type CallClock = { startISO: string; minutes: number; serverNow: number };
const OPENS_BEFORE_MS = 10 * 60_000;
/** Below this, a difference between the server and this device is page-load delay or a briefly cached page, not a wrong clock. */
const REAL_SKEW_MS = 60_000;

/**
 * A ticking clock for one booked call. Starts at the server's time (so the first frame matches the server's), then
 * ticks every second. Corrects for a device whose clock is more than a minute off. When the call is over it
 * re-renders the page, so the screen moves on by itself.
 */
export function useCallClock({ startISO, minutes, serverNow }: CallClock) {
  const router = useRouter();
  const start = useMemo(() => new Date(startISO).getTime(), [startISO]);
  const [now, setNow] = useState(serverNow);
  const skew = useRef<number | null>(null);
  useEffect(() => {
    if (skew.current === null) { const s = serverNow - Date.now(); skew.current = Math.abs(s) > REAL_SKEW_MS ? s : 0; }
    const tick = () => setNow(Date.now() + (skew.current ?? 0));
    tick();
    const t = window.setInterval(tick, 1000);
    const back = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", back);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", back); };
  }, [serverNow]);
  const phase: CallPhase = callPhase(new Date(now), new Date(start), minutes);
  const was = useRef(phase);
  useEffect(() => { if (was.current !== phase && phase === "ENDED") router.refresh(); was.current = phase; }, [phase, router]);
  return { now, phase, open: canJoin(phase), toStart: start - now, toOpen: start - OPENS_BEFORE_MS - now, sinceStart: now - start };
}

/** CL1 heading: the day and time when it is more than an hour away, then a live countdown, then "has started". */
export function CallHeadline({ clock, later }: { clock: CallClock; later: string }) {
  const c = useCallClock(clock);
  if (c.phase === "ENDED") return <>Your call has ended</>;
  if (c.phase === "LIVE") return <>Your call started {sinceText(c.sinceStart)}</>;
  if (c.toStart > 60 * 60_000) return <>{later}</>;
  return <>Your call starts {untilText(c.toStart)}</>;
}

/** CL4 line under the heading: "Starts in 25 minutes", then "Started 3 minutes ago". */
export function StartsLine({ clock }: { clock: CallClock }) {
  const c = useCallClock(clock);
  if (c.phase === "ENDED") return <>Ended</>;
  if (c.phase === "LIVE") return <>Started {sinceText(c.sinceStart)}</>;
  return <>Starts {untilText(c.toStart)}</>;
}

/** D3 "Your conversation" button: "Before the call" until the link opens, then "Join conversation", by itself. */
export function JoinCallLink({ href, clock }: { href: string; clock: CallClock }) {
  const { open } = useCallClock(clock);
  return (
    <Link href={href} className={cn("dc-btn dc-btn-primary h-[52px]", !open && "opacity-[.42]")}>
      <Icon name="video" size={18} />{open ? "Join conversation" : "Before the call"}
    </Link>
  );
}

/** "Open now", or "Opens in 7 minutes" (P07 badge; CL4 note when `sentence`). */
export function OpensLine({ clock, sentence }: { clock: CallClock; sentence?: boolean }) {
  const c = useCallClock(clock);
  if (c.open) return <>{sentence ? "The link is open." : "Open now"}</>;
  if (c.phase === "ENDED") return <>{sentence ? "This conversation has ended." : "Ended"}</>;
  return <>{sentence ? `The link opens 10 minutes before the start, ${untilText(c.toOpen)}.` : `Opens ${untilText(c.toOpen)}`}</>;
}
