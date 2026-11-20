import { describe, expect, it } from "vitest";
import { hostLabel, hostsForEdit, MAX_HOSTS, resolveHosts, TEAM_HOST, TEAM_HOST_NAME, type HostOption } from "./event-hosts";
import { shortName } from "./views";

const opts: HostOption[] = [
  { id: "a".repeat(24), name: "Marcus Bennett", short: "Marcus B.", expertise: "Technology & Data" },
  { id: "b".repeat(24), name: "Rachel Kim", short: "Rachel K.", expertise: "Technology & Data" },
  { id: "c".repeat(24), name: "Michael Okafor", short: "Michael O.", expertise: "Engineering" },
];

describe("public short names", () => {
  it("keep a title with the first name instead of with the initial", () => {
    expect(shortName("Dr. Priya Nair")).toBe("Dr. Priya N.");
    expect(shortName("Dr Bisi Adeyemi")).toBe("Dr Bisi A.");
    expect(shortName("Marcus Bennett")).toBe("Marcus B.");
    expect(shortName("Dr Smith")).toBe("Dr S.");
  });
});

describe("event hosts", () => {
  it("labels each mentor with their specialization", () => {
    expect(hostLabel(opts[0]!)).toBe("Marcus Bennett · Technology & Data");
  });
  it("stores public short names and mentor ids, keeping the team as a name only", () => {
    expect(resolveHosts([opts[1]!.id, TEAM_HOST, opts[0]!.id], opts)).toEqual({ ok: true, host: `Rachel K., ${TEAM_HOST_NAME}, Marcus B.`, hostIds: [opts[1]!.id, opts[0]!.id] });
  });
  it("needs at least one host, no more than the limit, and only approved mentors", () => {
    expect(resolveHosts(["", " "], opts).ok).toBe(false);
    expect(resolveHosts(["x".repeat(24)], opts).ok).toBe(false);
    const five = [...opts.map((o) => o.id), TEAM_HOST, "d".repeat(24)];
    expect(five.length).toBeGreaterThan(MAX_HOSTS);
    expect(resolveHosts(five, [...opts, { id: "d".repeat(24), name: "D", short: "D.", expertise: "Law" }]).ok).toBe(false);
  });
  it("ignores a host picked twice", () => {
    const r = resolveHosts([opts[0]!.id, opts[0]!.id], opts);
    expect(r.ok && r.hostIds).toEqual([opts[0]!.id]);
  });
  it("reopens a saved event with its stored hosts and the team", () => {
    expect(hostsForEdit({ host: `Marcus B., ${TEAM_HOST_NAME}`, hostIds: [opts[0]!.id] }, opts)).toEqual({ values: [opts[0]!.id, TEAM_HOST], unmatched: [] });
  });
  it("matches typed names on older events, and lists the names it could not match", () => {
    expect(hostsForEdit({ host: "Marcus Bennett, Rachel Kim and Michael Okafor" }, opts)).toEqual({ values: opts.map((o) => o.id), unmatched: [] });
    expect(hostsForEdit({ host: "Rachel K., Jane Doe" }, opts)).toEqual({ values: [opts[1]!.id], unmatched: ["Jane Doe"] });
  });
});
