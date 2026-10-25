import { describe, expect, it } from "vitest";
import { cronAllowed, reminderDue, windowSoon } from "./jobs";

const now = new Date("2026-10-25T12:00:00Z");
const inMin = (m: number) => new Date(now.getTime() + m * 60_000);

describe("scheduled job rules", () => {
  it("picks the right call reminder", () => {
    expect(reminderDue(inMin(25 * 60), now)).toBeNull();
    expect(reminderDue(inMin(23 * 60), now)).toBe("24h");
    expect(reminderDue(inMin(61), now)).toBe("24h");
    expect(reminderDue(inMin(60), now)).toBe("1h");
    expect(reminderDue(inMin(5), now)).toBe("1h");
    expect(reminderDue(inMin(-1), now)).toBeNull();
  });
  it("flags Asks due within four hours, not ones already past", () => {
    expect(windowSoon(inMin(3 * 60), now)).toBe(true);
    expect(windowSoon(inMin(5 * 60), now)).toBe(false);
    expect(windowSoon(inMin(-10), now)).toBe(false);
    expect(windowSoon(null, now)).toBe(false);
  });
  it("only runs jobs with the secret in production", () => {
    expect(cronAllowed("Bearer s3cret", "s3cret", true)).toBe(true);
    expect(cronAllowed("Bearer nope", "s3cret", true)).toBe(false);
    expect(cronAllowed(null, undefined, true)).toBe(false);
    expect(cronAllowed(null, undefined, false)).toBe(true);
  });
});
