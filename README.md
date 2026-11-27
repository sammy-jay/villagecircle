# The Village Circle — Step 1 (foundation)

Next.js 14 (App Router) · TypeScript · Tailwind · **Prisma on MongoDB** · Auth.js · real integrations behind env tokens.

## Run it
```bash
pnpm install                 # also runs prisma generate
cp .env.example .env        # fill in DATABASE_URL + NEXTAUTH_SECRET at minimum
pnpm run db:push             # creates collections + indexes in MongoDB
pnpm run dev
pnpm run check:env           # shows which integrations are configured + pings MongoDB
pnpm run db:seed             # topics + first admin (set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
pnpm test                    # 62 tests covering the BRD safeguarding and sign-up rules
```
Use MongoDB Atlas (or any replica set): Prisma transactions need one. Unconfigured integrations run in a safe dev mode (email/SMS logged; Twilio Verify accepts `123456` outside production; Daily returns a dev link).

## What is in Step 1
- `prisma/schema.prisma`: every BRD §11 entity; append-only: AuditEvent, Attestation, ConsentRecord, AskStateChange.
- `src/lib/domain/*`: age gate (BR-19/20), Ask state machine (§6.1; BR-05/06/08/15), 3-open-Ask cap (BR-14), contact-detail detection (BR-10), mentor-facing summary + whitelist projection (BR-09), eligibility (BR-01/04/13), recording access, ranking weights (§6.4), service windows.
- `src/lib/auth.ts`: Auth.js (email+password, Google), lockout, roles, admin/safeguarding TOTP two-step sign-in with recovery codes. `ADMIN_AUTH_CHECKS_ENABLED=false` temporarily bypasses email verification for all registrations and MFA for admins; it defaults to enabled.
- `src/lib/integrations/*`: Resend, Twilio (SMS + Verify), Daily, S3 storage (signed URLs), ICS/Google Calendar, screening adapter (Checkr default, provider TBC), PostHog; `/api/cron/*` jobs (`vercel.json`).
- UI kit, shells, landing, sign-in, sign-up with age gate, under-13, guardian-needed, crisis, MFA, `/styleguide`.

## Open BRD items (not decided here)
Retention periods (counsel), crisis lines per country (988 is an example), screening provider. FR-R13 (mentor pairs) intentionally omitted.

## Step 2: sign-up and consent
- Role-aware register (participant / mentor 21+ / guardian 18+), age gate, email verification, forgot/reset password.
- Guardian authorization (S-3): participant invites guardian; single-use hashed link, 14-day expiry; 6-digit SMS code with 5-try lockout; authorize or decline (decline closes the account); guardian account + link ending at the 18th birthday; consent records; spot-check queue before activation (V-GUARD).
- Mentor application: 4 steps, optional résumé/LinkedIn, versioned attestation signed with typed legal name (refusal ends the application, no appeal), screening started via the adapter, status timeline, orientation, appeal, withdraw.
- Participant profile builder (`/onboarding`).
- Admin (two-step sign-in required): mentor queue (oldest first, window badges), guardian spot checks, approve / ask one question / decline with notes, grant cleared-for-minors only when opt-in + clear screening + orientation + code of conduct + current attestation. Every action is audited. Screening webhook: `/api/webhooks/screening`.

Not done yet / known: rate limiting on public endpoints (add Upstash or similar before launch); the orientation module content is placeholder text for the safeguarding lead to supply.

## UI note (design-faithful rebuild)
Every Step 1 and 2 screen is coded from its board in the design artifact using `src/components/dc` (tokens, buttons, tags, callouts, shells, 6-box code input) and `.dc-*` classes in `globals.css`.
New routes: `/admin/sign-in`, `/api/auth/resend-verify`, `/api/mentor/reply`, `/api/mfa/status`.
Run `npm test`, `npx next build` (set `DATABASE_URL`, `NEXTAUTH_SECRET`). Database flows need a MongoDB replica set (Atlas) and were not live-tested here.

## Step 3: the core loop (UI from the boards)
Participant: `/home`, `/asks`, `/asks/new`, `/asks/[id]/edit` (wizard), `/asks/[id]` (tracker and exit states), `/asks/[id]/{time,join,call,change,missed,trouble,after}`, `/paused`.
Team: `/admin/asks`, `/admin/asks/[id]` (+ `/summary`, `/match`, `/step-forward`).
Mentor: `/mentor` (inbox), `/mentor/asks/[id]` (+ `/refer`, `/call`), `/mentor/conversations/[id]` (+ `/change`, `/after`).
Guardian: `/guardian`, `/guardian/authorizations`, `/guardian/asks/[id]` (+ `/join`, `/call`). `/call/[id]` routes each party to their own room.
Without a video domain configured the call page shows a practice room instead of Daily.

## Step 4: village, community and insight
Participant: `/village/{directory,library,library/[id],mentors/[id],events/[id],community}`, `/goals`, `/notes`, `/goals/offer/[askId]`, `/review`, `/review/check-in`, `/notifications`, `/volunteer`, `/give-back`. Public: `/library`.
Mentor: `/mentor/{availability,impact,contribute,settings}`.
Team: `/admin/{moderation,reports,library,library/review,events,templates}` (CSV at `/api/admin/reports/export`).
Cron `monthly` resets mentor hours once a month, sends digests and creates 30-day check-ins. Email and SMS template defaults live in `src/lib/templates.ts`.
Known gaps: reported-content model, automatic resource expiry, event reminders, data export and account deletion.

## Step 5 — Safety, support and polish
Routes: user side `/report`, `/guardian/{recordings,withdraw,asks/[id]/pause,asks/[id]/ongoing}`, `/paused`, `/settings`(+`/export`,`/delete`,`/turning-18`), `/recommend`, `/mentor/reaffirm`, `/signed-out`; admin `/admin/{incidents,accounts,roles,audit,data-requests,help,taxonomy,broadcast,queue-health,search,bulk,playbook,config}`; public `/about /faq /help /help/report /become-a-mentor /families /policies /maintenance`, cookie banner, error/loading pages. See `docs/ACCEPTANCE.md` and `scripts/a11y-check.mjs` (`BASE_URL=... node scripts/a11y-check.mjs`).
Known gaps: no live DB or screenshot-vs-board verification; reviewer/volunteer/read-only roles are labels only (all get ADMIN access); edited config weights not yet read by ranking/review; broadcast mute and 48h maintenance banner not built; server-side PostHog not consent-gated; scheduled broadcasts send on page load; FAQ answers 2-8 and some copy are mine where boards had none; policy text is placeholder pending counsel; M18 built as public /recommend form.
