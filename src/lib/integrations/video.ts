import { env, isConfigured } from "./status";

const API = "https://api.daily.co/v1";
const headers = () => ({ Authorization: `Bearer ${env("DAILY_API_KEY")}`, "Content-Type": "application/json" });

/** One private room per conversation. Minors' conversations are recorded by default (BR-07). */
export async function createRoom(opts: { name: string; startsAt: Date; durationMinutes: number; record: boolean }) {
  if (!isConfigured("video")) return { name: opts.name, url: `/call/${opts.name}?dev=1`, simulated: true };
  const exp = Math.floor(opts.startsAt.getTime() / 1000) + (opts.durationMinutes + 30) * 60;
  const nbf = Math.floor(opts.startsAt.getTime() / 1000) - 10 * 60;
  const res = await fetch(`${API}/rooms`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ name: opts.name, privacy: "private", properties: { exp, nbf, max_participants: 3, enable_recording: opts.record ? "cloud" : undefined, enable_chat: true, eject_at_room_exp: true } }),
  });
  if (!res.ok) throw new Error(`Daily room failed: ${res.status}`);
  const j = await res.json();
  return { name: j.name as string, url: j.url as string, simulated: false };
}

/** Short-lived, per-person join token. The guardian token can be view-only. */
export async function createMeetingToken(opts: { room: string; userName: string; isOwner?: boolean; ttlMinutes: number }) {
  if (!isConfigured("video")) return { token: "dev-token", simulated: true };
  const res = await fetch(`${API}/meeting-tokens`, {
    method: "POST", headers: headers(),
    body: JSON.stringify({ properties: { room_name: opts.room, user_name: opts.userName, is_owner: !!opts.isOwner, exp: Math.floor(Date.now() / 1000) + opts.ttlMinutes * 60 } }),
  });
  if (!res.ok) throw new Error(`Daily token failed: ${res.status}`);
  return { token: (await res.json()).token as string, simulated: false };
}

export async function deleteRoom(name: string) {
  if (!isConfigured("video")) return;
  await fetch(`${API}/rooms/${encodeURIComponent(name)}`, { method: "DELETE", headers: headers() });
}
