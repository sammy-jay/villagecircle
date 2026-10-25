import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateConfig, mergeConfig, DEFAULT_CONFIG, canEditConfig, cleanTopic, slugify, validateBroadcast, canSendBroadcast, canReceiveBroadcast, audienceRoles, recipientLabel,
  queueStatus, durationLabel, windowEndsLabel, breachingSoon, loadWidth, maskEmail, canRevealContact, canSeeIncidentDetail, normaliseQuery, queryOk,
  bulkEligible, planBulk, isSafeguardingItem, BULK_ACTIONS, currentStep, PLAYBOOK, REVIEW_STEPS, previewText, type BulkItem,
} from "./admin-ops";

const base: BulkItem = { state: "IN_TEAM_REVIEW", reason: "R_NEW", flags: [], minor: false, pausedForCrisis: false };

describe("configuration (A5)", () => {
  it("defaults are valid and weights total 100", () => { expect(validateConfig(DEFAULT_CONFIG)).toEqual([]); expect(Object.values(DEFAULT_CONFIG.weights).reduce((a, b) => a + b, 0)).toBe(100); });
  it("rejects weights that do not total 100", () => expect(validateConfig({ ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, fit: 40 } })[0]).toMatch(/total 100/));
  it("rejects out-of-range windows and fractions", () => {
    expect(validateConfig({ ...DEFAULT_CONFIG, windows: { ...DEFAULT_CONFIG.windows, reviewBusinessDays: 0 } }).length).toBe(1);
    expect(validateConfig({ ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, fit: 35.5, capacity: 19.5 } }).length).toBeGreaterThan(0);
  });
  it("a malformed stored value falls back to defaults", () => { expect(mergeConfig({ weights: { fit: 99 } })).toEqual(DEFAULT_CONFIG); expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG); });
  it("a valid stored value overrides the defaults", () => { const next = mergeConfig({ windows: { reviewBusinessDays: 3 } }); expect(next.windows.reviewBusinessDays).toBe(3); expect(next.windows.mentorReplyDays).toBe(5); });
  it("only ADMIN edits configuration", () => { expect(canEditConfig(["ADMIN"])).toBe(true); expect(canEditConfig(["SAFEGUARDING_LEAD"])).toBe(false); });
});

describe("taxonomy (A12)", () => {
  const ok = { name: "College guidance", guidedPrompts: ["Where are you?", " ", "Where are you?"], subTopics: ["Applying"], expertiseMap: ["EXP-EDU"], active: true };
  it("trims and de-duplicates", () => { const r = cleanTopic(ok); expect(r.ok && r.value.guidedPrompts).toEqual(["Where are you?"]); });
  it("refuses unknown expertise codes and empty names", () => { expect(cleanTopic({ ...ok, expertiseMap: ["EXP-NOPE"] }).ok).toBe(false); expect(cleanTopic({ ...ok, name: " " }).ok).toBe(false); });
  it("slugs are stable and ascii", () => expect(slugify("Résumé review!")).toBe("resume-review"));
});

describe("broadcast (A17)", () => {
  const now = new Date("2026-10-17T10:00:00Z");
  it("audiences map to roles; everyone is the three public roles", () => { expect(audienceRoles("MENTORS")).toEqual(["MENTOR"]); expect(audienceRoles("EVERYONE")).toEqual(["MENTOR", "PARTICIPANT", "GUARDIAN"]); });
  it("only active accounts in the audience receive it", () => {
    expect(canReceiveBroadcast({ status: "ACTIVE", roles: ["MENTOR"] }, "MENTORS")).toBe(true);
    expect(canReceiveBroadcast({ status: "SUSPENDED", roles: ["MENTOR"] }, "MENTORS")).toBe(false);
    expect(canReceiveBroadcast({ status: "ACTIVE", roles: ["MENTOR"] }, "GUARDIANS")).toBe(false);
    expect(canReceiveBroadcast({ status: "ACTIVE", roles: ["ADMIN"] }, "EVERYONE")).toBe(false);
  });
  it("needs a subject, a message and a future time", () => {
    expect(validateBroadcast({ subject: "", body: "A real message here." }, now).length).toBe(1);
    expect(validateBroadcast({ subject: "Hello", body: "short" }, now).length).toBe(1);
    expect(validateBroadcast({ subject: "Hello", body: "A real message here.", scheduledFor: new Date("2026-10-17T09:00:00Z") }, now).length).toBe(1);
    expect(validateBroadcast({ subject: "Hello", body: "A real message here.", scheduledFor: new Date("2026-10-18T09:00:00Z") }, now)).toEqual([]);
  });
  it("sending requires the confirmed recipient count to match the live audience", () => {
    expect(canSendBroadcast(undefined, 214).ok).toBe(false);
    expect(canSendBroadcast(200, 214).ok).toBe(false);
    expect(canSendBroadcast(214, 0).ok).toBe(false);
    expect(canSendBroadcast(214, 214).ok).toBe(true);
  });
  it("labels counts", () => { expect(recipientLabel(214, "MENTORS")).toBe("214 mentors"); expect(recipientLabel(1, "MENTORS")).toBe("1 mentor"); expect(previewText("a ".repeat(100), 20).endsWith("…")).toBe(true); });
});

