# Backend Target Architecture — School Portal (Proposed)

**Status:** proposal for review. Nothing here has been implemented. Findings referenced as `C-n`, `H-n`, `M-n`, `D-n`, `P-n` are defined in `docs/backend-audit.md`.

## 1. Guiding decisions

| Decision | Rationale |
|---|---|
| **Keep the stack**: Node.js, Express 4, Mongoose 8, MongoDB, CommonJS, JWT + HttpOnly refresh cookie, Firebase Storage, nodemailer, Puppeteer/EJS. | CLAUDE.md rules 3-4. Nothing in the audit shows the stack itself is the problem; the problems are structure, authorization and data integrity. |
| **Modular monolith**, not microservices. | One small team, one database, ~194 endpoints. No demonstrated scaling need. |
| **Strangler, not rewrite.** Existing route files keep working; each module is moved behind the new layers one at a time, with the old route path and response shape preserved by a compatibility layer. | 194 endpoints and two frontends depend on today's shapes (audit §13). |
| **Do not add** Redis, queues, TypeScript, an ORM swap, or a new framework in this refactor. | CLAUDE.md §12 ("only when they solve a demonstrated requirement"). Two optional, evidence-gated exceptions are listed in §9. |
| **Tests first.** Characterization tests are written for a module *before* it is touched. | There are currently zero tests (audit §10). |
| **Security fixes are decoupled from restructuring.** The unauthenticated/critical holes are closed in small standalone changes (Stage 0-1 in the plan) rather than waiting for the module move. | Highest risk, smallest blast radius. |

## 2. Layering

```
Route  ->  middleware chain  ->  Controller  ->  Service  ->  Repository (optional)  ->  Mongoose model
                                                  |
                                                  +-> Infrastructure adapters (mail, sms, storage, pdf)
```

- **Routes** declare path + method, then `authenticate`, `authorize(...)`, `validate(schema)`, and hand off to a controller. No logic.
- **Controllers** read validated input (`req.validated`), call one service function, and return the result through the *response adapter* (§6). They never touch Mongoose.
- **Services** hold the business rules (grading, fees, term lifecycle, student lifecycle…). They take plain arguments plus an `actor` (`{ id, role, permissions, schoolId }`) — never `req`/`res`. They own transactions.
- **Repositories** exist only where a query is reused across modules or is complex (e.g. "students of a level", "exams for a term/level", "fee ledger for a student"). Simple lookups stay in services; no repository-per-model ceremony.
- **Models** keep schema + indexes + trivial virtuals. Virtuals that perform I/O (`Examination.scoresWithTotal`, P-1) are replaced by a service function that receives the already-loaded grade scale.

## 3. Proposed module layout

Adapted to the real features (every folder maps to an existing route file or helper):

```
src/                               (new; existing root files stay until each module migrates)
  app.js                           express app factory (no listen)  -> testable with supertest
  server.js                        env validation -> db connect -> listen -> graceful shutdown
  config/
    env.js                         validated, typed env (fail fast); .env.example documents all vars
    cors.js, session.js            (session only if still needed - see H-11)
  common/
    errors/                        AppError + NotFound/Validation/Conflict/Forbidden/Unauthorized
    middleware/                    authenticate, authorize, tenant, validate, rateLimit, requestId, errorHandler
    validation/                    shared express-validator helpers (objectId, pagination, date) - already a dependency
    logging/                       structured logger + redaction
    http/                          response adapter, pagination helper
    money/                         integer minor-unit helpers
  infrastructure/
    database/                      connection, transaction helper (withTransaction)
    mail/                          ONE mail service (replaces the 5 modules), TLS verified
    sms/                           SMS provider adapter (errors surfaced, not swallowed)
    storage/                       Firebase Storage adapter (fixes H-7)
    pdf/                           report renderer (pooled browser, ids not names)
  modules/
    auth/        (staff + student login, refresh, logout, reset)
    users/       (admin users, profile, password)
    schools/
    academic/    (sessions, terms, term lifecycle)         <- was sessionRoute + termRoute
    levels/      (levels, level subjects, teacher assignment)
    students/    (students, parents, student lifecycle, bulk import)
    teachers/    (teachers, courses)
    subjects/ grades/ departments/ houses/
    examinations/ (scores, grading, ranking, remarks, report cards, publishing)
    attendance/
    fees/        (fee schedules, payments/ledger, summaries)   <- fee + currentFee
    communications/ (messages, notifications, announcements, events, holidays, notes)
```

