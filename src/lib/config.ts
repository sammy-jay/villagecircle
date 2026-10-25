import { db } from "./db";
import { audit } from "./audit";
import { DEFAULT_CONFIG, mergeConfig, validateConfig, type AppConfig } from "./domain/admin-ops";
export { DEFAULT_CONFIG, type AppConfig } from "./domain/admin-ops";

const KEY = "config:app";

/** Stored configuration over the code defaults. A malformed stored value falls back to the defaults. */
export async function getConfig(): Promise<AppConfig> {
  try { const s = await db.setting.findUnique({ where: { key: KEY } }); return s ? mergeConfig(s.value) : DEFAULT_CONFIG; } catch { return DEFAULT_CONFIG; }
}

/** Saves weights and windows. Takes effect for new Asks only. Every change is audited with before and after. */
export async function saveConfig(actorId: string, next: AppConfig): Promise<{ ok: true } | { ok: false; error: string }> {
  const errs = validateConfig(next); if (errs.length) return { ok: false, error: errs[0]! };
  const before = await getConfig();
  await db.setting.upsert({ where: { key: KEY }, update: { value: next as never }, create: { key: KEY, value: next as never } });
  await audit(actorId, "config.save", "Configuration", "app", before, next);
  return { ok: true };
}
