/** Where a mentor is in joining: apply, wait for the team, finish orientation, or mentor. */
export type MentorGate = "APPLY" | "STATUS" | "ORIENTATION" | "ACTIVE";

const HOME: Record<MentorGate, string> = { APPLY: "/mentor/apply", STATUS: "/mentor/application", ORIENTATION: "/mentor/orientation", ACTIVE: "/mentor" };
export const mentorHome = (g: MentorGate) => HOME[g];

export function gateFor(app: { state: string } | null, m: { verification: string; codeOfConductAt: Date | null; orientationDoneAt: Date | null } | null): MentorGate {
  if (!app || app.state === "DRAFT") return m?.verification === "APPROVED" ? (m.codeOfConductAt && m.orientationDoneAt ? "ACTIVE" : "ORIENTATION") : "APPLY";
  if (app.state !== "APPROVED" || m?.verification !== "APPROVED") return "STATUS";
  return m.codeOfConductAt && m.orientationDoneAt ? "ACTIVE" : "ORIENTATION";
}

