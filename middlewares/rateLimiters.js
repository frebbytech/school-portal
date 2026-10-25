const rateLimit = require("express-rate-limit");

/**
 * Rate limiters. Schools usually share one public IP (school Wi-Fi), so limiters
 * that protect sign-in are keyed by IP *and* account, and only failed attempts count;
 * otherwise a classroom of students logging in would lock each other out.
 */

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const positiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Student login: N failed attempts per student id per IP per 15 minutes
const studentLoginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: () => positiveInt(process.env.STUDENT_LOGIN_RATE_LIMIT_MAX, 10),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${req.ip}|${String(req.body?.studentId ?? "").trim().toLowerCase()}`,
  handler: (req, res) =>
    res.status(429).json({ message: "Too many login attempts. Please try again later." }),
});

// Platform administrator login: N failed attempts per username per IP per 15 minutes
const platformLoginLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: () => positiveInt(process.env.PLATFORM_LOGIN_RATE_LIMIT_MAX, 5),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `${req.ip}|${String(req.body?.username ?? "").trim().toLowerCase()}`,
  handler: (req, res) =>
    res.status(429).json("Too many requests from this user, please try again after some time!"),
});

// Sending SMS/email: per signed-in user, so one account cannot flood recipients
const messageLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: () => positiveInt(process.env.MESSAGE_RATE_LIMIT_MAX, 60),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  handler: (req, res) =>
    res.status(429).json("Too many messages sent. Please try again later."),
});

/**
 * Optional API-wide limiter, OFF unless RATE_LIMIT_MAX is set to a positive number
 * (requests per IP per 15 minutes). It is opt-in because many users behind one
 * school IP legitimately make many requests; pick a value from real traffic.
 */
function createGlobalLimiter() {
  const max = positiveInt(process.env.RATE_LIMIT_MAX, 0);
  if (!max) return null;

  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === "/api/frebbys/v1/health",
    handler: (req, res) =>
      res.status(429).json("Too many requests from this IP, please try again later"),
  });
}

module.exports = { studentLoginLimiter, platformLoginLimiter, messageLimiter, createGlobalLimiter };