Dependencies point **downwards only**: `modules/* -> common, infrastructure`; modules may call each other **only through exported service functions** (e.g. `fees` calls `levels.getStudents(levelId, actor)`), never by importing each other's models. This avoids the circular imports CLAUDE.md warns about.

## 4. Request lifecycle

1. `requestId` (correlation id, echoed as `X-Request-Id`) → structured access log.
2. `helmet`, `cors`, body parsers with **realistic limits** (JSON ~1 MB; multipart handled by the upload middleware with size/type limits; bulk imports get an explicit larger limit on their routes only).
3. `rateLimit` — global, plus strict limits on login, password reset, message sending, publishing. Backed by Mongo/another shared store only when more than one instance runs.
4. `authenticate` — verifies the access token **and** rejects it if the principal is inactive (short in-process cache, ≤60 s, to avoid a DB hit per request).
5. `authorize(policy)` — role/permission check. `tenant` — derives `actor.schoolId` from the token only; never from the body/query.
6. `validate(schema)` — params, query, body; allow-listed fields (kills mass assignment, C-5); coerces/normalises.
7. Controller → service → (transaction) → repository/models.
8. Errors are thrown as `AppError`s and mapped by **one** error handler (known Mongo/validation errors → safe messages; unknown → generic 500 + logged with the request id).

## 5. Authentication and authorization design

**Preserve:** token formats, cookie names/paths, `POST /users/login`, `POST /users/verify`, `PUT /users/logout`, `POST /student-auth/*` request/response shapes, and the JWT claims the UIs read (`id`, `_id`, `school`, `role`, `permissions`, `exp`) — audit §13.1.

**Change (behind the same endpoints):**

- A single `Principal` type: `{ kind: 'staff'|'student', id, schoolId, role, permissions }`. Student tokens gain an explicit `role: 'student'` claim (additive) so policies can distinguish them; until all issued tokens expire (15 min), the middleware infers `student` from the absence of `role`.
- **Policy table** (declarative, one file): endpoint → allowed roles/permissions + ownership rule. Roles today: `administrator`, `teacher`, `student`, `parent`; `School.permissions` / `User.permissions` (UI module names such as "Examination Portal", "School Fees") become the server-side permission vocabulary — *extracted from the existing enum, not invented*.
- **Student-portal allow-list**: students are authorized for exactly the endpoints in audit §13.2, and for *their own* records (`:id` must equal `principal.id`). This is the compatibility keystone: it closes C-6 without breaking the student app.
- **Teachers**: limited to the levels/courses assigned to them for result entry and attendance (rule to be confirmed with the owner — see open questions).
- **Refresh**: re-check `active`; staff and student refresh tokens share one verification path; refresh-token **rotation + revocation** only if a token store is introduced (open question; the cheap first step is checking `active` and clearing the cookie correctly — H-1/H-2).
- **Passwords**: one `hashPassword` in `auth`; no other module calls bcrypt. Reset flow uses a hashed, single-use, CSPRNG token with an expiry and attempt limit (C-4).
- **Tenant isolation**: `tenant` middleware injects `schoolId`; repositories *require* it in their signatures so an unscoped query cannot be written by accident. Add `school` to `Examination`, `CurrentFee`, `Attendance` (additive, backfilled — see §7).

## 6. API compatibility strategy

- **No path, method, field-name or status-code changes in the first pass.** Exceptions need an entry in `docs/api-reference.md` with old contract, new contract, affected consumers and migration steps (CLAUDE.md §9).
- A **response adapter** lets each endpoint keep its legacy body (string / array / object) while services return plain data. This is how bare-string mutations (`"Changes Saved!!!"`) and Mongoose-shaped documents (with `fullName`, `levelName`, `noOfStudents` virtuals) stay identical.
- Status-code quirks that clients may rely on (`403` on expired access token, `404` on bad credentials) are **preserved by default** and listed in a "legacy quirks" table; each is changed only with a frontend release.
- A **contract test suite** (supertest, recorded from the current behaviour) runs against both the old route and the refactored module; a module is "done" only when both pass.
- Dead/mismatched endpoints (audit §13.3) are *not removed* in the first pass; they are flagged and decided with the owner.

## 7. Data and migrations

All changes **additive and backward-compatible**; nothing destructive without explicit approval (CLAUDE.md §8).

