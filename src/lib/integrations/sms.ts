import twilio from "twilio";
import { env, isConfigured } from "./status";

const client = () => twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN"));

export async function sendSms(to: string, body: string) {
  if (process.env.NODE_ENV !== "production") console.log("sendSms", { to, body }); // dev only: codes must not reach production logs
  if (!isConfigured("sms") || !env("TWILIO_FROM_NUMBER")) { console.info(`[sms:dev] to=${to} body="${body}"`); return { simulated: true }; }
  await client().messages.create({ to, from: env("TWILIO_FROM_NUMBER"), body });
  return { simulated: false };
}

/** Twilio Verify — code generation, delivery, expiry and rate limits are handled by Twilio. */
export async function startPhoneVerification(to: string) {
  if (!isConfigured("sms")) { console.info(`[verify:dev] code for ${to} is 123456`); return { simulated: true }; }
  await client().verify.v2.services(env("TWILIO_VERIFY_SERVICE_SID")).verifications.create({ to, channel: "sms" });
  return { simulated: false };
}
export async function checkPhoneVerification(to: string, code: string): Promise<boolean> {
  if (!isConfigured("sms")) return process.env.NODE_ENV !== "production" && code === "123456";
  const r = await client().verify.v2.services(env("TWILIO_VERIFY_SERVICE_SID")).verificationChecks.create({ to, code });
  return r.status === "approved";
}
