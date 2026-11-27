import { describe, expect, it } from "vitest";
import { allOrientationModulesComplete, isOrientationModuleId, ORIENTATION_MODULES } from "./mentor-orientation";

describe("mentor orientation modules", () => {
  it("accepts only configured module IDs", () => {
    expect(isOrientationModuleId("why")).toBe(true);
    expect(isOrientationModuleId("unknown")).toBe(false);
  });

  it("requires every module before orientation is complete", () => {
    const ids = ORIENTATION_MODULES.map((module) => module.id);
    expect(allOrientationModulesComplete(ids.slice(0, -1))).toBe(false);
    expect(allOrientationModulesComplete(ids)).toBe(true);
  });
});
