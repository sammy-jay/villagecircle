/** BR-10 + review step B: find contact details embedded in free text. Conservative: false positives are fine, misses are not. */
export interface ContactHit { kind: "email" | "phone" | "url" | "handle" | "social" | "messaging"; match: string }

const PATTERNS: [ContactHit["kind"], RegExp][] = [
  ["email", /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Z]{2,}/gi],
  ["phone", /(?:\+?\d[\s().-]*){9,}/g],
  ["url", /\b(?:https?:\/\/|www\.)\S+/gi],
  ["handle", /(?:^|\s)@[A-Z0-9_.]{3,}/gi],
  ["social", /\b(?:instagram|insta|ig|snapchat|snap|tiktok|facebook|fb|twitter|linkedin|telegram)\b\s*[:\-]?\s*@?[A-Z0-9_.]{3,}/gi],
  ["messaging", /\b(?:whatsapp|wa\.me|signal|discord|imessage|text me|call me|dm me|reach me|my number)\b/gi],
];

const DIGIT_WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };

function normalizeSpelledDigits(t: string): string {
  return t.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, (w) => DIGIT_WORDS[w.toLowerCase()]);
}

export function detectContactDetails(text: string): ContactHit[] {
  const hits: ContactHit[] = [];
  const variants = [text, normalizeSpelledDigits(text)];
  for (const v of variants) {
    for (const [kind, re] of PATTERNS) {
      for (const m of v.matchAll(new RegExp(re.source, re.flags))) {
        const match = m[0].trim();
        if (kind === "phone" && match.replace(/\D/g, "").length < 9) continue;
        if (!hits.some((h) => h.kind === kind && h.match === match)) hits.push({ kind, match });
      }
    }
  }
  return hits;
}

export const hasContactDetails = (t: string) => detectContactDetails(t).length > 0;
