const { body, param, query, validationResult } = require("express-validator");
const { ValidationError } = require("./errors");

/**
 * Shared request validation (express-validator) for params, query and body.
 *
 *   router.post("/quick", validate(oneOfValues("type", MESSAGE_TYPES), text("message", { max: 1000 })), handler)
 *
 * Failures become a `ValidationError` (HTTP 400, code VALIDATION_ERROR) handled by the
 * central error handler, so the body keeps the legacy `{ status, statusCode, message }`
 * shape. Validators only CHECK input; they never rewrite it, so what a handler
 * receives is exactly what the client sent.
 */
const validate = (...chains) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const message = result
      .array({ onlyFirstError: true })
      .map((error) => error.msg)
      .join("; ");
    next(new ValidationError(message));
  },
];

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const isObjectIdString = (value) => typeof value === "string" && OBJECT_ID.test(value);

const locations = { body, param, query };

const start = (where, field, optional) => {
  const chain = locations[where](field);
  return optional ? chain.optional({ values: "undefined" }) : chain;
};

/** A 24-character hex ObjectId string (rejects numbers, objects and 12-char strings). */
const objectId = (where, field, { optional = false } = {}) =>
  start(where, field, optional)
    .custom(isObjectIdString)
    .withMessage(`${field} is not a valid id`);

/** An array of ObjectId strings, with an upper bound on its size. */
const objectIdList = (where, field, { optional = false, max = 500 } = {}) =>
  start(where, field, optional)
    .custom((value) => Array.isArray(value) && value.length <= max && value.every(isObjectIdString))
    .withMessage(`${field} must be a list of valid ids (at most ${max})`);

/** A string (not an array or object) within the given length. */
const text = (where, field, { optional = false, min = 1, max = 255 } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "string" && value.trim().length >= min && value.length <= max)
    .withMessage(`${field} must be text of ${min} to ${max} characters`);

const email = (where, field, { optional = false } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "string" && value.length <= 254)
    .bail()
    .isEmail()
    .withMessage(`${field} is not a valid email address`);

/**
 * A phone number as people type it: digits with an optional leading +, and optional
 * brackets, spaces or hyphens (the clients accept e.g. "(+233)(024)1234567").
 */
const phone = (where, field, { optional = false } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "string" && /^\+?[0-9()\s-]{7,20}$/.test(value))
    .withMessage(`${field} is not a valid phone number`);

const oneOfValues = (where, field, values, { optional = false } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "string" && values.includes(value))
    .withMessage(`${field} must be one of: ${values.join(", ")}`);

const boolean = (where, field, { optional = false } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "boolean")
    .withMessage(`${field} must be true or false`);

const isoDate = (where, field, { optional = false } = {}) =>
  start(where, field, optional)
    .custom((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .withMessage(`${field} is not a valid date`);

module.exports = {
  validate,
  isObjectIdString,
  objectId,
  objectIdList,
  text,
  email,
  phone,
  oneOfValues,
  boolean,
  isoDate,
};
