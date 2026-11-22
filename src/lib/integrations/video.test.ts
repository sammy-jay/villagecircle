import { afterEach, describe, expect, it } from "vitest";
import { dailyDomain, roomUrl } from "./video";

const before = process.env.DAILY_DOMAIN;
afterEach(() => { process.env.DAILY_DOMAIN = before; });

describe("Daily domain", () => {
  it("accepts the subdomain however it was typed", () => {
    for (const v of ["villagecircle", "villagecircle.daily.co", "https://villagecircle.daily.co/", " VillageCircle.daily.co "]) {
      process.env.DAILY_DOMAIN = v;
      expect(dailyDomain().toLowerCase()).toBe("villagecircle");
    }
  });
  it("builds the room address once, never daily.co.daily.co", () => {
    process.env.DAILY_DOMAIN = "https://villagecircle.daily.co";
    expect(roomUrl("vc-123")).toBe("https://villagecircle.daily.co/vc-123");
  });
});
