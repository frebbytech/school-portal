# UI refactor plan (admin app `client/` and student portal `student/`)

**Status:** proposal for review. No UI code has been changed by this plan. Prepared 2026-11-11.

`CLAUDE.md` is written for the backend and says not to redesign the UI unless asked. You have now asked, so this plan is the UI equivalent of the backend audit and plan. Once you approve it (or change it), I will add a UI section to `CLAUDE.md` and work in the same way as the backend: small stages, each on its own branch, never `main`, nothing merged without your review.

## 1. What is there today (measured, not guessed)

| | Admin app `client/` | Student portal `student/` |
|---|---|---|
| Size | 456 files, about 72,000 lines (about 13,000 of them are static country/town lists in `mockup/data`) | 229 files, about 19,500 lines |
| Stack | React 19, Vite 6, React Router 7, TanStack Query 5, MUI 6, Axios | same, with MUI 7 |
| Routes | 166 `<Route>` entries in one 1,558-line `pages/layouts/Root.jsx` | 6 layout files |
| Data layer | 26 API files, 79 files call `useQuery`, 83 call `useMutation` | 15 API files |
| Forms | Formik in 30 files **and** React Hook Form in 36 files, both with Yup | React Hook Form + Yup |
| Dates | `moment` in 41 files, `dayjs` in 4 | both libraries present |
| Dialogs | SweetAlert2 in 39 files | SweetAlert2 |
| Tests | **none** | **none** |
| Lint | ESLint runs, but only the basic React rules; the accessibility and React-hooks plugins are installed and not switched on | similar |

### Problems found (each one is in the code today)

| # | Problem | Evidence | Why it matters |
|---|---|---|---|
| U1 | A failed request with no server response (offline, server down, timeout) crashes with `TypeError` instead of showing a message | `throw error.response.data` in 63 places in `client/src/api` (only 4 use `error.response?.`) | Users on weak connections see a broken page, not "check your connection" |
| U2 | The query cache is thrown away whenever `App` re-renders | `new QueryClient(...)` is created inside the `App` component (`App.jsx`) | Lost caching, repeated requests, flicker |
| U3 | The access token is copied into several places: React state, the app's Axios instance defaults, the global `axios` defaults (all set in `UserProvider` / the student `AuthProvider`), plus per-call headers in `userAPI` and `platformAPI`. `levelAPI` also sent `Bearer ` + `localStorage["@user"]`, which holds only `{_id, id, profile}`, never the token; the request interceptor overwrote it, so it was harmless but wrong | `grep Authorization` | Several copies can disagree. There is also **no automatic retry after a 401**: the token is renewed by a timer one minute before it expires, so a laptop that sleeps past expiry gets errors until the page is reloaded |
| U4 | Two form libraries, two date libraries, plus unused packages | counts above; `react-dates`, `react-date-range`, `@mui/styles` have no importers | Inconsistent behaviour, larger bundle, harder onboarding |
| U5 | One 1,558-line file holds every route, menu entry and permission check | `Root.jsx` | Every new screen touches it; hard to test; permission rules are scattered |
| U6 | No tests at all on the front end | 0 test files | Nothing protects the screens from the contract changes below |
| U7 | `console.log` left in 39 files | grep | Noise, and can leak student data into browser consoles |
| U8 | The UI does not yet know about the backend's new rules | see section 2 | Screens will show raw errors or break |

## 2. Backend changes the UI must adopt (the contract has moved)

These are the visible changes from the backend stages (details in `docs/refactoring-progress.md`). This is Stage U1's checklist.

