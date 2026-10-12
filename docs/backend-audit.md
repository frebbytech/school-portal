# Backend Audit — School Portal

**Phase:** One (Repository Discovery and Audit) — read-only. No application code, schema, dependency or environment file was changed.
**Repository:** `frebbytech/school-portal`, branch `main`, commit `eee141f` ("v1.0.0").
**Method:** static reading of the backend source plus a static cross-match of the two frontends' API calls against the backend routes. **Nothing was run against a database or the live deployment**; no tests exist to run. Items that need runtime confirmation are labelled *Potential*.

**Labels used**

- **Confirmed** — the defect is visible directly in the cited code.
- **Potential** — plausible from the code, but depends on runtime behaviour, data or usage that was not verified.

> **Secrets handling.** Credentials found in source are described here but deliberately **not reproduced**. Treat every credential listed in finding C-1 as compromised.

---

## 1. Existing technology stack

| Concern | What the repo actually uses | Evidence |
|---|---|---|
| Runtime / language | Node.js (`engines`: 20.17+ / 22.9+), plain JavaScript, CommonJS | `package.json` |
| Web framework | Express 4 | `server.js` |
| Database | **MongoDB** via **Mongoose 8** | `db/DBConnection.js`, `models/*.js` |
| Dead alternative | `db/knex.js` exports `undefined` (all code commented out); `knex`/`mysql2` referenced only in comments | `db/knex.js`, `routes/termRoute.js:17` |
| Authentication | JWT bearer access token (1h) + JWT refresh token in an HttpOnly cookie; `bcryptjs` hashing | `routes/userRoute.js`, `routes/studentAuthRoute.js`, `middlewares/verifyJWT.js` |
| Sessions | `express-session` with the default in-memory store | `server.js:124-147` |
| Validation | `express-validator` used in one route file (`noteRoute.js`); otherwise ad hoc | `routes/noteRoute.js` |
| File uploads | `multer` disk storage to `./images/*`, then re-uploaded to **Firebase Storage** | `routes/*Route.js`, `config/uploadFile.js`, `firebase.js` |
| Email | `nodemailer` (five near-duplicate modules) | `config/mail/*.js` |
| SMS | HTTP API via `axios` (`SMS_URL`, `SMS_API_KEY`) | `config/sms/messenger.js` |
| PDF reports | EJS templates rendered to PDF with Puppeteer | `config/generateReportTemplate.js`, `config/generateReport.js`, `views/*.ejs` |
| Spreadsheet import | Client-side parsing (XLSX/CSV in the frontends); templates served from `templates/` | `server.js:208-221` |
| Security middleware | `helmet`, `cors`, `express-rate-limit` (login only) | `server.js`, `routes/userRoute.js:29-43` |
| Logging | `morgan` + `console.*` (50 call sites in `routes/`, `config/`, `middlewares/`, `models/`) | grep |
| Tests | **None** (no test runner, no test files) | repo tree |
| Lint / format | `npm run lint` calls `eslint`, but ESLint is not a dependency and there is no backend ESLint config | `package.json` |
| CI/CD, Docker, reverse-proxy config | **None in the repo** | repo tree |
| Hosting hints | Render (`school-portal-aivn.onrender.com` hardcoded in cookie domain and CORS defaults), Vercel for frontends | `server.js`, `routes/*Route.js` |
| Git state | Single commit; clean working tree at audit time | `git log`, `git status` |

**Unused dependencies** (no non-comment `require` found in backend code): `apicache`, `install`, `jspdf`, `mysql2`, `npm`, `rate-limit-mongo`, `react-dnd`, `react-dnd-html5-backend`, `uuid`; `knex` appears only in commented-out code. `rate-limit-mongo` being unused means the rate limiter uses the default in-memory store.

**Frontends in the same repository** (not audited, only read for API usage): `client/` (admin/teacher portal, Vite + React) and `student/` (student portal, Vite + React). The backend is everything else at the repository root.

---

## 2. Current backend architecture

A flat Express application. There is no service or repository layer: **route files contain HTTP handling, validation (rarely), business rules, and Mongoose queries together.**

```
HTTP  ->  server.js (helmet, cors, cookies, json 50 MB, session, morgan, static files)
      ->  public routers:   /users, /schools, /student-auth          (auth applied per route, inconsistently)
      ->  app.use(verifyJWT)                                         (signature check only)
      ->  protected routers: 21 routers under /api/frebbys/v1/...    (no role/permission checks)
      ->  404 handler -> global error handler (JSON {status, statusCode, message})
```

- `controllers/studentController.js` and `controllers/userController.js` exist but are **empty (0 bytes)**; they are not imported anywhere.
- Business logic that is not inline lives in `config/` (grading, ranking, remarks, fee/attendance aggregation, mail, SMS, PDF).
- Some Mongoose models contain behaviour: `models/examinationModel.js` computes `scoresWithTotal` through an **async virtual that queries the database** (`Level.findById(...).populate("grades")`) every time it is read.
- Startup: the server listens only after the Mongo connection resolves (`server.js:259-281`); `unhandledRejection` and `uncaughtException` both call `process.exit(1)` (`server.js:284-292`).

**Tenancy model.** The system is **multi-tenant by `school`**: most models carry a `school` ObjectId and the JWT carries `school`. Tenant scoping is applied inconsistently (see §6 and finding C-6).

---

## 3. Directory structure and responsibilities

| Path | Responsibility |
|---|---|
| `server.js` | App bootstrap, middleware, router mounting, error handling, graceful shutdown |
| `db/DBConnection.js` | Mongoose connection (hardcoded URL, see C-1) |
| `db/knex.js` | Dead code |
| `middlewares/verifyJWT.js` | `verifyJWT` (access token), `verifyRefreshJWT` (refresh cookie → user lookup) |
| `routes/` (24 files, 194 endpoints) | HTTP handlers **and** business logic, per resource |
| `models/` (31 files) | Mongoose schemas; some contain virtuals/logic |
| `config/` | Helpers: `helper.js` (525 lines, mixed utilities), `helpers/examination.js` (ranking/analytics), `helpers/fees.js`, `generate*.js`, `mail/`, `sms/`, `uploadFile.js`, `rank.js` |
| `views/` | EJS/HTML report-card templates (`template1.ejs`, `template2.ejs`, `report.ejs`, `reportcard.html`) |
| `templates/` | `.xlsx` import templates served to the frontends |
| `reports/` | Output directory for generated PDFs (served statically — see H-9) |
| `images/` | Upload scratch directory (git-ignored); served statically |
| `controllers/` | Two empty files |
| `firebase.js` | Firebase app + Storage + Firestore initialisation |
| `client/`, `student/` | Frontends (out of scope) |

---

## 4. API endpoint inventory

**194 endpoints** across 24 router files, all under `/api/frebbys/v1`. Public (no auth) routers are `users`, `schools`, `student-auth`; everything mounted after `app.use(verifyJWT)` (`server.js:185`) requires a valid JWT **but no particular role**. The full table is in **Appendix A**.

Summary by router (endpoint counts): users 17, levels 19, students 13, examinations 12, current-fees 11, terms 11, teachers 9, attendances 8, notifications 8, courses 7, fees 7, student-auth 7, announcements 6, departments 6, events 6, houses 6, parents 6, schools 6, subjects 5, grades 5, holidays 5, messages 5, sessions 5, notes 4.

Cross-cutting observations (all confirmed from code):

