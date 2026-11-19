/**
 * Formatted text for library resources: a small, safe subset of Markdown, stored as plain text in Resource.body.
 *
 *   ## Section heading        ### Smaller heading
 *   **bold**   *italic*   [link text](https://example.gov/page)
 *   - bullet                  1. numbered step
 *   - [ ] checklist item      - [x] ticked item
 *   > A tip, shown in a callout
 *
 * Readers never see these marks: every page renders the parsed blocks. Nothing is ever inserted as HTML, so a body
 * cannot carry markup or scripts. Plain bodies written before formatting existed read as paragraphs, unchanged.
 * Pure: no database, no React. Shared by the editor preview, every reader page and the moderation screen.
 */
import { detectContactDetails, type ContactHit } from "./contact-detect";

export type Inline =
  | { t: "text"; v: string }
  | { t: "bold"; c: Inline[] }
  | { t: "italic"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] };

export type Block =
  | { t: "h2"; c: Inline[]; text: string }
  | { t: "h3"; c: Inline[] }
  | { t: "p"; lines: Inline[][] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][]; start: number }
  | { t: "check"; items: { done: boolean; c: Inline[] }[] }
  | { t: "tip"; lines: Inline[][] };

// ───────── Links ─────────

/**
 * Links are the one exception to "no contact details" (BR-10), and only to trusted places: government and education
 * sites, and the video and document hosts a mentor would share a recording from. Anything else (a personal site,
 * a social profile, a link shortener) is treated as contact details, as before.
 */
export const LINK_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com", "docs.google.com", "drive.google.com", "khanacademy.org", "collegeboard.org", "commonapp.org"] as const;
export const LINK_SUFFIXES = [".gov", ".edu", ".mil"] as const;
export const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com", "drive.google.com"] as const;
export const LINK_RULE = "Links can go to .gov and .edu sites, YouTube, Vimeo, Loom, Google Docs or Drive, Khan Academy, College Board and the Common App.";

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch { return null; }
}
const matchesHost = (host: string, list: readonly string[]) => list.some((h) => host === h || host.endsWith(`.${h}`));
/** A link a resource may carry: https or http, to a trusted host. */
export function isAllowedLink(url: string): boolean {
  const h = hostOf(url.trim()); if (!h) return false;
  return matchesHost(h, LINK_HOSTS) || LINK_SUFFIXES.some((s) => h.endsWith(s));
}
export function isVideoLink(url: string): boolean {
  const h = hostOf(url.trim()); return !!h && matchesHost(h, VIDEO_HOSTS);
}

const MD_LINK = /\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/g;
const BARE_URL = /\b(?:https?:\/\/|www\.)[^\s<>()[\]]+/gi;

/** Every link in a body: written as [text](url) or pasted bare. */
export function linksIn(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(MD_LINK)) out.push(m[2]!);
  for (const m of md.replace(MD_LINK, " ").matchAll(BARE_URL)) out.push(m[0].replace(/[.,;:!?]+$/, ""));
  return out;
}
/** Links a resource may not carry. */
export const disallowedLinks = (md: string) => linksIn(md).filter((u) => !isAllowedLink(u.startsWith("www.") ? `https://${u}` : u));

/** Contact details in a resource, with its allowed links taken out first (they are checked by `disallowedLinks`). */
export function resourceContactHits(md: string): ContactHit[] {
  const withoutLinks = md
    .replace(MD_LINK, (_, text: string, url: string) => (isAllowedLink(url) ? ` ${text} ` : ` ${text} ${url} `))
    .replace(BARE_URL, (u) => (isAllowedLink(u.startsWith("www.") ? `https://${u}` : u.replace(/[.,;:!?]+$/, "")) ? " " : u));
  return detectContactDetails(withoutLinks);
}

// ───────── Inline ─────────

