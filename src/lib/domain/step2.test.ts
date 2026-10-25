import { describe, it, expect } from "vitest";
import { newToken, newCode, checkInvite, checkCode, inviteExpiry, maskPhone, sha, MAX_CODE_ATTEMPTS } from "./tokens";
import { step1, step2, checkAttestation, ATTESTATION_VERSION, mentorAgeOk, canGrantClearedForMinors, mentorStage } from "./mentor-application";

const now = new Date("2026-10-11T10:00:00Z");
const inv = (o = {}) => ({ state: "SENT", expiresAt: new Date(now.getTime() + 86400_000), usedAt: null, lockedUntil: null, ...o });

describe("guardian invite link (S-3)", () => {
  it("tokens are random and stored only as hashes", () => { const a = newToken(), b = newToken(); expect(a.raw).not.toBe(b.raw); expect(a.hash).toBe(sha(a.raw)); expect(a.hash).not.toContain(a.raw); });
  it("expires after 14 days", () => { const e = inviteExpiry(now); expect(e.getTime() - now.getTime()).toBe(14 * 86400_000); });
  it("valid, expired, used, closed, locked", () => {
    expect(checkInvite(inv(), now).ok).toBe(true);
    expect(checkInvite(inv({ expiresAt: new Date(now.getTime() - 1) }), now)).toMatchObject({ ok: false, reason: "EXPIRED" });
    expect(checkInvite(inv({ usedAt: now }), now)).toMatchObject({ reason: "USED" });
    expect(checkInvite(inv({ state: "DECLINED" }), now)).toMatchObject({ reason: "CLOSED" });
    expect(checkInvite(inv({ lockedUntil: new Date(now.getTime() + 1000) }), now)).toMatchObject({ reason: "LOCKED" });
  });
  it("masks the phone like the design", () => { expect(maskPhone("+234 801 234 4192")).toBe("ending 4192"); });
});

describe("6-digit code with lockout", () => {
  const c = newCode();
  const base = { codeHash: c.hash, codeExpiresAt: new Date(now.getTime() + 600_000), codeAttempts: 0, lockedUntil: null };
  it("is 6 digits", () => { expect(c.raw).toMatch(/^\d{6}$/); });
  it("accepts the right code (spaces ok) and resets attempts", () => { const r = checkCode({ ...base, codeAttempts: 3 }, ` ${c.raw.slice(0, 3)} ${c.raw.slice(3)} `, now); expect(r.ok).toBe(true); expect(r.nextAttempts).toBe(0); });
  it("counts wrong attempts then locks", () => {
    let st = { ...base };
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) { const r = checkCode(st, "000000" === c.raw ? "111111" : "000000", now); expect(r).toMatchObject({ ok: false, reason: "WRONG", attemptsLeft: MAX_CODE_ATTEMPTS - i }); st = { ...st, codeAttempts: r.nextAttempts }; }
    const last = checkCode(st, "000000" === c.raw ? "111111" : "000000", now); expect(last).toMatchObject({ ok: false, reason: "LOCKED" }); expect(last.nextLockedUntil).not.toBeNull();
  });
  it("a locked invite rejects even the correct code", () => { expect(checkCode({ ...base, lockedUntil: new Date(now.getTime() + 1000) }, c.raw, now)).toMatchObject({ ok: false, reason: "LOCKED" }); });
  it("expired code and missing code", () => {
    expect(checkCode({ ...base, codeExpiresAt: new Date(now.getTime() - 1) }, c.raw, now)).toMatchObject({ reason: "EXPIRED" });
    expect(checkCode({ ...base, codeHash: null, codeExpiresAt: null }, c.raw, now)).toMatchObject({ reason: "NO_CODE" });
  });
});

