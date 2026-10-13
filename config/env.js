/**
 * Startup environment validation.
 *
 * `validateEnv()` is a pure function (takes the env object, returns a report) so it
 * can be tested. `assertEnv()` is what server.js calls: it applies safe defaults,
 * logs warnings, and aborts startup with a clear message when something essential
 * is missing. Only variable NAMES are ever printed, never values.
 */

const PRODUCTION_REQUIRED = [
  "MONGO_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "REFRESH_TOKEN_SECRET",
  "SESSION_SECRET",
];

// Missing in production => feature degraded, but the app can still serve requests
const RECOMMENDED = [
  ["CORS_WHITELIST", "browsers may be blocked by CORS (built-in defaults are used)"],
  ["MAIL_CLIENT_SERVICE", "emails will fail"],
  ["MAIL_CLIENT_USER", "emails will fail"],
  ["MAIL_CLIENT_PASS", "emails will fail"],
  ["SMS_URL", "SMS will fail"],
  ["SMS_API_KEY", "SMS will fail"],
  ["FIREBASE_API_KEY", "image uploads will fail"],
  ["FIREBASE_STORAGE_BUCKET", "image uploads will fail"],
];

const SECRET_NAMES = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "REFRESH_TOKEN_SECRET",
  "SESSION_SECRET",
];

const MIN_SECRET_LENGTH = 32;
const DEFAULT_REFRESH_TOKEN_EXPIRY = "7d";

const isSet = (env, name) =>
  typeof env[name] === "string" && env[name].trim() !== "";

function validateEnv(env = process.env) {
  const production = env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  if (production) {
    for (const name of PRODUCTION_REQUIRED) {
      if (!isSet(env, name)) errors.push(`${name} is required in production`);
    }
  }

  // Short secrets are weak; this is a warning so existing deployments keep booting
  for (const name of SECRET_NAMES) {
    if (isSet(env, name) && env[name].length < MIN_SECRET_LENGTH) {
      warnings.push(
        `${name} is shorter than ${MIN_SECRET_LENGTH} characters; use a long random value`
      );
    }
  }

  // Reusing one secret for several token types lets a token of one kind be
  // accepted as another
  const seen = new Map();
  for (const name of SECRET_NAMES) {
    if (!isSet(env, name)) continue;
    const owner = seen.get(env[name]);
    if (owner) warnings.push(`${name} has the same value as ${owner}; use distinct secrets`);
    else seen.set(env[name], name);
  }

  if (production) {
    for (const [name, effect] of RECOMMENDED) {
      if (!isSet(env, name)) warnings.push(`${name} is not set: ${effect}`);
    }
  }

  return { errors, warnings };
}

function assertEnv(env = process.env, log = console) {
  // Student refresh tokens are signed with this expiry; a missing value would make
  // signing fail. 7d matches the cookie lifetime.
  if (!isSet(env, "REFRESH_TOKEN_EXPIRY")) {
    env.REFRESH_TOKEN_EXPIRY = DEFAULT_REFRESH_TOKEN_EXPIRY;
  }

  const { errors, warnings } = validateEnv(env);

  for (const warning of warnings) log.warn(`[config] ${warning}`);

  if (errors.length) {
    for (const error of errors) log.error(`[config] ${error}`);
    throw new Error(
      `Invalid configuration (${errors.length} problem${errors.length > 1 ? "s" : ""}); see messages above`
    );
  }
}

module.exports = {
  validateEnv,
  assertEnv,
  PRODUCTION_REQUIRED,
  DEFAULT_REFRESH_TOKEN_EXPIRY,
};