- **Mixed response shapes.** Handlers return bare strings (`res.json("Changes Saved!")`), bare arrays/objects, or `{message}`; the global handler returns `{status, statusCode, message}`. The frontends depend on these shapes (see §13).
- **HTTP status misuse.** Missing records and bad credentials return `404`/`403`/`401` inconsistently (e.g. wrong password → `404`, `routes/userRoute.js:141,146`; expired token → `403`, `middlewares/verifyJWT.js:26`; deletions → `201`).
- **Side-effecting GETs.** `GET /examinations/publish` and `GET /examinations/:id?publish=...` send SMS/email and generate PDFs (`routes/examinationRoute.js:211,616`); `GET /attendances/:id` **creates** an attendance record when none exists (`routes/attendanceRoute.js:102-151`); `GET /students/:id/parent` ignores its path parameter.
- **Wrong ID-in-path/query conventions.** e.g. `DELETE /students?id=` (backend) vs the admin client's `DELETE /students/:id`.
- **No pagination anywhere.** Every list endpoint returns the full result set (e.g. `routes/studentRoute.js:35`, `routes/attendanceRoute.js:15`, `routes/currentFeeRoute.js:25`).
- **Dead / mismatched endpoints** — see §13.

---

## 5. Database entities and relationships

MongoDB collections (Mongoose models; `db.model(...)` on a single named connection):

```
School ──< User (role: administrator|teacher|student|parent; permissions[])
School ──< Session ──< Term (status: upcoming|current|archived; active flag)
Term/Session ──< Level (class instance per term; subjects[], students[], grades→Grade, fee→Fee, teacher→User)
Level >── Student (Level.students[] and Student.level — both directions stored)
Student ──1:1── StudentAuth (same _id as Student; login credentials)
Student ──< Parent
Student × Term × Level ──1── Examination (scores[] embedded, overallScore, comments{})
Student × Term × Level ──1── CurrentFee (payment[] embedded)   Fee (level × term; amount[] line items)
Level × date ──1── Attendance (status[] embedded per student)
Subject, Course (level×subject×teacher), Department, House, Grade (ratings[])
Message, Notification, Event, Announcement, Holiday, Note, Log (unused), Medical, Headmaster, OverallScore …
```

Schema observations:

| # | Observation | Evidence | Status |
|---|---|---|---|
| D-1 | `Examination` and `CurrentFee` have **no `school` field**; `Attendance` has none either. Tenant isolation for these must be derived through `level`/`term`, and today is not enforced. | `models/examinationModel.js`, `models/currentFeeModel.js`, `models/attendanceModel.js` | Confirmed |
| D-2 | **No uniqueness** on `Examination {session,term,level,student}`, `CurrentFee {session,term,level,student}`, or `Attendance {level,date}`. Duplicates are possible under concurrent requests. | models above; only non-unique compound indexes | Confirmed |
| D-3 | `Student.indexnumber` and `StudentAuth.indexnumber` are **globally** unique, but the app treats students as per-school (`routes/studentRoute.js:437`). Two schools cannot share an index number. | `models/studentModel.js:17-23`, `models/studentAuthModel.js` | Confirmed |
| D-4 | `User.username` and `User.email` are globally unique, but login looks up `{school, username}` (`models/userModel.js:116`). | `models/userModel.js` | Confirmed |
| D-5 | `Grade.name` is `unique` with a **static** default (`Grade-System-${randomUUID()}` is evaluated once at module load, `models/gradeModel.js:20-23`), so every unnamed grade in a process gets the same name and the second insert fails; uniqueness is global across schools. | `models/gradeModel.js` | Confirmed (static); runtime behaviour Potential |
| D-6 | The intended partial unique index on `Term` is malformed: `TermSchema.index({active:1, unique:true, partialFilterExpression:{...}})` passes `unique`/`partialFilterExpression` as **index keys**, not options (`models/termModel.js:57-61`). The uniqueness it appears to promise is not what is created. | `models/termModel.js` | Confirmed (definition); effect on the live index Potential |
| D-7 | **Money is stored as JS floats** inside untyped arrays: `CurrentFee.payment: Array`, `Fee.amount: Array`; sums use `_.sumBy`. | `models/currentFeeModel.js:27`, `models/feeModel.js:24` | Confirmed |
| D-8 | Scores, payments, attendance status and remarks are **untyped embedded arrays/`Mixed`**; no per-element validation or constraints. | `Examination.scores`, `Attendance.status`, `Student.medical/academic`, `Term.exams` | Confirmed |
| D-9 | Date fields are inconsistently typed: `Term.from/to/vacationDate` are `String`; `User.dateofbirth` is `String`; `Student.dateofbirth` is `Date`; `Attendance.date` is `Date` but queried with raw strings (`routes/attendanceRoute.js:108-111`). | models | Confirmed |
| D-10 | `Level` is per-term (a "class" is re-created each term), and `students[]` is stored on both `Level` and `Student.level`; the two can diverge (see H-6). | `models/levelModel.js`, `routes/studentRoute.js:555-561` | Confirmed |
| D-11 | `Log` model exists but is **never used** — there is no audit trail. | `models/logModel.js`; no references | Confirmed |
| D-12 | `StudentAuth.password` defaults to `""`. | `models/studentAuthModel.js` | Confirmed |
| D-13 | No migrations or seed tooling exist; the only seed is an HTTP endpoint (C-3). | repo tree | Confirmed |

Indexes: single-field and some compound indexes exist (e.g. `Student {school,indexnumber}`, `User {school,username}`); `Examination`/`CurrentFee` have per-field indexes but not tenant- or query-aligned compounds beyond `Examination {session,term,level,student}`.

---

## 6. Authentication and authorization flow

**Staff login** (`POST /users/login`, `routes/userRoute.js:133-208`)
1. `{username, code, password}`; user looked up by `{school: code, username}`; `bcrypt.compareSync`; `active` checked.
2. Returns a 1-hour access JWT in the body and a 30-day refresh JWT in an HttpOnly cookie (cookie `maxAge` is 7 days, `path=/api/frebbys/v1/users/verify`). The access token contains the whole user profile, including `role`, `permissions` and `school`.
3. `POST /users/verify` (`verifyRefreshJWT`) re-reads the user from Mongo, issues a new access token. It does **not** check `active`.

**Student login** (`POST /student-auth/login`, `routes/studentAuthRoute.js:98-193`): looks up `StudentAuth` by `indexnumber` only (no school), issues a 15-minute access token `{_id,id,school}` signed with the **same `JWT_SECRET`**, plus a refresh token signed with a different secret/env (`REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`) — while staff use `JWT_REFRESH_SECRET`.

**Request authorization.** `verifyJWT` (`middlewares/verifyJWT.js:6-33`) only verifies the signature and sets `req.user`. **No route anywhere checks `role` or `permissions`** (grep confirms no role/permission guard in `routes/` or `middlewares/`). `School.permissions` and `User.permissions` exist as data but are enforced only in the frontend UI.

**Tenant scoping.** Applied via `req.user.school` in some handlers (e.g. `studentRoute.js:38`, `teacherRoute.js:31`, `levelRoute.js:122`) and absent in many others (§7, C-6).

---

## 7. Existing security controls

| Control | State |
|---|---|
| Password hashing | `bcryptjs`, cost 10 — adequate. Applied on create/reset paths, **bypassed** on some update paths (C-5). |
| Helmet | Enabled, but the CSP has a placeholder directive (`trusted-cdn.com`) and is irrelevant for a JSON API. |
| CORS | Allowlist from `CORS_WHITELIST`, else hardcoded origins **with trailing slashes** that can never equal a browser `Origin` header (H-10). Requests with no `Origin` are always allowed. |
| Rate limiting | `/users/login` only: 5 requests / 15 min per IP, in-memory. **The global limiter is commented out** (`server.js:177`). Student auth, password reset and messaging endpoints are unlimited. |
| Cookies | `httpOnly`, `secure`, `sameSite=none` for refresh tokens — appropriate for the cross-site deployment. |
| Input validation | Effectively none server-side except `noteRoute.js` and Mongoose schema rules. |
| Body limits | `express.json` limit **50 MB**, `urlencoded` 50 MB with 50 000 parameters (`server.js:114-121`). `multer` has no size/type limits. |
| Error handling | Central handler hides messages in production. Handlers frequently bypass it with ad hoc responses. |
| Logging | `morgan` to `access.log` in production; no request IDs, no redaction policy, no structured logs. |
| Audit trail | None (`Log` model unused). |