| Backend change | What the UI must do |
|---|---|
| Fee arrears now computed (`previous`, `totalOutstanding`) | Show them; re-check every screen that displays fee balances |
| Payment amount validated (positive, 2 decimals); unknown fields dropped | Same rule in the form; show the server message |
| Fee records or fee structures with payments cannot be deleted (409) | Hide or disable the delete button; explain why |
| Scores limited to the term's split (e.g. 40/60); total computed by the server | Cap the inputs to the split; show the server's total; remove client-side total/grade authority |
| Comments are an object of short text; hand-written remarks are no longer replaced | Remarks screen sends an object; show "auto-generated" until edited |
| Attendance: one register per class and day; entries must be class students; no future dates | Date picker limits; clear message on 400 |
| `mustChangePassword` on login (staff user object and student login response) | Prompt to change password after first login |
| Level removal returns 409 until the term lifecycle is finished | Show the "archive instead" message instead of a generic error |
| Student/teacher/parent deactivated, not deleted | Labels and buttons say "Deactivate" |
| Lists accept `?page=&limit=` and send `X-Total-Count` | Use server pagination for students, notifications, messages, events, announcements, attendance, fee records |
| Platform administrator role and `/platform` screen | Already added (login, schools, administrators); needs review and tests |
| Errors have `message`, `code`, `requestId` (or a bare string on older routes) | One error normaliser shows the message and quotes the request id for support |

## 3. Principles for this UI phase

1. **Same features, same routes, same look until a stage says otherwise.** Behaviour first, visuals second. Each stage is reviewable in a few screens, not "the whole app".
2. **Contract first, then screens.** The shared API client and error handling land before any screen is rewritten, so every later stage inherits the fixes.
3. **No new language or framework.** Keep React, Vite, MUI, React Router, TanStack Query, JavaScript (JSDoc where it helps). Remove libraries only when a stage has migrated their last user.
4. **Tests come with the code.** Vitest + React Testing Library for components and hooks, Mock Service Worker for the API, ESLint at zero warnings (turning on the accessibility and hooks rules). A few browser-level tests with Playwright for the critical flows (login, record payment, enter scores, take attendance).
5. **Server rules are never re-implemented as the only check.** The UI mirrors them for a good experience (caps, required fields) but treats the server's answer as the truth.
6. **I cannot build or run the front end in my sandbox** (no npm registry). Every stage is therefore verified by you running `npm run lint`, `npm test` and `npm run build`, and by screenshots or a short screen recording when the stage changes how something looks. I will say in each report exactly what I could and could not check.

## 4. Stages

Each stage is its own branch, small enough to review, with a rollback of "don't merge".

| Stage | Goal | Main work | Done when |
|---|---|---|---|
| **U0** Tooling | A safety net exists | Add Vitest, React Testing Library, MSW to both apps; ESLint with accessibility + hooks rules (existing violations listed, not mass-fixed); a `npm run check` that runs lint, tests and build | The checks run on your machine and fail on a deliberate break |
| **U1** API client and auth | One way to call the server | One Axios instance with: token attached from one place (memory, not `localStorage`), single refresh on 401 shared by concurrent calls, error normaliser (network, 400, 401, 403, 404, 409, 429, 5xx, with `requestId`), no `error.response.data` crashes; migrate the 26 API files mechanically; QueryClient created once; default retry/backoff rules; remove `console.log` | Offline and 4xx/5xx cases show messages on every screen; contract checklist in section 2 handled at API level |
| **U2** App shell and routing | Root.jsx becomes data | A route table (path, lazy component, required role, required school permission, menu entry), one `ProtectedRoute` that uses it, menu built from the same table; error boundary per area; page titles; 404/403 pages | Root.jsx under 150 lines; adding a screen touches one file; tests for role/permission gating |
| **U3** Design foundations | One visual language | Tokens from the existing palette (navy `#012E54`, peach `#ffc09f`) and typography; light and dark modes only if you want them; a small kit of shared components (page header, data table, empty state, confirm dialog replacing SweetAlert2, form fields, money and score inputs, status chips, skeleton loaders); shared between the two apps | The kit has tests and a simple catalogue page; one pilot screen rebuilt with it |
| **U4** Forms | One form approach | React Hook Form + Yup everywhere (it already has the most users); server errors mapped onto fields; migrate the 30 Formik files module by module together with their screens in U5; dates moved to `dayjs` | No Formik import left; `moment` only where a stage has not reached yet |
| **U5** Screens, by risk | Rebuild each area on the kit, with the server contract | In this order: (1) sign-in, platform screen, first-login password change; (2) fees and payments (arrears, payment form, no-delete rules); (3) exams (score entry with split caps, remarks, publishing); (4) attendance register; (5) students (list with server pagination, import, deactivate, transfers); (6) terms and levels (create term with classes, archive instead of delete); (7) teachers/users/permissions; (8) communications (messages, announcements, events, notes); (9) settings; (10) reports and printing | Each area: its screens use the kit and the API client, have tests for the main flow, and your sign-off |
| **U6** Student portal | Same foundations for students | Align on MUI 7 and the shared kit, remove the unused legacy dependencies, first-login password prompt, results/fees/attendance views using the new contract, mobile first | Parity with today's pages plus the contract items |
| **U7** Quality | Accessible, fast, mobile-friendly | Keyboard and screen-reader pass on the main flows, colour contrast, focus handling in dialogs; responsive layouts down to phone width (most users are likely on phones); bundle report and trimming (the 13,000 lines of static country/town data loaded only where needed, dependency pruning: unused packages, one rich-text editor, one date library); virtualised long tables | Lint with accessibility rules at zero warnings; bundle size before and after in the report |

