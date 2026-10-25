import type { Role } from "@prisma/client";
import { db } from "./db";
import { audit } from "./audit";
import { notify, notifySafeguarding } from "./notify";
import { sendEmail } from "./integrations/email";
import { esc } from "./account";
import { createInvite } from "./guardian";
import { buildExport } from "./safety-user";
import { isMinor, ageOn } from "./domain/age";
import {
  actionLabel, actorLabel, auditCsv, auditWhere, AUDIT_PAGE, addMonth, canDeleteNow, dataPersonLabel, dataRequestStatus, diffSummary, fmtStamp, helpFromLabel, isSafeguardingLead, looksLikeSafeguarding, REPLY_MIN,
} from "./domain/admin-safety-1";

export type Res = { ok: true; [k: string]: unknown } | { ok: false; error: string };
const fail = (error: string): Res => ({ ok: false, error });
const OID = /^[a-f0-9]{24}$/i;
type Actor = { id: string; roles: Role[] };

/* ───────── A15 audit log ───────── */
export type AuditFilter = { actor?: string; object?: string; from?: string; to?: string; page?: number };
async function auditRows(f: AuditFilter, take: number, skip: number) {
  const ev = await db.auditEvent.findMany({ where: auditWhere(f) as never, orderBy: { createdAt: "desc" }, take, skip });
  const ids = Array.from(new Set(ev.map((e) => e.actorId).filter(Boolean))) as string[];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, roles: true } });
  return ev.map((e) => {
    const a = e.actorId ? users.find((u) => u.id === e.actorId) ?? null : null;
    return { id: e.id, actor: actorLabel(e.actorId ? a ?? { name: "Former member", roles: [] } : null), action: actionLabel(e.action), object: `${e.object}${e.objectId ? ` #${e.objectId.slice(-4)}` : ""}`, change: diffSummary(e.before, e.after), when: e.createdAt };
  });
}
export async function auditPage(f: AuditFilter) {
  const page = Math.max(1, f.page ?? 1);
  const rows = await auditRows(f, AUDIT_PAGE + 1, (page - 1) * AUDIT_PAGE);
  const team = await db.user.findMany({ where: { roles: { hasSome: ["ADMIN", "SAFEGUARDING_LEAD"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { rows: rows.slice(0, AUDIT_PAGE), more: rows.length > AUDIT_PAGE, page, team: team.map((t) => ({ id: t.id, name: t.name })) };
}
/** Exporting is itself recorded. Admin or safeguarding lead only (checked by the route). */
export async function auditExport(actor: Actor, f: AuditFilter) {
  const rows = await auditRows(f, 5000, 0);
  await audit(actor.id, "audit.export", "AuditEvent", undefined, null, { rows: rows.length, filter: { ...f, page: undefined } });
  return auditCsv(rows);
}

/* ───────── A28 data requests ───────── */
export async function dataRequests() {
  const [dels, exps, gdrs] = await Promise.all([db.deletionRequest.findMany({ orderBy: { requestedAt: "desc" }, take: 100 }), db.dataExport.findMany({ orderBy: { requestedAt: "desc" }, take: 100 }), db.guardianDataRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 })]);
  const statuses = await db.dataRequestStatus.findMany();
  const st = (k: string) => statuses.find((s) => s.key === k)?.state ?? null;
  const pids = gdrs.map((g) => g.participantId);
  const profs = await db.participantProfile.findMany({ where: { id: { in: pids } }, select: { id: true, userId: true } });
  const uids = Array.from(new Set([...dels.map((d) => d.userId), ...exps.map((e) => e.userId), ...profs.map((p) => p.userId)]));
  const users = await db.user.findMany({ where: { id: { in: uids } }, select: { id: true, name: true, dateOfBirth: true } });
  const person = (uid: string) => {
    const u = users.find((x) => x.id === uid); if (!u) return { label: "Unknown", minor: false };
    const minor = !!u.dateOfBirth && isMinor(u.dateOfBirth);
    return { label: dataPersonLabel({ name: u.name, minor, age: u.dateOfBirth ? ageOn(u.dateOfBirth) : null, anonymised: u.name === "Former member" }), minor };
  };
  type Row = { key: string; userId: string; person: string; request: "Export" | "Delete account"; received: Date; due: Date; status: ReturnType<typeof dataRequestStatus>; minor: boolean };
  const rows: Row[] = [
    ...dels.map((d) => { const p = person(d.userId); return { key: `del:${d.id}`, userId: d.userId, person: p.label, request: "Delete account" as const, received: d.requestedAt, due: addMonth(d.requestedAt), minor: p.minor, status: dataRequestStatus({ kind: "DELETE", minor: p.minor, cancelled: !!d.cancelledAt, completed: !!d.completedAt, teamState: st(`del:${d.id}`) }) }; }),
    ...exps.map((e) => { const p = person(e.userId); return { key: `exp:${e.id}`, userId: e.userId, person: p.label, request: "Export" as const, received: e.requestedAt, due: addMonth(e.requestedAt), minor: p.minor, status: dataRequestStatus({ kind: "EXPORT", minor: p.minor, exportExpired: e.expiresAt < new Date(), teamState: st(`exp:${e.id}`) }) }; }),
    ...gdrs.map((g) => { const uid = profs.find((p) => p.id === g.participantId)?.userId ?? ""; const p = person(uid); const done = st(`gdr:${g.id}`) === "DONE"; return { key: `gdr:${g.id}`, userId: uid, person: p.label, request: (g.kind === "EXPORT" ? "Export" : "Delete account") as "Export" | "Delete account", received: g.createdAt, due: addMonth(g.createdAt), minor: p.minor, status: done ? dataRequestStatus({ kind: "EXPORT", minor: true, teamState: "DONE" }) : g.kind === "EXPORT" ? { label: "Confirm identity", tone: "bad" as const, needsAction: true, done: false } : dataRequestStatus({ kind: "DELETE", minor: true, teamState: st(`gdr:${g.id}`) }) }; }),
  ].sort((a, b) => b.received.getTime() - a.received.getTime());
  return rows;
}

const parseKey = (key: string) => { const m = /^(del|exp|gdr):([a-f0-9]{24})$/i.exec(key); return m ? { kind: m[1]! as "del" | "exp" | "gdr", id: m[2]! } : null; };
export async function dataRequestDetail(key: string, roles: Role[]) {
  const p = parseKey(key); if (!p) return null;
  const rows = await dataRequests(); const row = rows.find((r) => r.key === key); if (!row) return null;
  const openIncidents = row.userId ? await db.incident.count({ where: { state: { not: "CLOSED" }, OR: [{ reporterId: row.userId }, { subjectId: row.userId }] } }) : 0;
  const teamState = (await db.dataRequestStatus.findUnique({ where: { key } }))?.state ?? null;
  const check = canDeleteNow({ roles, minor: row.minor, guardianConfirmed: teamState === "CONFIRMED", openIncidents, onHold: teamState === "HELD" });
  return { ...row, openIncidents, teamState, canDeleteNow: check.ok, deleteBlocked: check.ok ? null : check.error, isSg: isSafeguardingLead(roles) };
}

/** Team handling: CONFIRM (guardian or identity confirmed), HOLD (legal hold), RELEASE, DONE (export sent / complete), DELETE_NOW (safeguarding lead only). */
export async function handleDataRequest(actor: Actor, key: string, action: "CONFIRM" | "HOLD" | "RELEASE" | "DONE" | "DELETE_NOW", note?: string): Promise<Res> {
  const p = parseKey(key); if (!p) return fail("Request not found.");
  const d = await dataRequestDetail(key, actor.roles); if (!d) return fail("Request not found.");
  const setState = async (state: string) => { await db.dataRequestStatus.upsert({ where: { key }, update: { state, note: note?.trim() || null, updatedById: actor.id, updatedAt: new Date() }, create: { key, state, note: note?.trim() || null, updatedById: actor.id } }); };
  if (action === "CONFIRM") {
    if (d.status.done) return fail("This request is already complete.");
    await setState("CONFIRMED");
    if (p.kind === "gdr" && d.request === "Delete account" && d.userId) { // the guardian's deletion request becomes the same 30-day deletion as a self-service one
      const g = await db.guardianDataRequest.findUnique({ where: { id: p.id } });
      if (g) await db.deletionRequest.upsert({ where: { userId: d.userId }, update: { requestedAt: new Date(), purgeAfter: new Date(Date.now() + 30 * 86400_000), cancelledAt: null, completedAt: null }, create: { userId: d.userId, purgeAfter: new Date(Date.now() + 30 * 86400_000) } });
    }
    await audit(actor.id, "data.request.confirm", "DataRequest", key.slice(4), null, { key });
    return { ok: true };
  }
  if (action === "HOLD" || action === "RELEASE") {
    if (!isSafeguardingLead(actor.roles)) return fail("Only the safeguarding lead can place or lift a legal hold.");
    if (action === "HOLD" && (note ?? "").trim().length < 5) return fail("Add a short note explaining the hold.");
    await setState(action === "HOLD" ? "HELD" : "RELEASED");
    await audit(actor.id, action === "HOLD" ? "data.request.hold" : "data.request.release", "DataRequest", key.slice(4), null, { key, note });
    return { ok: true };
  }
  if (action === "DONE") {
    if (p.kind === "gdr" && d.request === "Export" && d.userId) { // send the young person's copy to the guardian only
      const g = await db.guardianDataRequest.findUnique({ where: { id: p.id } }); const gu = g ? await db.guardian.findUnique({ where: { id: g.guardianId } }) : null;
      const data = await buildExport(d.userId);
      if (gu && data) await notify(gu.userId, "data.export", "A copy of the data you asked for", "The file is attached.", { link: "/guardian", attachments: [{ filename: "village-circle-export.json", content: JSON.stringify(data, null, 2) }] });
    }
    await setState("DONE");
    await audit(actor.id, "data.request.complete", "DataRequest", key.slice(4), null, { key });
    return { ok: true };
  }
  const chk = canDeleteNow({ roles: actor.roles, minor: d.minor, guardianConfirmed: d.teamState === "CONFIRMED", openIncidents: d.openIncidents, onHold: d.teamState === "HELD" });
  if (!chk.ok) return fail(chk.error);
  if (d.request !== "Delete account" || !d.userId) return fail("Only deletion requests can be deleted.");
  const { anonymiseUser } = await import("./safety-user");
  const r = await anonymiseUser(d.userId); if (!r.ok) return fail(r.error);
  await setState("DONE");
  await audit(actor.id, "data.delete.now", "User", d.userId, null, { key });
  return { ok: true };
}

/* ───────── A29 help requests ───────── */
/** For the Contact the team form. Anything that sounds like a safeguarding concern skips this queue and goes to the safeguarding lead. */
export async function createHelpRequest(i: { fromUserId?: string; fromName?: string; fromRole: string; email?: string; about: string; message: string }): Promise<Res> {
  const text = `${i.about} ${i.message}`.trim(); if (text.length < 3) return fail("Tell us what you need.");
  const user = i.fromUserId ? await db.user.findUnique({ where: { id: i.fromUserId }, select: { dateOfBirth: true, name: true } }) : null;
  const minor = !!user?.dateOfBirth && isMinor(user.dateOfBirth);
  if (looksLikeSafeguarding(text) && i.fromUserId) {
    const inc = await db.incident.create({ data: { reporterId: i.fromUserId, category: "SAFEGUARDING", severity: "HIGH", description: i.message.slice(0, 2000), dueAt: new Date(Date.now() + 24 * 3600_000) } });
    await audit(i.fromUserId, "help.escalated", "Incident", inc.id);
    await notifySafeguarding("incident.new", "A concern was reported", "High priority. Respond within 24 hours.", `/admin/incidents/${inc.id}`);
    return { ok: true, escalated: true };
  }
  const r = await db.helpRequest.create({ data: { fromUserId: i.fromUserId, fromName: minor ? null : i.fromName ?? user?.name ?? null, fromRole: i.fromRole, minor, email: minor ? null : i.email?.trim().toLowerCase() || null, about: i.about.slice(0, 200), message: i.message.slice(0, 3000) } });
  return { ok: true, id: r.id };
}

export async function helpList(selected?: string) {
  const rows = await db.helpRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const uids = rows.filter((r) => r.minor && r.fromUserId).map((r) => r.fromUserId!);
  const us = await db.user.findMany({ where: { id: { in: uids } }, select: { id: true, dateOfBirth: true } });
  const list = rows.map((r) => ({ id: r.id, from: helpFromLabel(r, us.find((u) => u.id === r.fromUserId)?.dateOfBirth ? ageOn(us.find((u) => u.id === r.fromUserId)!.dateOfBirth!) : null), about: r.about, received: r.createdAt, status: r.status, role: r.fromRole, minor: r.minor }));
  const sel = (selected && OID.test(selected) ? rows.find((r) => r.id === selected) : null) ?? rows.find((r) => r.status !== "REPLIED") ?? null;
  const detail = sel ? { id: sel.id, from: list.find((l) => l.id === sel.id)!.from, about: sel.about, message: sel.message, status: sel.status, reply: sel.reply, canResend: sel.fromRole.toLowerCase() === "guardian" && /link|approv/i.test(sel.about) } : null;
  return { list, detail };
}

export async function replyToHelp(actor: Actor, id: string, reply: string): Promise<Res> {
  if (!OID.test(id)) return fail("Message not found.");
  const text = reply.trim(); if (text.length < REPLY_MIN) return fail("Write a reply before sending.");
  const r = await db.helpRequest.findUnique({ where: { id } }); if (!r) return fail("Message not found.");
  if (r.fromUserId) await notify(r.fromUserId, "help.reply", "A reply from The Village Circle team", text, { link: "/home" });
  else if (r.email) await sendEmail({ to: r.email, subject: "A reply from The Village Circle team", html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D1914"><p>${esc(text).replace(/\n/g, "<br>")}</p><p style="color:#6E655A;font-size:13px">The Village Circle</p></div>` }).catch(() => undefined);
  else return fail("There is no way to reach this person.");
  await db.helpRequest.update({ where: { id }, data: { status: "REPLIED", reply: text, repliedAt: new Date(), repliedById: actor.id } });
  await audit(actor.id, "help.reply", "HelpRequest", id, { status: r.status }, { status: "REPLIED" });
  return { ok: true };
}
export async function markWaiting(actor: Actor, id: string): Promise<Res> {
  if (!OID.test(id)) return fail("Message not found.");
  await db.helpRequest.update({ where: { id }, data: { status: "WAITING" } });
  await audit(actor.id, "help.waiting", "HelpRequest", id);
  return { ok: true };
}
/** Issues a fresh single-use approval link to the guardian the person named. The link goes to the guardian's email, never into the queue. */
export async function resendApproval(actor: Actor, id: string): Promise<Res> {
  if (!OID.test(id)) return fail("Message not found.");
  const r = await db.helpRequest.findUnique({ where: { id } }); if (!r?.email) return fail("There is no email on this message.");
  const inv = await db.guardianInvite.findFirst({ where: { guardianEmail: r.email, state: { notIn: ["AUTHORIZED", "DECLINED"] } }, orderBy: { createdAt: "desc" } });
  if (!inv) return fail("No open approval was found for that guardian.");
  const prof = await db.participantProfile.findUnique({ where: { id: inv.participantId } }); if (!prof) return fail("No open approval was found for that guardian.");
  try { await createInvite(prof.userId, { name: inv.guardianName, email: inv.guardianEmail, mobile: inv.guardianMobile, relationship: inv.relationship }); } catch { return fail("Could not send a new link. Try again in a minute."); }
  await audit(actor.id, "help.approval.resend", "GuardianInvite", inv.id);
  return { ok: true };
}
