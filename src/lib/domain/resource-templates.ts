/**
 * D24 Contribute: the structured template for each format a mentor can share. Each section is its own formatted box;
 * on submit the sections are joined into Resource.body as `## Heading` blocks, which the library page turns into
 * "In this article". Editing splits a body back into its sections, so nothing a mentor wrote is lost, even after
 * switching format or opening an old plain-text draft. Pure: no database, no React.
 */
import { disallowedLinks, isAllowedLink, isVideoLink, LINK_RULE, plainText, resourceContactHits } from "./rich-text";

export type ContributeType = "ARTICLE" | "GUIDE" | "TEMPLATE" | "VIDEO";
export interface TemplateSection {
  key: string; heading: string; hint: string; placeholder: string; required: boolean; max: number;
  /** Text the box starts with, so the right kind of list is already there. */
  starter?: string;
}
export interface ResourceTemplate {
  type: ContributeType; label: string; hint: string; sections: TemplateSection[];
  /** Recording: a link to the video, shown first on the page as "Watch". */
  link?: { label: string; hint: string };
  /** Where notes from a conversation, or text that matches no section, are put. */
  catchAll: string;
}

export const TEMPLATES: Record<ContributeType, ResourceTemplate> = {
  ARTICLE: {
    type: "ARTICLE", label: "Answer", hint: "A written answer to a common question", catchAll: "detail",
    sections: [
      { key: "short", heading: "The short answer", required: true, max: 600, hint: "Two or three sentences. If they read nothing else, what should they know?", placeholder: "Most people get their first internship through someone they know, not a job board." },
      { key: "detail", heading: "More detail", required: false, max: 2500, hint: "Your own experience, an example, what you wish you had known.", placeholder: "When I was a sophomore I sent out forty applications and heard back from two…" },
      { key: "next", heading: "What to do next", required: true, max: 1000, hint: "Two to four things they can do this week. One per line.", placeholder: "Ask one person in the field for a 15-minute chat.", starter: "1. " },
    ],
  },
  GUIDE: {
    type: "GUIDE", label: "Step-by-step guide", hint: "Steps to get something done, in order", catchAll: "steps",
    sections: [
      { key: "before", heading: "Before you start", required: false, max: 800, hint: "What they need, how long it takes and who it is for.", placeholder: "You will need your family's tax return and about an hour." },
      { key: "steps", heading: "Steps", required: true, max: 3000, hint: "One step per line. To explain a step, add a sentence after it on the same line.", placeholder: "Make a list of 20 companies you would like to work for.", starter: "1. " },
      { key: "tips", heading: "Tips and common mistakes", required: false, max: 1200, hint: "What trips people up, and how to avoid it.", placeholder: "Don't wait for the deadline: aid is first come, first served in many states.", starter: "- " },
    ],
  },
  TEMPLATE: {
    type: "TEMPLATE", label: "Template or checklist", hint: "A checklist, outline or sample they can copy", catchAll: "template",
    sections: [
      { key: "purpose", heading: "What it is for", required: true, max: 600, hint: "When to use it, in a sentence or two.", placeholder: "Use this the week before any interview, for any kind of job." },
      { key: "template", heading: "The template", required: true, max: 3000, hint: "The checklist, outline or sample itself. Use a checklist for things to tick off.", placeholder: "Research what the company does and who its customers are", starter: "- [ ] " },
      { key: "how", heading: "How to use it", required: false, max: 1000, hint: "Anything to change for their situation.", placeholder: "If it's a phone interview, skip the outfit and practise out loud instead." },
    ],
  },
  VIDEO: {
    type: "VIDEO", label: "Recording", hint: "A short video or audio you recorded", catchAll: "about",
    link: { label: "Link to the recording", hint: "From YouTube, Vimeo, Loom or Google Drive. Set it to unlisted or anyone with the link, not public on your profile." },
    sections: [
      { key: "about", heading: "What it covers", required: true, max: 800, hint: "Who it's for and what they will learn, in two or three sentences.", placeholder: "A 10-minute walk through a nurse's twelve-hour shift, for anyone thinking about nursing." },
      { key: "points", heading: "Key points", required: false, max: 1500, hint: "The main points, so people can skim before they watch.", placeholder: "Most of the job is talking with families, not procedures.", starter: "- " },
    ],
  },
};
export const CONTRIBUTE_TYPES = Object.keys(TEMPLATES) as ContributeType[];
export const isContributeType = (t: string): t is ContributeType => (CONTRIBUTE_TYPES as string[]).includes(t);
export const templateFor = (t: string): ResourceTemplate => TEMPLATES[isContributeType(t) ? t : "ARTICLE"];

export const WATCH_HEADING = "Watch";
/** The whole body: no more than this many characters, marks included. */
export const BODY_MAX = 8000;
/** A required section needs at least this much real text (a starter like "1. " alone does not count). */
export const SECTION_MIN = 20;

export type Sections = Record<string, string>;

