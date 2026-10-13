/**
 * Domain error types. Throw these from services/handlers; the central error
 * handler (middlewares/errorHandler.js) maps them to HTTP responses.
 */

class AppError extends Error {
  constructor(status, message, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.expose = status < 500; // client errors may show their message
  }
}

class ValidationError extends AppError {
  constructor(message = "Invalid request data") {
    super(400, message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized Access.Please contact administrator") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

class NotFoundError extends AppError {
  constructor(message = "Not Found") {
    super(404, message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