---

## 8. Major performance bottlenecks

All *Confirmed from code*; magnitudes are **Potential** until profiled (the CLAUDE.md rule is to profile before optimising).

| # | Issue | Where |
|---|---|---|
| P-1 | `Examination.scoresWithTotal` virtual runs a `Level.findById().populate("grades")` **per exam document read**. Report previews, analytics and publishing call it per student, and `getSubjectPosition`/`getMyPosition` add further queries per subject per student. | `models/examinationModel.js:71-94`, `routes/examinationRoute.js:191-200,1026-1040`, `config/helpers/examination.js` |
| P-2 | N+1 queries: `Fee.findOne` per fee record; `User.findById` per attendance record. | `routes/currentFeeRoute.js:104-118,148-175,340-359`, `routes/attendanceRoute.js:67-92` |
| P-3 | Unbounded, unpaginated lists and whole-collection loads (`Student.find({school})`, `CurrentFee.find()`, `Attendance.find({active:true})`, dashboards that populate every student of every level). | `routes/studentRoute.js:35-43,57-174`, `routes/currentFeeRoute.js:25-31`, `routes/levelRoute.js:148-234` |
| P-4 | `generateTotalGrade` runs an unused `Subject.find({isCore:true})` over the whole collection on every call. | `config/generateTotalGrade.js:14-16` |
| P-5 | Puppeteer launches **a new browser per report** (up to 5 concurrent via `pLimit(5)`), with `timeout: 0` and no `finally { browser.close() }`; a failure leaks the browser process. | `config/generateReport.js:3-47` |
| P-6 | Publishing generates all PDFs, emails and SMS **inside the request**; it can run for minutes (no job queue, no timeout). | `routes/examinationRoute.js:211-399` |
| P-7 | A new `nodemailer` transport is created (and `verify()` called) for **every** message. | `config/mail/*.js` |
| P-8 | Per-tenant dashboards compute aggregates in JS over fully loaded documents rather than in the database. | `routes/levelRoute.js`, `routes/studentRoute.js:57-174`, `config/helpers/*` |
| P-9 | Missing tenant/query-aligned indexes for several hot filters (`Attendance {level,date}`, `CurrentFee {student,term}`, `Fee {level,term}`). | models |

---

## 9. Code duplication and maintainability issues

- **Five mail modules** doing the same job with different bodies: `config/mail/{mail,mail2,mailer,mails,sendEmail}.js`.
- **`LEVEL_OPTIONS` defined twice with different values** — `config/helper.js` uses `"Junior High School 1"`, `config/helpers/fees.js` uses `"J.H.S 1"`. Level sorting differs by call site.
- **The "current term" response shape** (`core{...}`, `exams`, `termId`, `sessionId`, …) is hand-copied in `termRoute.js` (three times) and `studentAuthRoute.js` (three times).
- **The "logged-in user" payload** is hand-copied six times across `userRoute.js` and `verifyJWT.js`.
- `{ ...student._doc, fullName, levelId, levelName }` mapping repeated across `levelRoute.js`/`studentRoute.js`.
- **Giant route files** mixing concerns: `examinationRoute.js` (1 090 lines), `levelRoute.js` (844), `studentRoute.js` (711), `termRoute.js` (571), `userRoute.js` (595).
- **`_.isEmpty` used on Mongoose result objects** where it can never be true (`UpdateResult`/`DeleteResult`), so the "not found" branches after `updateOne`/`deleteMany` are dead code (e.g. `termRoute.js:513-523,534-546`, `levelRoute.js:653-659`, `notificationRoute.js:79-85`).
- **Commented-out code** throughout (knex snippets, old routes) and **50 `console.*` calls**.
- Dead code: `db/knex.js`, empty `controllers/`, `setActive()` (`termRoute.js:19-25`), `getImageAsBase64`, `models/logModel.js`.
- Typos in contracts: `query.status = "curent"` (`termRoute.js:114`), `mesaage` (`studentRoute.js:704`).
- No naming, error-handling or response-shape convention; mix of `Promise.all(map(async…))` with and without proper awaiting.

---

## 10. Existing tests and coverage gaps

**There are no automated tests**, no test runner, no test database config, no CI. Coverage is 0%. The highest-value characterization targets (to be written *before* each module is refactored, per CLAUDE.md §14):

1. Auth: staff login/refresh/logout, student login/refresh/reset, and a matrix of "role × endpoint" access.
2. Tenant isolation across `school`.
3. Fees: payment append, balance/arrears calculation, previous-term arrears.
4. Examinations: score merge, `overallScore`, grading by `Grade.ratings`, aggregate grade (`generateTotalGrade`), position/ranking.
5. Attendance: create-on-read, upsert keys, weekend handling.
6. Term/session lifecycle: create term, set current, archive.
7. Student lifecycle: create (multi-document), transfer between levels, disable, delete.

---

## 11. Integration dependencies

| Integration | Where | Notes |
|---|---|---|
| MongoDB (Atlas in production) | `db/DBConnection.js` | Hardcoded production URL (C-1). |
| Firebase Storage | `config/uploadFile.js`, `firebase.js` | Profile/badge images; `uploadMultipleImages` and `getImageAsBase64` are broken (H-7). Firestore is initialised but not used by the backend code reviewed. Firebase web-SDK config is read from env. |
| SMTP (nodemailer, Gmail-style `service`) | `config/mail/*.js` | TLS certificate verification disabled (H-8). |
| SMS HTTP API | `config/sms/messenger.js` | Env `SMS_URL`, `SMS_API_KEY`; errors are swallowed and callers report success (H-4). Sender name `"FrebbyTech"` hardcoded in `sendSMS`. |
| Puppeteer / Chromium | `config/generateReport.js` | Needs a Chromium available on the host (`.puppeteerrc.cjs`). |
| Render / Vercel | CORS, cookie domain | Host names hardcoded in source (`server.js`, `userRoute.js`, `studentAuthRoute.js`). |
| Frontends `client/`, `student/` | via REST | See §13. |

**Environment variables read by the backend:** `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`, `ACCESS_TOKEN_EXPIRY` (referenced only in a comment), `SESSION_SECRET`, `TOKEN`, `CORS_WHITELIST`, `CLIENT_URL`, `STUDENT_URL`, `MAIL_CLIENT_{SERVICE,USER,PASS,ID,SECRET}`, `MAIL_REFRESH_TOKEN`, `MAIL_REDIRECT_URL`, `SMS_URL`, `SMS_API_KEY`, `FIREBASE_*`, `MEASUREMENT_ID`, plus unused leftovers (`MONGO_URL`, `MONGO_URL_LOCAL`, `DB_*`, `DB_LOCAL_*`). **No `.env.example` exists and nothing validates env at startup** (`.env` is git-ignored — appropriate).

---

## 12. Findings: critical risks and recommended improvements

### Critical

