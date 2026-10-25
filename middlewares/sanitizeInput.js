const { ValidationError } = require("../common/errors");

/**
 * Rejects request input that could be turned into a database operator or pollute
 * object prototypes:
 *  - any key starting with `$` (`{"username": {"$ne": ""}}`, `?id[$gt]=`) in the body,
 *    query string or route params: these reach Mongo queries as operators;
 *  - `__proto__`, `constructor` and `prototype` keys;
 *  - nesting deeper than MAX_DEPTH.
 * No client sends such keys, so legitimate traffic is unaffected. The offending key
 * is not echoed back.
 */
const MAX_DEPTH = 20;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const isUnsafe = (value, depth = 0) => {
  if (value === null || typeof value !== "object") return false;
  if (depth > MAX_DEPTH) return true;

  if (Array.isArray(value)) {
    for (const item of value) if (isUnsafe(item, depth + 1)) return true;
    return false;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || FORBIDDEN_KEYS.has(key)) return true;
    if (isUnsafe(value[key], depth + 1)) return true;
  }
  return false;
};

const rejectUnsafeInput = (req, res, next) => {
  if (isUnsafe(req.body) || isUnsafe(req.query) || isUnsafe(req.params)) {
    return next(new ValidationError("Invalid request data"));
  }
  next();
};

module.exports = { rejectUnsafeInput, isUnsafe };
