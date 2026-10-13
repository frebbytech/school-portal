# Refactoring Progress and Phased Plan — School Portal Backend

**Last updated:** 2026-10-11 · **Overall status:** Phase One (audit) complete. **Plan and stage order approved by the owner on 2026-10-12.** Implementation has not started; it is blocked on the items in §5a.

Companion documents: `docs/backend-audit.md` (findings, IDs referenced below) and `docs/backend-architecture.md` (target design, open questions).

## 1. Progress tracker

| Stage | Name | Status |
|---|---|---|
| 0 | Operational actions and read-only data audit | **Owner action in progress** (credential/secret rotation approved by owner 2026-10-12; completion not yet confirmed to me) |
| 1 | Test harness and characterization tests | **Done, owner ran tests: passed** (2026-10-13). Characterization tests of *current* behaviour are not written yet |
| 2 | Close the critical unauthenticated holes | **Done, owner ran tests: passed.** C-1, C-2, C-3, C-4, H-10. Deferred: H-3 (needs student-app check) |
| 3 | Foundation: bootstrap, config, errors, logging, mail/upload fixes | **Done — owner ran full suite: 53 tests pass** (2026-10-13), branch `refactor/stage-3-foundation` (see §5c) |
| 4 | Authentication, authorization, tenant isolation | **In progress.** 4a (shared guards, users router, H-1, H-2) written on branch `refactor/stage-4a-users-authz`, uncommitted, NOT run (see §5d). Remaining routers not started |
| 5 | Validation, mass-assignment allow-lists, response adapter | Not started |
| 6 | Users, schools, academic sessions/terms, levels | Not started |
| 7 | Students, parents, teachers | Not started |
| 8 | Fees and payments | Not started |
| 9 | Examinations, grading, report publishing; attendance | Not started |
| 10 | Communications, performance, cleanup | Not started |

**Tests executed so far:** none — the repository has no tests, and Phase One was read-only. A scratch attempt to verify two Mongoose behaviours failed because the npm registry was unreachable from the audit sandbox (audit finding M-11 and M-3 remain *Potential*).
**Files changed in the application:** none. Files added in Phase One: `docs/backend-audit.md`, `docs/backend-architecture.md`, `docs/refactoring-progress.md`.

## 2. Ground rules for every stage

- One reviewable change set per module/stage; each stage lists its own rollback.
- Characterization tests **before** changing behaviour; contract tests assert legacy response shapes (audit §13) unchanged.
- Run tests, lint, and a startup smoke test after each meaningful change; report actual results, never assumed ones.
- No schema/index change without a documented migration (`docs/deployment-and-migration.md`), a pre-migration backup, and a non-production rehearsal. **No destructive migration and nothing against production without explicit approval.**
- No commits, pushes, or history rewrites unless asked.
- Frontend code is not modified; if a contract must change, it is listed with a coordinated-release plan first.

## 3. Recommended implementation sequence

Ordered by risk-reduction per unit of effort, deliberately **diverging from CLAUDE.md §5's default order**: the security fixes in Stages 2 and 4 move ahead of "application bootstrap" because the audit found live, remotely exploitable holes (C-1…C-6) that do not depend on the restructuring.

### Stage 0 — Operational actions and data audit *(owner + read-only script; no app code)*

| Item | Detail |
|---|---|
| Rotate secrets | Rotate the MongoDB Atlas database user password that is committed in `db/DBConnection.js` (C-1); rotate `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`, `TOKEN`, SMTP and SMS credentials as a precaution; change the admin password if it matches any leaked value (C-1, C-3). Rotating JWT secrets signs everyone out — schedule accordingly. |
| Confirm environment | Confirm which env vars are actually set in production; whether Atlas is a replica set (transactions); whether a staging DB exists. |
| Read-only data audit | A script (to be reviewed before running) that reports: duplicate `Examination`/`CurrentFee`/`Attendance` keys (D-2), orphaned Student/StudentAuth/Level/Examination/CurrentFee/Parent rows (H-6), records referencing other schools' levels/terms (C-6), payments with non-numeric or float-fraction amounts (D-7), terms with more than one `status: "current"` (H-13). **Reads only.** |
| Acceptance | Credentials rotated; findings of the data audit reviewed with the owner; migration plan adjusted to real data. |
| Rollback | n/a (no changes to the application). |

