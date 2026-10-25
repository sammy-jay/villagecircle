/** Cookie and privacy choice (HP5). "needed" = only what keeps the site working; "analytics" = also anonymous counts. */
export type Consent = "needed" | "analytics";
export const CONSENT_KEY = "vc-consent";
export const CONSENT_EVENT = "vc-consent-change";
export const OPEN_EVENT = "vc-cookie-open";
export const parseConsent = (v: unknown): Consent | null => (v === "needed" || v === "analytics" ? v : null);
export function readConsent(): Consent | null { try { return parseConsent(localStorage.getItem(CONSENT_KEY)); } catch { return null; } }
export function writeConsent(c: Consent) {
  try { localStorage.setItem(CONSENT_KEY, c); } catch { /* storage may be blocked */ }
  try { document.cookie = `${CONSENT_KEY}=${c}; path=/; max-age=${180 * 86400}; samesite=lax`; } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
}
/** Analytics may run only with an explicit "analytics" choice. No choice means no analytics. */
export const analyticsAllowed = (c: Consent | null) => c === "analytics";