describe("queue health (A20)", () => {
  const now = new Date("2026-10-17T12:00:00Z"); const H = 3600_000;
  it("matches the board: 1d6h of 2 days is at risk, 2d of 5 is on track, 6d of 5 is overdue", () => {
    expect(queueStatus({ count: 7, oldestAt: new Date(now.getTime() - 30 * H), windowMs: 48 * H, now })).toMatchObject({ status: "AT_RISK", pct: 63 });
    expect(queueStatus({ count: 4, oldestAt: new Date(now.getTime() - 48 * H), windowMs: 120 * H, now })).toMatchObject({ status: "ON_TRACK", pct: 40 });
    expect(queueStatus({ count: 2, oldestAt: new Date(now.getTime() - 144 * H), windowMs: 120 * H, now })).toMatchObject({ status: "OVERDUE", pct: 100 });
  });
  it("an empty queue is on track", () => expect(queueStatus({ count: 0, oldestAt: null, windowMs: 1, now }).status).toBe("ON_TRACK"));
  it("labels durations and window ends", () => { expect(durationLabel(30 * H)).toBe("1d 6h"); expect(durationLabel(6 * H)).toBe("6h"); expect(windowEndsLabel(new Date(now.getTime() + 100 * 60000), now)).toBe("In 1h 40m"); expect(windowEndsLabel(new Date(now.getTime() - 24 * H), now)).toBe("Overdue 1d"); });
  it("lists items due within 4 hours, overdue first", () => {
    const items = [{ id: "a", due: new Date(now.getTime() + 3 * H) }, { id: "b", due: new Date(now.getTime() + 9 * H) }, { id: "c", due: new Date(now.getTime() - 24 * H) }];
    expect(breachingSoon(items, now).map((i) => i.id)).toEqual(["c", "a"]);
  });
  it("load bars cap at 100", () => { expect(loadWidth(7)).toBe(70); expect(loadWidth(14)).toBe(100); });
});

describe("search (A21)", () => {
  it("masks email like the board", () => expect(maskEmail("amara@example.org")).toBe("a•••@e•••.org"));
  it("normalises and gates the query", () => { expect(normaliseQuery("  Oka   for ")).toBe("Oka for"); expect(queryOk("a")).toBe(false); expect(queryOk("ok")).toBe(true); });
  it("a minor's contact details are for the safeguarding lead only", () => {
    expect(canRevealContact(["ADMIN"], { minor: false })).toBe(true); expect(canRevealContact(["ADMIN"], { minor: true })).toBe(false);
    expect(canRevealContact(["SAFEGUARDING_LEAD"], { minor: true })).toBe(true); expect(canRevealContact(["MENTOR"], { minor: false })).toBe(false);
  });
  it("incident detail is the safeguarding lead's", () => { expect(canSeeIncidentDetail(["ADMIN"])).toBe(false); expect(canSeeIncidentDetail(["SAFEGUARDING_LEAD"])).toBe(true); });
});

