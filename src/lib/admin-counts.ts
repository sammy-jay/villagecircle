import { db } from "./db";
import { openAskCount } from "./review";
/** Gold count badges on the team console nav (A1, A7). */
export async function adminCounts() {
  const [mentors, guardians, asks] = await Promise.all([
    db.application.count({ where: { type: "MENTOR", state: { in: ["SUBMITTED", "IN_REVIEW", "APPEALED"] } } }),
    db.application.count({ where: { type: "GUARDIAN", state: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    openAskCount(),
  ]);
  return { mentors, guardians, asks };
}