| ID | Finding | Evidence | Status | Recommendation |
|---|---|---|---|---|
| **C-1** | **Hardcoded production database credential** in source: the production MongoDB Atlas connection string, including username and password, is committed. The same literal string value is also reused as the seeded admin password (C-3). The `MONGO_URL` env path is commented out. Anyone with repo access (the repository is public per the clone path used) can read/write the production database. | `db/DBConnection.js:6-8`; `routes/userRoute.js:82` | **Confirmed** | **Immediately rotate** the Atlas user password and any account reusing it; move to `MONGO_URL` env; purge from git history only after rotation (history rewrite needs explicit approval). |
| **C-2** | **Unauthenticated deletion of any user.** `DELETE /users/:id` has no `verifyJWT`, and the users router is mounted *before* the global `verifyJWT`. | `routes/userRoute.js:546-565`, `server.js:180,185` | **Confirmed** | Require auth + administrator role + same-school check. The admin client already sends its bearer token (`client/src/api/userAPI.js:178`), so no client change is needed. |
| **C-3** | **Backdoor admin-creation endpoint** `GET /users/admin/add/:token`: creates an administrator with a hardcoded username, email, phone number and password, gated only by a URL-embedded token compared with `process.env.TOKEN` (non-constant-time, logged in access logs). Not called by the admin client. | `routes/userRoute.js:68-96` | **Confirmed** | Remove; replace with an out-of-band seed script (CLI), never an HTTP route. |
| **C-4** | **Student password reset does not verify the emailed code.** `POST /student-auth/reset-password` accepts `{studentId, newPassword}` and sets the password. Anyone who knows (or guesses) a student index number can take over the account. The code is also generated with `Math.random()`, stored in plaintext, and `confirm-reset-code`/`reset-password-request` have no rate limiting and disclose account existence (404). | `routes/studentAuthRoute.js:29-30,295-342` | **Confirmed** | Bind the reset to a verified, single-use, hashed, short-lived token (CSPRNG); rate-limit; uniform responses. |
| **C-5** | **Privilege escalation / account takeover via missing authorization and mass assignment on user endpoints.** Because `verifyJWT` checks only the signature (and student tokens use the same secret): <br>• `PUT /users/reset-password` lets *any* authenticated caller set *any* user's password by id (`:430-454`). <br>• `PUT /users` and `PATCH /users` spread `req.body` into `findByIdAndUpdate`, so a caller can set `role`, `permissions`, `school`, `active` on any user (`:278-334,503-517`). `PATCH /users` also writes `password` **unhashed** if supplied. <br>• `POST /users` spreads `req.body` after `school`, so the body overrides `school`/`role` and any caller can create an administrator (`:236-275`). <br>• `PUT /teachers` does the same with `upsert:true` (`routes/teacherRoute.js:224-252`). <br>• `PUT /schools` and `PUT /users/school` spread the body into school documents. | files/lines as cited | **Confirmed** | Central role/permission middleware; explicit field allow-lists per endpoint; ownership + tenant checks; hash passwords in one place. |
| **C-6** | **No role/permission enforcement and weak tenant isolation across the API.** (a) Student tokens are accepted by every protected route. (b) Staff of any role (e.g. teachers) can reach every admin endpoint. (c) Many handlers read or mutate by client-supplied id **without a school filter**: `GET /students/:id`, `PUT/DELETE /students`, all `current-fees` routes, `GET /attendances` (returns attendance for *all* schools), `GET/PUT/DELETE /grades/:id`, `DELETE /terms/:id`, `PUT /terms/remove`, `GET /users/:id`, `DELETE /fees/:id`, notes/notifications by id, etc. (d) `POST /messages/bulk` loads `Student.find({})`/`Parent.find({})` with **no school filter** and sends SMS/email to *every school's* contacts. (e) `POST /messages/resend` and `/quick` let any authenticated caller send arbitrary SMS/email through the school's provider. | e.g. `routes/studentRoute.js:196,520-585,688-709`, `routes/currentFeeRoute.js:25-31,199-205`, `routes/attendanceRoute.js:15-25`, `routes/messageRoute.js:118-131,79-108`, `routes/termRoute.js:168-195,529-569` | **Confirmed** (code); exploitability of each depends on knowing ids | Role/permission middleware on every router; derive `school` only from the verified token; scope every query; add the missing `school` field to `Examination`/`CurrentFee`/`Attendance` (additive migration). |
| **C-7** | **Financial integrity.** Payments are appended to an embedded array from client-supplied data with no validation and no idempotency (`POST /current-fees`, `routes/currentFeeRoute.js:419-453`: `paid`, `outstanding` and `date` come from the body); `PUT /current-fees` overwrites an entire fee document from `req.body` (`:456-472`); `DELETE /current-fees/:id` hard-deletes a student's financial record and returns `201` (`:474-482`); `outstanding` is client-computed; money is float-typed (D-7); no transaction, no audit record, no payment-status model. A double-click or retry double-credits. | as cited | **Confirmed** | Server-side balance computation, integer minor units (`pesewas`), idempotency key per payment, append-only ledger entries with `createdBy`, soft-void instead of delete. Preserve the existing response shapes the frontends read. |

### High