/** **bold**, *italic* or _italic_, [text](url). Unclosed marks stay as written. A link to a host that is not allowed shows as its text. */
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => { if (buf) { out.push({ t: "text", v: buf }); buf = ""; } };
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (ch === "\\" && i + 1 < s.length && "*_[]\\".includes(s[i + 1]!)) { buf += s[i + 1]; i += 2; continue; }
    if (ch === "[") {
      const m = /^\[([^\]\n]{1,200})\]\(([^)\s]{1,500})\)/.exec(s.slice(i));
      if (m) {
        flush();
        const inner = parseInline(m[1]!);
        out.push(isAllowedLink(m[2]!) ? { t: "link", href: m[2]!, c: inner } : { t: "text", v: m[1]! });
        i += m[0].length; continue;
      }
    }
    if (ch === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > i + 2) { flush(); out.push({ t: "bold", c: parseInline(s.slice(i + 2, end)) }); i = end + 2; continue; }
    }
    if ((ch === "*" || ch === "_") && s[i + 1] !== ch && s[i + 1] !== " " && s[i + 1] !== undefined) {
      // _ only opens at a word start, so snake_case words stay as they are.
      const opens = ch === "*" || i === 0 || /[\s(]/.test(s[i - 1]!);
      const end = opens ? findClose(s, ch, i + 1) : -1;
      if (end > i + 1) { flush(); out.push({ t: "italic", c: parseInline(s.slice(i + 1, end)) }); i = end + 1; continue; }
    }
    buf += ch; i++;
  }
  flush();
  return out;
}
function findClose(s: string, ch: string, from: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === ch && s[j - 1] !== " " && s[j + 1] !== ch && (ch === "*" || j + 1 >= s.length || /[\s.,;:!?)]/.test(s[j + 1]!))) return j;
  }
  return -1;
}
export function inlineText(c: Inline[]): string {
  return c.map((x) => (x.t === "text" ? x.v : inlineText(x.c))).join("");
}

// ───────── Blocks ─────────

const RX = {
  h2: /^##\s+(.+)$/, h3: /^###\s+(.+)$/,
  check: /^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/, ul: /^\s*[-*•]\s+(.*)$/, ol: /^\s*(\d{1,3})[.)]\s+(.*)$/, tip: /^>\s?(.*)$/,
};

export function parseRich(md: string | null | undefined): Block[] {
  const lines = (md ?? "").replace(/\r\n?/g, "\n").split("\n");
  const out: Block[] = [];
  let para: Inline[][] = [];
  const endPara = () => { if (para.length) { out.push({ t: "p", lines: para }); para = []; } };
  const last = () => out[out.length - 1];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { endPara(); continue; }
    let m: RegExpExecArray | null;
    if ((m = RX.h3.exec(line))) { endPara(); out.push({ t: "h3", c: parseInline(m[1]!.trim()) }); continue; }
    if ((m = RX.h2.exec(line))) { endPara(); const c = parseInline(m[1]!.trim()); out.push({ t: "h2", c, text: inlineText(c) }); continue; }
    if ((m = RX.check.exec(line))) {
      endPara(); const item = { done: m[1] !== " ", c: parseInline(m[2]!.trim()) }; const b = last();
      if (b?.t === "check") b.items.push(item); else out.push({ t: "check", items: [item] });
      continue;
    }
    if ((m = RX.ul.exec(line))) {
      endPara(); const item = parseInline(m[1]!.trim()); const b = last();
      if (b?.t === "ul") b.items.push(item); else out.push({ t: "ul", items: [item] });
      continue;
    }
    if ((m = RX.ol.exec(line))) {
      endPara(); const item = parseInline(m[2]!.trim()); const b = last();
      if (b?.t === "ol") b.items.push(item); else out.push({ t: "ol", items: [item], start: Number(m[1]) || 1 });
      continue;
    }
    if ((m = RX.tip.exec(line))) {
      endPara(); const l = parseInline(m[1]!.trim()); const b = last();
      if (b?.t === "tip") b.lines.push(l); else out.push({ t: "tip", lines: [l] });
      continue;
    }
    // A plain line right after a list item continues that item (a sentence under a step).
    const b = last();
    if (!para.length && b && (b.t === "ul" || b.t === "ol") && /^\s{2,}\S/.test(raw)) { b.items[b.items.length - 1]!.push({ t: "text", v: ` ${line.trim()}` }); continue; }
    para.push(parseInline(line.trim()));
  }
  endPara();
  return out.filter((b) => !(b.t === "h2" && !b.text.trim()));
}

/** The words only, for previews, search and counting: no marks, list items and paragraphs separated by a space. */
export function plainText(md: string | null | undefined): string {
  const parts: string[] = [];
  for (const b of parseRich(md)) {
    if (b.t === "h2" || b.t === "h3") parts.push(inlineText(b.c));
    else if (b.t === "p" || b.t === "tip") parts.push(b.lines.map(inlineText).join(" "));
    else if (b.t === "check") parts.push(...b.items.map((i) => inlineText(i.c)));
    else parts.push(...b.items.map(inlineText));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** The `## ` headings in order, with the anchor id each gets on the page ("In this article"). */
export function headingsOf(md: string | null | undefined): { id: string; text: string }[] {
  return parseRich(md).filter((b): b is Extract<Block, { t: "h2" }> => b.t === "h2").map((b, i) => ({ id: `s${i}`, text: b.text }));
}
