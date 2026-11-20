/**
 * A14 event hosts: picked from approved mentors (or the Village Circle team), not typed. The event keeps the mentors'
 * ids (Event.hostIds) and their public names (Event.host, comma separated), which is what participants see on D20.
 * Pure: no database.
 */
export const TEAM_HOST = "TEAM";
export const TEAM_HOST_NAME = "The Village Circle team";
export const MAX_HOSTS = 4;

/** An approved mentor who can host: full name for the team's list, short name for participants, main specialization. */
export type HostOption = { id: string; name: string; short: string; expertise: string };
export const hostLabel = (o: HostOption) => `${o.name} · ${o.expertise}`;

const splitNames = (host: string) => host.split(/,|&|\band\b/i).map((s) => s.trim()).filter(Boolean);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * What the picker starts with for a saved event: its stored ids, or, for events saved before hosts were picked from
 * the list, the typed names matched to mentors by full or short name. Names that match nobody come back as `unmatched`
 * so the team can see them and pick again.
 */
export function hostsForEdit(e: { host: string; hostIds?: string[] | null }, options: HostOption[]): { values: string[]; unmatched: string[] } {
  const names = splitNames(e.host);
  const team = names.some((n) => same(n, TEAM_HOST_NAME)) ? [TEAM_HOST] : [];
  const ids = (e.hostIds ?? []).filter((id) => options.some((o) => o.id === id));
  if (ids.length) return { values: [...ids, ...team].slice(0, MAX_HOSTS), unmatched: [] };
  const values: string[] = []; const unmatched: string[] = [];
  for (const n of names) {
    if (same(n, TEAM_HOST_NAME)) continue;
    const o = options.find((x) => same(x.name, n) || same(x.short, n));
    if (o && !values.includes(o.id)) values.push(o.id); else if (!o) unmatched.push(n);
  }
  return { values: [...values, ...team].slice(0, MAX_HOSTS), unmatched };
}

/** The picked hosts into what is stored. Each must still be an approved mentor (or the team); order is kept. */
export function resolveHosts(values: string[], options: HostOption[]): { ok: true; host: string; hostIds: string[] } | { ok: false; error: string } {
  const picked = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (!picked.length) return { ok: false, error: "Choose at least one host." };
  if (picked.length > MAX_HOSTS) return { ok: false, error: `Choose up to ${MAX_HOSTS} hosts.` };
  const names: string[] = []; const hostIds: string[] = [];
  for (const v of picked) {
    if (v === TEAM_HOST) { names.push(TEAM_HOST_NAME); continue; }
    const o = options.find((x) => x.id === v);
    if (!o) return { ok: false, error: "One of the hosts is no longer an approved mentor. Choose the hosts again." };
    names.push(o.short); hostIds.push(o.id);
  }
  return { ok: true, host: names.join(", "), hostIds };
}
