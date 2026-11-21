/**
 * Before-the-call screens (CL1, CL4, P07): where a booked call is in time, and the countdown words. Pure: the screens
 * tick a clock and call these every second, so nothing waits for a refresh.
 */
import { joinState } from "./scheduling";

/** EARLY: the link is not open yet. OPEN: open, not started. LIVE: started (joinable until 30 minutes after the end). ENDED: over. */
export type CallPhase = "EARLY" | "OPEN" | "LIVE" | "ENDED";
export function callPhase(now: Date, start: Date, minutes: number): CallPhase {
  const js = joinState(start, minutes, now);
  if (js === "TOO_EARLY") return "EARLY";
  if (js === "ENDED") return "ENDED";
  return now < start ? "OPEN" : "LIVE";
}
export const canJoin = (p: CallPhase) => p === "OPEN" || p === "LIVE";

const n = (x: number, one: string, many: string) => `${x} ${x === 1 ? one : many}`;
/**
 * "in 2 hours 5 minutes", "in 25 minutes", "in less than a minute". Minutes round up, so it never says
 * "0 minutes" while the time is still ahead.
 */
export function untilText(ms: number): string {
  if (ms <= 0) return "now";
  if (ms < 60_000) return "in less than a minute";
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `in ${n(mins, "minute", "minutes")}`;
  if (mins < 24 * 60) { const h = Math.floor(mins / 60), m = mins % 60; return `in ${n(h, "hour", "hours")}${m ? ` ${n(m, "minute", "minutes")}` : ""}`; }
  return `in ${n(Math.round(mins / 1440), "day", "days")}`;
}
/** "just now", "4 minutes ago". */
export function sinceText(ms: number): string {
  if (ms < 60_000) return "just now";
  return `${n(Math.floor(ms / 60_000), "minute", "minutes")} ago`;
}
