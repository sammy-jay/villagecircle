"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** How often to look while someone is using the page, and once they have been idle for a while. */
const ACTIVE_MS = 6_000;
const IDLE_MS = 30_000;
const IDLE_AFTER_MS = 3 * 60_000;
/** Other components (the notification bell) listen for this to reload their own data when the page does. */
export const LIVE_EVENT = "vc:live";

const TEXT_INPUTS = new Set(["text", "search", "email", "number", "tel", "url", "password", "date", "datetime-local", "time", "month", "week"]);
/** Someone is typing: re-rendering now could move the box under them, so wait until they leave it. */
function typing() {
  const a = document.activeElement as HTMLElement | null;
  if (!a) return false;
  if (a instanceof HTMLTextAreaElement || a.isContentEditable) return true;
  return a instanceof HTMLInputElement && TEXT_INPUTS.has(a.type);
}

/**
 * Keeps a dashboard up to date without a refresh: asks /api/live whether anything changed for this person and, only
 * when it did, re-renders the page on the server (router.refresh). Scroll position and anything typed are kept.
 * Checks every few seconds while the page is in use, every 30 seconds when idle, not at all in a background tab,
 * and straight away when the person comes back to it.
 */
export function LiveUpdates() {
  const router = useRouter();
  useEffect(() => {
    let last: string | null = null;
    let timer = 0, inflight = false, pending = false, stopped = false, lastActive = Date.now();

    const apply = () => { pending = false; router.refresh(); window.dispatchEvent(new Event(LIVE_EVENT)); };
    const check = async () => {
      if (stopped || inflight || document.visibilityState !== "visible") return;
      inflight = true;
      try {
        const r = await fetch("/api/live", { cache: "no-store", headers: { accept: "application/json" } });
        if (r.status === 401) { if (last !== null) apply(); stopped = true; return; } // signed out or suspended: the page guard takes over
        if (!r.ok) return;
        const { v } = (await r.json()) as { v: string | null };
        if (v && last !== null && v !== last) { if (typing()) pending = true; else apply(); }
        if (v) last = v;
      } catch { /* offline or a blip: try again on the next tick */ } finally { inflight = false; }
    };
    const schedule = () => {
      window.clearTimeout(timer);
      if (stopped) return;
      timer = window.setTimeout(async () => { await check(); schedule(); }, Date.now() - lastActive > IDLE_AFTER_MS ? IDLE_MS : ACTIVE_MS);
    };
    const active = () => { const wasIdle = Date.now() - lastActive > IDLE_AFTER_MS; lastActive = Date.now(); if (wasIdle) { void check(); schedule(); } };
    const back = () => { if (document.visibilityState === "visible") { lastActive = Date.now(); void check(); schedule(); } };
    const left = () => { if (pending) window.setTimeout(() => { if (pending && !typing()) apply(); }, 0); };

    window.addEventListener("pointerdown", active, { passive: true });
    window.addEventListener("keydown", active);
    window.addEventListener("scroll", active, { passive: true });
    window.addEventListener("focus", back);
    document.addEventListener("visibilitychange", back);
    document.addEventListener("focusout", left);
    void check(); schedule();
    return () => {
      stopped = true; window.clearTimeout(timer);
      window.removeEventListener("pointerdown", active); window.removeEventListener("keydown", active); window.removeEventListener("scroll", active);
      window.removeEventListener("focus", back); document.removeEventListener("visibilitychange", back); document.removeEventListener("focusout", left);
    };
  }, [router]);
  return null;
}