Recommended order: U0, U1, U2 first (they are invisible to users and make everything else safer), then U3 with one pilot screen so you can judge the look before I rebuild more. After the pilot you decide whether to continue as planned.

## 5. Risks

| Risk | Mitigation |
|---|---|
| I cannot run the apps myself | Small stages, your `npm run check` output, screenshots; I do not claim a screen works unless it was observed |
| 166 routes and 456 files is large | The route table (U2) and kit (U3) turn the rest into repetition; areas are done in risk order and can stop at any point with the app still working |
| Visual drift between admin and student apps | One shared kit; decision on how to share it below |
| Behaviour users rely on changes by accident | Characterisation tests before each area is rewritten; same routes and labels unless stated |
| Token handling | The token is already kept in memory (not `localStorage`) and the refresh cookie restores the session on reload. U1b adds one shared "renew once and retry on 401" step; it needs a check of the cookie settings on your hosting (admin app, student app and API are on different hosts today, which makes the cookie `SameSite`/`Secure` settings matter; see `docs/deployment-and-migration.md`) |

## 6. Decisions I need from you

1. **Look and feel.** Keep today's look (navy and peach, MUI styling) and only tidy it, or a fresh visual direction? My recommendation: keep the identity, tidy spacing, typography and components, and judge it on the pilot screen before going further.
2. **Order.** Is fees/exams/attendance the right priority, or is there a screen your staff complain about most? That one moves up.
3. **Who uses it, on what.** Mostly phones, tablets or desktops? Slow connections? This decides how hard U7 pushes mobile and offline behaviour.
4. **Sharing code between the two apps.** (a) A small shared folder both apps import (an npm workspace), or (b) two copies kept in step. Recommendation: (a), but it changes how you install and deploy the front ends, so I want your OK.
5. **Test tools.** OK to add Vitest, React Testing Library, MSW and Playwright as dev dependencies?
6. **Hosting.** `vercel.json` is present: are both apps on Vercel with the API elsewhere? This matters for the cookie and token change in U1.
7. **Screenshots.** Can you send screenshots of the 5 to 8 screens you use most (or a short screen recording)? Without them I design from the code alone.

## 7. Decisions (answered 2026-11-13)

