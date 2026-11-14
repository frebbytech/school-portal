# Deployment and migration

## Requirements

- Node.js `20.17.0`, or `22.9.0` up to (not including) `25`. `.nvmrc` pins 22. Node 25 removes `SlowBuffer`, which `jsonwebtoken` still uses, so every login would crash.
- MongoDB reachable from the server. Tests start their own throw-away MongoDB (`mongodb-memory-server`); they never touch a real database.

## Environment variables

All documented in `.env.example`. Never commit real values. In production the server **refuses to start** unless these are set: `MONGO_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`.

| Group | Variables |
|---|---|
| Core | `NODE_ENV`, `PORT`, `LOG_LEVEL`, `UPLOAD_MAX_MB` |
| Database | `MONGO_URL` (production), `MONGO_URL_LOCAL` (development) |
| Secrets | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRY`, `SESSION_SECRET` |
| Browsers | `CORS_WHITELIST`, `CLIENT_URL`, `STUDENT_URL` |
| Rate limits | `RATE_LIMIT_MAX`, `STUDENT_LOGIN_RATE_LIMIT_MAX`, `PLATFORM_LOGIN_RATE_LIMIT_MAX`, `MESSAGE_RATE_LIMIT_MAX`, `RESET_RATE_LIMIT_MAX` |
| Mail and SMS | `MAIL_CLIENT_SERVICE`, `MAIL_CLIENT_USER`, `MAIL_CLIENT_PASS`, `MAIL_TLS_REJECT_UNAUTHORIZED`, `SMS_URL`, `SMS_API_KEY` |
| File storage | `FIREBASE_*` |
| Safety switch | `ENFORCE_AUTHZ` (see below) |

## First deployment of the refactored backend

1. **Rotate secrets** if they have ever been committed or shared; set all five required variables.
2. **Back up the database** and restore the backup somewhere safe. Rehearse steps 4 to 6 on that copy first.
3. Deploy the new code. Behaviour changes that users will notice are listed in `docs/refactoring-progress.md` (arrears now counted, payments validated, deletes refused for records with payments, and so on).
4. Run the read-only audit: `AUDIT_MONGO_URL="<read-only url>" node scripts/data-audit.js audit-report.md`. Fix or accept what it reports.
5. Create the first platform administrator (only they can create schools): set `PLATFORM_USERNAME`, `PLATFORM_PASSWORD` (12+ characters), `PLATFORM_EMAIL`, `PLATFORM_FIRSTNAME`, `PLATFORM_LASTNAME`, then `node scripts/create-platform-admin.js`. Sign in at `/platform` in the admin app.
6. Run migration 001 as a dry run, then with `--apply` (see `docs/database.md`).

## Authorization switch

`ENFORCE_AUTHZ` controls the role checks (administrator-only writes, teacher scope). Leave it **on** (the default). It exists so a role mistake found after deployment can be switched off temporarily while it is fixed; school separation, platform rules and field allow-lists stay in force either way.

## Rollback

| Change | How to undo |
|---|---|
| Code | Redeploy the previous release. The new fields (`mustChangePassword`, `school` on exam and fee records) are optional, so the old code ignores them. |
| Migration 001 | `db.terms.dropIndex("one_current_term_per_school")` |
| Data | No stage deletes or rewrites existing data. Restore from the backup only if something outside this refactor went wrong. |

## Health and shutdown

`server.js` validates the environment, connects, listens, and on SIGTERM stops accepting requests, lets in-flight ones finish, then closes the database connection. Every response carries `X-Request-Id`; quote it when reporting a problem so the log line can be found.

## Running the tests locally

`nvm use` (Node 22), `npm ci`, `npm test`. The first run downloads a MongoDB binary for the in-memory server (needs internet). The suite runs in one process (`--runInBand`).

## Sign-in cookie settings (COOKIE_DOMAIN, COOKIE_SAMESITE, COOKIE_SECURE)

Until now the sign-in cookies, and the session cookie in `app.js`, carried a hard-coded
`Domain=school-portal-aivn.onrender.com` in production, so the app could only be signed in
from that one API host. They now read three optional variables (`common/cookies.js`):

| Variable | Default | Meaning |
|---|---|---|
| `COOKIE_DOMAIN` | empty | Empty = the cookie belongs to the API host only (same effect as before on Render). Set a bare domain such as `example.com` only to share the cookie across subdomains. No `https://`, port or slash. |
| `COOKIE_SAMESITE` | `none` | `none` = admin app, student app and API may be on different sites (today's behaviour). `lax` or `strict` = everything on one site, e.g. `admin.example.com`, `student.example.com`, `api.example.com`. |
| `COOKIE_SECURE` | `true` | HTTPS only. `false` is for plain-http testing and is ignored when SameSite is `none`. |

**Separate hosts (today, e.g. Vercel + Render):** change nothing; defaults reproduce the old behaviour.

**One VPS, one domain:** serve everything over HTTPS, set `COOKIE_SAMESITE=lax`, leave
`COOKIE_DOMAIN` empty (or set it to the parent domain), and list each app origin in
`CORS_WHITELIST`. The reverse proxy must keep the paths `/api/frebbys/v1/users/verify` and
`/api/frebbys/v1/student-auth/refresh` unchanged, since the cookies are scoped to them.

**Effect on people already signed in:** the browser treats the new cookie as the same cookie
and replaces it at the next sign-in; nobody needs to do anything. If a staff member sees
"Session expired" right after the change, signing in again fixes it.
