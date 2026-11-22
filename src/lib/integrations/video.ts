import { env, isConfigured } from "./status";

const API = "https://api.daily.co/v1";
const headers = () => ({ Authorization: `Bearer ${env("DAILY_API_KEY")}`, "Content-Type": "application/json" });

/**
 * The Daily subdomain, however it was typed: "villagecircle", "villagecircle.daily.co" and
 * "https://villagecircle.daily.co/" all give "villagecircle".
 */
export function dailyDomain(): string {
  return env("DAILY_DOMAIN").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").replace(/\.daily\.co$/i, "").trim();
}
export const roomUrl = (name: string) => `https://${dailyDomain()}.daily.co/${encodeURIComponent(name)}`;

async function dailyError(what: string, res: Response): Promise<Error> {
  let info = "";
  try { const j = (await res.json()) as { error?: string; info?: string }; info = [j.error, j.info].filter(Boolean).join(": "); } catch { /* no body */ }
  return new Error(`Daily ${what} failed (${res.status})${info ? `: ${info}` : ""}`);
}

/**
 * One private room per conversation, open from 10 minutes before the start until 30 minutes after the end.
 * Minors' conversations are recorded (BR-07). Safe to call again: a room that already exists is updated to the
 * new time instead of failing, so rebooking works and calls booked before video was set up get their room on join.
 */
export async function ensureRoom(opts: { name: string; startsAt: Date; durationMinutes: number; record: boolean }) {
  if (!isConfigured("video")) return { name: opts.name, url: `/call/${opts.name}?dev=1`, simulated: true };
  const startS = Math.floor(opts.startsAt.getTime() / 1000);
  // Our own call screen draws everything, so Daily's extras are off. Chat especially: it is a channel the platform does
  // not see, where contact details could be swapped (BR-10). Messages stay in the Ask thread.
  const properties = {
    exp: startS + (opts.durationMinutes + 30) * 60, nbf: startS - 10 * 60, max_participants: 3, eject_at_room_exp: true,
    enable_recording: opts.record ? "cloud" : undefined, enable_chat: false, enable_people_ui: false, enable_prejoin_ui: false, enable_emoji_reactions: false, enable_hand_raising: false, enable_screenshare: true,
  };
  const update = await fetch(`${API}/rooms/${encodeURIComponent(opts.name)}`, { method: "POST", headers: headers(), body: JSON.stringify({ privacy: "private", properties }) });
  if (update.ok) return { name: opts.name, url: roomUrl(opts.name), simulated: false };
  if (update.status !== 404) throw await dailyError("room update", update);
  const res = await fetch(`${API}/rooms`, { method: "POST", headers: headers(), body: JSON.stringify({ name: opts.name, privacy: "private", properties }) });
  if (!res.ok) throw await dailyError("room", res);
  const j = (await res.json()) as { name: string; url: string };
  return { name: j.name, url: j.url, simulated: false };
}
/** Kept for existing callers: booking a call makes sure its room exists. */
export const createRoom = ensureRoom;

/**
 * Short-lived, per-person join token. `role` rides along as the Daily user id, so the call screen can tell the mentor,
 * the participant and an observing guardian apart. A guardian starts with camera and mic off.
 * `record`: the first person in starts the cloud recording (BR-07, under 18s); the room only allows it, this starts it.
 */
export async function createMeetingToken(opts: { room: string; userName: string; isOwner?: boolean; ttlMinutes: number; role?: "PARTICIPANT" | "MENTOR" | "GUARDIAN"; record?: boolean }) {
  if (!isConfigured("video")) return { token: "dev-token", simulated: true };
  const observer = opts.role === "GUARDIAN";
  const res = await fetch(`${API}/meeting-tokens`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ properties: {
      room_name: opts.room, user_name: opts.userName, is_owner: !!opts.isOwner, exp: Math.floor(Date.now() / 1000) + opts.ttlMinutes * 60,
      ...(opts.role ? { user_id: opts.role } : {}), ...(observer ? { start_video_off: true, start_audio_off: true } : {}), ...(opts.record ? { start_cloud_recording: true } : {}),
    } }),
  });
  if (!res.ok) throw await dailyError("token", res);
  return { token: (await res.json()).token as string, simulated: false };
}

export async function deleteRoom(name: string) {
  if (!isConfigured("video")) return;
  await fetch(`${API}/rooms/${encodeURIComponent(name)}`, { method: "DELETE", headers: headers() });
}
