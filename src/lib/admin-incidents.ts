import type { IncidentSeverity, IncidentState, Role } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { ageOn } from "./domain/age";
import { shortName } from "./domain/views";
import { canActOnIncident, canMoveIncident, incidentCountdown, incidentWindowHours, nextIncidentState, INCIDENT_STATE_LABEL, INCIDENT_OUTCOMES, RESOLUTION_NOTE_MIN, CATEGORY_LABEL } from "./domain/admin-safety-1";

export type Res = { ok: true; [k: string]: unknown } | { ok: false; error: string };
const fail = (error: string): Res => ({ ok: false, error });
const OID = /^[a-f0-9]{24}$/i;
const OPEN: IncidentState[] = ["REPORTED", "TRIAGED", "INVESTIGATING", "ACTIONED"];

export async function incidentList(roles: Role[]) {
  const rows = await db.incident.findMany({ orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }], take: 200 });
  const sg = canActOnIncident(roles);
  return rows.map((i) => {
    const total = incidentWindowHours(i.severity);
    return { id: i.id, ref: i.id.slice(-4).toUpperCase(), category: CATEGORY_LABEL[i.category], severity: i.severity, state: i.state, stateLabel: INCIDENT_STATE_LABEL[i.state], created: i.createdAt, countdown: incidentCountdown(i.dueAt, total, i.state === "CLOSED"), restricted: !sg };
  });
}

export async function incidentDetail(id: string, roles: Role[]) {
  if (!OID.test(id)) return null;
  const i = await db.incident.findUnique({ where: { id } }); if (!i) return null;
  const sg = canActOnIncident(roles);
  const total = incidentWindowHours(i.severity);
  const base = { id: i.id, ref: i.id.slice(-4).toUpperCase(), category: i.category, categoryLabel: CATEGORY_LABEL[i.category], state: i.state, next: nextIncidentState(i.state), severity: i.severity, countdown: incidentCountdown(i.dueAt, total, i.state === "CLOSED"), restricted: !sg };
  if (!sg) return { ...base, reporterRole: null, timeline: [], connection: null, resolution: null };
  const [reporter, events, conn] = await Promise.all([
    db.user.findUnique({ where: { id: i.reporterId }, select: { roles: true } }),
    db.incidentEvent.findMany({ where: { incidentId: id }, orderBy: { createdAt: "asc" } }),
    i.connectionId ? db.connection.findUnique({ where: { id: i.connectionId }, include: { mentor: { include: { user: true } }, participant: { include: { user: true } } } }) : null,
  ]);
  const reporterRole = reporter?.roles.includes("GUARDIAN") ? "a guardian" : reporter?.roles.includes("MENTOR") ? "a mentor" : "a participant";
  return {
    ...base, reporterRole, description: i.description, resolution: i.resolution, evidence: i.evidenceRefs.length, created: i.createdAt,
    timeline: events.map((e) => ({ id: e.id, kind: e.kind, text: e.text, at: e.createdAt })),
    connection: conn ? { id: conn.id, mentorUserId: conn.mentor.userId, participant: `${shortName(conn.participant.user.name)}${conn.participant.user.dateOfBirth ? `, ${ageOn(conn.participant.user.dateOfBirth)}` : ""}`, mentor: shortName(conn.mentor.user.name), paused: conn.pausedByConcern } : null,
  };
}

async function note(incidentId: string, kind: string, text: string, actorId: string) { await db.incidentEvent.create({ data: { incidentId, kind, text, actorId } }); }

/** Moves one step along REPORTED, TRIAGED, INVESTIGATING, ACTIONED, CLOSED. Writes an audit row and a timeline row. */
export async function moveIncident(id: string, to: IncidentState, actor: { id: string; roles: Role[] }, resolutionNote?: string): Promise<Res> {
  if (!OID.test(id)) return fail("Incident not found.");
  const i = await db.incident.findUnique({ where: { id } }); if (!i) return fail("Incident not found.");
  const c = canMoveIncident(i.state, to, actor.roles, resolutionNote); if (!c.ok) return fail(c.error);
  await db.incident.update({ where: { id }, data: { state: to, actionedById: actor.id, ...(to === "CLOSED" ? { resolution: resolutionNote!.trim() } : {}) } });
  await note(id, `state.${to}`, to === "TRIAGED" ? "Safeguarding lead took ownership." : `Moved to ${INCIDENT_STATE_LABEL[to].toLowerCase()}.`, actor.id);
  await audit(actor.id, "incident.move", "Incident", id, { state: i.state }, { state: to });
  return { ok: true };
}

/** "Resolve and notify": records the outcome, severity and note, walks the remaining steps to CLOSED and tells the reporter. */
export async function resolveIncident(id: string, actor: { id: string; roles: Role[] }, d: { outcome: string; severity: IncidentSeverity; note: string }): Promise<Res> {
  if (!canActOnIncident(actor.roles)) return fail("Only the safeguarding lead can close an incident.");
  if (!OID.test(id)) return fail("Incident not found.");
  const i = await db.incident.findUnique({ where: { id } }); if (!i) return fail("Incident not found.");
  if (i.state === "CLOSED") return fail("This incident is closed.");
  if (!(INCIDENT_OUTCOMES as readonly string[]).includes(d.outcome)) return fail("Choose an outcome.");
  if ((d.note ?? "").trim().length < RESOLUTION_NOTE_MIN) return fail(`Add a resolution note of at least ${RESOLUTION_NOTE_MIN} characters.`);
  let state: IncidentState = i.state;
  while (state !== "CLOSED") { const next: IncidentState = nextIncidentState(state)!; const r = await moveIncident(id, next, actor, next === "CLOSED" ? `${d.outcome}. ${d.note}` : undefined); if (!r.ok) return r; state = next; }
  await db.incident.update({ where: { id }, data: { severity: d.severity } });
  await note(id, "resolved", `Resolved: ${d.outcome}.`, actor.id);
  await audit(actor.id, "incident.resolve", "Incident", id, { severity: i.severity }, { severity: d.severity, outcome: d.outcome });
  await notify(i.reporterId, "incident.resolved", "Thank you for telling us", "The team has looked into what you reported and taken action. You do not need to do anything.", { link: "/home" }); // no details of the outcome
  return { ok: true };
}

/** Lifts the automatic pause on the connection. Safeguarding lead only. */
export async function restoreConnection(id: string, actor: { id: string; roles: Role[] }): Promise<Res> {
  if (!canActOnIncident(actor.roles)) return fail("Only the safeguarding lead can restore a connection.");
  if (!OID.test(id)) return fail("Incident not found.");
  const i = await db.incident.findUnique({ where: { id } }); if (!i?.connectionId) return fail("This incident has no connection.");
  await db.connection.update({ where: { id: i.connectionId }, data: { pausedByConcern: false } });
  await note(id, "connection.restored", "Connection restored.", actor.id);
  await audit(actor.id, "incident.connection.restore", "Connection", i.connectionId, { pausedByConcern: true }, { pausedByConcern: false });
  return { ok: true };
}

export async function openIncidentCount() { return db.incident.count({ where: { state: { in: OPEN } } }); }
