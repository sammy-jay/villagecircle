import { db } from "./db";
import { notify } from "./notify";

/** In-app notice to the team. Bodies carry topics and counts only, never names or contact details. */
export async function notifyAdmins(event: string, title: string, body: string, link: string) {
  const admins = await db.user.findMany({ where: { roles: { has: "ADMIN" }, status: "ACTIVE" }, select: { id: true } });
  for (const a of admins) await notify(a.id, event, title, body, { link, email: false });
}
