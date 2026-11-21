import { describe, expect, it } from "vitest";
import { callPhase, canJoin, sinceText, untilText } from "./call-clock";

const start = new Date("2026-11-21T18:00:00Z");
const at = (mins: number) => new Date(start.getTime() + mins * 60_000);

describe("call clock", () => {
  it("opens 10 minutes before, is live from the start, and ends 30 minutes after the end", () => {
    expect([-11, -10, -1, 0, 29, 59, 61].map((m) => callPhase(at(m), start, 30))).toEqual(["EARLY", "OPEN", "OPEN", "LIVE", "LIVE", "LIVE", "ENDED"]);
    expect(canJoin(callPhase(at(-10), start, 30))).toBe(true);
    expect(canJoin(callPhase(at(-11), start, 30))).toBe(false);
  });
  it("never says 0 minutes while the time is still ahead", () => {
    expect(untilText(30_000)).toBe("in less than a minute");
    expect(untilText(61_000)).toBe("in 2 minutes");
    expect(untilText(25 * 60_000)).toBe("in 25 minutes");
    expect(untilText(60 * 60_000)).toBe("in 1 hour");
    expect(untilText(125 * 60_000)).toBe("in 2 hours 5 minutes");
    expect(untilText(3 * 86400_000)).toBe("in 3 days");
    expect(untilText(0)).toBe("now");
  });
  it("says how long ago a call started", () => {
    expect(sinceText(20_000)).toBe("just now");
    expect(sinceText(4 * 60_000 + 5_000)).toBe("4 minutes ago");
  });
});
