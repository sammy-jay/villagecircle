import { db } from "./db";
import { sendEmail } from "./integrations/email";
import { esc } from "./account";

const APP = () => process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
export const appUrl = (path: string) => `${APP()}${path}`;

/** Optional messages a person can mute (NT-1 "What you can mute"). Everything else is always on. */
const MUTABLE: Record<string, string> = { "resource.new": "resources", "event.new": "events", "review.monthly": "review" };

/** In-app notification, plus an email. Bodies must never carry the other party's contact details or full names (BR-10). */
export async function notify(userId: string, event: string, title: string, body: string, o: { email?: boolean; link?: string; dedupeKey?: string; attachments?: { filename: string; content: string }[] } = {}) {
  try {
    await db.notification.create({ data: { userId, event, channel: "IN_APP", title, body, link: o.link?.startsWith("/") && !o.link.startsWith("//") ? o.link : null, sentAt: new Date(), dedupeKey: o.dedupeKey } });
  } catch { return; } // duplicate dedupeKey: already sent
  if (o.email === false) return;
  const mutable = MUTABLE[event];
  if (mutable) { const pref = await db.setting.findUnique({ where: { key: `notify-prefs:${userId}` } }); if ((pref?.value as Record<string, string> | null)?.[mutable] === "OFF") return; }
  const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) return;
  const btn = o.link ? `<p><a href="${appUrl(o.link)}" style="background:#1F4D36;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Open The Village Circle</a></p>` : "";
  await sendEmail({ to: u.email, subject: title, html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1D1914"><h2 style="font-family:Georgia,serif">${esc(title)}</h2><p>${esc(body)}</p>${btn}</div>`, attachments: o.attachments }).catch(() => undefined);
}

/** Everyone who can act on safeguarding. */
export async function safeguardingLeads() { return db.user.findMany({ where: { roles: { has: "SAFEGUARDING_LEAD" } }, select: { id: true } }); }
export async function notifySafeguarding(event: string, title: string, body: string, link = "/admin") {
  for (const u of await safeguardingLeads()) await notify(u.id, event, title, body, { link });
}
