const { logger } = require("../common/logger");
const { AppError } = require("../common/errors");

const GENERIC_MESSAGE = "An unexpected error occurred";

/**
 * Translate any thrown error into { status, message, code }.
 * Detection is by error shape/name so this module has no dependency on the
 * libraries that produce the errors.
 */
function classify(error) {
  // Duplicate key (unique index violation)
  if (error?.name === "MongoServerError" && error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    const value = field !== undefined ? error.keyValue[field] : undefined;
    return {
      status: 409,
      code: "DUPLICATE_KEY",
      message:
        field !== undefined
          ? `The ${field} "${value}" is already taken.`
          : "A record with the same unique value already exists.",
      expose: true,
    };
  }

  // Mongoose schema validation
  if (error?.name === "ValidationError" && error.errors && typeof error.errors === "object") {
    const messages = Object.values(error.errors)
      .map((item) => item?.message)
      .filter(Boolean);
    return {
      status: 400,
      code: "VALIDATION_ERROR",
      message: messages.length ? messages.join("; ") : "Invalid request data",
      expose: true,
    };
  }

  // Malformed ObjectId or other bad value type. The offending value is not echoed.
  if (error?.name === "CastError") {
    return {
      status: 400,
      code: "INVALID_ID",
      message: `Invalid ${error.path || "value"}`,
      expose: true,
    };
  }

  // Upload limits (multer)
  if (error?.name === "MulterError") {
    const tooLarge = error.code === "LIMIT_FILE_SIZE";
    return {
      status: tooLarge ? 413 : 400,
      code: tooLarge ? "FILE_TOO_LARGE" : "UPLOAD_ERROR",
      message: tooLarge ? "The uploaded file is too large" : "Invalid file upload",
      expose: true,
    };
  }

  const status = Number(error?.status || error?.statusCode) || 500;
  const validStatus = status >= 400 && status <= 599 ? status : 500;

  return {
    status: validStatus,
    // Only our own error types expose a code; library codes (e.g. ECONNRESET) stay internal
    code: error instanceof AppError ? error.code : undefined,
    message: error?.message,
    // body-parser/http-errors/AppError mark client errors as safe to show
    expose: validStatus < 500 && error?.expose !== false,
  };
}

/**
 * Central Express error handler. Keeps the legacy response body
 * `{ status: "error", statusCode, message }` and adds `code` and `requestId`.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  const info = classify(error);
  const production = process.env.NODE_ENV === "production";

  // Server errors never leak details in production
  const message =
    info.status >= 500
      ? production
        ? GENERIC_MESSAGE
        : info.message || GENERIC_MESSAGE
      : info.expose || !production
        ? info.message || GENERIC_MESSAGE
        : GENERIC_MESSAGE;

  const context = {
    requestId: req.id,
    method: req.method,
    path: (req.originalUrl || req.url || "").split("?")[0],
    status: info.status,
    errorName: error?.name,
    errorCode: info.code,
  };

  if (info.status >= 500) {
    logger.error("request failed", { ...context, err: error });
  } else {
    logger.warn("request rejected", { ...context, reason: info.message });
  }

  const body = { status: "error", statusCode: info.status, message };
  if (info.code) body.code = info.code;
  if (req.id) body.requestId = req.id;

  res.status(info.status).json(body);
};

module.exports = { errorHandler, classify };