| Question | Answer | What it changes |
|---|---|---|
| Look and feel | Keep today's navy and peach and tidy it | U3 is a tidy-up of spacing, type, empty states and components, not a redesign |
| Priority screen | **Examination** | The Examination area becomes the pilot for the design kit (U3) and the first area in U5 |
| Devices | Admins and teachers on desktop; students on phones and tablets | Admin app: desktop-first, no phone redesign; student portal: mobile-first (U6/U7) |
| Shared code folder | Yes | A shared package used by both apps, added with U3 (changes `npm install` and deployment; instructions will come with that stage) |
| Test tools | Yes | Added in U0 |
| Hosting | Admin app, student app and API on different hosts now, one VPS later | Cookie and CORS settings must work for both layouts; checked in U1b |
| Screenshots | Provided (8 screens) | See section 8 |

## 8. Review of the screenshots (admin app, school "Nana Educational Complex")

Things I can see, with what I do not yet know marked as such.

| Screen | Observation | Plan |
|---|---|---|
| Every page | The navy sidebar stops at the height of the menu, leaving a white block beside long pages | Layout fix in U2/U3 (sidebar fixed to the full viewport height) |
| Dashboard | Heading reads "Fall 2025" while the current session is 2026/2026 Term 1. The text is not in the front-end code, so it probably comes from stored session or term data: needs checking | Investigate with you in U5 (Sessions) |
| Dashboard, Student home | Empty charts show an axis from 0 to 1 instead of "No attendance recorded yet" | Shared empty-state component (U3) |
| Student home | 100 students, 48 male + 40 female (88: the 12 with gender "Other" appear in no card or chart), a "Students for 2026/2026" chart showing 150 for Term 1, and 50 + 50 in the level chart. These numbers disagree with each other: cause not yet known (counts come from several server endpoints) | Audit the dashboard endpoints and make one source of truth (U5, students) |
| New Student | Date of birth is pre-filled with today's date, so a missing date goes unnoticed; once a field is filled its label is no longer visible | Empty DOB with a required rule; floating labels (U4/U5) |
| Levels | Clean; the "Action" column is empty | Fill or remove (U5) |
| **Examination (Day Care)** | "Failed Students 49" counts students who simply have no scores yet (49 of 50 have 0 of 7 subjects entered), and the pass/fail numbers are computed on the server. "Highest score 504" has no scale (7 subjects x 100 = 700 possible). The page address and the breadcrumb show the raw level id (`691780392684d5c5b9fa28e6`) instead of "Day Care". "Result Entry Progress 2%" is shown in red while nobody has started | Pilot screen (see section 9) |
| Attendance | Breadcrumb shows the raw level id; each row has its own Save button as well as Save Attendance (two ways to save, easy to lose unsaved rows); only Present/Absent | U5 attendance |
| Teacher profile | Fine; the "Manage Students" heading is used for what the admin menu calls Students | Consistent naming in the route table (U2) |

## 9. The Examination area as the pilot

Goal: the first screens rebuilt on the tidied design, with the server rules visible, so you can judge the new look on the screen your staff use most. Scope: the exam home (list of levels), a level's exam page, score entry (single student and whole subject), import, report cards. Planned changes, in order:

1. Foundations first (U0 and U1, done below): test tooling and the API error handling, because score entry saves many requests and must show clear messages when one fails.
2. The level exam page: pass/fail only for students whose results are complete ("Not yet entered" as its own count), a scale next to the highest and lowest scores, a readable breadcrumb and page title, progress that is not red at 2%.
3. Score entry: the two fields capped to the term's split (the page shows "50/50"), the total shown but computed by the server, unsaved-change warning, keyboard entry (Tab and Enter move down the column), server messages beside the row that failed, import with a row-by-row error list.
4. Remarks: hand-written comments kept, "automatic" shown until edited.
5. Report cards: unchanged content; layout checked for printing.

Backend changes this needs (small, listed here so they are not a surprise): the exam details endpoint should return a "results complete" count and compute pass/fail only over complete students; I will add this with tests and the front end will fall back to the current numbers until it is deployed.

## 10. Progress

