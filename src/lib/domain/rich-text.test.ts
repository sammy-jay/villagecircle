import { describe, expect, it } from "vitest";
import { disallowedLinks, headingsOf, isAllowedLink, isVideoLink, parseInline, parseRich, plainText, resourceContactHits } from "./rich-text";
import { BODY_MAX, checkBody, checkResource, composeBody, initialSections, splitBody, TEMPLATES } from "./resource-templates";

describe("parseInline", () => {
  it("reads bold, italic and allowed links", () => {
    expect(parseInline("a **b** *c* [d](https://studentaid.gov/x)")).toEqual([
      { t: "text", v: "a " }, { t: "bold", c: [{ t: "text", v: "b" }] }, { t: "text", v: " " },
      { t: "italic", c: [{ t: "text", v: "c" }] }, { t: "text", v: " " }, { t: "link", href: "https://studentaid.gov/x", c: [{ t: "text", v: "d" }] },
    ]);
  });
  it("shows a link to a host that is not allowed as its text only", () => {
    expect(parseInline("[my site](https://myblog.com)")).toEqual([{ t: "text", v: "my site" }]);
  });
  it("never turns a javascript: link into a link", () => {
    expect(parseInline("[x](javascript:alert(1))").some((n) => n.t === "link")).toBe(false);
  });
  it("leaves unclosed marks and snake_case alone", () => {
    expect(parseInline("2 * 3 and **open")).toEqual([{ t: "text", v: "2 * 3 and **open" }]);
    expect(parseInline("my_file_name")).toEqual([{ t: "text", v: "my_file_name" }]);
  });
  it("keeps HTML as plain text", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([{ t: "text", v: "<script>alert(1)</script>" }]);
  });
});

describe("parseRich", () => {
  const md = "## Steps\n\n1. One\n2. Two\n   with more\n\n- [ ] Todo\n- [x] Done\n\n> Tip line\n\nPlain para\nsecond line\n\n### Small";
  it("builds headings, lists, checklists, tips and paragraphs", () => {
    expect(parseRich(md).map((b) => b.t)).toEqual(["h2", "ol", "check", "tip", "p", "h3"]);
  });
  it("continues an indented line onto the list item above", () => {
    const ol = parseRich(md).find((b) => b.t === "ol")!;
    expect(ol.t === "ol" && ol.items.length).toBe(2);
  });
  it("reads an old plain body as paragraphs", () => {
    expect(parseRich("First paragraph.\n\nSecond one.").map((b) => b.t)).toEqual(["p", "p"]);
  });
  it("gives plain text without marks", () => {
    expect(plainText("## Hi\n\n**Bold** and [link](https://x.edu)\n\n- a\n- b")).toBe("Hi Bold and link a b");
  });
  it("lists headings with their anchors", () => {
    expect(headingsOf("## A\n\ntext\n\n## B")).toEqual([{ id: "s0", text: "A" }, { id: "s1", text: "B" }]);
  });
});

describe("links", () => {
  it("allows government, education and the listed hosts only", () => {
    for (const u of ["https://studentaid.gov/h/apply", "https://www.harvard.edu", "https://youtu.be/abc", "https://docs.google.com/d/1"]) expect(isAllowedLink(u)).toBe(true);
    for (const u of ["https://myblog.com", "https://bit.ly/x", "https://instagram.com/me", "ftp://x.gov", "https://user:pw@x.gov", "https://fakegov.com"]) expect(isAllowedLink(u)).toBe(false);
  });
  it("accepts only video hosts for a recording", () => {
    expect(isVideoLink("https://www.youtube.com/watch?v=1")).toBe(true);
    expect(isVideoLink("https://studentaid.gov")).toBe(false);
  });
  it("finds links that are not allowed, written or bare", () => {
    expect(disallowedLinks("[a](https://ok.edu) and https://bad.com/x.")).toEqual(["https://bad.com/x"]);
  });
  it("does not treat an allowed link as contact details, but still catches an email", () => {
    expect(resourceContactHits("See [FAFSA](https://studentaid.gov)")).toEqual([]);
    expect(resourceContactHits("email me at sam@mail.com").length).toBeGreaterThan(0);
  });
});

describe("resource templates", () => {
  const answer = { short: "Most people find internships through someone they know.", detail: "Story here.", next: "1. Ask one person for a chat\n2. Update your résumé" };
  it("joins sections into ## blocks in template order and splits them back", () => {
    const body = composeBody("ARTICLE", answer);
    expect(body.startsWith("## The short answer\n\n")).toBe(true);
    expect(splitBody("ARTICLE", body).sections).toEqual(answer);
  });
  it("leaves out empty boxes and boxes holding only their starter", () => {
    expect(composeBody("ARTICLE", { short: answer.short, detail: "", next: "1. " })).toBe(`## The short answer\n\n${answer.short}`);
  });
  it("turns a heading typed inside a box into a smaller one", () => {
    expect(composeBody("ARTICLE", { short: "## Oops\ntext" })).toContain("### Oops");
  });
  it("puts an old plain body, or text under an unknown heading, in the catch-all box", () => {
    expect(splitBody("ARTICLE", "Just some notes.").sections).toEqual({ detail: "Just some notes." });
    expect(splitBody("GUIDE", "## Odd\n\nx").sections.steps).toBe("### Odd\n\nx");
  });
  it("keeps the recording link as Watch and reads it back", () => {
    const body = composeBody("VIDEO", { about: "A walk through a nurse's shift for students." }, "https://youtu.be/abc");
    expect(body.startsWith("## Watch\n\n[Watch the recording](https://youtu.be/abc)")).toBe(true);
    expect(splitBody("VIDEO", body).link).toBe("https://youtu.be/abc");
  });
  it("starts empty boxes with their starter list", () => {
    expect(initialSections("TEMPLATE", "").sections.template).toBe("- [ ] ");
  });
  it("asks for required sections, a title and a video link", () => {
    const fields = checkResource("VIDEO", "", { about: "" }, "https://studentaid.gov").map((p) => p.field);
    expect(fields).toEqual(["title", "link", "about"]);
  });
  it("refuses links that are not allowed and contact details", () => {
    expect(checkResource("ARTICLE", "A good title", { ...answer, detail: "See https://mysite.com" })[0]?.field).toBe("detail");
    expect(checkResource("ARTICLE", "A good title", { ...answer, detail: "Text me 555 123 4567 8" })[0]?.error).toMatch(/contact details/);
  });
  it("accepts a complete answer, and checks the stored body the same way", () => {
    expect(checkResource("ARTICLE", "Finding an internship", answer)).toEqual([]);
    expect(checkBody("ARTICLE", "Finding an internship", composeBody("ARTICLE", answer))).toEqual([]);
  });
  it("keeps every section under the whole-body limit", () => {
    const max = Object.values(TEMPLATES).map((t) => t.sections.reduce((n, s) => n + s.max + s.heading.length + 6, 0));
    expect(Math.max(...max)).toBeLessThanOrEqual(BODY_MAX);
  });
});
