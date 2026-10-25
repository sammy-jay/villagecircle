// Quick automated accessibility pass over the public pages at desktop (1280) and phone (390) width.
// Checks: horizontal overflow, images without alt, form fields without a label, heading order, missing h1/main, missing page title.
// This is NOT a WCAG audit: no contrast, focus order or screen-reader testing. Usage: BASE_URL=http://localhost:3000 node scripts/a11y-check.mjs
import { createRequire } from "node:module";
const require = createRequire("/opt/npm-tools/node_modules/");
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES = ["/", "/about", "/faq", "/help", "/help/report", "/become-a-mentor", "/families", "/policies", "/policies/code-of-conduct", "/policies/privacy", "/maintenance", "/crisis", "/login", "/this-page-does-not-exist"];
const SIZES = [{ w: 1280, h: 900 }, { w: 390, h: 844 }];

function audit() {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.push(`horizontal overflow: scrollWidth ${de.scrollWidth} > ${de.clientWidth}`);
  if (!document.title.trim()) out.push("missing <title>");
  if (!document.querySelector("main")) out.push("no <main> landmark");
  for (const i of document.querySelectorAll("img:not([alt])")) out.push(`image without alt: ${i.getAttribute("src")}`);
  const visible = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  for (const f of document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")) {
    if (f.closest("[aria-hidden=true]")) continue;
    const named = f.getAttribute("aria-label") || f.getAttribute("aria-labelledby") || (f.id && document.querySelector(`label[for="${CSS.escape(f.id)}"]`)) || f.closest("label");
    if (!named) out.push(`form field without a label: <${f.tagName.toLowerCase()} name="${f.getAttribute("name") ?? ""}">`);
  }
  for (const b of document.querySelectorAll("button, a[href]")) {
    if (!visible(b)) continue;
    if (!(b.textContent || "").trim() && !b.getAttribute("aria-label") && !b.querySelector("img[alt]:not([alt=''])")) out.push(`${b.tagName.toLowerCase()} with no accessible name`);
  }
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")];
  const h1s = hs.filter((h) => h.tagName === "H1").length;
  if (h1s !== 1) out.push(`expected one h1, found ${h1s}`);
  let prev = 0;
  for (const h of hs) { const n = Number(h.tagName[1]); if (prev && n > prev + 1) out.push(`heading order jumps h${prev} to h${n}: "${h.textContent.trim().slice(0, 40)}"`); prev = n; }
  return out;
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
let bad = 0;
for (const size of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  const page = await ctx.newPage();
  for (const path of PAGES) {
    let res;
    try { res = await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 30000 }); } catch (e) { console.log(`FAIL ${size.w} ${path}: ${e.message.split("\n")[0]}`); bad++; continue; }
    // Dismiss nothing: the cookie banner is part of the page and must not cause overflow.
    const problems = await page.evaluate(audit);
    const expected404 = path === "/this-page-does-not-exist";
    if (res && res.status() >= 400 && !expected404 && path !== "/maintenance") problems.unshift(`HTTP ${res.status()}`);
    console.log(`${problems.length ? "FAIL" : "ok  "} ${size.w} ${path}${problems.length ? "\n  - " + problems.join("\n  - ") : ""}`);
    bad += problems.length;
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `\n${bad} problem(s)` : "\nNo problems found by these checks");
process.exit(bad ? 1 : 0);
