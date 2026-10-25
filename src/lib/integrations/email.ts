import { Resend } from "resend";
import { env, isConfigured } from "./status";

export interface EmailMessage { to: string; subject: string; html: string; text?: string; attachments?: { filename: string; content: string }[] }

/** Resend. With no key set it logs instead of sending, so every flow works in development. */
export async function sendEmail(m: EmailMessage): Promise<{ id: string | null; simulated: boolean }> {
  if (!isConfigured("email")) { console.info(`[email:dev] to=${m.to} subject="${m.subject}"`); return { id: null, simulated: true }; }
  const r = await new Resend(env("RESEND_API_KEY")).emails.send({
    from: env("EMAIL_FROM"), to: m.to, subject: m.subject, html: m.html, text: m.text,
    attachments: m.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })),
  });
  if (r.error) throw new Error(`Resend: ${r.error.message}`);
  return { id: r.data?.id ?? null, simulated: false };
}
