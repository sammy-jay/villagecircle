/** Search matching shared by every search box: every word must appear somewhere, ignoring case and accents. */
const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const searchWords = (q: string) => fold(q).split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, "")).filter((w) => w.length > 1);

export function matchesAll(text: string, q: string): boolean {
  const words = searchWords(q);
  if (!words.length) return false;
  const hay = fold(text);
  return words.every((w) => hay.includes(w));
}