| Stage | Branch | Status |
|---|---|---|
| U0 tooling | `ui/u0-tooling` | Written. Not run: needs `npm install` and `npm run check` on your machine |
| U1 API errors | `ui/u1-api-client` | Written (error normaliser in 85 places, QueryClient created once, junk header removed). Not run. Token renewal is U1b |
| U1b token renewal | `ui/u1b-token-renewal` | Written. Not run. Both apps renew the token once and retry when a request meets an expired session; concurrent failures share one renewal. The API answers an expired access token with **403** "Session has expired…" (and uses 403 for "no permission"), so the retry matches on that message as well as on 401 |
| U2 route table | `ui/u2-route-table` | Written. Not run. `Root.jsx` went from 1,558 lines (about 850 of them an old commented-out copy) to 71. Screens now live in `client/src/routes/routeTable.jsx` (one list: path, who may open it, which school module it needs); `access.js` filters it; `renderRoutes.jsx` builds the routes. Checked by script against the old file: the same paths for administrators and for teachers. Also fixes the screen list being cached on role only (school modules loaded later could be missing) and a crash when school information was missing |
| U3a Examination pilot, level page | `ui/u3a-exam-summary` (also needs `pilot/cookies-and-exam-summary` on the server for the new numbers) | Written. Not run. Summary cards: pass/fail only for complete results, "Results not complete" card, highest/lowest with "out of N" and a dash instead of 0 when nothing is entered; invented "9052900 LEVEL CODE" and always-green tick removed; progress bar no longer red at low percentages; breadcrumb shows "Details" instead of a database id. Works with an older server (extra cards hidden). Not yet done from section 9: score-entry screens, import error list, remarks, report-card print check |
| U3b Examination pilot, score entry and import | `ui/u3b-score-entry` (the bulk-upload message needs the server branch `pilot/cookies-and-exam-summary`) | Written. Not run. **Import:** every row is checked before sending; rows that cannot be imported are listed with the spreadsheet row number and the reason (not in this class, duplicate student, score above the term limit, blank index number); good rows still import and the confirmation says how many rows are left out; column titles show the real split (for example "Class Score (0-40)") instead of a fixed 50%; the server now says how many rows it skipped (still a plain string). **Single-student entry:** limits shown for the term's split, running total, Enter adds the score and the cursor returns to the subject box, the server's reason shows beside the list when a save fails (nothing is lost), browser warning before closing the tab with unsaved scores, no unhandled promise rejection. Also: an old commented-out copy of the form (about 270 lines) removed, test runner now resolves the `@/` alias with an absolute path |
| U3c remarks and report-card printing | `ui/u3c-remarks-print` | Written. Not run. **Remarks dialog:** fixed a bug where a comment typed by hand (not picked from the suggestions) was not saved; shows a notice when remarks were written automatically and saving will replace them; refreshes after the results reload; 1,000-character limit matches the server. **Report cards:** the card was a fixed 11.7 in box with hidden overflow (long result lists were cut off, short ones could spill a blank page) and crashed if the grade system had not loaded yet; now A4 with no printer margin, at least one page tall but growing when needed, one card per page, colours and watermark printed, same rules for one card and a whole class. **Must be checked by eye** on a real printer or "Save as PDF": see the checklist below |
| U4 dates and form foundations | `ui/u4-forms-dates` | Written. Not run. **Dates (admin app):** every `moment` import replaced by one `src/lib/dates.js` (dayjs with the ordinal, `L/LL/LLL`, between and same-or-after plugins) plus `toDateInput` and `formatDate`; a test fails if `moment` comes back. The two date pickers now use the dayjs adapter (they used the moment one, so they would have broken). Fixed on the way: payment dates printed a literal `yyyy` (invalid token); a cleared date in the session forms saved 1 January 1970, now it shows Required. **New Student:** date of birth starts empty and is required. **Forms:** `src/lib/formErrors.js` puts a server message on the matching field (or one message at the top of the form) for React Hook Form screens. **Not done here, on purpose:** the 29 Formik forms move with their screens in U5 (migrating them blind is riskier than doing each with its tests); the student app still has `moment`/Formik (U6); `moment` stays in `package.json` until you run `npm uninstall moment` after a good build |
| U5a sign-in screen | `ui/u5a-signin` | Written. Not run. First Formik screen moved to React Hook Form + Yup (`components/forms/LoginForm.jsx`, 6 tests). **Fixed:** a network failure threw an object that the page tried to print as text, which crashed the sign-in page; the Enter key did nothing (the button was not a submit button); browsers could not offer saved passwords (`autoComplete="no"`). Same look; the reason for a failed login now shows above the fields (and as an alert for screen readers). Not changed: the 8-character minimum on the password box (it blocks anyone with a shorter old password; your decision) and the first-login password prompt (`mustChangePassword`), which is the next piece |
| U3d shared design kit between the two apps | | Not started; see note below |

