import { db } from "./db";
import { expertiseLabel } from "./domain/expertise";
import { shortName } from "./domain/views";

/** A2 / A26 "Choose a mentor": approved and oriented mentors, for an override or a personal request. Eligibility is checked again on save. */
export async function mentorOptions(minorsOnly = false) {
  const ms = await db.mentorProfile.findMany({ where: { verification: "APPROVED", codeOfConductAt: { not: null }, orientationDoneAt: { not: null }, ...(minorsOnly ? { clearedForMinors: true } : {}), user: { status: "ACTIVE" } }, include: { user: { select: { name: true } } }, take: 300 });
  return ms.map((m) => ({ value: m.id, label: `${shortName(m.user.name)}, ${expertiseLabel(m.primaryExpertise)}` })).sort((a, b) => a.label.localeCompare(b.label));
}

/** A26 history: the Ask's state changes and hand-match steps, newest last. */
export async function askHistory(askId: string) {
  const h = await db.askStateChange.findMany({ where: { askId }, orderBy: { createdAt: "asc" }, take: 50 });
  return h.map((x) => ({ id: x.id, text: x.note ?? `${x.from ? `${x.from.toLowerCase().replace(/_/g, " ")} to ` : ""}${x.to.toLowerCase().replace(/_/g, " ")}`, at: x.createdAt, reason: x.reason }));
}