describe("bulk actions (A22)", () => {
  it("offers only organising actions, never release, approve or close", () => { expect([...BULK_ACTIONS]).toEqual(["ASSIGN", "SET_EXPERTISE", "REMIND"]); });
  it("a plain queued Ask can be assigned, tagged and reminded", () => { for (const a of BULK_ACTIONS) expect(bulkEligible(a, base).ok).toBe(true); });
  it("safeguarding items are excluded from every bulk action, including close", () => {
    for (const bad of [{ ...base, reason: "R_FLAG" }, { ...base, reason: "R_CONCERN" }, { ...base, pausedForCrisis: true }, { ...base, hasIncident: true }, { ...base, flags: ["SELF_HARM"] }]) {
      expect(isSafeguardingItem(bad)).toBe(true);
      for (const a of [...BULK_ACTIONS, "CLOSE" as const]) expect(bulkEligible(a, bad).ok).toBe(false);
    }
    expect(isSafeguardingItem({ ...base, flags: ["CONTACT_DETAILS"] })).toBe(false);
  });
  it("bulk close is never allowed, even for an ordinary Ask", () => expect(bulkEligible("CLOSE", base).ok).toBe(false));
  it("nothing is bulk-sent to a minor or to an Ask waiting on a guardian", () => {
    expect(bulkEligible("REMIND", { ...base, minor: true }).ok).toBe(false); expect(bulkEligible("REMIND", { ...base, state: "AWAITING_GUARDIAN" }).ok).toBe(false);
    expect(bulkEligible("ASSIGN", { ...base, minor: true }).ok).toBe(true);
  });
  it("Asks that already left the queue are skipped", () => expect(bulkEligible("ASSIGN", { ...base, state: "OPEN_TO_MENTORS" }).ok).toBe(false));
  it("planBulk splits eligible from skipped and says why", () => {
    const p = planBulk("REMIND", [{ id: "1", ...base }, { id: "2", ...base, reason: "R_FLAG" }, { id: "3", ...base, minor: true }]);
    expect(p.eligible.map((i) => i.id)).toEqual(["1"]); expect(p.skipped.map((s) => s.id)).toEqual(["2", "3"]); expect(p.skipped.every((s) => s.why.length > 0)).toBe(true);
  });
});

describe("reviewer playbook (A24)", () => {
  it("has guidance for each of the six steps, each with an escalation line", () => { expect(REVIEW_STEPS).toHaveLength(6); for (const [l] of REVIEW_STEPS) expect(PLAYBOOK[l]!.escalate).toMatch(/safeguarding/); });
  it("shows the first undone step, or the one asked for", () => { expect(currentStep(["A", "B"])).toBe("C"); expect(currentStep(["A", "B"], "E")).toBe("E"); expect(currentStep(["A", "B"], "Z")).toBe("C"); expect(currentStep(["A", "B", "C", "D", "E", "F"])).toBe("F"); });
});

/* ───────── server functions with the database mocked ───────── */
const m = vi.hoisted(() => {
  const fn = (v: unknown = null) => vi.fn(async (..._a: unknown[]) => v);
  return {
    audit: vi.fn(async (..._a: unknown[]) => undefined), notify: vi.fn(async (..._a: unknown[]) => undefined),
    db: {
      user: { count: fn(3), findMany: fn([]), findFirst: fn(null), findUnique: fn(null) },
      broadcast: { create: fn({ id: "b1" }), update: fn({}), updateMany: fn({ count: 1 }), findUnique: fn(null), findMany: fn([]) },
      ask: { findMany: fn([]) }, incident: { findMany: fn([]) }, review: { upsert: fn({}) }, setting: { upsert: fn({}), findUnique: fn(null) },
    },
  };
});
vi.mock("../db", () => ({ db: m.db }));
vi.mock("../audit", () => ({ audit: m.audit }));
vi.mock("../notify", () => ({ notify: m.notify }));

