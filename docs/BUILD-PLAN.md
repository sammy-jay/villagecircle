# Rebuild plan: screens after the public site

Status on 25 October 2026: the token layer, the shared components, the public site (13 boards), Section 1 (Sign-up and account), Section 2 (the participant app), Section 3 (Guardian) and Section 4 (Mentor) are built. Signed-in screens are checked by typecheck, lint and a compile pass of every route; they have not been compared visually against the boards, because there is no demo data to sign in with. This plan covers everything else.

## Source of truth

The design canvas at https://claude.ai/artifact/Qnt11HpLCgtANRncdwcDjF holds one HTML file per board (`project/V-<code>-D.dc.html` for desktop, `-M` for phone). Build from these files, not from Figma. The Figma Starter plan allows only a handful of MCP calls, and the canvas has the exact markup and copy.

Per board:
1. Download the D and M files. Strip the embedded base64 logo and pretty-print them.
2. Build the route with the components below. Desktop layout applies at `lg` (1024px) and up; the phone layout applies below that.
3. Render the board on its own and screenshot it next to the route at 1280px and 390px. Fix differences until they match.
4. Wire up the data and actions through `src/lib`. Add a server action or API route where the deleted `src/app/api` handler used to be.

## What already exists

| Layer | Where | Notes |
|---|---|---|
| Tokens | `tailwind.config.ts`, `src/app/globals.css` | Colours, type scale, radii and dark theme from the DSF board. `.dc-*` classes for buttons, pills, tags, inputs, cards and banners. |
| App components | `src/components/dc` | Button, Tag, AskTag, Field, Input, Select with Say more, CountedTextarea, CodeInput, Signature, Toggle, Checkbox, RadioCard, tabs, Modal/bottom sheet, toasts, Timeline, Avatar, StoryRing, Banner, EmptyState, SidebarNav, AdminMenu, AdminBreadcrumb, TabBar, icons. Route maps are in `nav-config.ts`. |
| Public kit | `src/components/public` | Header and footer, Hero, CtaBand, LinkRows, StepTrail, ApprovalSample, accordion, the help and report forms, the cookie banner. |
| Logic | `src/lib` | Section 1 added `register.ts` and extended `guardian.ts` (code check, participant invite, resend). Domain rules have 265 passing tests. |
| Styleguide | `/styleguide` | Every component, for side-by-side checks against the DSF board. |

## Settled before Section 1

- Minimum age is 15 (`MIN_AGE` in `src/lib/domain/age.ts`). The `AGE_13_15` band name is kept for stored data.
- Auth is back: `src/app/api/auth/[...nextauth]`, with verify, forgot, reset and resend as server actions in `src/app/account-actions.ts`.
- `src/lib/report-page.tsx` is deleted; `/report` replaces it.
- The project is under git.

## Order of work

Each section needs two things: shells (the page frames for that role) and screens. Build the shell first, then the screens in the order listed, because later screens depend on earlier flows.

### 1. Sign-up and account (49 boards): built
Shell: the public header, or a bare centred card (M-series boards).
Screens: M1/DK1 Register, M2/DK2 Under-15, M9/DK3 Log in, M10/DK4 Verify email, M11 Forgot password (both states), M12 profile builder steps 1 to 3, M13/DK6 Waiting for guardian, M16 Report a concern (both states), M17 Turning 18, M18 Trusted adult, M19 Approval link expired, M20 Enter your code, M21 Too many tries, M22 Verify link expired, M23/EX9 Crisis support, M24 Pause connection (sheet and modal), M25 Account paused, P01 Recommend a young person (both states), P02 Signed out (both states).
Logic: `auth.ts`, `password.ts`, `consent.ts`, `guardian.ts`, `domain/age.ts`, `domain/tokens.ts`, `safety-user.ts` (`recommend`, `confirmTurning18`).
Done when: a minor can register, the guardian invite email goes out, the code check locks after 5 tries, and every expired or error state shows its board.
Routes: `/register`, `/under-15`, `/login`, `/after-login`, `/check-email`, `/verify-email/[token]`, `/forgot`, `/reset/[token]`, `/onboarding?step=`, `/guardian-needed`, `/guardian/authorize/[token]` (DK5/M3, M20, M19, M21, used and closed links), `/report`, `/settings/turning-18`, `/recommend` (P01; M18 is the same form), `/crisis` (M23; `?from=ask` is EX9), `/guardian/asks/[id]/pause` (M24), `/paused` (M25), `/signed-out` (P02; `?reason=deleted&until=` is P02-D2). Shells: `src/components/account/shells.tsx` and `src/components/app/app-shell.tsx`.