| Change | Why | Strategy |
|---|---|---|
| Add `school` to `Examination`, `CurrentFee`, `Attendance` | tenant isolation (C-6, D-1) | add optional field → backfill from `level.school` → read paths start scoping → later make required |
| Unique indexes `Examination{session,term,level,student}`, `CurrentFee{…}`, `Attendance{level,date}` | D-2 | **first run a duplicate-detection report**; resolve duplicates; then create indexes in the background |
| Fee ledger: store payment amounts as integer minor units alongside the legacy float field; read from the new field, keep writing both during a transition window | C-7, D-7 | dual-write → verify totals match → switch reads |
| Fix `Term` partial-unique index definition | D-6 | inspect the *live* indexes first; create the intended index only if data permits |
| `Grade.name` default / uniqueness scoped per school | D-5 | drop-and-recreate the index needs approval (production DB) |
| Per-school uniqueness for `Student.indexnumber` / `User.username` | D-3/D-4 | **only if** the product intends multiple schools to reuse identifiers — open question |
| Audit log collection (reuse the unused `Log` model) | D-11 | append-only writes from services (fee, exam, auth events) |
| Transactions | H-6, H-13, C-7 | requires MongoDB replica set (Atlas has one; local dev needs `--replSet`) — `withTransaction` helper falls back with a loud warning in dev |

A one-off **read-only data audit script** (counts of duplicates, orphans, cross-school references, float payments) precedes any migration, and is proposed in Stage 0 below.

## 8. Cross-cutting infrastructure

- **Config**: `config/env.js` validates required variables at startup and refuses to boot without secrets; `.env.example` lists every variable (the audit's §11 list). Hostnames (Render/Vercel) move to env.
- **Errors/logging**: `AppError` hierarchy; one error handler; `pino`-style structured JSON (library choice deferred — a thin logger wrapper keeps it swappable); redaction list (`password`, `token`, `authorization`, `cookie`, student PII fields); no request bodies logged by default.
- **Uploads**: a shared upload middleware with size limit, MIME + magic-byte check, generated filenames with a *whitelisted* extension; adapter fixes `uploadMultipleImages` / `getImageAsBase64` (H-7).
- **Mail/SMS**: one provider service each, TLS verification on, timeouts, errors returned to callers, bulk sends chunked.
- **Publishing**: ids based on `Examination._id` (not names), path built from validated ids only; PDF output moved out of any statically-served directory and served through an authenticated download route; Puppeteer launched once per job, always closed in `finally`; publishing becomes `POST` (the legacy `GET` stays as an alias during the transition).
- **Pagination**: opt-in `?page=&limit=` on list endpoints, with the **legacy unpaginated shape returned when the params are absent** (so clients are unaffected); sort fields allow-listed.

## 9. Things deliberately *not* proposed (yet)

- Background queue (Redis/BullMQ): consider **only if** publishing remains too slow after the in-request fixes and per-job browser reuse. Until then, bound concurrency and return `202` + a status endpoint is the first step.
- Distributed rate-limit/session store: only if the service runs more than one instance.
- TypeScript: out of scope; JSDoc types and validation schemas give most of the benefit.
- Rewriting the data model (e.g. normalising embedded `payment[]`/`scores[]` into collections): the fee **ledger** is the one justified exception (C-7); scores stay embedded but get validated shape and server-computed totals.

## 10. Open questions for the repository owner

**Resolved 2026-10-12:** (1) the system is multi-school; (2) teachers are limited to their own levels and courses; (6) students are deactivated, never deleted. Module files follow the `<module>.routes.js / .controller.js / .service.js / .validation.js` convention from the owner's `instructions.md`. Remaining open items are tracked in `docs/refactoring-progress.md` §5a.


1. **Is the system truly multi-school?** The data model says yes; `GET /users/school` returns "the first school" (`School.findOne()`), which suggests some deployments are single-school. This affects tenant rules and index uniqueness (D-3, D-4).
2. **Teacher permissions**: should teachers enter results/attendance only for their own levels/courses? The data (`Level.teacher`, `Course`) supports it, but the code never enforced it.
3. **Result publication rules**: is there a "published/locked" state in practice? Should edits after publishing require approval and be logged?
4. **Exam score rules**: the term stores `scorePreference` (default "50/50"). Are class/exam maxima always taken from it? Is the aggregate-grade logic in `generateTotalGrade` (core subjects + best two others, 1-9 scale) the intended policy for all schools, including those with custom grade scales?
5. **Fee semantics**: is "previous arrears" meant to include all earlier levels/terms (the code attempts it but is broken — H-12)? Currency is GHS; are fractions of a pesewa ever used?
6. **Admin UI "delete student"** currently 404s (audit §13.3). Should deletion exist at all, or only deactivation (preserving history)?
7. **Deployment**: single Render instance? Is the MongoDB a replica set (required for transactions)? Is there a staging database for migration rehearsal?
8. **Is the repository's Git history safe to rewrite** after the credential rotation, or should the leaked secret simply be considered burned and left in history?