describe("server enforcement", () => {
  beforeEach(() => { vi.clearAllMocks(); m.db.user.count.mockResolvedValue(3); m.db.broadcast.updateMany.mockResolvedValue({ count: 1 }); m.db.broadcast.create.mockResolvedValue({ id: "b1" }); });
  it("sending without the confirmed recipient count sends nothing", async () => {
    const { sendBroadcast } = await import("../admin-ops");
    const r = await sendBroadcast("a".repeat(24), { audience: "MENTORS", subject: "Thank you", body: "Thank you for September." });
    expect(r.ok).toBe(false); expect(m.notify).not.toHaveBeenCalled(); expect(m.db.broadcast.create).not.toHaveBeenCalled();
  });
  it("a stale count (audience changed) sends nothing", async () => {
    const { sendBroadcast } = await import("../admin-ops");
    const r = await sendBroadcast("a".repeat(24), { audience: "MENTORS", subject: "Thank you", body: "Thank you for September.", confirmCount: 2 });
    expect(r.ok).toBe(false); expect(m.notify).not.toHaveBeenCalled();
  });
  it("a confirmed send notifies every recipient once and writes the audit event", async () => {
    const { sendBroadcast } = await import("../admin-ops");
    m.db.broadcast.findUnique.mockResolvedValue({ id: "b1", audience: "MENTORS", subject: "Thank you", body: "Thank you for September.", status: "DRAFT" });
    m.db.user.findMany.mockResolvedValue([{ id: "u1" }, { id: "u2" }, { id: "u3" }]);
    const r = await sendBroadcast("a".repeat(24), { audience: "MENTORS", subject: "Thank you", body: "Thank you for September.", confirmCount: 3 });
    expect(r).toMatchObject({ ok: true, recipients: 3, scheduled: false }); expect(m.notify).toHaveBeenCalledTimes(3);
    expect(m.audit).toHaveBeenCalledWith("a".repeat(24), "broadcast.send", "Broadcast", "b1", null, expect.objectContaining({ recipients: 3 }));
  });
  it("an already-sent broadcast is never sent twice", async () => {
    const { sendBroadcast } = await import("../admin-ops");
    m.db.broadcast.findUnique.mockResolvedValue({ id: "b1", audience: "MENTORS", subject: "Thank you", body: "Thank you for September.", status: "SENT" });
    m.db.broadcast.updateMany.mockResolvedValue({ count: 0 });
    const r = await sendBroadcast("a".repeat(24), { audience: "MENTORS", subject: "Thank you", body: "Thank you for September.", confirmCount: 3 });
    expect(r).toMatchObject({ ok: true, recipients: 0 }); expect(m.notify).not.toHaveBeenCalled();
  });
  it("revealing contact details is refused for a minor unless safeguarding lead, and logged when allowed", async () => {
    const { revealContact } = await import("../admin-ops");
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 15);
    m.db.user.findUnique.mockResolvedValue({ email: "a@b.org", phone: null, dateOfBirth: dob });
    expect((await revealContact({ id: "x", roles: ["ADMIN"] }, "u1")).ok).toBe(false); expect(m.audit).not.toHaveBeenCalled();
    expect((await revealContact({ id: "x", roles: ["SAFEGUARDING_LEAD"] }, "u1")).ok).toBe(true); expect(m.audit).toHaveBeenCalledWith("x", "search.reveal_contact", "User", "u1", undefined, expect.anything());
  });
  it("bulk assign audits each Ask and skips safeguarding items without touching them", async () => {
    const { runBulk } = await import("../admin-ops");
    const mk = (id: string, reasonCode: string) => ({ id, state: "IN_TEAM_REVIEW", reasonCode, pausedForCrisis: false, review: null, participantId: "p", participant: { userId: "pu", user: { dateOfBirth: null } }, topic: { name: "T" }, answers: {} });
    m.db.user.findFirst.mockResolvedValue({ id: "r1" }); m.db.ask.findMany.mockResolvedValue([mk("a1", "R_NEW"), mk("a2", "R_FLAG")]); m.db.incident.findMany.mockResolvedValue([]);
    const r = await runBulk({ id: "adm", roles: ["ADMIN"] }, "ASSIGN", ["a1", "a2"], { reviewerId: "r1" });
    expect(r).toMatchObject({ ok: true, done: 1 }); expect(m.db.review.upsert).toHaveBeenCalledTimes(1);
    expect(m.audit).toHaveBeenCalledWith("adm", "bulk.assign", "Ask", "a1", expect.anything(), expect.anything());
    expect(m.audit).toHaveBeenCalledWith("adm", "bulk.assign.run", "Ask", undefined, undefined, expect.objectContaining({ done: 1 }));
  });
  it("bulk refuses non-team roles and oversize selections", async () => {
    const { runBulk } = await import("../admin-ops");
    expect((await runBulk({ id: "x", roles: ["MENTOR"] }, "REMIND", ["a"], {})).ok).toBe(false);
    expect((await runBulk({ id: "x", roles: ["ADMIN"] }, "REMIND", Array.from({ length: 51 }, (_, i) => `a${i}`), {})).ok).toBe(false);
  });
  it("saving configuration writes before and after to the audit log", async () => {
    const { saveConfig } = await import("../config");
    const r = await saveConfig("adm", { ...DEFAULT_CONFIG, windows: { ...DEFAULT_CONFIG.windows, reviewBusinessDays: 3 } });
    expect(r.ok).toBe(true); expect(m.audit).toHaveBeenCalledWith("adm", "config.save", "Configuration", "app", expect.anything(), expect.objectContaining({ windows: expect.anything() }));
    m.audit.mockClear(); expect((await saveConfig("adm", { ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, fit: 90 } })).ok).toBe(false); expect(m.audit).not.toHaveBeenCalled();
  });
});