| ID | Finding | Evidence | Status |
|---|---|---|---|
| **H-1** | **Refresh does not honour account disablement.** `verifyRefreshJWT` never checks `active`, so disabled staff keep minting access tokens for up to 30 days. Likewise `student-auth/login` and `/refresh` never check `Student.active`, so a disabled student can still log in. Disabling a student updates `Student.active` only (`PATCH /students/disable`, which also uses `upsert:true`). | `middlewares/verifyJWT.js:35-98`, `routes/studentAuthRoute.js:98-284`, `routes/studentRoute.js:652-685` | Confirmed |
| **H-2** | **Student logout does not clear the refresh cookie** (clears `"refreshToken"`, cookie is named `"refresh_token"`). Staff logout correctly clears `refresh_token` but does not revoke it (no token store). Refresh tokens are not rotated or revocable. | `routes/studentAuthRoute.js:176,286-292`, `routes/userRoute.js:456-475` | Confirmed |
| **H-3** | **Unauthenticated data exposure.** `GET /student-auth/:id` returns a student's full record (including medical/academic Mixed data and school) to anyone with the id; `GET /users/school` returns the first school document; `GET /schools/:id` is public by school code; `/api/frebbys/v1/reports`, `/images`, `/views`, `/templates` are served statically with no auth. | `routes/studentAuthRoute.js:33-95`, `routes/userRoute.js:58-66`, `routes/schoolRoute.js:34-43`, `server.js:160-174` | Confirmed |
| **H-4** | **Unhandled-rejection process crash and swallowed failures in publishing.** `server.js` calls `process.exit(1)` on any `unhandledRejection`. In `GET /examinations/publish`, the email/SMS loops call `limit(() => ...)` without awaiting, `Promise.all([mailedReports, response])` passes arrays (so nothing is awaited), and `res.status(404)` is called inside a `.map` callback (can double-send headers). SMS/mail helpers `catch` and `console.log`, so the API replies `"ok"` even if nothing was delivered. | `server.js:289-292`, `routes/examinationRoute.js:309-398`, `config/sms/messenger.js:25-30,58-62`, `config/mail/*.js` | Confirmed (code); crash frequency Potential |
| **H-5** | **Exam business-rule defects.** (a) Position for every student on publish is computed with `studentRecords?._id` (an array → `undefined`), so ranks are wrong/empty (`examinationRoute.js:272-278`; the single-student path passes `studentRecord._id` correctly). (b) Every score save regenerates **random** remarks and **overwrites** manually saved comments (`generateRemarks`, `examinationRoute.js:843-857,905-917,962-975`). (c) Totals/grades trust client input: `totalScore` comes from the body and `overallScore` is summed from it; the DB virtual recomputes `classScore + examsScore` (string concatenation if numeric strings are sent), so stored and displayed totals can disagree; no check against the term's `scorePreference` (e.g. 50/50) or 0–100 bounds. (d) Read-modify-write merge of `scores[]` without concurrency control → lost updates when two teachers save the same student. (e) No locking/approval/publish state: published results can be edited at any time and there is no audit history. (f) Any authenticated user (including students) can write scores. (g) `generateRemarks` picks `EXCELLENT[Math.random()*VERYGOOD.length]` for ≥700 (wrong array). (h) The aggregate grade in `generateTotalGrade` is hard-coded by `highestMark` thresholds and ignores custom rating scales. | `routes/examinationRoute.js`, `config/generateRemarks.js:19`, `config/generateTotalGrade.js`, `models/examinationModel.js:71-94` | Confirmed |
| **H-6** | **Student lifecycle is non-atomic and inconsistent.** `POST /students` performs six writes (Student, StudentAuth, Level push, Examination, CurrentFee, Parents) with no transaction, so a mid-way failure leaves orphans. The default login password is the student's **phone number or index number**. `PUT /students` (academic) compares `ObjectId !== string` (always true) after `new:true`, so it re-pushes the student into `Level.students` every time and never removes the student from the previous level. `DELETE /students` hard-deletes the Student and leaves `StudentAuth`, `Examination`, `CurrentFee`, `Parent` and `Level.students` entries behind — destroying history that CLAUDE.md §6 says must be preserved. `PUT /students` also spreads `req.body` with `upsert:true` (mass assignment of `school`, `active`, `indexnumber`). | `routes/studentRoute.js:328-426,520-585,688-709,376-379` | Confirmed |
| **H-7** | **Broken/undefined references in upload code.** `uploadMultipleImages` references an undefined `filePath` (`config/uploadFile.js` loop), `getImageAsBase64` uses an un-imported `axios`, and `teacherRoute.js` calls `uploadMultipleImages` without importing it (`PUT /teachers/bulk-profile` throws). `uploadFile` swallows errors and returns `undefined`, which handlers then store as the profile URL. `multer` stores files under an attacker-influenced extension (`originalname.split(".")[1]`) with no size/type limits. | `config/uploadFile.js`, `routes/teacherRoute.js:10,293`, route multer setups | Confirmed |
| **H-8** | **TLS verification disabled for SMTP** (`tls: { rejectUnauthorized: false }`) in all five mail modules. | `config/mail/{mail,mail2,mailer,mails,sendEmail}.js` | Confirmed |
| **H-9** | **Report PDFs are written under a guessable, collision-prone name and served publicly.** `report_id` = `${fullName}_${levelName}_${term}`; two students with the same name collide (one student's report can be sent to the other's address); the name is unsanitised input to a file path (`reports/${id}.pdf`); the folder is statically served unauthenticated. The template name is read from `term.report.template` (settable via `PUT /terms`) into a file path. | `routes/examinationRoute.js:1065`, `config/generateReport.js:24`, `server.js:167-170`, `config/generateReportTemplate.js` | Confirmed (collision/exposure); path traversal Potential |
| **H-10** | **CORS default allowlist cannot match.** Hardcoded origins include trailing slashes (`"https://frebbys-school-portal.vercel.app/"`) so, when `CORS_WHITELIST` is unset, the deployed frontends are rejected (`Origin` has no trailing slash). | `server.js:69-98` | Confirmed |
| **H-11** | **Session middleware is effectively unusable and fragile.** Sessions use the in-memory store (lost on restart, not shared across instances) and the session cookie is path-restricted to `/users/verify`, so it is never sent to `/sessions`. `sessionRoute.js` reads `req.session?.user.school`, which throws a `TypeError` whenever `req.session.user` is unset (`?.` guards `session`, not `user`). | `server.js:124-147`, `routes/sessionRoute.js:11,41-42`, `routes/userRoute.js:225` | Confirmed (code); runtime effect Potential. Note: the admin client's `getAllSessions` is unused (static check). |
| **H-12** | **Fee-calculation bugs.** (a) `POST /current-fees/student` computes previous arrears as `_.sum(previousFees?.fees)` on an *array* (`.fees` is `undefined`), so **previous arrears are always 0** (`routes/currentFeeRoute.js:363-367`). (b) A missing fee record is created with `CurrentFee.create(...).select("payment")` — `create` returns a Promise, so this throws (`:381-389`). (c) Current-term fee uses `Fee.findOne({level})` without `term` (`:392-394`) while history endpoints use `{level, term}`, so the figure can come from the wrong term. (d) `percentage` divides by zero when no fee is set. | `routes/currentFeeRoute.js` | Confirmed |
| **H-13** | **Term lifecycle can leave the "current term" ambiguous or the request half-applied.** `PATCH /terms/:id` archives the current term then sets the new one in two non-atomic writes with no check that `status` is a legal transition; `POST /terms` creates session, term, grade, levels, students, exams, fees across many awaits with no transaction and returns `res.status(400)` from inside a `.map` (headers-sent risk) after partial writes; `Grade.findOne({name})` is not tenant-scoped, so one school can silently reuse another's grade scale; `DELETE /terms/:id` and `PUT /terms/remove` hard-delete terms (orphaning levels/exams/fees) with no school filter. `GET /terms/sessions` mistypes the teacher status filter (`"curent"`), returning nothing for teachers. | `routes/termRoute.js:114,198-398,498-569` | Confirmed |
| **H-14** | **Attendance integrity.** `GET /attendances` returns all schools' attendance; `GET /attendances/level/:id` **ignores `:id`** and returns everything in the first active term's date range; `GET /attendances/:id` creates records on read (and `level.students` throws if the level is missing); the two write endpoints upsert on **different keys** (`{session,term,level,date}` vs `{level,date}`) and compare a `Date` field to formatted strings; `PUT /attendances` spreads the body into the document; no unique index (D-2). | `routes/attendanceRoute.js` | Confirmed |

### Medium

| ID | Finding | Evidence | Status |
|---|---|---|---|
| M-1 | Redundant structure: five mail modules, duplicated `LEVEL_OPTIONS`, duplicated term/user payload builders (§9). | see §9 | Confirmed |
| M-2 | No pagination, sort or filter allow-listing on any list endpoint; dashboards load full collections. | P-3 | Confirmed |
| M-3 | `Level` creation from a template (`POST /levels/generate`) maps only `levelName` and then destructures fields that do not exist, then `insertMany` without `school`/`createdBy` (required) — the endpoint cannot succeed. `POST /levels/assign-teacher` queries `teacher: {_id: teacher}` against an ObjectId path. `POST /levels/delete/many` calls `Level.deleteMany(ids)` with an **array** as the filter. | `routes/levelRoute.js:394-474,685-705,649-661` | Confirmed (broken `generate`); `assign-teacher` / `deleteMany(array)` behaviour **Potential** (runtime semantics not verified — worth a characterization test before touching) |
| M-4 | `PUT /levels/assign-teacher` is check-then-set (race) and sends email inside the request, failing the request on SMTP errors. | `routes/levelRoute.js:708-766` | Confirmed |
| M-5 | HTML is concatenated into emails unescaped (`${body.message}`), and report templates are rendered from DB-supplied fields (EJS `<%= %>` escapes output in the templates reviewed — no `<%-` found). | `config/mail/mailer.js`, `views/*.ejs` | Confirmed (email); no template XSS found |
| M-6 | `convertImageToBase64` fetches any URL stored in `school.badge` / `student.profile` from the server; since those fields are settable through the mass-assignable `PUT /schools` / `PUT /students`, this is a server-side request forgery vector. | `config/helper.js:108-125`, `routes/examinationRoute.js:259-267` | Potential (mechanism confirmed; reachable endpoints depend on C-5/C-6) |
| M-7 | Login responses: wrong credentials return `404`; disabled account returns `404`; refresh failures return `403`. Clients may rely on these codes (see §13). | `routes/userRoute.js:141-154` | Confirmed |
| M-8 | Notification/note endpoints lack ownership checks (`PUT /notes/:id`, `DELETE /notes/:id`, `PUT /notifications` with `$set: {...body}`, `PUT /notifications/:id/read`, `PUT /notifications/:userId/read-all`). | `routes/noteRoute.js:46-95`, `routes/notificationRoute.js:33-65` | Confirmed |
| M-9 | `express-session` cookie `domain` is a hardcoded Render hostname in production; `secure:true` is forced in all environments. | `server.js:130-137` | Confirmed |
| M-11 | `Level.findByIdAndUpdate(..., {$push: {students: studentIds}})` in `POST /students/many` pushes an *array* value; whether Mongoose expands this to `$each` or nests the array was not verified (the dependency registry was unreachable from the audit sandbox). `$push` (not `$addToSet`) is also used everywhere, so duplicates are possible. | `routes/studentRoute.js:493-499,398-402` | Potential |
| M-10 | Unused/misplaced dependencies enlarge the attack surface and install time (§1). | `package.json` | Confirmed |

### Low

