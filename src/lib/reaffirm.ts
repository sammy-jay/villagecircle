import { db } from "./db";
import { audit } from "./audit";
import { notify } from "./notify";
import { checkAttestation, ATTESTATION_VERSION } from "./domain/mentor-application";
import { reaffirmDue, reaffirmLapsed } from "./domain/safety-user";
import type { R } from "./asks";

/** The statement as the EX11 board words it. */
export const REAFFIRM_TEXT = "I confirm that I have never been charged with or convicted of any offence involving child endangerment, child abuse, neglect or exploitation, and that I do not appear on any child abuse register or sex offender registry in any jurisdiction. I understand that a false statement ends my participation immediately.";
export type HoldKind = "LAPSED" | "DISCLOSURE" | "REMOVAL";
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** When the mentor's safeguarding statement was last signed (application attestation or a later re-affirmation), and when the next is due. */
export async function reaffirmDates(userId: string) {
  const att = await db.attestation.findFirst({ where: { application: { applicantId: userId } }, orderBy: { signedAt: "desc" } });
  const re = await db.mentorReaffirmation.findFirst({ where: { userId }, orderBy: { signedAt: "desc" } });
  const last = [att?.signedAt, re?.signedAt].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  return { last, nextDueAt: re ? re.nextDueAt : att ? att.nextDueAt : last ? reaffirmDue(last) : null };
}

export async function reaffirmView(userId: string) {
  const m = await db.mentorProfile.findUnique({ where: { userId }, include: { user: true } }); if (!m) return null;
  const hold = await db.eligibilityHold.findUnique({ where: { userId } });
  const d = await reaffirmDates(userId);
  const active = hold && !hold.resolvedAt ? hold : null;
  const lapsed = !!d.nextDueAt && reaffirmLapsed(d.nextDueAt);
  return { name: m.user.name, kind: (active?.kind as HoldKind | undefined) ?? (lapsed ? ("LAPSED" as const) : null), paused: !!active, nextDueAt: d.nextDueAt, dueSoon: !!d.nextDueAt && d.nextDueAt.getTime() - Date.now() < 30 * 86400_000, canAffirm: !active || active.kind === "LAPSED" };
}

export async function reaffirm(userId: string, d: { affirmed: boolean; typedLegalName: string }, ip: string): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId }, include: { user: true } }); if (!m) return fail("Not allowed.");
  const hold = await db.eligibilityHold.findUnique({ where: { userId } });
  if (hold && !hold.resolvedAt && hold.kind !== "LAPSED") return fail("The team will be in touch with you directly.");
  const v = checkAttestation({ affirmed: d.affirmed, typedLegalName: d.typedLegalName, accountName: m.user.name, version: ATTESTATION_VERSION });
  if (!v.ok) return fail(v.reason === "NAME_MISMATCH" ? "Type your full legal name exactly as it is on your account." : "Tick the box and type your name to affirm.");
  const now = new Date();
  await db.mentorReaffirmation.create({ data: { userId, statementVersion: ATTESTATION_VERSION, typedLegalName: d.typedLegalName.trim(), ipAddress: ip, nextDueAt: reaffirmDue(now) } });
  await db.consentRecord.create({ data: { userId, kind: "SAFEGUARDING_ATTESTATION", version: `reaffirm-${now.toISOString().slice(0, 10)}`, granted: true, ipAddress: ip } });
  if (hold && !hold.resolvedAt) { await db.eligibilityHold.update({ where: { userId }, data: { resolvedAt: now } }); if (m.user.status === "PAUSED") await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } }); }
  await audit(userId, "mentor.safeguarding.reaffirmed", "User", userId);
  return { ok: true };
}

/** Pauses a mentor (re-affirmation lapsed, change in circumstances, or removal). Open conversations are kept; new Asks stop. */
export async function holdMentor(userId: string, kind: HoldKind, actorId: string | null = null) {
  await db.eligibilityHold.upsert({ where: { userId }, update: { kind, since: new Date(), resolvedAt: null }, create: { userId, kind } });
  await db.user.update({ where: { id: userId }, data: { status: "PAUSED" } });
  await audit(actorId, `mentor.hold.${kind.toLowerCase()}`, "User", userId);
}

/** Cron: lapsed re-affirmations pause the mentor; a reminder goes out 30 days before. Wire into the cron route (for example the "monthly" job). */
export async function sweepReaffirmations(now: Date = new Date()): Promise<{ paused: number; reminded: number }> {
  const mentors = await db.mentorProfile.findMany({ where: { verification: "APPROVED", user: { status: "ACTIVE" } }, select: { userId: true } });
  let paused = 0, reminded = 0;
  for (const m of mentors) {
    const { nextDueAt } = await reaffirmDates(m.userId); if (!nextDueAt) continue;
    if (reaffirmLapsed(nextDueAt, now)) {
      await holdMentor(m.userId, "LAPSED");
      await notify(m.userId, "mentor.reaffirm.lapsed", "Your mentoring is paused", "Your annual re-affirmation is due. It takes two minutes. Your open conversations are kept.", { link: "/mentor/reaffirm", dedupeKey: `reaffirm-lapsed-${m.userId}-${nextDueAt.toISOString().slice(0, 10)}` });
      paused++;
    } else if (nextDueAt.getTime() - now.getTime() <= 30 * 86400_000) {
      await notify(m.userId, "mentor.reaffirm.soon", "Your annual re-affirmation is coming up", "Please confirm your safeguarding statement before it lapses. It takes two minutes.", { link: "/mentor/reaffirm", dedupeKey: `reaffirm-soon-${m.userId}-${nextDueAt.toISOString().slice(0, 10)}` });
      reminded++;
    }
  }
  return { paused, reminded };
}

/** EX11 "Tell us now": a change in circumstances pauses new Asks at once and goes to the safeguarding lead in confidence. */
export async function discloseChange(userId: string, note: string): Promise<R> {
  const m = await db.mentorProfile.findUnique({ where: { userId } }); if (!m) return fail("Not allowed.");
  const text = note.trim(); if (text.length < 10) return fail("Tell us in a sentence or two. A person will follow up.");
  await holdMentor(userId, "DISCLOSURE", userId);
  await db.setting.upsert({ where: { key: `disclosure:${userId}` }, update: { value: { note: text.slice(0, 2000), at: new Date().toISOString() } }, create: { key: `disclosure:${userId}`, value: { note: text.slice(0, 2000), at: new Date().toISOString() } } });
  const { notifySafeguarding } = await import("./notify");
  await notifySafeguarding("mentor.disclosure", "A mentor disclosed a change in circumstances", "New Asks are paused. Please contact them directly.", "/admin/incidents").catch(() => {});
  return { ok: true };
}
