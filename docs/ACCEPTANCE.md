# Acceptance map: BRD v2.0 to routes and tests

How to read this. **Unit** = covered by a vitest test of pure domain code in `src/lib/domain/*.test.ts` (run `npm test`). **Built** = the route or function exists and type-checks, but nothing automated exercises it. **Not verified** = no evidence either way.

## What has and has not been tested

- Tested: pure rules (age gate, state machine, contact detection, summary projection, permissions, windows, token and code rules, templates, incident states, consent and maintenance decisions, FAQ and policy content).
- Not tested: any flow against a live database (Prisma/MongoDB), any real browser journey, email, SMS, video, storage, screening, PostHog delivery, and cron execution. No end-to-end or integration suite exists.
- `npx tsc --noEmit` and `vitest` pass. `next build` has **not** been run, so production build errors, static generation of `/policies/[slug]` and edge-runtime behaviour of the middleware are unconfirmed (only `next dev` was exercised).
- Public pages were smoke-checked with `scripts/a11y-check.mjs` against `next dev` (14 pages at 1280 and 390 wide: overflow, alt, labels, heading order). That is not a WCAG audit. Colour contrast, keyboard order, screen readers, zoom and reduced-motion were **not** checked by tool; they rely on board tokens.
- Maintenance mode was checked by hand once on `next dev`: pages and `/api/asks` returned 503, `/api/health` 200.

## Section 17 sample acceptance criteria

| Criterion | Where | Evidence |
|---|---|---|
| FR-P05 minor's Ask waits for guardian; appears in no reviewer or mentor view | `/asks/new` wizard, `/guardian/authorize/[token]`, `src/lib/domain/ask-state.ts` | Unit: "minor cannot skip guardian authorization", step3 lifecycle. Notifications, 2FA check and recorded reference: Built, untested |
| FR-P05 lapse after 14 days with plain notice to both | cron `service-windows` (`lapsedConsent`) | Unit: invite expiry 14 days. Cron run and notices: Not verified |
| FR-D05 summary excludes name, school, contact; release blocked on detected contact | `/admin/asks/[id]/summary`, `domain/mentor-summary.ts`, `contact-detect.ts` | Unit: contact detection, withheld identifiers, whitelist projection |
| FR-R04 step forward; participant not told until team confirms; others thanked, never rejected | `/mentor/asks/[id]`, `/admin/asks/[id]/step-forward` | Unit: state machine, passing never lowers rank. Thank-you messages: Built, untested |
| FR-R04 minor: scheduling blocked until guardian approves that mentor | `/guardian/approvals/[id]` | Unit: "scheduled only after the guardian approves mentor and time" |

## Business objectives

BO-1 to BO-8 are measures, not features. Impact and demand reporting exist at `/mentor/impact` and `/admin/reports` (Built; unit-tested aggregation only). No objective has been measured against real data.

## Business rules

| Rule | Route or code | Evidence |
|---|---|---|
| BR-01 no Asks before approval, code accepted, orientation | `domain/mentor-application.ts` | Unit |
| BR-02, BR-03 sign-up needs bio, area, attestation; refusal ends it | `/mentor/apply` | Unit (step2) |
| BR-04 minors see only cleared mentors | `domain/ranking.ts`, shortlist | Unit |
| BR-05 minor needs verified guardian | `/guardian-needed`, `/register` | Unit (state machine); email and SMS verification untested |
| BR-06 per-Ask and per-mentor/time authorization | `/guardian/asks/[id]`, `/guardian/approvals/[id]` | Unit |
| BR-07 minors' calls recorded, guardian access | `/guardian/recordings`, `/api/recordings` | Unit: recording permissions. Daily recording and storage: Not verified |
| BR-08, BR-09 human review; minimum-necessary summary | `/admin/asks/*` | Unit |
| BR-10 no contact details | contact detection, templates, notification bodies | Unit |
| BR-11 30 or 60 minute conversations | scheduling | Unit |
| BR-12 passing invisible, no rank penalty | mentor inbox | Unit |
| BR-13 monthly hours cap | cron `monthly` | Unit; cron untested |
| BR-14 three open Asks | Ask creation | Unit |
| BR-15 unanswered Ask returns to team | cron `service-windows` | Unit (state rule); cron untested |
| BR-16 moderation before publishing | `/admin/moderation`, `/village` | Built, untested |
| BR-17 no ratings or leaderboards | none collected | By absence; copy on `/about` |
| BR-18 no money | none collected | By absence; stated in `/faq` |
| BR-19, BR-20 age rules | `/under-13`, `/settings/turning-18` | Unit |
| Annual re-affirmation | `/mentor/reaffirm`, cron `daily` -> `sweepReaffirmations` | Unit for due and lapsed; sweep itself untested |
| Account deletion after 30 days | `/settings/delete`, cron `daily` -> `sweepDeletions` | Unit for confirmation rules; anonymisation untested |