### Stage 1 — Test harness and characterization tests

- **Needs approval:** adding dev dependencies (e.g. a test runner, `supertest`, an in-memory MongoDB) and `test`/`lint` scripts — CLAUDE.md forbids dependency changes without approval, and Phase One was read-only.
- Split `server.js` into `app.js` (no `listen`) + `server.js` so the app is testable — behaviour-preserving.
- Contract/characterization tests for: staff and student auth; role × endpoint access matrix (documenting today's *permissive* behaviour so changes are deliberate); fees (balance, arrears, payment append); exams (score merge, totals, grades, positions); attendance; term lifecycle; student create/transfer/disable/delete; cross-school access.
- **Acceptance:** `npm test` runs green against the *current* behaviour (known bugs are encoded as expected-failing tests tagged with their finding id); lint script runs.
- **Rollback:** tests and the `app.js` split are additive.

### Stage 2 — Close the critical unauthenticated holes *(small, frontend-neutral)*

| Finding | Change | Frontend impact |
|---|---|---|
| C-1 | `db/DBConnection.js` reads `MONGO_URL` from env and fails fast if missing; no credential literal in source | none (after env is set in Render) |
| C-2 | `DELETE /users/:id`: require auth + administrator + same-school | none (admin client already sends its token) |
| C-3 | Remove `GET /users/admin/add/:token`; provide a CLI seed script instead | none (not called by any client) |
| C-4 | Student reset: bind `reset-password` to a verified single-use token; CSPRNG; uniform responses; rate limit | request bodies may need a `code` field the UI already collects in `confirm-reset-code` — **verify the student UI passes it, else coordinate** |
| H-3 | Stop serving `/reports`, `/images` and `/views` publicly; authenticate `GET /student-auth/:id` | verify the student app's use of `GET /student-auth/:id` first |
| H-10 | Fix CORS default origins (no trailing slash) / require `CORS_WHITELIST` | none |

- **Acceptance:** each fix has a test that fails before and passes after; no other route changes; manual smoke of both login flows.
- **Rollback:** each item is an independent revert.

### Stage 3 — Foundation

- Config module with startup validation + `.env.example` (documentation only; no real values); error classes + single error handler (preserving current response bodies); structured logger with redaction; replace `process.exit` on `unhandledRejection` with logging + graceful handling (H-4); single mail service with TLS verification (H-8) — **needs a test against the real SMTP host** because enabling verification can break a misconfigured provider; fix `config/uploadFile.js` and the missing import in `teacherRoute.js` (H-7); upload size/type limits; request ids; global rate limit with strict auth/messaging limits.
- **Acceptance:** app boots only with valid config; no `console.*` in production paths; upload and mail paths covered by adapter tests with stubs (no real messages sent in tests).

### Stage 4 — Authentication, authorization, tenant isolation *(highest-value structural change)*

- `authenticate`/`authorize`/`tenant` middleware and the declarative policy table (architecture §5).
- Student-portal allow-list and own-record rule (audit §13.2); teacher scope (**after owner confirms the rule**, open question 2).
- Fix H-1 (honour `active` on refresh/login for staff and students), H-2 (cookie clearing).
- Close C-5/C-6 per router in this order: users → schools → messages (cross-school broadcast) → fees → students → examinations → attendance → terms/levels → the rest.
- **Acceptance:** an access-matrix test proves every endpoint rejects unauthenticated, wrong-role, and cross-school callers; student app smoke test passes with the allow-list; admin client smoke test passes.
- **Rollback:** feature flag `ENFORCE_AUTHZ` (default on in tests, staged rollout in production) so enforcement can be disabled without a redeploy if a legitimate flow is blocked.

### Stage 5 — Validation, allow-lists, response adapter

- `express-validator` schemas (already a dependency) for params/query/body of every mutating endpoint; explicit field allow-lists replace `...req.body` / `$set: {...rest}` (C-5, C-6); ObjectId validation; pagination helper (opt-in).
- Response adapter preserving legacy bodies; "legacy quirks" table checked in.
- **Acceptance:** malformed/unexpected input yields consistent 400s without changing success responses; mass-assignment tests pass.

### Stage 6 — Users, schools, academic sessions/terms, levels

- Move to `modules/…`; atomic term lifecycle with legal status transitions and a single *current* term per school (H-13); tenant-scope Grade lookups; fix `sessionRoute` (H-11); fix `/terms/sessions` typo; `levels/generate`, `assign-teacher`, `delete/many` (M-3) *after* characterization tests reveal actual behaviour; non-blocking teacher notification email (M-4).
- **Migrations:** term index definition (D-6) — inspect live indexes first.
- **Acceptance:** term create/archive flows tested incl. failure mid-way (no partial data); frontends' `terms`/`levels/session` shapes unchanged.

### Stage 7 — Students, parents, teachers

- Transactional student creation (H-6); safe transfer between levels (remove from old, add to new, `$addToSet`); soft-delete/deactivate preserving history (**decision needed**, open question 6); stop default passwords equal to phone/index number or force change on first login (**product decision**); fix bulk import and bulk-profile endpoints (H-7); remove mass assignment on `PUT /students|/teachers`.
- **Migrations:** optional per-school uniqueness (D-3/D-4, **only if multi-school reuse is intended**).
- **Acceptance:** failure-injection tests show no orphans; duplicate index/number handling matches today's messages (`"Index Number already exist!"`).

### Stage 8 — Fees and payments

- Server-side balance/arrears computation; fix previous-arrears and term-less fee lookup (H-12); payment idempotency key; append-only ledger records with actor and timestamp; void instead of delete; integer minor units (dual-write transition); transactions; fee-schedule validation.
- **Migrations:** add ledger fields; backfill from `payment[]`; verify totals per student/term before switching reads.
- **Acceptance:** replaying the same payment request does not double-credit; totals before/after migration match to the pesewa for a representative dataset; response shapes of `current-fees/current/:id`, `/summary`, `/student` unchanged.

### Stage 9 — Examinations, report publishing, attendance

- Server-computed totals with bounds checked against the term's score preference; per-score validation; atomic per-subject updates (no whole-array read-modify-write); stop overwriting saved comments on score save (H-5b); correct position computation in bulk publish (H-5a); remove the I/O virtual (P-1) in favour of a service function with one grade-scale lookup; publish/lock state and audit history (**needs rules from owner**, open question 3); report ids from `_id`, PDFs outside public static paths, pooled/closed browser, awaited and error-reporting mail/SMS (H-4, H-9); attendance scoping, unique key, no create-on-read side effect *behind a compatibility flag* (the admin UI may rely on it), single upsert key (H-14).
- **Migrations:** add `school` to `Examination`/`Attendance`; unique indexes after duplicate cleanup.
- **Acceptance:** grading/ranking unit tests derived from today's outputs; concurrent-save test shows no lost updates; publish run reports per-recipient failures.

### Stage 10 — Communications, performance, cleanup

- Tenant-scoped messaging; chunked sends; notification/note ownership (M-8).
- Profile before optimising (P-1…P-9): add indexes backed by observed queries; replace N+1s; aggregate in the database; paginate heavy lists with legacy defaults.
- Remove dead code and unused dependencies (`db/knex.js`, empty `controllers/`, unused packages) — **after** confirming no consumers; decide the fate of mismatched/dead endpoints with the owner (audit §13.3).
- Final docs: `docs/api-reference.md`, `docs/database.md`, `docs/deployment-and-migration.md`.

## 4. Definition of done (per module, from CLAUDE.md §19)

Responsibilities clear · business rules preserved and enforced · authn/authz applied · validation comprehensive · errors consistent · DB integrity preserved · API behaviour compatible or documented · important paths tested · tests and static checks pass · no known new vulnerabilities · docs match the implementation · migration/rollback understood.

## 5. Decisions and approvals needed before Stage 1 begins

1. Approve the plan and the stage order (including moving security ahead of bootstrap).
2. Confirm the secret rotation (Stage 0) is done or scheduled.
3. Approve adding dev dependencies and scripts for tests/lint (Stage 1).
4. Answer the architecture open questions (multi-school, teacher scope, publication rules, score/fee semantics, student deletion, default passwords, deployment topology, history rewrite).

## 5a. Owner decisions (2026-10-12) and remaining blockers

**Decided**

| Topic | Decision | Effect on the plan |
|---|---|---|
| Plan and stage order | Approved (security fixes ahead of bootstrap) | Stages 0-10 as written |
| Teacher scope | Teachers are limited to **their own levels and courses** for results and attendance | Stage 4/9 policy: teacher may write scores/attendance only for levels where `Level.teacher` is them or courses (`Course`) assign them; admins unrestricted |
| Tenancy | **Multi-school** system | Tenant isolation is mandatory everywhere (Stage 4); no single-school shortcuts such as `School.findOne()` |
| Student removal | **Never delete; deactivate** | Stage 7: legacy `DELETE /students?id=` becomes deactivation (history preserved); hard delete removed. Whether to add the admin client's currently-404 `DELETE /students/:id` as an alias for deactivation is to be confirmed |
| Extra instructions | `instructions.md` received and adopted as additional guidance | Adopted: `<module>.routes/controller/service/validation.js` naming, Mongoose sanitisation/`lean()`/index rules, transactions only after confirming a replica set, post-commit side effects, idempotent batched migrations, tests on a dedicated DB with test doubles for email/SMS/payments. No conflict with the approved sequence |

**Still needed before implementation starts**

1. **Confirmation that the leaked MongoDB credential and other secrets have been rotated (Stage 0).** Until then the production database is exposed regardless of any code change.
2. **Approval to add test tooling.** The registry was unreachable from my sandbox, so I also need to know where tests can run (your machine, CI, or a sandbox with npm access). Without installed dependencies I cannot run the app or any tests, so I will not claim any change works.
3. **Where changes should land.** The repository clone here is read-only; I cannot push. Choose: I produce patches/branches you apply, or you attach push access to the repository.
4. **Index-number and username uniqueness (D-3/D-4):** may two schools reuse the same student index number or username? (Today they cannot.)
5. Answers still open from the architecture document: result-publication/lock rules, score and fee semantics, default student passwords, deployment topology (replica set? staging DB?), and whether Git history may be rewritten after rotation.

## 5b. Stage 1-2 patches (prepared 2026-10-12)

Delivered as patch files (apply in order with `git apply`; the owner commits manually):

1. `0001-test-harness-and-app-server-split.patch`
2. `0002-close-critical-security-holes.patch`

**Verification actually performed:** both patches apply cleanly, in order, to a pristine export of commit `eee141f`; every changed or new JavaScript file passes `node --check`. **Not performed:** `npm install`, any test run, starting the app. The sandbox's egress policy returns 403 for `registry.npmjs.org`, so no dependency could be installed. **The tests are written but have never been run; they may need small fixes.**

**What changed**

| Finding | Change | Compatibility |
|---|---|---|
| (Stage 1) | `server.js` split into `app.js` (builds the Express app) and `server.js` (connects + listens). Logic unchanged. Dev deps added: `jest`, `supertest`, `mongodb-memory-server`; scripts `test`, `test:watch`; `jest.config.js`; `tests/setup/*`, `tests/helpers.js` | none for clients. `package-lock.json` must be regenerated with `npm install` |
| C-1 | `db/DBConnection.js` reads `MONGO_URL` (required in production, app throws without it) / `MONGO_URL_LOCAL`; no credential in source. `.env.example` added (placeholders only) | **Production must have `MONGO_URL` set before deploying**, or the app will not start |
| C-2 | `DELETE /users/:id` now requires a valid token, role `administrator`, and the target user in the caller's school (new `middlewares/authorize.js`: `requireRole`, `isSameSchool`). Same success/ID-format messages; new `403` for forbidden/other-school | admin client already sends its token; no UI change |
| C-3 | `GET /users/admin/add/:token` removed. `scripts/create-admin.js` added (reads `ADMIN_*` env vars, hashes password, requires an existing school code) | no client called the route. `TOKEN` env var is no longer used |
| C-4 | Student reset: code from `crypto.randomInt`, stored hashed; `confirm-reset-code` marks the request verified; `reset-password` now requires a verified, unexpired request (single use); 5 wrong guesses invalidate the code; per-IP rate limit (default 10/15 min, `RESET_RATE_LIMIT_MAX`); new passwords must be ≥ 6 chars (the student UI already enforces this). New optional fields `resetVerified`, `resetAttempts` on `StudentAuth` (no migration needed) | request/response shapes unchanged; the UI's existing request → confirm → reset sequence works. A code requested before deploy (stored in plain text) will fail once; the student requests a new one |
| H-10 | CORS origins normalised (trailing slashes/whitespace ignored) | fixes rejected frontends when `CORS_WHITELIST` is unset |

**To run the tests (on a machine with npm access):** `npm install`, then `npm test`. `mongodb-memory-server` downloads a MongoDB binary on first run. Report any failure to me and I will fix it before Stage 3.

**Known issues noticed but not changed in these patches:** `server.js` calls `db.closeConnection()`, which is not a Mongoose method (graceful shutdown would throw); `GET /student-auth/:id` is still unauthenticated (H-3); user-existence disclosure on reset request (404) kept for compatibility; student logout still does not clear the refresh cookie (H-2, Stage 4).

## 5c. Stage 3 — foundation (prepared 2026-10-13)

Branch `refactor/stage-3-foundation` (from the pushed Stage 1-2 branch). Not committed. Delivered as `0003-foundation.patch`.

**Verification actually performed:** every changed/new JS file passes `node --check`. The four unit suites (`tests/unit/*`: env 10, logger 6, errorHandler 11, upload/`detectImageType` 2 = 29 tests) were executed here with a minimal jest-compatible shim (multer stubbed for the upload suite, since npm is unreachable). All passed. **Not performed:** real `jest` run, `tests/request-id-and-errors.test.js`, `tests/student-login-limit.test.js`, the Stage 1-2 suites against these changes, starting the app, real SMTP or Firebase calls. **Run `npm test` and report failures.**

| Finding | Change | Compatibility / action |
|---|---|---|
| H-4 | `unhandledRejection` is logged, no longer exits; `uncaughtException` logs and exits 1 | none |
| (bootstrap) | `config/env.js` validates env at startup; production refuses to start without `MONGO_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`; warns on weak/duplicate secrets (never prints values). Graceful shutdown in `server.js` (the earlier `db.closeConnection()` bug is gone) | **Production must have all five set** |
| logging | `common/logger.js` JSON logger with redaction; `X-Request-Id` on every response | none |
| errors | `common/errors.js` + `middlewares/errorHandler.js`: same body `{status, statusCode, message}`, plus optional `code`/`requestId`; duplicate key -> 409, validation/cast -> 400; 5xx messages hidden in production | clients that matched on 500 for duplicate keys will now see 409 |
| H-7 | `config/uploadFile.js` fixed (missing `axios` import, undefined variable in multi-upload, temp files always removed, failures throw 502); missing import in `teacherRoute.js` | none |
| uploads | `middlewares/upload.js`: random filenames, jpeg/png/webp only, size limit (`UPLOAD_MAX_MB`, default 5), magic-byte check, max 20 files | **Behaviour change:** other file types or oversize files are now rejected with 400 |
| H-8 | `config/mail/transport.js`: shared transport, TLS verification on by default (`MAIL_TLS_REJECT_UNAUTHORIZED=false` opts out, logs a warning), timeouts, no per-send `verify()` | **Test against the real SMTP host before production**; if the provider has a bad certificate, set the opt-out temporarily |
| rate limits | student login (`STUDENT_LOGIN_RATE_LIMIT_MAX`, default 10 per 15 min per IP+id, successes not counted), messaging (`MESSAGE_RATE_LIMIT_MAX`, default 60 per 15 min), optional global (`RATE_LIMIT_MAX`, off by default) | 429 on excess |

**Deferred, noticed:** `message` routes still say "delivered" when a send fails (Stage 10); staff login limiter counts successful logins and may lock out schools behind one IP (Stage 4); `GET /student-auth/:id` still unauthenticated (H-3); student logout cookie mismatch (H-2); unused `config/mail/mail.js`, `sendEmail.js` (Stage 10). Audit note M-4 was inaccurate: `mailer.sendMail` swallowed errors.

## 5d. Stage 4a — guards and users router (prepared 2026-10-13)

Branch `refactor/stage-4a-users-authz` (from the Stage 3 branch). **Nothing here has been executed**: only `node --check`. Run `npm test`; new suite is `tests/users.authz.test.js`.

**Shared guards** (`middlewares/authorize.js`): `getPrincipal` (a token without `role` is a student), `requireStaff` (administrator/teacher only), `requireRoleEnforced`, `isSelf`, `pickFields`. `ENFORCE_AUTHZ=false` turns the *role* guards into no-ops (temporary rollback). School-scope checks and field allow-lists inside handlers are always on, as are the Stage 2 guards.

| Finding | Route | Change | Compatibility |
|---|---|---|---|
| C-5/C-6 | `GET /users`, `GET /users/:id` | staff only; `:id` must be in the caller's school (else 404; unknown id was a 500) | student app does not call these |
| C-5 | `POST /users` | administrator only; field allow-list; school from token; role must be administrator/teacher; password ≥ 6 | clients sending other roles or short passwords now get 400 |
| C-5 | `PUT /users`, `PATCH /users` | self -> profile fields only; administrator of same school -> plus role/permissions/active; others 403/404; `school` never changeable; PATCH now hashes `password` | the admin UI editing another user must be an administrator |
| C-5 | `PUT /users/profile` | self or same-school administrator | |
| C-5 | `PUT /users/reset` | caller's own id only (it needs the old password) | |
| C-5 | `PUT /users/reset-password`, `PATCH /users/admin/reset-password`, `PUT /users/account` | administrator of the same school | **teachers with the "Users" permission lose access**; confirm this is intended |
| C-5 | `PUT /users/school` | administrator; always the caller's own school; descriptive fields only (not `code`, `unique`, `permissions`); **no upsert** (cannot create schools) | |
| H-1 | `POST /users/verify`, `POST /student-auth/refresh`, `/login` | disabled staff and deactivated students cannot renew or sign in (student login: 403 with a message) | access tokens already issued stay valid until expiry (<= 1 h staff, 15 min student) |
| H-2 | `POST /student-auth/logout` | clears `refresh_token` (the name was wrong) with the attributes it was set with | |

**Not covered by tests:** student deactivation on login/refresh (needs a full Student fixture). **Still open:** `GET /users/school` returns the first school to anyone (no auth, wrong for multi-school); other routers (schools, messages, fees, students, examinations, attendance, terms/levels, rest) are Stage 4b onward, and the student allow-list will be applied there.

## 6. Known risks to the refactoring itself

- Behaviour that "looks wrong" may be relied on by a UI (create-on-read attendance, 404-for-bad-credentials, 403-on-expiry, bare-string bodies). Mitigation: contract tests + legacy-quirks table; change one quirk per release.
- Enforcing authorization can block a legitimate flow nobody documented (especially for the student portal and teachers). Mitigation: `ENFORCE_AUTHZ` flag, staged rollout, access-matrix tests.
- Rotating JWT secrets forces re-login; enabling SMTP TLS verification may expose a misconfigured mail provider.
- Data migrations touch production financial and academic records; each needs backup, rehearsal, verification, and a rollback note.
