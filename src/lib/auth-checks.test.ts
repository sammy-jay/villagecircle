import { describe, expect, it } from "vitest";
import { authChecksEnabled } from "./auth-checks";

describe("authentication checks", () => {
  it("keeps the checks enabled by default", () => {
    expect(authChecksEnabled(undefined)).toBe(true);
    expect(authChecksEnabled("true")).toBe(true);
  });

  it("disables the checks only when explicitly set to false", () => {
    expect(authChecksEnabled("false")).toBe(false);
    expect(authChecksEnabled("0")).toBe(true);
  });
});
