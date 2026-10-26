import { describe, expect, it } from "vitest";
import { matchesAll, searchWords } from "./search";

describe("search matching", () => {
  it("needs every word, in any order", () => {
    expect(matchesAll("Careers in medicine and nursing", "medicine careers")).toBe(true);
    expect(matchesAll("Careers in medicine", "medicine law")).toBe(false);
  });
  it("ignores case, accents and punctuation", () => {
    expect(matchesAll("Résumé review", "resume")).toBe(true);
    expect(matchesAll("Interview preparation", "INTERVIEW!")).toBe(true);
  });
  it("ignores one-letter words and empty searches", () => {
    expect(searchWords("a b medicine")).toEqual(["medicine"]);
    expect(matchesAll("anything", "  ")).toBe(false);
  });
});
