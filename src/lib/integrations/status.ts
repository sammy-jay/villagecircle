export const env = (k: string) => (process.env[k] ?? "").trim();
const has = (...keys: string[]) => keys.every((k) => env(k));

export interface Integration { id: string; name: string; configured: boolean; missing: string[]; note?: string }

const REQUIRED: Record<string, { name: string; keys: string[]; note?: string }> = {
  database: { name: "MongoDB (Prisma)", keys: ["DATABASE_URL"] },
  auth: { name: "Auth.js", keys: ["NEXTAUTH_SECRET", "NEXTAUTH_URL"] },
  encryption: { name: "Field encryption (MFA secrets)", keys: ["FIELD_ENCRYPTION_KEY"] },
  google: { name: "Google sign-in", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  email: { name: "Resend (email)", keys: ["RESEND_API_KEY", "EMAIL_FROM"] },
  sms: { name: "Twilio (SMS + verify)", keys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_VERIFY_SERVICE_SID"] },
  video: { name: "Daily (video + recording)", keys: ["DAILY_API_KEY", "DAILY_DOMAIN"] },
  storage: { name: "S3-compatible storage", keys: ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] },
  screening: { name: "Background screening", keys: ["CHECKR_API_KEY"], note: "Provider TBC in the BRD; Checkr is the default adapter." },
  analytics: { name: "PostHog", keys: ["NEXT_PUBLIC_POSTHOG_KEY"] },
  cron: { name: "Cron secret", keys: ["CRON_SECRET"] },
};

export function integrationStatus(): Integration[] {
  return Object.entries(REQUIRED).map(([id, r]) => ({ id, name: r.name, configured: has(...r.keys), missing: r.keys.filter((k) => !env(k)), note: r.note }));
}
export const isConfigured = (id: keyof typeof REQUIRED | string) => integrationStatus().find((i) => i.id === id)?.configured ?? false;
