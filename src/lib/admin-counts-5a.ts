import { db } from "./db";
/** Nav counts for the Step 5 group 1 screens. */
export async function safetyCounts() {
  const [incidents, help] = await Promise.all([
    db.incident.count({ where: { state: { in: ["REPORTED", "TRIAGED", "INVESTIGATING", "ACTIONED"] } } }),
    db.helpRequest.count({ where: { status: "NEW" } }),
  ]);
  return { incidents, help };
}
