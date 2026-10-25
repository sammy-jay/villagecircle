import { db } from "./db";
import { audit } from "./audit";
import { TEMPLATES, templateDef, renderParts, validateParts, type TemplateParts } from "./domain/templates";
export * from "./domain/templates";

const skey = (key: string) => `template:${key}`;
const clean = (p: Partial<TemplateParts>, fallback: TemplateParts): TemplateParts => ({ subject: typeof p.subject === "string" ? p.subject : fallback.subject, preheader: typeof p.preheader === "string" ? p.preheader : fallback.preheader, body: typeof p.body === "string" ? p.body : fallback.body, cta: typeof p.cta === "string" ? p.cta : fallback.cta, footer: typeof p.footer === "string" ? p.footer : fallback.footer });

/** Stored text if an admin edited it and it is still valid, otherwise the code default. */
export async function getTemplate(key: string): Promise<{ parts: TemplateParts; edited: boolean } | null> {
  const def = templateDef(key); if (!def) return null;
  const s = await db.setting.findUnique({ where: { key: skey(key) } });
  if (!s || typeof s.value !== "object" || !s.value) return { parts: def.defaults, edited: false };
  const parts = clean(s.value as Partial<TemplateParts>, def.defaults);
  return validateParts(def, parts).length ? { parts: def.defaults, edited: false } : { parts, edited: true };
}
export async function renderTemplate(key: string, vars: Record<string, string>) {
  const def = templateDef(key); if (!def) throw new Error(`Unknown template ${key}`);
  const t = await getTemplate(key);
  return { channel: def.channel, ...renderParts(def, t!.parts, vars) };
}
export async function saveTemplate(key: string, parts: TemplateParts, actorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const def = templateDef(key); if (!def) return { ok: false, error: "Template not found." };
  const next = clean(parts, def.defaults); const errs = validateParts(def, next);
  if (errs.length) return { ok: false, error: errs[0]! };
  const before = (await getTemplate(key))!.parts;
  await db.setting.upsert({ where: { key: skey(key) }, update: { value: next as never }, create: { key: skey(key), value: next as never } });
  await audit(actorId, "template.save", "Template", key, before, next);
  return { ok: true };
}
export async function resetTemplate(key: string, actorId: string) {
  if (!templateDef(key)) return { ok: false as const, error: "Template not found." };
  await db.setting.deleteMany({ where: { key: skey(key) } }); await audit(actorId, "template.reset", "Template", key); return { ok: true as const };
}
export { TEMPLATES };
