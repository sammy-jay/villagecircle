/** Camera and microphone picked on the before-the-call screen, used when joining (kept in this browser only). */
export const DEVICES_KEY = "vc-devices";
export function saveDevices(d: { cam?: string; mic?: string }) {
  try { const cur = JSON.parse(localStorage.getItem(DEVICES_KEY) ?? "{}"); localStorage.setItem(DEVICES_KEY, JSON.stringify({ ...cur, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v)) })); } catch { /* not saved */ }
}
export function savedDevices(): { cam?: string; mic?: string } {
  try { return JSON.parse(localStorage.getItem(DEVICES_KEY) ?? "{}"); } catch { return {}; }
}