### 2. Mentee, the participant app (105 boards): built
Shell: `SidebarNav` (desktop) and `TabBar` (phone) using `PARTICIPANT_NAV` and `PARTICIPANT_TABS`, built from D1 and N06.
Screens, in this order:
1. Home: N09 Welcome, D1 Home (light and dark), NT1 Notifications.
2. The Ask loop: D2a Quick Ask, D10 to D12 Ask wizard, N05 Ask sent and Withdraw, D13 My Asks, D3 Ask journey, N08 Ask thread, D14 Pick a time.
3. Calls: CL1 Before the call, CL2 In the call (dark), D16 After the call, N04 Thank a mentor, EX18 Goals offer.
4. The village: D4 and N12 Explore and filters, N03 Search, D18 Mentor profile, D9 Community, N01 Saved, N02 and D20 Events, LIB and D19 Library.
5. Self: D17 and P06 Goals, D22 Monthly check-in, D21 Settings, N07 Profile and privacy, N10 Notification preferences, N11 Contact the team.
6. Exceptions: EX1 Reschedule, EX3 Missed, EX4 Connection trouble, EX5 Returned for detail, EX6 Hand matching, EX7 Redirected, EX8 Closed, EX14 Export, EX15 Delete, EX16 Timeout, EX17 Give back.
Logic: `asks.ts`, `participant-ctx.ts`, `village.ts`, `village-ctx.ts`, `insight.ts`, `connections.ts`, `call-extra.ts`, `safety-user.ts`, `domain/ask-state.ts`.
Done when: a minor's Ask goes Draft, Awaiting guardian, Team review, Stepped forward, Scheduled, Complete, with every exit state reachable and matching its board.
Routes: `/home` (N09 until the first Ask, then D1), `/notifications`, `/me` (N06), `/asks/new` (D2a over Home), `/asks/[id]/edit?step=topic|tell|read|send` (D10, D2, D11, D12; `/asks/start/edit` starts at the topic), `/asks/[id]/sent` (N05, `?withdraw=1`), `/asks` (D13, `?tab=closed` uses EX8 cards), `/asks/[id]` (D3, or EX5 to EX8), `/asks/[id]/thread` (N08), `/asks/[id]/time` (D14), `/asks/[id]/call` (CL1), `/asks/[id]/room` (CL2), `/asks/[id]/after` (D16), `/asks/[id]/thanks` (N04), `/asks/[id]/offer` (EX18), `/asks/[id]/reschedule` (EX1), `/asks/[id]/missed` (EX3), `/asks/[id]/trouble` (EX4), `/village/directory` (D4, N12 at `?filters=1`), `/village/directory/[id]` (D18), `/search` (N03), `/village/community` (D9), `/village/saved` (N01), `/village/events` (N02), `/village/events/[id]` (D20), `/village/library` (LIB), `/village/library/[id]` (D19), `/goals` (D17 with P06), `/goals/check-in` (D22), `/settings` (D21), `/settings/profile` (N07), `/settings/notifications` (N10), `/settings/contact` (N11), `/settings/data` (EX14), `/settings/delete` (EX15), `/give-back` (EX17). EX16 is the idle guard in the app shell.
New logic: `participant-home.ts`, `participant-profile.ts`, `ask-thread.ts` with the `AskMessage` model, `Thanks.tags`, optional wizard details on the Ask answers, and `mentorProfileFor` now returns tips and similar mentors.

### 3. Guardian (20 boards): built
Shell: `guardian-shell` from G1.
Screens: DK5/M3 Authorization (public token link), G1 Overview, G2 Approvals, G3 Conversations and recordings, G4 Withdraw consent, G6 Ongoing mentorship, P07 Before you join, CL3 and P07 In the call and Paused (dark).
Logic: `guardian.ts`, `consent.ts`, `safety-user.ts` (`guardianOverview`, `guardianRecordings`, `withdrawConsent`, `decideOngoing`).
Done when: the per-Ask and per-mentor/time approvals from the minor's flow (section 2) can be completed here.
Routes: `/guardian` (G1), `/guardian/approvals` and `/guardian/approvals/[askId]` (G2), `/guardian/recordings` and `/guardian/recordings/[id]` (G3; playback needs `RECORDINGS_BASE_URL`), `/guardian/withdraw` (G4, `?done=1`), `/guardian/ongoing/[askId]` (G6), `/guardian/asks/[id]/call` (P07), `/guardian/asks/[id]/room` (CL3, P07-D3 at `?paused=1`), `/guardian/authorizations` (no board). DK5/M3 is `/guardian/authorize/[token]` from Section 1. New logic: `guardian-ctx.ts`, `guardian-app.ts` (attendance, family default, authorization history).

