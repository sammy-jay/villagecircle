import { describe, it, expect } from "vitest";
import {
  mentorListable, mentorVisibleTo, toDirectoryCard, DIRECTORY_KEYS, filterDirectory, resourceVisible, thanksVisible, thanksDescriptor, toThanksCard, THANKS_KEYS, scrubText, scrubThanks,
  postVisible, libraryFilter, formatBody, canRegister, placesLeft, fillPercent, thanksCountLabel, monthYear, type DirectoryMentorSource,
} from "./village";
import { expertiseLabel } from "./expertise";

const ok = { verification: "APPROVED", codeOfConductAt: new Date(), orientationDoneAt: new Date(), visibility: "LISTED", userStatus: "ACTIVE" };
const mentor = (o: Partial<DirectoryMentorSource> = {}): DirectoryMentorSource => ({ id: "m1", name: "Kwame Mensah", bio: "Trained in Accra. Email me at kwame@example.com or call +1 713 555 0199.", primaryExpertise: "EXP-HLT", extraExpertise: ["EXP-EDU"], languages: ["English", "Twi"], countryOfOrigin: "Ghana", clearedForMinors: true, monthlyHours: 1, thanksCount: 3, ...ok, ...o });

describe("directory safeguarding", () => {
  it("lists only approved, onboarded, active, listed mentors", () => {
    expect(mentorListable(ok)).toBe(true);
    for (const bad of [{ verification: "PENDING" }, { codeOfConductAt: null }, { orientationDoneAt: null }, { visibility: "PRIVATE" }, { userStatus: "SUSPENDED" }]) expect(mentorListable({ ...ok, ...bad })).toBe(false);
  });
  it("shows under-18s only mentors cleared for young people", () => {
    expect(mentorVisibleTo({ ...ok, clearedForMinors: false }, { minor: true })).toBe(false);
    expect(mentorVisibleTo({ ...ok, clearedForMinors: false }, { minor: false })).toBe(true);
    expect(mentorVisibleTo({ ...ok, clearedForMinors: true }, { minor: true })).toBe(true);
  });
  it("card has a fixed whitelist of keys and no private data", () => {
    const raw = { ...mentor(), email: "kwame@example.com", phone: "+17135550199", dateOfBirth: "1980-01-01", school: "Baltimore High", surname: "Mensah" };
    const c = toDirectoryCard(raw, expertiseLabel);
    expect(Object.keys(c).sort()).toEqual([...DIRECTORY_KEYS]);
    const json = JSON.stringify(c);
    for (const s of ["kwame@example.com", "555 0199", "1980", "Baltimore", "Mensah"]) expect(json).not.toContain(s);
    expect(c.name).toBe("Kwame M.");
    expect(c.initials).toBe("KM");
    expect(c.expertise).toEqual(["Healthcare & Medicine", "Education & Academia"]);
  });
  it("filters by keyword, profession, language and country", () => {
    const cards = [toDirectoryCard(mentor(), expertiseLabel), toDirectoryCard(mentor({ id: "m2", name: "Tomi Adeyemi", primaryExpertise: "EXP-ENT", extraExpertise: [], languages: ["Yoruba"], countryOfOrigin: "Nigeria", bio: "Founder." }), expertiseLabel)];
    expect(filterDirectory(cards, {}).length).toBe(2);
    expect(filterDirectory(cards, { q: "founder" }).map((c) => c.id)).toEqual(["m2"]);
    expect(filterDirectory(cards, { profession: "EXP-HLT" }).map((c) => c.id)).toEqual(["m1"]);
    expect(filterDirectory(cards, { language: "yoruba" }).map((c) => c.id)).toEqual(["m2"]);
    expect(filterDirectory(cards, { country: "Ghana", language: "Yoruba" })).toEqual([]);
  });
  it("scrubs contact details out of text", () => { expect(scrubText("Write to me at a.b@x.org today")).not.toContain("x.org"); });
});

