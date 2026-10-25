/** Maintenance mode (HP7). Pure so the edge middleware and the tests share one decision. */
export type MaintenanceDecision = "pass" | "page" | "api503";
const ALLOWED_API = ["/api/health", "/api/cron", "/api/webhooks"];
const PAGE_OK = ["/maintenance", "/crisis", "/help/report"];

export function maintenanceOn(v: string | undefined): boolean { return ["1", "true", "on", "yes"].includes((v ?? "").trim().toLowerCase()); }

export function maintenanceDecision(path: string, on: boolean): MaintenanceDecision {
  if (!on) return "pass";
  if (path.startsWith("/api/")) return ALLOWED_API.some((x) => path === x || path.startsWith(x + "/")) ? "pass" : "api503";
  if (PAGE_OK.some((x) => path === x || path.startsWith(x + "/"))) return "pass";
  return "page";
}

export function maintenanceCopy(env: Record<string, string | undefined> = process.env) {
  return {
    window: env.MAINTENANCE_WINDOW?.trim() || "Saturday 17 October, 2:00 to 4:00 am",
    backBy: env.MAINTENANCE_BACK_BY?.trim() || "4:00 am, Saturday 17 October",
    length: env.MAINTENANCE_LENGTH?.trim() || "about two hours",
  };
}