## Non-functional

| Req | Status |
|---|---|
| NFR-01 uptime, maintenance announced 48h ahead | `MAINTENANCE_MODE=1` shows `/maintenance` (HP7) with 503 and `Retry-After`; wording via `MAINTENANCE_WINDOW`, `MAINTENANCE_BACK_BY`, `MAINTENANCE_LENGTH`. Unit-tested decision; hand-checked on dev. The 48-hour advance banner (ST-2) is **not built**; uptime is not measured |
| NFR-02 first paint under 2s on 4G | Not measured. `loading.tsx` skeleton reserves layout |
| NFR-03 mobile first | Layouts reflow; public pages checked at 390 wide for overflow only |
| NFR-04 WCAG 2.1 AA | Skip link, 3px gold `:focus-visible`, reduced motion, labelled fields, real buttons for FAQ and chips. Partial and unaudited (see above) |
| NFR-05 security, MFA for admins | `middleware.ts`, `requireRole`. Unit: permission matrix. Encryption at rest is provider configuration, not verified |
| NFR-06 privacy, export, deletion | `/settings/export`, `/settings/delete`; cookie banner gates anonymous counts (`vc-consent`). **Server-side `track()` is not gated** (IDs and event names only, no cookies). 24-month retention job: Not built |
| NFR-07 immutable audit | Unit: append-only collections guard. Database-level immutability not verified |
| NFR-08 scale | Not tested |
| NFR-09, NFR-10 localisation, configurability | `/admin/config`, `/admin/templates`, `/admin/taxonomy`. Built; templates unit-tested |
| NFR-11 compliance with counsel | Open: policy text on `/policies/*` is a placeholder and says so |

## Step 5 public and polish screens

| Board | Route or component | Notes |
|---|---|---|
| HP1 About | `/about` | |
| HP2 FAQ | `/faq` | Accordion, audience chips. Answers 2 to 8 are written from the BRD; only the first answer is on the board. Search box not added |
| HP3 Help centre | `/help`, `POST /api/help` | Form writes `HelpRequest`. Search forwards to `/faq?q=`. Rate limit by DB count and honeypot. Design note box omitted. Safeguarding wording escalates only for logged-in senders; visitors notify leads instead |
| HP4 How to report | `/help/report` | Sending needs login (reports are tied to an account); logged-out visitors are sent to log in |
| HP5 Cookie banner | `CookieBanner` in `src/components/dc/system.tsx` | Footer "Cookie settings" reopens it. No choice means no analytics |
| HP7 Maintenance | `/maintenance`, `src/middleware.ts` | |
| HP8 Offline and 500 | `OfflineBanner`, `app/error.tsx`, `app/global-error.tsx` | Reference is the Next digest, not a stored incident. Offline "kept on this device" is only true for drafts the other screens already save locally; no general offline queue exists |
| HP9, HP10 | `/become-a-mentor`, `/families` | HP10 testimonial is **replaced**, not published: the board marks it sample only. Real consented quotes needed |
| PO-1 Policies | `/policies`, `/policies/[slug]` | Text is placeholder pending counsel. "Download as PDF" opens the browser print dialog (print stylesheet), it does not generate a file |
| ST-2 Errors and loading | `AlertCard`, `app/loading.tsx`, `not-found.tsx` | Other alert variants exist as components but are not wired into every flow |
| Idle sign-out (EX16) | `SessionGate` in layout | Only mounts when `useSession` is authenticated; timing untested in a browser |

## Open items for a human

Run `next build`; run `scripts/a11y-check.mjs` against a production server; add an end-to-end suite with a test database; confirm 988 and region copy with the client; supply policy text; decide on a 48-hour maintenance banner.
