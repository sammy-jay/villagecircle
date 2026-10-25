/** Pure rules for the scheduled jobs, so the timing is testable without a database. */

/** Which call reminder is due now: "24h" inside the last day, "1h" inside the last hour, or none. The hourly job sends each once (dedupe key). */
export function reminderDue(start: Date, now: Date = new Date()): "24h" | "1h" | null {
  const mins = (start.getTime() - now.getTime()) / 60_000;
  if (mins <= 0) return null;
  if (mins <= 60) return "1h";
  if (mins <= 24 * 60) return "24h";
  return null;
}

/** An Ask is close to its service window when it is due within `hours` (default 4) and not yet past it. */
export const windowSoon = (due: Date | null, now: Date = new Date(), hours = 4) => !!due && due.getTime() > now.getTime() && due.getTime() - now.getTime() <= hours * 3600_000;

/** Cron calls carry `Authorization: Bearer <CRON_SECRET>`. Without a secret configured, only development may run them. */
export function cronAllowed(authHeader: string | null, secret: string | undefined, production: boolean) {
  if (!secret) return !production;
  return authHeader === `Bearer ${secret}`;
}