- L-1: Typos: `"curent"`, `mesaage`, `"Couldnt"`, `"vouchers"` in the report error text.
- L-2: Unused `Subject.find`, unused imports, `res.status(204).send('Grade removed')` (body on 204).
- L-3: `GET /students/:id/parent` ignores the path param and reads `req.query.id`.
- L-4: `package.json` has no `test` script, an unrunnable `lint` script, and the dev script depends on `console-ninja`.
- L-5: Name-based report ids and mixed case/trim rules on `indexnumber` (lowercased on write, uppercased on display).
- L-6: Hardcoded brand strings and phone numbers in code (`generateReport.js` footer, SMS sender).
- L-7: `Level.level` is an untyped `Object` (`{name, type}`) with `initials` stored separately; `levelName` is a virtual concatenation.

---

## 13. Frontend API dependencies that must remain compatible

Static analysis of `client/src/api/*.js` and `student/src/**` (186 and 74 call sites) matched against the 194 backend routes. **This is a heuristic extraction** (template-literal URLs and a few dynamically built paths were matched by pattern), so it must be re-verified endpoint by endpoint before each module is refactored.

### 13.1 Auth contracts (must not change without a coordinated frontend release)

| Contract | Detail |
|---|---|
| Base URL | `VITE_BASE_URL` → `/api/frebbys/v1`; both frontends use `withCredentials: true` |
| Staff login | `POST /users/login` body `{username, code, password}` → `200 {token, school}`; sets cookie `refresh_token` (`httpOnly`, `secure`, `sameSite=none`, `path=/api/frebbys/v1/users/verify`) |
| Staff refresh | `POST /users/verify` (cookie only) → `200 {token}`; admin client schedules a refresh ~1 min before the token's `exp` (`client/src/context/providers/UserProvider.jsx`) |
| Staff logout | `PUT /users/logout` → `204` |
| Student login | `POST /student-auth/login` body `{studentId, password}` → `200 {accessToken, data:{student, school, session}}`; cookie path `/api/frebbys/v1/student-auth/refresh` |
| Student refresh | `POST /student-auth/refresh` → `200 {token, data:{student, school, session}}` — **note `accessToken` on login but `token` on refresh**; the student client reads both shapes (`student/src/context/AuthProvider.jsx`) |
| Student reset | `POST /student-auth/reset-password-request`, `/confirm-reset-code`, `/reset-password` (request/response messages are read by the UI) |
| Token claims read by the UI | access token payload fields `id`, `_id`, `school`, `role`, `permissions`, `exp` (the student client calls `parseJwt`) — do **not** shrink the JWT payload without checking the frontends |
| Authorization header | `Authorization: Bearer <accessToken>`; **expired/invalid token returns `403`** and `401` for missing — if a frontend interceptor keys off these codes, they must be preserved (the student client's interceptor is commented out; the admin client uses a timer-based refresh) |

### 13.2 Student portal depends on shared "admin" endpoints

The student portal calls the **same router paths as the admin app**, authenticated with a *student* token. Any role-based authorization added to fix C-5/C-6 must therefore **allow-list the student-facing endpoints** rather than block students outright. The student app's *actually used* API functions (traced from imports, not just exports) call:

- `GET /examinations/:id`, `/examinations/analytics/:id`, `/examinations/academic/:id`
- `GET /announcements`, `/events`, `/events/:id`, `/holidays?year=`
- `GET /attendances/level/:id` (the student dashboard; note this endpoint currently ignores `:id`, H-14)
- `GET /current-fees/history?studentId=`, `GET /current-fees/current/:id`
- `GET /levels/session`, `/levels/:id`, `/levels/recent/birthday`, `/levels/dashboard-info`
- `GET/POST/PUT/DELETE /notes…`, `GET/PUT/DELETE /notifications…` (read, read-all, delete, delete-all)
- `GET /students/:id`
- the `/student-auth/*` routes above

Endpoints the student client *defines* but does not use (copied from the admin app): fee summary/day, parents, subjects, terms, messages, holiday mutations, `levels/previous`, etc. They must still be treated as admin-only once guards exist.

### 13.3 Static mismatches between frontends and backend (confirmed by comparing call sites with routes)

| Frontend call | Backend reality |
|---|---|
| Admin: `DELETE /students/:id` (`client/src/api/studentAPI.js:198`) | Backend only has `DELETE /students?id=` → the admin UI's delete currently 404s. **Decide deliberately** whether to add `/:id` (and what it does) rather than letting a refactor change behaviour silently. |
| Admin: `POST /students/indexnumber` (`:157`) | Backend has `GET /students/index-number?id=` |
| Admin: `GET/PUT/DELETE /examinations` (`ExaminationAPI.js`) | No such routes (only `POST /examinations`) |
| Admin: `POST /fees/current-level/all`, `PUT /schools/remove`, `PUT/POST /messages…` variants, `PUT /holidays/remove`, `GET /notes/:id`, `POST /notifications` | No matching backend route found |
| Student: `POST /current-fees/current-level`, `PUT /holidays/remove`, `GET /notes/:id`, `POST /notifications` | No matching backend route found |
| Backend routes with **no** matching static call (23): `DELETE /current-fees/:id`, `GET /fees`, `GET /levels`, `GET /sessions/:id`, `POST /messages/quick|bulk`, `POST /users/login`-adjacent admin-only maintenance routes, `GET /users/admin/add/:token`, … (full list in Appendix A, "Admin client"/"Student portal" columns) | Candidates for removal **only after** confirming no external consumer; do not delete in the first pass. |

Several of the "no matching route" items are probably caused by the heuristic (variable/dynamic URL building such as `` `/${type}/profile` `` in `sessionAPI.js`, which expands to `/students|teachers|users/profile|bulk-profile|many`). They are listed so they get checked, not because they are proven dead.

### 13.4 Response-shape dependencies (examples that must be preserved unless migrated)

- Bare string bodies for mutations (`"Changes Saved!!!"`) — the UIs display them as toasts.
- `levels/session`: `{students, subjects, fees, departments, houses, levelsOption, levelSummary}`.
- `terms`: items shaped `{core:{…}, headmaster, report, exams, termId, sessionId, status, active}` or the `type=dropdown` variant.
- `current-fees/current/:id`: `{totalFees, totalPaid, lastFeePaid, totalArrears, feePaymentTrend, topFeePayments, activeLevel}`.
- Bulk-import duplicate errors: `400 {isDuplicateError:true, message, data:[…]}`.
- Mongoose documents are returned as-is (including virtuals such as `fullName`, `levelName`, `noOfStudents`) — removing a virtual is a breaking change.

---

## 14. Summary — what to do first

1. **Rotate the leaked database credential and any reused secret (C-1)** — this is an operational action for the repo owner and does not require code changes.
2. Close the unauthenticated holes (C-2, C-3, C-4, H-3) — small, isolated changes with no frontend impact.
3. Introduce role/permission and tenant middleware, preserving the student-portal allow-list (C-5, C-6, §13.2).
4. Fix the financial and exam correctness defects (C-7, H-5, H-12) behind characterization tests.
5. Only then restructure into modules (see `docs/backend-architecture.md` and `docs/refactoring-progress.md`).

---

## Appendix A — Endpoint inventory (static extraction)

Auth column: *JWT (global)* = covered by `app.use(verifyJWT)` at `server.js:185` (signature check only, no role check); *NONE (public)* = no authentication; *JWT (route-level)* = `verifyJWT` applied inside a router mounted before the global guard. "Admin client" / "Student portal" = a static call-site match was found (heuristic; see §13).

#### announcement (`routes/announcementRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/announcements` | line 11 | JWT (global) | yes | yes (static) |
| GET | `/announcements/:id` | line 25 | JWT (global) | yes | yes (static) |
| POST | `/announcements` | line 35 | JWT (global) | yes | - |
| PUT | `/announcements` | line 82 | JWT (global) | yes | - |
| PUT | `/announcements/remove` | line 106 | JWT (global) | yes | - |
| DELETE | `/announcements/:id` | line 131 | JWT (global) | yes | - |

#### attendance (`routes/attendanceRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/attendances` | line 15 | JWT (global) | yes | yes (static) |
| GET | `/attendances/level/:id` | line 28 | JWT (global) | - | yes (static) |
| GET | `/attendances/history/:id` | line 53 | JWT (global) | yes | yes (static) |
| GET | `/attendances/:id` | line 102 | JWT (global) | yes | yes (static) |
| POST | `/attendances` | line 153 | JWT (global) | yes | - |
| POST | `/attendances/student` | line 188 | JWT (global) | yes | - |
| PUT | `/attendances` | line 246 | JWT (global) | yes | - |
| DELETE | `/attendances/:id` | line 266 | JWT (global) | yes | - |

#### course (`routes/courseRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/courses` | line 21 | JWT (global) | yes | - |
| GET | `/courses/dashboard` | line 32 | JWT (global) | yes | - |
| GET | `/courses/teacher` | line 124 | JWT (global) | yes | - |
| GET | `/courses/:id` | line 156 | JWT (global) | yes | - |
| POST | `/courses` | line 165 | JWT (global) | yes | - |
| PUT | `/courses` | line 222 | JWT (global) | yes | - |
| DELETE | `/courses/:id` | line 240 | JWT (global) | yes | - |

#### currentFee (`routes/currentFeeRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/current-fees` | line 25 | JWT (global) | yes | yes (static) |
| GET | `/current-fees/day` | line 34 | JWT (global) | yes | yes (static) |
| GET | `/current-fees/history` | line 84 | JWT (global) | yes | yes (static) |
| GET | `/current-fees/current/:id` | line 127 | JWT (global) | - | yes (static) |
| GET | `/current-fees/:id` | line 199 | JWT (global) | yes | yes (static) |
| POST | `/current-fees/summary` | line 207 | JWT (global) | yes | yes (static) |
| POST | `/current-fees/level` | line 297 | JWT (global) | yes | - |
| POST | `/current-fees/student` | line 321 | JWT (global) | yes | yes (static) |
| POST | `/current-fees` | line 419 | JWT (global) | yes | - |
| PUT | `/current-fees` | line 456 | JWT (global) | yes | - |
| DELETE | `/current-fees/:id` | line 474 | JWT (global) | - | - |

#### department (`routes/departmentRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/departments` | line 7 | JWT (global) | yes | - |
| GET | `/departments/:id` | line 21 | JWT (global) | yes | - |
| POST | `/departments` | line 32 | JWT (global) | yes | - |
| PUT | `/departments/:id` | line 55 | JWT (global) | yes | - |
| DELETE | `/departments/remove` | line 79 | JWT (global) | - | - |
| DELETE | `/departments/:id` | line 105 | JWT (global) | yes | - |

#### event (`routes/eventRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/events` | line 12 | JWT (global) | yes | yes (static) |
| GET | `/events/:id` | line 25 | JWT (global) | yes | yes (static) |
| POST | `/events` | line 37 | JWT (global) | yes | - |
| PUT | `/events` | line 82 | JWT (global) | yes | - |
| PUT | `/events/remove` | line 102 | JWT (global) | yes | - |
| DELETE | `/events/:id` | line 123 | JWT (global) | yes | - |

#### examination (`routes/examinationRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/examinations/details` | line 35 | JWT (global) | yes | yes (static) |
| GET | `/examinations/reports` | line 151 | JWT (global) | yes | - |
| GET | `/examinations/publish` | line 211 | JWT (global) | yes | yes (static) |
| GET | `/examinations/subject` | line 402 | JWT (global) | yes | - |
| GET | `/examinations/analytics/:id` | line 487 | JWT (global) | - | yes (static) |
| GET | `/examinations/academic/:studentId` | line 540 | JWT (global) | - | yes (static) |
| GET | `/examinations/:id` | line 616 | JWT (global) | yes | yes (static) |
| POST | `/examinations/student/academics` | line 772 | JWT (global) | - | - |
| POST | `/examinations` | line 827 | JWT (global) | yes | - |
| POST | `/examinations/bulk` | line 863 | JWT (global) | yes | - |
| POST | `/examinations/update` | line 930 | JWT (global) | yes | - |
| PUT | `/examinations/comments` | line 985 | JWT (global) | yes | - |

#### fee (`routes/feeRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/fees` | line 13 | JWT (global) | - | - |
| GET | `/fees/all` | line 40 | JWT (global) | yes | - |
| POST | `/fees/current-level` | line 77 | JWT (global) | yes | - |
| GET | `/fees/:id` | line 105 | JWT (global) | yes | - |
| POST | `/fees` | line 122 | JWT (global) | yes | - |
| PUT | `/fees` | line 185 | JWT (global) | yes | - |
| DELETE | `/fees/:id` | line 200 | JWT (global) | yes | - |

#### grade (`routes/gradeRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/grades` | line 8 | JWT (global) | yes | - |
| GET | `/grades/:id` | line 57 | JWT (global) | yes | - |
| POST | `/grades` | line 69 | JWT (global) | yes | - |
| PUT | `/grades` | line 89 | JWT (global) | yes | - |
| DELETE | `/grades/:id` | line 114 | JWT (global) | yes | - |

#### holiday (`routes/holidayRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/holidays` | line 8 | JWT (global) | yes | yes (static) |
| GET | `/holidays/:id` | line 29 | JWT (global) | yes | yes (static) |
| POST | `/holidays` | line 41 | JWT (global) | yes | yes (static) |
| PUT | `/holidays` | line 71 | JWT (global) | yes | yes (static) |
| DELETE | `/holidays/:id` | line 109 | JWT (global) | yes | yes (static) |

#### house (`routes/houseRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/houses` | line 7 | JWT (global) | yes | - |
| GET | `/houses/:id` | line 21 | JWT (global) | yes | - |
| POST | `/houses` | line 32 | JWT (global) | yes | - |
| PUT | `/houses/:id` | line 56 | JWT (global) | yes | - |
| DELETE | `/houses/remove` | line 80 | JWT (global) | - | - |
| DELETE | `/houses/:id` | line 104 | JWT (global) | yes | - |

#### level (`routes/levelRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/levels/session` | line 24 | JWT (global) | yes | yes (static) |
| GET | `/levels/dashboard-info` | line 148 | JWT (global) | yes | yes (static) |
| GET | `/levels` | line 236 | JWT (global) | - | - |
| GET | `/levels/previous` | line 270 | JWT (global) | yes | yes (static) |
| GET | `/levels/subject` | line 327 | JWT (global) | yes | yes (static) |
| GET | `/levels/:id` | line 340 | JWT (global) | yes | yes (static) |
| POST | `/levels/students/all` | line 361 | JWT (global) | yes | yes (static) |
| POST | `/levels/generate` | line 394 | JWT (global) | yes | - |
| POST | `/levels` | line 477 | JWT (global) | yes | - |
| POST | `/levels/many` | line 496 | JWT (global) | yes | - |
| PUT | `/levels` | line 581 | JWT (global) | yes | - |
| PUT | `/levels/grade` | line 606 | JWT (global) | yes | - |
| DELETE | `/levels` | line 635 | JWT (global) | yes | - |
| POST | `/levels/delete/many` | line 649 | JWT (global) | yes | - |
| PUT | `/levels/subject` | line 667 | JWT (global) | yes | - |
| POST | `/levels/assign-teacher` | line 685 | JWT (global) | yes | - |
| PUT | `/levels/assign-teacher` | line 708 | JWT (global) | yes | - |
| PUT | `/levels/unassign-teacher` | line 768 | JWT (global) | yes | - |
| GET | `/levels/recent/birthday` | line 812 | JWT (global) | yes | yes (static) |

#### message (`routes/messageRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/messages` | line 13 | JWT (global) | yes | yes (static) |
| POST | `/messages/quick` | line 27 | JWT (global) | - | - |
| POST | `/messages/resend` | line 84 | JWT (global) | yes | - |
| POST | `/messages/bulk` | line 118 | JWT (global) | - | - |
| DELETE | `/messages/:id` | line 214 | JWT (global) | yes | - |

#### note (`routes/noteRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/notes` | line 7 | JWT (global) | yes | yes (static) |
| POST | `/notes` | line 18 | JWT (global) | yes | yes (static) |
| PUT | `/notes/:id` | line 46 | JWT (global) | yes | yes (static) |
| DELETE | `/notes/:id` | line 82 | JWT (global) | yes | yes (static) |

#### notification (`routes/notificationRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/notifications` | line 9 | JWT (global) | yes | yes (static) |
| GET | `/notifications/:id` | line 21 | JWT (global) | yes | yes (static) |
| PUT | `/notifications` | line 33 | JWT (global) | yes | yes (static) |
| PUT | `/notifications/:id/read` | line 54 | JWT (global) | yes | yes (static) |
| PUT | `/notifications/:userId/read-all` | line 61 | JWT (global) | yes | yes (static) |
| DELETE | `/notifications/remove` | line 69 | JWT (global) | - | - |
| DELETE | `/notifications/:id` | line 90 | JWT (global) | yes | yes (static) |
| DELETE | `/notifications/:id/all` | line 107 | JWT (global) | yes | yes (static) |

#### parent (`routes/parentRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/parents` | line 11 | JWT (global) | yes | yes (static) |
| GET | `/parents/student` | line 25 | JWT (global) | yes | yes (static) |
| GET | `/parents/:id` | line 42 | JWT (global) | yes | yes (static) |
| POST | `/parents` | line 58 | JWT (global) | yes | - |
| PUT | `/parents` | line 74 | JWT (global) | yes | - |
| DELETE | `/parents/:id` | line 91 | JWT (global) | yes | - |

#### school (`routes/schoolRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/schools` | line 24 | JWT (route-level) | yes | - |
| GET | `/schools/:id` | line 34 | NONE (public) | yes | - |
| POST | `/schools` | line 46 | JWT (route-level) | yes | - |
| PUT | `/schools` | line 63 | JWT (route-level) | yes | - |
| PUT | `/schools/badge` | line 89 | JWT (route-level) | yes | - |
| DELETE | `/schools/:id` | line 142 | JWT (route-level) | yes | - |

#### session (`routes/sessionRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/sessions` | line 7 | JWT (global) | yes | - |
| GET | `/sessions/:id` | line 21 | JWT (global) | - | - |
| POST | `/sessions` | line 35 | JWT (global) | yes | - |
| PUT | `/sessions` | line 60 | JWT (global) | yes | - |
| DELETE | `/sessions/:id` | line 81 | JWT (global) | yes | - |

#### studentAuth (`routes/studentAuthRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/student-auth/:id` | line 33 | NONE (public) | - | yes (static) |
| POST | `/student-auth/login` | line 98 | NONE (public) | - | yes (static) |
| POST | `/student-auth/refresh` | line 196 | NONE (public) | - | yes (static) |
| POST | `/student-auth/logout` | line 286 | NONE (public) | - | yes (static) |
| POST | `/student-auth/reset-password-request` | line 295 | NONE (public) | - | yes (static) |
| POST | `/student-auth/confirm-reset-code` | line 315 | NONE (public) | - | yes (static) |
| POST | `/student-auth/reset-password` | line 329 | NONE (public) | - | yes (static) |

#### student (`routes/studentRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/students` | line 35 | JWT (global) | - | yes (static) |
| GET | `/students/details` | line 57 | JWT (global) | yes | yes (static) |
| GET | `/students/index-number` | line 177 | JWT (global) | yes | yes (static) |
| GET | `/students/:id` | line 194 | JWT (global) | yes | yes (static) |
| GET | `/students/:id/profile` | line 287 | JWT (global) | yes | - |
| GET | `/students/:id/parent` | line 312 | JWT (global) | yes | - |
| POST | `/students` | line 328 | JWT (global) | yes | - |
| POST | `/students/many` | line 429 | JWT (global) | yes | - |
| PUT | `/students` | line 520 | JWT (global) | yes | - |
| PUT | `/students/profile` | line 588 | JWT (global) | - | - |
| PUT | `/students/bulk-profile` | line 618 | JWT (global) | - | - |
| PATCH | `/students/disable` | line 652 | JWT (global) | yes | - |
| DELETE | `/students` | line 688 | JWT (global) | - | - |

#### subject (`routes/subjectRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/subjects` | line 30 | JWT (global) | yes | yes (static) |
| GET | `/subjects/:name` | line 58 | JWT (global) | - | - |
| POST | `/subjects` | line 68 | JWT (global) | yes | - |
| PUT | `/subjects` | line 117 | JWT (global) | yes | - |
| DELETE | `/subjects/:id` | line 144 | JWT (global) | yes | - |

#### teacher (`routes/teacherRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/teachers` | line 28 | JWT (global) | yes | - |
| GET | `/teachers/courses` | line 43 | JWT (global) | yes | - |
| GET | `/teachers/:id` | line 94 | JWT (global) | yes | - |
| POST | `/teachers` | line 105 | JWT (global) | yes | - |
| POST | `/teachers/many` | line 163 | JWT (global) | - | - |
| PUT | `/teachers` | line 224 | JWT (global) | yes | - |
| PUT | `/teachers/profile` | line 255 | JWT (global) | yes | - |
| PUT | `/teachers/bulk-profile` | line 285 | JWT (global) | - | - |
| DELETE | `/teachers/:id` | line 318 | JWT (global) | yes | - |

#### term (`routes/termRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/terms` | line 28 | JWT (global) | yes | yes (static) |
| GET | `/terms/sessions` | line 98 | JWT (global) | - | yes (static) |
| GET | `/terms/valid` | line 143 | JWT (global) | yes | yes (static) |
| GET | `/terms/:id` | line 168 | JWT (global) | yes | yes (static) |
| POST | `/terms` | line 198 | JWT (global) | yes | - |
| PUT | `/terms` | line 401 | JWT (global) | yes | - |
| PATCH | `/terms` | line 438 | JWT (global) | yes | - |
| PUT | `/terms/account` | line 473 | JWT (global) | yes | - |
| PATCH | `/terms/:id` | line 498 | JWT (global) | yes | - |
| PUT | `/terms/remove` | line 529 | JWT (global) | yes | - |
| DELETE | `/terms/:id` | line 553 | JWT (global) | yes | - |

#### user (`routes/userRoute.js`)

| Method | Path | Defined at | Auth | Admin client | Student portal |
|---|---|---|---|---|---|
| GET | `/users` | line 46 | JWT (route-level) | yes | - |
| GET | `/users/school` | line 59 | NONE (public) | - | - |
| GET | `/users/admin/add/:token` | line 69 | NONE (public) | - | - |
| GET | `/users/:id` | line 99 | JWT (route-level) | yes | - |
| POST | `/users/login` | line 133 | NONE (public) | - | - |
| POST | `/users/verify` | line 211 | NONE (public) | yes | - |
| POST | `/users` | line 236 | JWT (route-level) | yes | - |
| PUT | `/users` | line 278 | JWT (route-level) | yes | - |
| PUT | `/users/profile` | line 337 | JWT (route-level) | yes | - |
| PUT | `/users/reset` | line 401 | JWT (route-level) | - | - |
| PUT | `/users/reset-password` | line 430 | JWT (route-level) | yes | - |
| PUT | `/users/logout` | line 456 | JWT (route-level) | yes | - |
| PATCH | `/users/admin/reset-password` | line 478 | JWT (route-level) | - | - |
| PATCH | `/users` | line 503 | JWT (route-level) | - | - |
| PUT | `/users/account` | line 520 | JWT (route-level) | yes | - |
| DELETE | `/users/:id` | line 547 | NONE (public) | yes | - |
| PUT | `/users/school` | line 568 | JWT (route-level) | - | - |

