import { describe, expect, it } from "vitest";
import { zonedToUtc } from "./scheduling";

describe("zonedToUtc", () => {
  it("reads a wall-clock time in the given zone", () => {
    expect(zonedToUtc("2026-11-03T19:00", "Africa/Lagos").toISOString()).toBe("2026-11-03T18:00:00.000Z");
    expect(zonedToUtc("2026-07-01T09:30", "America/Chicago").toISOString()).toBe("2026-07-01T14:30:00.000Z");
    expect(zonedToUtc("2026-12-01T09:30", "America/Chicago").toISOString()).toBe("2026-12-01T15:30:00.000Z");
  });
  it("rejects anything else", () => { expect(Number.isNaN(zonedToUtc("tomorrow").getTime())).toBe(true); });
});
