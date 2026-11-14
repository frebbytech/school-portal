/**
 * Settings for the sign-in (refresh) cookies, read from the environment so the same code
 * works on any hosting layout:
 *
 *   COOKIE_DOMAIN    leave empty for a cookie tied to the API's own host (right when the
 *                    API is on a host of its own). Set it (e.g. "example.com") only to
 *                    share the cookie with sibling subdomains. Never put a scheme or a
 *                    slash in it.
 *   COOKIE_SAMESITE  "none" (default, today's behaviour) lets the admin app, the student
 *                    app and the API sit on different sites; "lax" or "strict" suit one
 *                    site, e.g. apps and API on subdomains of one domain on a single VPS.
 *   COOKIE_SECURE    "true" (default) sends the cookie over HTTPS only. "false" is for
 *                    plain-http testing; it is ignored when SameSite is "none" because
 *                    browsers refuse such cookies without Secure.
 */
const SAME_SITE_VALUES = ["none", "lax", "strict"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function cookieSettings(env = process.env) {
  const requested = String(env.COOKIE_SAMESITE || "none").trim().toLowerCase();
  const sameSite = SAME_SITE_VALUES.includes(requested) ? requested : "none";
  const domain = String(env.COOKIE_DOMAIN || "").trim() || undefined;
  const secure = sameSite === "none" ? true : String(env.COOKIE_SECURE || "true").trim().toLowerCase() !== "false";
  return { sameSite, domain, secure };
}

// Options for setting the refresh cookie on a given path.
function refreshCookieOptions(path, env = process.env) {
  const { sameSite, domain, secure } = cookieSettings(env);
  return { httpOnly: true, secure, sameSite, maxAge: WEEK_MS, path, ...(domain ? { domain } : {}) };
}

// Options for clearing it: the browser only removes a cookie when these match the ones it
// was set with (path, domain, SameSite, Secure); maxAge is left out on purpose.
function clearCookieOptions(path, env = process.env) {
  const { maxAge, ...rest } = refreshCookieOptions(path, env);
  return rest;
}

module.exports = { cookieSettings, refreshCookieOptions, clearCookieOptions, SAME_SITE_VALUES };
