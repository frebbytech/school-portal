const { randomUUID } = require("crypto");

// Accept a caller-supplied id only if it is short and made of safe characters,
// otherwise it could be used to inject newlines/markup into logs.
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Gives every request a correlation id (`req.id`) and echoes it as the
 * `X-Request-Id` response header so a user-reported error can be found in the logs.
 */
const requestId = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  req.id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
};

module.exports = { requestId };