describe("resources", () => {
  it("shows only approved resources; public visitors only PUBLIC", () => {
    expect(resourceVisible({ moderation: "PENDING", visibility: "PUBLIC" }, "MEMBER")).toBe(false);
    expect(resourceVisible({ moderation: "REMOVED", visibility: "PUBLIC" }, "PUBLIC")).toBe(false);
    expect(resourceVisible({ moderation: "APPROVED", visibility: "PUBLIC" }, "PUBLIC")).toBe(true);
    expect(resourceVisible({ moderation: "APPROVED", visibility: "MEMBERS" }, "PUBLIC")).toBe(false);
    expect(resourceVisible({ moderation: "APPROVED", visibility: "MEMBERS" }, "MEMBER")).toBe(true);
    expect(resourceVisible({ moderation: "APPROVED", visibility: "MENTORS" }, "MEMBER")).toBe(false);
  });
  it("library chips filter by cohort, leadership topic and saved", () => {
    const items = [{ id: "a", cohorts: ["HIGH_SCHOOL"], topics: ["college-guidance"] }, { id: "b", cohorts: ["COLLEGE"], topics: ["leadership-development"] }];
    expect(libraryFilter(items, "all", new Set()).length).toBe(2);
    expect(libraryFilter(items, "HIGH_SCHOOL", new Set()).map((x) => x.id)).toEqual(["a"]);
    expect(libraryFilter(items, "leadership", new Set()).map((x) => x.id)).toEqual(["b"]);
    expect(libraryFilter(items, "saved", new Set(["b"])).map((x) => x.id)).toEqual(["b"]);
  });
  it("formats the body with a heading per multi-line paragraph", () => {
    expect(formatBody("Before\nMeet.\n\nIn the month\nFind one.\n\nPlain")).toEqual([{ heading: "Before", lines: ["Meet."] }, { heading: "In the month", lines: ["Find one."] }, { lines: ["Plain"] }]);
  });
  it("month labels", () => { expect(monthYear(new Date(Date.UTC(2026, 8, 5)))).toBe("September 2026"); expect(monthYear(new Date(Date.UTC(2026, 8, 5)), true)).toBe("Sept 2026"); expect(monthYear(new Date(Date.UTC(2026, 7, 5)), true)).toBe("Aug 2026"); });
});

describe("thanks wall and posts", () => {
  it("needs team approval AND the author's choice to share", () => {
    expect(thanksVisible({ moderation: "APPROVED", sharePublicly: true })).toBe(true);
    expect(thanksVisible({ moderation: "APPROVED", sharePublicly: false })).toBe(false);
    expect(thanksVisible({ moderation: "PENDING", sharePublicly: true })).toBe(false);
    expect(thanksVisible({ moderation: "REJECTED", sharePublicly: true })).toBe(false);
  });
  it("describes people without names", () => {
    expect(thanksDescriptor({ roles: ["PARTICIPANT"], cohort: "HIGH_SCHOOL" })).toBe("A high school student");
    expect(thanksDescriptor({ roles: ["PARTICIPANT"], cohort: "COLLEGE" })).toBe("A college student");
    expect(thanksDescriptor({ roles: ["PARTICIPANT"], cohort: "EARLY_CAREER" })).toBe("An early-career professional");
    expect(thanksDescriptor({ roles: ["MENTOR"], cohort: null })).toBe("A mentor");
    expect(thanksDescriptor({ roles: ["GUARDIAN"], cohort: null })).toBe("A parent");
  });
  it("thanks card carries only quote, descriptor and topic, with names and contact details removed", () => {
    const c = toThanksCard({ id: "t1", body: "Kwame was brilliant, thank you Amara Okafor! Reach me at amara@mail.com", topic: "College guidance", author: { roles: ["PARTICIPANT"], cohort: "HIGH_SCHOOL", name: "Amara Okafor" }, mentorName: "Kwame Mensah" });
    expect(Object.keys(c).sort()).toEqual([...THANKS_KEYS]);
    const s = JSON.stringify(c);
    for (const n of ["Kwame", "Amara", "Okafor", "amara@mail.com"]) expect(s).not.toContain(n);
    expect(c.who).toBe("A high school student");
    expect(scrubThanks("Hi Tomi", ["Tomi Adeyemi"])).toBe("Hi");
  });
  it("posts: approved only; minors never see other participants' posts", () => {
    expect(postVisible({ moderation: "PENDING", authorIsMentor: true }, { minor: false })).toBe(false);
    expect(postVisible({ moderation: "APPROVED", authorIsMentor: false }, { minor: true })).toBe(false);
    expect(postVisible({ moderation: "APPROVED", authorIsMentor: false }, { minor: false })).toBe(true);
    expect(postVisible({ moderation: "APPROVED", authorIsMentor: true }, { minor: true })).toBe(true);
  });
  it("count label", () => { expect(thanksCountLabel(0)).toBe("No thank-you notes yet"); expect(thanksCountLabel(1)).toBe("1 thank-you note"); expect(thanksCountLabel(12)).toBe("12 thank-you notes"); });
});

describe("event registration", () => {
  const future = new Date(Date.now() + 86_400_000);
  it("blocks past, duplicate and full registrations", () => {
    expect(canRegister({ startsAt: future, capacity: 2, registrations: [] }, "u").ok).toBe(true);
    expect(canRegister({ startsAt: new Date(Date.now() - 1000), capacity: null, registrations: [] }, "u").ok).toBe(false);
    expect(canRegister({ startsAt: future, capacity: 5, registrations: ["u"] }, "u").ok).toBe(false);
    expect(canRegister({ startsAt: future, capacity: 1, registrations: ["x"] }, "u").ok).toBe(false);
  });
  it("places and progress", () => { expect(placesLeft(100, 38)).toBe(62); expect(placesLeft(null, 5)).toBeNull(); expect(fillPercent(100, 38)).toBe(38); expect(fillPercent(null, 4)).toBe(0); });
});
