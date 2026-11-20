const { body } = require("express-validator");
const { validate, text, oneOfValues, boolean } = require("./validation");
const { logger } = require("./logger");

/**
 * Rules shared by the announcement and event routes.
 *
 * - An announcement's background colour comes from its priority on the SERVER, so a
 *   client can no longer store any colour string (or markup) it likes.
 * - Notifications are a side effect: once the announcement/event is saved, a failure
 *   to notify is logged but does not turn a saved item into an error.
 */
const PRIORITIES = ["high", "medium", "low", "default"];
const PRIORITY_COLORS = {
  high: "#ffcccb",
  medium: "#fff3cd",
  low: "#d4edda",
  default: "#ffffff",
};
const bgColorFor = (priority) => PRIORITY_COLORS[priority] || PRIORITY_COLORS.default;

// `optional` = a partial update (PUT): a field that is sent must still be valid.
const announcementRules = ({ optional = false } = {}) =>
  validate(
    text("body", "title", { optional, max: 200 }),
    text("body", "description", { optional, max: 20000 }),
    oneOfValues("body", "priority", PRIORITIES, { optional: true }),
    boolean("body", "active", { optional: true })
  );

// "" and null both mean "no date"; anything else must parse as a date.
const optionalDate = (field) =>
  body(field)
    .optional({ values: "falsy" })
    .custom((value) => typeof value === "string" && !Number.isNaN(Date.parse(value)))
    .withMessage(`${field} is not a valid date`);

const endNotBeforeStart = body("end")
  .optional({ values: "falsy" })
  .custom((end, { req }) => {
    const start = req.body?.start;
    return !start || !end || Date.parse(end) >= Date.parse(start);
  })
  .withMessage("end must not be before start");

const eventRules = ({ optional = false } = {}) =>
  validate(
    text("body", "title", { optional, max: 200 }),
    text("body", "description", { optional, max: 20000 }),
    text("body", "type", { optional: true, min: 0, max: 100 }),
    text("body", "caption", { optional: true, min: 0, max: 500 }),
    text("body", "album", { optional: true, min: 0, max: 500000 }),
    boolean("body", "active", { optional: true }),
    // an empty string means "no date" (the form sends "" when the field is left blank)
    optionalDate("start"),
    optionalDate("end"),
    endNotBeforeStart
  );

// An empty date field arrives as "" - store it as "no date".
const blankDatesToNull = (data) => {
  const out = { ...data };
  ["start", "end"].forEach((key) => {
    if (out[key] === "") out[key] = null;
  });
  return out;
};

const notifySafely = async (Notification, notifications, what) => {
  try {
    if (notifications.length) await Notification.insertMany(notifications);
    return true;
  } catch (err) {
    logger.error(`${what} saved, but its notifications could not be created`, { err });
    return false;
  }
};

module.exports = {
  PRIORITIES,
  PRIORITY_COLORS,
  bgColorFor,
  announcementRules,
  eventRules,
  blankDatesToNull,
  notifySafely,
};
