/**
 * Minimal structured (JSON-lines) logger with redaction. No dependencies.
 *
 *   logger.info("message", { any: "context" })
 *   logger.error("message", { err, requestId })
 *
 * LOG_LEVEL: debug | info | warn | error | silent (default: info; "silent" under
 * NODE_ENV=test unless LOG_LEVEL is set explicitly).
 *
 * Redaction removes values of sensitive keys and credentials embedded in
 * connection strings. Request bodies are never logged by this module.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|credential|session/i;
const URL_CREDENTIALS = /([a-z][a-z0-9+.-]*:\/\/)([^\/\s:@]+):([^\/\s@]+)@/gi;
const MAX_DEPTH = 5;
const MAX_STRING = 2000;
const REDACTED = "[REDACTED]";

const redactString = (value) => {
  const cleaned = value.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
  return cleaned.length > MAX_STRING ? `${cleaned.slice(0, MAX_STRING)}…[truncated]` : cleaned;
};

function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[Object]";
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) return serializeError(value);

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1, seen));
  }

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(item, depth + 1, seen);
  }
  return out;
}

function serializeError(err) {
  return {
    name: err.name,
    message: redactString(String(err.message ?? "")),
    code: err.code,
    status: err.status ?? err.statusCode,
    stack: err.stack ? redactString(String(err.stack)) : undefined,
  };
}

const currentLevel = () => {
  const configured = (process.env.LOG_LEVEL || "").toLowerCase();
  if (LEVELS[configured]) return LEVELS[configured];
  return process.env.NODE_ENV === "test" ? LEVELS.silent : LEVELS.info;
};

function write(level, message, context) {
  if (LEVELS[level] < currentLevel()) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    message: redactString(String(message)),
    ...(context ? redact(context) : {}),
  };

  const line = JSON.stringify(entry);
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(`${line}\n`);
}

const logger = {
  debug: (message, context) => write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
};

module.exports = { logger, redact, serializeError };
