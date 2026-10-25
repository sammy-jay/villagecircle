import { describe, expect, it } from "vitest";
import { matchesResourceFilter, parseFilter, preview, resourceCounts } from "./mentor-resources";

describe("mentor resources list", () => {
  it("counts by group", () => {
    expect(resourceCounts(["PENDING", "APPROVED", "APPROVED", "REJECTED", "REMOVED"])).toEqual({ ALL: 5, PENDING: 1, APPROVED: 2, NOT_PUBLISHED: 2 });
  });
  it("filters", () => {
    expect(matchesResourceFilter("REMOVED", "NOT_PUBLISHED")).toBe(true);
    expect(matchesResourceFilter("APPROVED", "NOT_PUBLISHED")).toBe(false);
    expect(matchesResourceFilter("PENDING", "ALL")).toBe(true);
  });
  it("falls back to ALL on junk", () => { expect(parseFilter("x")).toBe("ALL"); expect(parseFilter("PENDING")).toBe("PENDING"); expect(parseFilter(undefined)).toBe("ALL"); });
  it("previews on a word boundary", () => {
    expect(preview("short")).toBe("short");
    const p = preview("word ".repeat(60), 50); expect(p.endsWith("…")).toBe(true); expect(p.length).toBeLessThanOrEqual(51);
  });
});