### 4. Mentor (60 boards): built
Shell: `MentorShell` in `app-shell.tsx`: `SidebarNav` with `MENTOR_NAV` (Inbox, Hours, My impact, Resources, Community, Profile and privacy, plus Share something) and `TabBar` with `MENTOR_TABS` (Inbox, Hours, Impact, Resources, Me). Before a mentor is active, `JoinShell` in `src/app/mentor/mentor-kit.tsx` frames the apply, status and orientation screens.
Screens: M5 to M8 and DK7 to DK10 Apply (including the signature), M14/DK11 Application status, M15/DK12 Orientation, EX10 Declined and appeal, D5 Inbox, D6 Ask summary, EX13 Return Ask, D7 Hours (both states), D23 Availability, EX12 Hours reached, D8 Close-out, EX2 Change time, CL4 Pre-join (including too early), D24 and P03 Contribute and Resources (including empty), D25 Impact, D26 Volunteer, D27 Responses, D28 Profile, P04 and EX11 Annual re-affirmation (all states).
Logic: `mentor.ts`, `mentor-asks.ts`, `mentor-extra.ts`, `mentor-profile.ts`, `mentor-resources.ts`, `reaffirm.ts`, `domain/mentor-application.ts`.
Routes: `/mentor` (D5; sends the mentor to their stage first), `/mentor/apply?step=1..4` (M5 to M8, DK7 to DK10), `/mentor/application` (M14/DK11, and EX10 when declined), `/mentor/orientation` (M15/DK12), `/mentor/asks/[id]` (D6), `/mentor/asks/[id]/step` (D27 step forward with times), `/mentor/asks/[id]/return` (EX13), `/mentor/responses` (D27), `/mentor/conversations/[askId]` (CL4 before the end of the call, then D8; `?after=1` from the room), `/mentor/conversations/[askId]/change` (EX2), `/mentor/conversations/[askId]/room` (in the call), `/mentor/conversations/[askId]/ics`, `/mentor/availability` (D23, EX12 when the month is given), `/mentor/settings` (D7, both re-affirmation states), `/mentor/reaffirm` (P04 and EX11, all states), `/mentor/impact` (D25), `/mentor/volunteer` (D26), `/mentor/profile` (D28), `/mentor/contribute` (D24), `/mentor/resources` (P03, with the empty state). `/settings`, `/settings/notifications`, `/settings/data` and `/settings/delete` now use the frame of whoever is signed in (`RoleShell`).
New logic: `mentor-ctx.ts` (guard) and `domain/mentor-gate.ts` (apply, status, orientation, active), info-request reply, one appeal, orientation request, signature on the draft (`mentor.ts`), response history and window times (`mentor-extra.ts`), disclosure (`reaffirm.ts`), the return reason on a referral, logged minutes and the follow-up offer on close-out (`connections.ts`), hours by month (`insight.ts`), and optional board fields on the application schemas.

### 5. Team admin console (71 boards)
Shell: `AdminMenu` (desktop) and `AdminBreadcrumb` (phone) with `ADMIN_NAV`. Also A18 Team sign-in and A25 MFA setup.
Screens, in order: A3 Overview, A1 Mentor applications, A6 Guardian queue, A7 Ask queue, A2 Ask review, A8 Summary composer, A26 Hand-match, A9 Step forward, A30 and A31 All Asks and Ask record, A32 Clear for under-18, A11 Incidents, A10 Moderation, A28 Data requests, A29 Help requests, A15 Audit log, A16 Accounts, A19 Team roles, A23 Suspend mentor, A13 and A27 Library admin and review cycle, A14 Events, A12 Taxonomy, P05 Email and SMS templates, A17 Broadcast, A4 Reports, A5 Configuration, A20 Queue health, A21 Search, A22 Bulk actions, A24 Reviewer playbook.
Logic: the `admin-*.ts` files, `review.ts`, `insight-admin.ts`, `templates.ts`, `audit.ts`, `mfa.ts`.
Fix while here: real role permissions. Today every team role gets full admin access (A19).

### 6. System states (shared)
FL1 to FL3 Flows (documentation only, no route), NT2 Email and SMS (check against `templates.ts`), NT3 Notification pop-up, ST1 Empty states, ST2 Errors and loading, ST3 Loading skeletons. Build ST1 to ST3 as components in `src/components/dc` early in section 2, because every list screen needs them.

## Effort

Boards per section (desktop and phone together): Sign-up 49, Mentee 105, Guardian 20, Mentor 60, Admin 71, System 10. The public site took one working session for 26 boards, including the shared kit. With the kit in place, expect about 25 to 35 boards per session. That's roughly 10 to 12 sessions for the rest, plus wiring and the end-to-end tests below.

## Testing for each section

- Screenshots against the board at 1280px and 390px for every route.
- `npx tsc --noEmit`, `npx next lint` and `npx vitest run` stay green.
- One Playwright journey per section against a seeded database: register and get guardian consent; minor Ask through to the call; guardian approvals; mentor application through to clearance; admin review.
