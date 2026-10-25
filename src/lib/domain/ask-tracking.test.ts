import { describe, it, expect } from "vitest";
import { attentionReasons, isUpcoming, matchesFilter, STAGE_OF, STATE_LABEL, type TrackInput } from "./ask-tracking";

const now = new Date("2026-10-18T12:00:00Z");
const hrs = (n: number) => new Date(now.getTime() + n * 3600000);
const base: TrackInput = { state: "SCHEDULED", minor: false, serviceWindowDue: null, scheduledAt: hrs(24), connectionStatus: "CONFIRMED", attendance: "UNKNOWN", updatedAt: hrs(-1) };

describe("ask tracking", () => {
  it("every non-draft state has a stage and a label", () => {
    for (const s of Object.keys(STATE_LABEL).filter((s) => s !== "DRAFT")) { expect(STAGE_OF[s]).toBeTruthy(); }
  });
  it("a scheduled Ask is still tracked (never drops out)", () => {
    expect(matchesFilter("ALL", base, now)).toBe(true);
    expect(matchesFilter("SCHEDULED", base, now)).toBe(true);
    expect(matchesFilter("REVIEW", base, now)).toBe(false);
  });
  it("upcoming means scheduled within 72 hours, in the future", () => {
    expect(isUpcoming(base, now)).toBe(true);
    expect(isUpcoming({ ...base, scheduledAt: hrs(100) }, now)).toBe(false);
    expect(isUpcoming({ ...base, scheduledAt: hrs(-3) }, now)).toBe(false);
  });
  it("flags missed and overdue conversations", () => {
    expect(attentionReasons({ ...base, connectionStatus: "MISSED" }, now)).toContain("Missed conversation");
    expect(attentionReasons({ ...base, attendance: "MENTOR_ABSENT" }, now)).toContain("Missed conversation");
    expect(attentionReasons({ ...base, scheduledAt: hrs(-5) }, now)).toContain("Time has passed, no outcome recorded");
    expect(attentionReasons(base, now)).toEqual([]);
  });
  it("flags open Asks past their window and waiting mentors", () => {
    expect(attentionReasons({ ...base, state: "OPEN_TO_MENTORS", scheduledAt: null, serviceWindowDue: hrs(-1) }, now)).toHaveLength(1);
    expect(attentionReasons({ ...base, state: "MENTOR_STEPPED_FORWARD", scheduledAt: null, updatedAt: hrs(-60) }, now)).toHaveLength(1);
  });
  it("under 18 filter", () => { expect(matchesFilter("UNDER18", { ...base, minor: true }, now)).toBe(true); expect(matchesFilter("UNDER18", base, now)).toBe(false); });
});
