import { describe, it, expect } from "vitest";
import { TEMPLATES, templateDef, renderText, renderParts, validateParts, safeVar, TemplateError } from "./templates";
import { cycleMonths, dueDate, cycleState, addMonths, agoLabel } from "./review-cycle";
import { hasContactDetails } from "./contact-detect";

describe("template defaults (BR-10)", () => {
  it("are valid and carry no contact details", () => {
    for (const t of TEMPLATES) { expect(validateParts(t, t.defaults)).toEqual([]); }
  });
  it("render with sample values and no leftover placeholders", () => {
    for (const t of TEMPLATES) { const r = renderParts(t, t.defaults, t.sample); expect(r.body).not.toMatch(/\{\{/); expect(hasContactDetails(r.body)).toBe(false); }
    const d = templateDef("email.session_confirmed")!; expect(renderParts(d, d.defaults, d.sample).subject).toBe("Confirmed: Amara and Kwame, Thursday 14 October, 6:00 pm");
  });
});
describe("template rendering", () => {
  it("fills placeholders and drops unknown ones", () => { expect(renderText("Hi {{a}} {{b}}", { a: "Ann" }, ["a"])).toBe("Hi Ann"); expect(renderText("Hi {{x}}", { x: "no" }, ["a"])).toBe("Hi"); });
  it("cuts name values to a first name", () => expect(safeVar("mentor_first_name", "Kwame Mensah")).toBe("Kwame"));
  it("refuses values carrying contact details", () => { expect(() => safeVar("topic", "call me on 0803 555 0182")).toThrow(TemplateError); expect(() => safeVar("topic", "ann@example.com")).toThrow(TemplateError); });
});
describe("template validation", () => {
  const d = templateDef("email.one_month_checkin")!;
  it("rejects contact details typed into a template", () => {
    expect(validateParts(d, { ...d.defaults, body: "Hello {{participant_first_name}}, email me at kwame@example.com" }).length).toBeGreaterThan(0);
    expect(validateParts(d, { ...d.defaults, body: "Hello {{participant_first_name}}, whatsapp 0803 555 0182" }).length).toBeGreaterThan(0);
  });
  it("rejects placeholders for other people's details", () => expect(validateParts(d, { ...d.defaults, body: "Hello {{participant_first_name}} {{mentor_email}}" }).join(" ")).toContain("mentor_email"));
  it("allows the own domain in SMS and requires the code", () => {
    const s = templateDef("sms.guardian_approval")!; expect(validateParts(s, s.defaults)).toEqual([]);
    const c = templateDef("sms.guardian_code")!; expect(validateParts(c, { body: "Your code is here." }).join(" ")).toContain("{{code}}");
  });
  it("caps SMS length", () => { const s = templateDef("sms.guardian_approval")!; expect(validateParts(s, { body: "{{participant_first_name}} " + "a".repeat(330) }).join(" ")).toContain("320"); });
});
describe("review cycle", () => {
  const now = new Date("2026-10-15T00:00:00Z");
  it("is 12 months, 6 for admissions and legal", () => { expect(cycleMonths(["College guidance"])).toBe(12); expect(cycleMonths(["College admissions"])).toBe(6); expect(cycleMonths(["Immigration"])).toBe(6); expect(cycleMonths(["Immigration"], { immigration: 3 })).toBe(3); });
  it("computes due dates from last review or creation", () => {
    expect(dueDate(new Date("2025-08-31T00:00:00Z"), new Date("2024-01-01"), 6).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(dueDate(null, new Date("2025-10-01T00:00:00Z"), 12).toISOString().slice(0, 10)).toBe("2026-10-01");
    expect(addMonths(new Date("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
  it("classifies expired, due soon and current", () => {
    expect(cycleState(new Date("2026-10-01"), now)).toBe("EXPIRED"); expect(cycleState(new Date("2026-11-14"), now)).toBe("DUE_SOON"); expect(cycleState(new Date("2027-03-01"), now)).toBe("CURRENT");
  });
  it("labels age", () => { expect(agoLabel(null, now)).toBe("Not yet"); expect(agoLabel(new Date("2025-08-15"), now)).toBe("14 months ago"); });
});