### Cookie and CORS findings for hosting (U1b)

- The sign-in cookies (`refresh_token`) are set with `Secure`, `SameSite=None` and, in production, a **hard-coded** `domain: "school-portal-aivn.onrender.com"` (`routes/userRoute.js` login, `routes/studentAuthRoute.js` login). On any other host the browser rejects the cookie, so token renewal and reload-restores-session stop working. It works for separate hosts only while the API stays on that Render address.
- Moving everything to one VPS (apps and API on one domain or subdomains of it) needs: the domain taken from an environment variable (for example `COOKIE_DOMAIN`, empty = host-only), `SameSite=Lax` when the apps share the site, and `CORS_ORIGINS` listing each app origin. This is a small backend change; it is not made yet.
- The admin cookie path is `/api/frebbys/v1/users/verify` and the student cookie path `/api/frebbys/v1/student-auth/refresh`; a reverse proxy must keep those paths unchanged.

### Finding: `invalidateQueries([...])` used in a form this library version does not support

99 places call `queryClient.invalidateQueries(["name", id])` (array form, the old TanStack Query v4 style). The app uses v5, where the argument is an object (`{ queryKey: [...] }`); an array is read as an empty filter, so **every** query is refreshed, not the one named. Screens still show fresh data, at the cost of extra requests after each save. A mechanical fix is easy, but some screens may be relying on the accidental refresh-everything (for example the dashboard after a change), so each one needs checking. Proposed for U4/U5, screen by screen, not as one sweep. New code in this phase does not use the array form.

### Correction: the "sidebar stops at menu height" finding

In the full-page screenshots the white area beside long pages looked like a layout fault. It is not: the sidebar is `position: sticky; top: 0; height: 100svh`, so in real use it stays pinned while the page scrolls, and a stitched full-page screenshot simply shows it at one screen height. No change needed. Separate, minor: the menu list relies on a large bottom padding (`pb: 36`) so the last items can be scrolled into view on short screens; worth tidying when the sidebar is rebuilt (U3d).

### Print check for report cards (do this once, by eye)

1. Open a student's report card, press Print, choose "Save as PDF", paper A4, margins "None" or default (the page now sets its own).
2. Expect exactly one page, nothing cut off at the bottom, no blank second page, the school watermark and coloured header cells visible, and no "Add Remarks"/"Print" buttons.
3. Try a student with many subjects (about 15): expect the card to continue onto a second page rather than being clipped.
4. Open "View Students Report" for a class and print all: expect one card per page, no card starting halfway down a page.
5. Try both report templates (Settings, report template 1 and 2).

### U3d note: why the shared design kit is not started

Sharing components between the admin and student apps means changing both builds (a shared folder, import paths, lint and test config). I cannot run a build here, so a wrong guess would leave both apps unable to build. Proposed approach once the pilot looks right to you: first extract a plain `design-tokens` file (colours, spacing, radii, type sizes) used by both MUI themes, which needs no build changes; then move the few truly shared components (cards, table, dialog title, error text) behind an `@school-portal/ui` alias, one component at a time, with you running `npm run build` in both apps after each.
