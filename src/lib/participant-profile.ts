import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { isMinor } from "./domain/age";
import { detectContactDetails } from "./domain/contact-detect";
import type { R } from "./asks";

/** N07: which profile parts a mentor may see. The first name is always shown; last name, school, contact details and background never are. */
export const SHOW_KEYS = ["ageBand", "stage", "interests", "goal", "state"] as const;
export type ShowKey = (typeof SHOW_KEYS)[number];
const showKey = (userId: string) => `profile-show:${userId}`;

export async function profileView(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } });
  if (!u?.participant) return null;
  const s = await db.setting.findUnique({ where: { key: showKey(userId) } });
  const v = (s?.value ?? {}) as Partial<Record<ShowKey, boolean>>;
  const show = Object.fromEntries(SHOW_KEYS.map((k) => [k, v[k] !== false])) as Record<ShowKey, boolean>;
  const goal = u.participant.goalsText;
  return {
    first: u.name.split(" ")[0] ?? "", band: u.dateOfBirth && isMinor(u.dateOfBirth) ? "15 to 17" : "18 and over", cohort: u.participant.cohort, region: u.region, town: u.town,
    interests: u.participant.interests, goal: goal[0] ?? "", goalMore: goal[1] ?? "", background: u.participant.communityBackground ?? "", languages: u.languages,
    show, updatedAt: u.participant.updatedAt,
  };
}

const input = z.object({
  cohort: z.enum(["HIGH_SCHOOL", "COLLEGE", "GRADUATE", "EARLY_CAREER"]).nullable(),
  region: z.string().max(60).nullable(),
  interests: z.array(z.string().max(60)).max(8),
  goal: z.string().max(120), goalMore: z.string().max(300),
  background: z.string().max(300),
  show: z.record(z.enum(SHOW_KEYS), z.boolean()),
});

/** Saves the profile and the visibility switches. Free text is refused if it holds contact details. */
export async function saveProfile(userId: string, raw: unknown): Promise<R> {
  const p = input.safeParse(raw); if (!p.success) return { ok: false, error: "Check the form and try again." };
  const d = p.data;
  if (detectContactDetails(`${d.goal} ${d.goalMore} ${d.background}`).length) return { ok: false, error: "Please take out phone numbers, emails or handles." };
  const u = await db.user.findUnique({ where: { id: userId }, include: { participant: true } }); if (!u?.participant) return { ok: false, error: "Not available." };
  await db.participantProfile.update({ where: { id: u.participant.id }, data: { cohort: d.cohort, interests: d.interests, goalsText: [d.goal, d.goalMore].filter(Boolean), communityBackground: d.background || null } });
  await db.user.update({ where: { id: userId }, data: { region: d.region } });
  await db.setting.upsert({ where: { key: showKey(userId) }, update: { value: d.show }, create: { key: showKey(userId), value: d.show } });
  await audit(userId, "profile.updated", "ParticipantProfile", u.participant.id);
  return { ok: true };
}