describe("mentor application (BR-02, BR-03, EL-01/03)", () => {
  const ok2 = { bio: "x".repeat(90), primaryExpertise: "EXP-TEC", extraExpertise: [], monthlyHours: 2, conversationLength: 30, optedForMinors: false } as const;
  it("phone format", () => { expect(step1.safeParse({ phone: "08012345678", country: "NG", languages: ["English"] }).success).toBe(false); expect(step1.safeParse({ phone: "+2348012345678", country: "Nigeria", languages: ["English"] }).success).toBe(true); });
  it("bio and primary area are required; résumé/LinkedIn are optional", () => {
    expect(step2.safeParse(ok2).success).toBe(true);
    expect(step2.safeParse({ ...ok2, bio: "short" }).success).toBe(false);
    expect(step2.safeParse({ ...ok2, primaryExpertise: undefined }).success).toBe(false);
  });
  it("at most two extra areas, distinct from the primary, 'other' needs text", () => {
    expect(step2.safeParse({ ...ok2, extraExpertise: ["EXP-ENG", "EXP-FIN", "EXP-LAW"] }).success).toBe(false);
    expect(step2.safeParse({ ...ok2, extraExpertise: ["EXP-TEC"] }).success).toBe(false);
    expect(step2.safeParse({ ...ok2, primaryExpertise: "EXP-OTH" }).success).toBe(false);
    expect(step2.safeParse({ ...ok2, primaryExpertise: "EXP-OTH", expertiseOther: "Marine biology" }).success).toBe(true);
  });
  it("attestation: refused, unsigned, mismatched, superseded all block", () => {
    const good = { affirmed: true, typedLegalName: "Ada  Obi", accountName: "ada obi", version: ATTESTATION_VERSION };
    expect(checkAttestation(good).ok).toBe(true);
    expect(checkAttestation({ ...good, refused: true })).toMatchObject({ reason: "REFUSED" });
    expect(checkAttestation({ ...good, affirmed: false })).toMatchObject({ reason: "UNSIGNED" });
    expect(checkAttestation({ ...good, typedLegalName: "Someone Else" })).toMatchObject({ reason: "NAME_MISMATCH" });
    expect(checkAttestation({ ...good, version: "2025.1" })).toMatchObject({ reason: "SUPERSEDED" });
  });
  it("mentors must be 21+", () => { expect(mentorAgeOk(new Date("2005-10-12"), now)).toBe(false); expect(mentorAgeOk(new Date("2005-10-11"), now)).toBe(true); });
  it("cleared-for-minors needs opt-in + clear enhanced screening + orientation (BR-04)", () => {
    const m = { optedForMinors: true, screening: "CLEAR" as const, orientationDone: true, codeOfConduct: true, attestationCurrent: true };
    expect(canGrantClearedForMinors(m)).toBe(true);
    for (const k of ["optedForMinors", "orientationDone", "codeOfConduct", "attestationCurrent"] as const) expect(canGrantClearedForMinors({ ...m, [k]: false })).toBe(false);
    expect(canGrantClearedForMinors({ ...m, screening: "PENDING" })).toBe(false);
    expect(canGrantClearedForMinors({ ...m, screening: "CONSIDER" })).toBe(false);
  });
  it("stage: no Active until approved + screening + orientation (BR-01)", () => {
    const a = { state: "APPROVED", screening: "CLEAR" as const, orientationDone: true, codeOfConduct: true, approved: true };
    expect(mentorStage(a)).toBe("ACTIVE");
    expect(mentorStage({ ...a, screening: "PENDING" })).toBe("SCREENING_PENDING");
    expect(mentorStage({ ...a, orientationDone: false })).toBe("ORIENTATION_PENDING");
    expect(mentorStage({ ...a, approved: false, state: "IN_REVIEW" })).toBe("IN_REVIEW");
    expect(mentorStage({ ...a, state: "DECLINED" })).toBe("DECLINED");
  });
});

import { canReview } from "./application-review";
describe("admin review rules", () => {
  const a = { type: "MENTOR" as const, state: "SUBMITTED", applicantId: "m1" };
  it("no self-review", () => { expect(canReview(a, "APPROVE", "m1").ok).toBe(false); expect(canReview(a, "APPROVE", "admin").ok).toBe(true); });
  it("state guards", () => { expect(canReview({ ...a, state: "DECLINED" }, "APPROVE", "admin").ok).toBe(false); expect(canReview({ ...a, type: "GUARDIAN" }, "APPROVE", "admin").ok).toBe(false); expect(canReview({ ...a, type: "GUARDIAN" }, "ACTIVATE_GUARDIAN", "admin").ok).toBe(true); });
  it("decline / info / hold need a real note", () => { expect(canReview(a, "DECLINE", "admin", { note: "no" }).ok).toBe(false); expect(canReview(a, "DECLINE", "admin", { note: "Bio is too thin to place you." }).ok).toBe(true); });
  it("granting cleared-for-minors is gated (BR-04)", () => {
    const ap = { ...a, state: "APPROVED" };
    expect(canReview(ap, "GRANT_MINORS", "admin").ok).toBe(false);
    expect(canReview(ap, "GRANT_MINORS", "admin", { mentor: { optedForMinors: true, screening: "PENDING", orientationDone: true, codeOfConduct: true, attestationCurrent: true } }).ok).toBe(false);
    expect(canReview(ap, "GRANT_MINORS", "admin", { mentor: { optedForMinors: true, screening: "CLEAR", orientationDone: true, codeOfConduct: true, attestationCurrent: true } }).ok).toBe(true);
  });
});
