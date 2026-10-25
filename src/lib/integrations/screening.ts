import { env, isConfigured } from "./status";
import { createHmac, timingSafeEqual } from "crypto";

/** Screening provider is TBC in the BRD, so everything goes through this interface. Swap the adapter, not the app. */
export interface ScreeningProvider {
  start(candidate: { id: string; email: string; name: string }): Promise<{ ref: string; state: "PENDING" | "CLEAR" | "CONSIDER" }>;
  parseWebhook(rawBody: string, signature: string | null): { ref: string; state: "CLEAR" | "CONSIDER" | "PENDING" } | null;
}

const checkr: ScreeningProvider = {
  async start(c) {
    const auth = "Basic " + Buffer.from(env("CHECKR_API_KEY") + ":").toString("base64");
    const [first, ...rest] = c.name.split(" ");
    const cand = await fetch("https://api.checkr.com/v1/candidates", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ email: c.email, first_name: first, last_name: rest.join(" ") || "-", custom_id: c.id }) });
    if (!cand.ok) throw new Error(`Checkr candidate failed: ${cand.status}`);
    const cj = await cand.json();
    const inv = await fetch("https://api.checkr.com/v1/invitations", { method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ candidate_id: cj.id, package: "driver_pro" }) });
    if (!inv.ok) throw new Error(`Checkr invitation failed: ${inv.status}`);
    return { ref: cj.id as string, state: "PENDING" };
  },
  parseWebhook(raw, sig) {
    const secret = env("CHECKR_WEBHOOK_SECRET"); if (!secret || !sig) return null;
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(sig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const j = JSON.parse(raw); const r = j?.data?.object; if (!r) return null;
    return { ref: r.candidate_id ?? r.id, state: r.result === "clear" ? "CLEAR" : r.status === "complete" ? "CONSIDER" : "PENDING" };
  },
};

const simulated: ScreeningProvider = {
  async start(c) { console.info(`[screening:dev] started for ${c.email}`); return { ref: `dev-${c.id}`, state: "PENDING" }; },
  parseWebhook() { return null; },
};

export const screening = (): ScreeningProvider => (isConfigured("screening") ? checkr : simulated);
// A result of CONSIDER never auto-declines: a human decides (BR-03 is about the attestation, not the check).