/** A heading inside a box becomes a smaller one, so it never splits the body into a new section by accident. */
const demote = (s: string) => s.replace(/^##(?!#)\s*/gm, "### ");
const isOnlyStarter = (s: string) => !plainText(s.replace(/^\s*(?:[-*]\s+\[[ xX]\]|[-*•]|\d{1,3}[.)])\s*$/gm, "")).trim();

/** Sections (and the recording link) into the stored body, in template order. Empty sections are left out. */
export function composeBody(type: string, sections: Sections, link = ""): string {
  const t = templateFor(type);
  const parts: string[] = [];
  if (t.link && link.trim()) parts.push(`## ${WATCH_HEADING}\n\n[Watch the recording](${link.trim()})`);
  for (const s of t.sections) {
    const v = demote((sections[s.key] ?? "").trim());
    if (v && !isOnlyStarter(v)) parts.push(`## ${s.heading}\n\n${v}`);
  }
  return parts.join("\n\n");
}

/**
 * A stored body back into the template's sections. Text before the first heading, and sections whose heading
 * matches nothing in this template, go into the template's catch-all box, under their own heading.
 */
export function splitBody(type: string, body: string | null | undefined): { sections: Sections; link: string } {
  const t = templateFor(type);
  const byHeading = new Map(t.sections.map((s) => [s.heading.toLowerCase(), s.key]));
  const sections: Sections = {}; let link = "";
  const extra: string[] = [];
  let key: string | null = null; let heading = ""; let buf: string[] = [];
  const put = () => {
    const text = buf.join("\n").trim(); buf = [];
    if (key === "__watch") { const m = /\]\(([^)\s]+)\)/.exec(text) ?? /(https?:\/\/\S+)/.exec(text); link = m?.[1] ?? ""; return; }
    if (!text && !heading) return;
    if (key) sections[key] = sections[key] ? `${sections[key]}\n\n${text}` : text;
    else extra.push(heading ? `### ${heading}\n\n${text}`.trim() : text);
  };
  for (const line of (body ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = /^##(?!#)\s+(.+)$/.exec(line);
    if (m) {
      put(); heading = m[1]!.trim();
      key = heading.toLowerCase() === WATCH_HEADING.toLowerCase() ? "__watch" : byHeading.get(heading.toLowerCase()) ?? null;
      if (key) heading = "";
      continue;
    }
    buf.push(line);
  }
  put();
  const rest = extra.filter(Boolean).join("\n\n");
  if (rest) sections[t.catchAll] = sections[t.catchAll] ? `${sections[t.catchAll]}\n\n${rest}` : rest;
  return { sections, link };
}

/** The boxes as they open: what was written, or the starter list for an empty box. */
export function initialSections(type: string, body: string | null | undefined): { sections: Sections; link: string } {
  const t = templateFor(type); const { sections, link } = splitBody(type, body);
  for (const s of t.sections) if (!sections[s.key]?.trim() && s.starter) sections[s.key] = s.starter;
  return { sections, link };
}

export type SectionProblem = { field: string; error: string };

/** Everything a mentor must fix before sending, in the order the boxes appear. Empty array: ready. */
export function checkResource(type: string, title: string, sections: Sections, link = ""): SectionProblem[] {
  const t = templateFor(type); const out: SectionProblem[] = [];
  if (title.trim().length < 5) out.push({ field: "title", error: "Add a title of a few words." });
  if (t.link) {
    const l = link.trim();
    if (!l) out.push({ field: "link", error: "Add the link to your recording." });
    else if (!isVideoLink(l)) out.push({ field: "link", error: "Use a link from YouTube, Vimeo, Loom or Google Drive." });
  }
  for (const s of t.sections) {
    const v = (sections[s.key] ?? "").trim();
    if (v.length > s.max) out.push({ field: s.key, error: `${s.heading}: please keep it under ${s.max.toLocaleString("en-US")} characters.` });
    else if (s.required && plainText(v).length < SECTION_MIN) out.push({ field: s.key, error: `${s.heading}: add a little more here.` });
  }
  const all = `${title}\n${Object.values(sections).join("\n")}`;
  const bad = disallowedLinks(all);
  if (bad.length) out.push({ field: fieldWith(t, sections, bad[0]!) ?? "title", error: `That link can't be shared here. ${LINK_RULE}` });
  else if (resourceContactHits(all).length) out.push({ field: fieldWith(t, sections, resourceContactHits(all)[0]!.match) ?? "title", error: "Please remove contact details. Everything stays on the platform." });
  if (composeBody(type, sections, link).length > BODY_MAX) out.push({ field: t.sections[0]!.key, error: `The whole resource is too long. Please keep it under ${BODY_MAX.toLocaleString("en-US")} characters.` });
  return out;
}
const fieldWith = (t: ResourceTemplate, sections: Sections, needle: string) => t.sections.find((s) => (sections[s.key] ?? "").includes(needle))?.key;

/** Server-side check of a stored body (what was actually submitted). */
export function checkBody(type: string, title: string, body: string): SectionProblem[] {
  const { sections, link } = splitBody(type, body);
  if (link && !isAllowedLink(link)) return [{ field: "link", error: "Use a link from YouTube, Vimeo, Loom or Google Drive." }];
  return checkResource(type, title, sections, link);
}
