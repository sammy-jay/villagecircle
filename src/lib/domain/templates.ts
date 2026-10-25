import { detectContactDetails } from "./contact-detect";

/** NT-2: code-owned email and SMS templates. Admins edit the text, never the placeholders that are allowed (BR-10). */
export type TemplateChannel = "EMAIL" | "SMS";
export interface TemplateParts { subject?: string; preheader?: string; body: string; cta?: string; footer?: string }
export interface TemplateDef { key: string; channel: TemplateChannel; label: string; audience: string; vars: string[]; required: string[]; defaults: TemplateParts; sample: Record<string, string> }

const FOOT_SAFE = "You are receiving this because you are linked to a Village Circle account. Safeguarding messages can't be turned off.";
const SAMPLE = { guardian_first_name: "Ngozi", participant_first_name: "Amara", mentor_first_name: "Kwame", topic: "careers in medicine", minutes: "60", when: "Thursday 14 October, 6:00 pm", code: "482 916", connection_ref: "2045", guardian_sentence: "Your guardian will attend." };

export const TEMPLATES: TemplateDef[] = [
  { key: "email.guardian_authorize", channel: "EMAIL", label: "Guardian authorization request", audience: "Guardian", vars: ["guardian_first_name", "participant_first_name", "topic"], required: ["participant_first_name"], sample: SAMPLE,
    defaults: { subject: "{{participant_first_name}} needs your authorization to speak with a mentor", preheader: "It takes about two minutes. The link works once and expires in 14 days.",
      body: "Hello {{guardian_first_name}},\n\n{{participant_first_name}} would like to ask a professional in the community about {{topic}}. Because {{participant_first_name}} is under 18, we need you to authorize this and stay part of the process.\n\nYou will approve each mentor and each time before any contact happens.", cta: "Review and authorize", footer: FOOT_SAFE } },
  { key: "email.session_confirmed", channel: "EMAIL", label: "Conversation confirmed", audience: "Participant", vars: ["participant_first_name", "mentor_first_name", "when", "topic", "minutes", "guardian_sentence"], required: ["participant_first_name", "when"], sample: SAMPLE,
    defaults: { subject: "Confirmed: {{participant_first_name}} and {{mentor_first_name}}, {{when}}", preheader: "Calendar invite attached. Reminders go out 24 hours and 1 hour before.",
      body: "Hello {{participant_first_name}},\n\nYour conversation about {{topic}} is booked for {{minutes}} minutes. {{guardian_sentence}} The conversation is recorded, and you and {{mentor_first_name}} will be told first.\n\nYou can join from your dashboard when it is time. The link opens 10 minutes early.", cta: "Open my dashboard", footer: FOOT_SAFE } },
  { key: "email.one_month_checkin", channel: "EMAIL", label: "One month check-in", audience: "Participant", vars: ["participant_first_name", "topic"], required: ["participant_first_name"], sample: SAMPLE,
    defaults: { subject: "One month on: did anything change?", preheader: "One question. It takes less than a minute.",
      body: "Hello {{participant_first_name}},\n\nA month ago you spoke with a mentor about {{topic}}. Did anything change because of it? A line or two is plenty.\n\nYour answer helps the village know what is working.", cta: "Answer one question", footer: "You can mute these check-ins in your settings." } },
  { key: "sms.guardian_code", channel: "SMS", label: "Guardian code", audience: "The Village Circle", vars: ["participant_first_name", "code"], required: ["code"], sample: SAMPLE,
    defaults: { body: "Village Circle: your code is {{code}}. Enter it to authorize {{participant_first_name}}'s account. It expires in 10 minutes. We'll never ask you to share it." } },
  { key: "sms.guardian_approval", channel: "SMS", label: "Guardian approval needed", audience: "The Village Circle", vars: ["participant_first_name"], required: ["participant_first_name"], sample: SAMPLE,
    defaults: { body: "Village Circle: {{participant_first_name}}'s Ask needs your approval before a mentor can be confirmed. Review it in your email, or open thevillagecircle.org/guardian." } },
  { key: "sms.safeguarding_concern", channel: "SMS", label: "Safeguarding concern", audience: "The Village Circle, to the safeguarding lead", vars: ["connection_ref"], required: ["connection_ref"], sample: SAMPLE,
    defaults: { body: "Village Circle safeguarding: a concern was reported on connection #{{connection_ref}}. The connection is paused. Please open the incident now." } },
];
export const templateDef = (key: string) => TEMPLATES.find((t) => t.key === key);

export class TemplateError extends Error {}
const PLACEHOLDER = /\{\{\s*([a-z_]+)\s*\}\}/g;
const OWN_DOMAIN = /thevillagecircle\.org(?:\/[a-z/_-]*)?/gi;
const NO_SCAN = new Set(["code", "connection_ref", "minutes"]);

/** Placeholder values that are names are cut to a first name; anything that looks like contact details is refused. */
export function safeVar(name: string, value: string): string {
  let v = (value ?? "").toString().trim();
  if (name.endsWith("_first_name")) v = v.split(/\s+/)[0] ?? "";
  if (!NO_SCAN.has(name) && detectContactDetails(v).length) throw new TemplateError(`Value for ${name} contains contact details`);
  return v;
}
export function renderText(text: string, vars: Record<string, string>, allowed: string[]): string {
  return text.replace(PLACEHOLDER, (_m, n: string) => (allowed.includes(n) ? safeVar(n, vars[n] ?? "") : "")).replace(/[ \t]{2,}/g, " ").replace(/ +([.,])/g, "$1").trim();
}
export function validateParts(def: TemplateDef, parts: TemplateParts): string[] {
  const errs: string[] = [];
  const fields: [string, string | undefined][] = [["Subject", parts.subject], ["Preview line", parts.preheader], ["Message", parts.body], ["Button", parts.cta], ["Footer", parts.footer]];
  if (!parts.body?.trim()) errs.push("The message cannot be empty.");
  if (def.channel === "EMAIL" && !parts.subject?.trim()) errs.push("The subject cannot be empty.");
  if (def.channel === "SMS" && (parts.body?.length ?? 0) > 320) errs.push("A text message must be 320 characters or fewer.");
  for (const [label, t] of fields) {
    if (!t) continue;
    for (const m of t.matchAll(PLACEHOLDER)) if (!def.vars.includes(m[1]!)) errs.push(`${label}: {{${m[1]}}} is not available in this template.`);
    const bare = t.replace(PLACEHOLDER, "").replace(OWN_DOMAIN, "");
    if (/\{\{|\}\}/.test(t.replace(PLACEHOLDER, ""))) errs.push(`${label}: a placeholder is not closed.`);
    if (detectContactDetails(bare).length) errs.push(`${label}: templates cannot contain contact details.`);
  }
  const all = [parts.subject, parts.body].join(" ");
  for (const r of def.required) if (!all.includes(`{{${r}}}`)) errs.push(`The message must include {{${r}}}.`);
  return errs;
}
export function renderParts(def: TemplateDef, parts: TemplateParts, vars: Record<string, string>) {
  const r = (t?: string) => (t === undefined ? undefined : renderText(t, vars, def.vars));
  return { subject: r(parts.subject), preheader: r(parts.preheader), body: r(parts.body)!, cta: r(parts.cta), footer: r(parts.footer) };
}
