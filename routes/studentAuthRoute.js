// server.js
require("dotenv").config();
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const StudentAuth = require("../models/studentAuthModel");
const { sendVerificationEmail } = require("../config/mail/mails");
const Student = require("../models/studentModel");
const Term = require("../models/termModel");
const expressAsyncHandler = require("express-async-handler");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { studentLoginLimiter } = require("../middlewares/rateLimiters");

// Helper functions
const generateAccessToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET, {
    // expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    expiresIn: "15m",
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

// Password reset helpers
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const MAX_RESET_ATTEMPTS = 5;

// 6-digit code from a cryptographically secure generator
const generateResetToken = () => crypto.randomInt(100000, 1000000).toString();

// Only a hash of the code is stored
const hashResetCode = (code) =>
  crypto.createHash("sha256").update(String(code)).digest("hex");

const codesMatch = (storedHash, code) => {
  if (!storedHash || code === undefined || code === null) return false;
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashResetCode(code), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const clearResetState = (student) => {
  student.resetToken = null;
  student.resetTokenExpiry = null;
  student.resetVerified = false;
  student.resetAttempts = 0;
};

// Limits password-reset abuse per IP (configurable for tests)
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RESET_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res
      .status(429)
      .json({ message: "Too many attempts. Please try again later." }),
});

//@GET student by student id
router.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params?.id;

    if (_.isEmpty(id)) {
      return res.status(400).json({ message: "Student ID is required" });
    }
    //Personal Info
    const student = await Student.findById(id)
      .populate({
        path: "school",
        select: [
          "address",
          "badge",
          "code",
          "email",
          "location",
          "motto",
          "name",
          "phonenumber",
          "region",
          "website",
        ],
      })
      .populate("level", ["level"]);
    if (_.isEmpty(student)) {
      return res.status(400).json("No Such Student exists");
    }

    const { school, ...rest } = student;

    const term = await Term.findOne({
      school: school._id,
      status: "current",
      active: true,
    }).populate("session");

    const currentTerm = {
      core: {
        name: term?.name,
        from: term?.from,
        to: term?.to,
        term: term?.term,
        academicYear: term?.academicYear,
        vacationDate: term?.vacationDate,
        reOpeningDate: term?.reOpeningDate,
        isPromotionTerm: term?.isPromotionTerm,
      },
      exams: term?.exams,
      termId: term._id,
      sessionId: term?.session?._id,
      status: term?.status,
      active: term?.active,
    };

    res.status(200).json({
      student: rest?._doc,
      school: student?.school,
      session: currentTerm,
    });
  })
);

// ✅ LOGIN
router.post("/login", studentLoginLimiter, async (req, res) => {
  const { studentId, password } = req.body;

  const student = await StudentAuth.findOne({ indexnumber: studentId });
  if (!student)
    return res.status(401).json({ message: "Invalid student ID or password" });

  const isMatch = await bcrypt.compare(password, student?.password);
  if (!isMatch)
    return res.status(401).json({ message: "Invalid student ID or password" });

  const authStudent = await Student.findById(student._id)
    .populate({
      path: "school",
      select: [
        "address",
        "badge",
        "code",
        "email",
        "location",
        "motto",
        "name",
        "phonenumber",
        "region",
        "website",
      ],
    })
    .populate("level", ["level"]);
  const { school, ...rest } = authStudent?._doc;

  const term = await Term.findOne({
    school: school._id,
    status: "current",
    active: true,
  }).populate("session");

  const currentTerm = {
    core: {
      name: term?.name,
      from: term?.from,
      to: term?.to,
      term: term?.term,
      academicYear: term?.academicYear,
      vacationDate: term?.vacationDate,
      reOpeningDate: term?.reOpeningDate,
      isPromotionTerm: term?.isPromotionTerm,
    },
    exams: term?.exams,
    termId: term._id,
    sessionId: term?.session?._id,
    status: term?.status,
    active: term?.active,
  };

  const data = {
    _id: authStudent._id,
    id: authStudent._id,
    school: school._id,
  };

  const fullName =
    _.capitalize(`${rest?.firstname} ${rest?.surname} ${rest?.othername}`) ||
    "No Name";

  const authUser = {
    student: {
      ...rest,
      fullName: fullName,
    },
    school: school,
    session: currentTerm,
  };
  const accessToken = generateAccessToken(data);
  const refreshToken = generateRefreshToken(data);

  req.user = data;

  // Send refresh token in HTTP-only cookie
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none", // Cross-site allowed
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/frebbys/v1/student-auth/refresh", // Ensure path matches refresh route
    // Set domain for subdomains if needed
    domain:
      process.env.NODE_ENV === "production"
        ? "school-portal-aivn.onrender.com" // Leading dot for subdomains
        : undefined, // Localhost works without domain
  });

  res.json({
    accessToken,
    data: authUser,
  });
});

// ✅ REFRESH TOKEN
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refresh_token;

  if (!refreshToken)
    return res.status(401).json({ message: "Unauthorized access " });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const student = await StudentAuth.findById(decoded.id).select("-password");

    if (!student) return res.status(401).json({ message: "Invalid token" });
    const authStudent = await Student.findById(student._id)
       .populate({
        path: "school",
        select: [
          "address",
          "badge",
          "code",
          "email",
          "location",
          "motto",
          "name",
          "phonenumber",
          "region",
          "website",
        ],
      })
      .populate("level", ["level"]);
    const { school, ...rest } = authStudent?._doc;
    const term = await Term.findOne({
      school: school._id,
      status: "current",
      active: true,
    }).populate("session");

    const currentTerm = {
      core: {
        name: term?.name,
        from: term?.from,
        to: term?.to,
        term: term?.term,
        academicYear: term?.academicYear,
        vacationDate: term?.vacationDate,
        reOpeningDate: term?.reOpeningDate,
        isPromotionTerm: term?.isPromotionTerm,
      },
      exams: term?.exams,
      termId: term._id,
      sessionId: term?.session?._id,
      status: term?.status,
      active: term?.active,
    };

    const data = {
      _id: authStudent._id,
      id: authStudent._id,
      school: school._id,
    };

    const fullName =
      _.capitalize(`${rest?.firstname} ${rest?.surname} ${rest?.othername}`) ||
      "No Name";


    const authUser = {
      student: {
        ...rest,
        fullName: fullName,
      },
      school: school,
      session: currentTerm,
    };

    // Generate new access token
    const newAccessToken = generateAccessToken(data);
    req.user = data;

    res.json({
      token: newAccessToken,
      data: authUser,
    });
  } catch (err) {
    res.status(403).json({ message: "Token expired or invalid" });
  }
});

router.post("/logout", (req, res) => {
  req.user = null;
  res.clearCookie("refreshToken", {
    path: "/api/frebbys/v1/student-auth/refresh",
  });
  res.sendStatus(204);
});

// ✅ Request reset
router.post("/reset-password-request", resetLimiter, async (req, res) => {
  const { studentId } = req.body;

  const student = await StudentAuth.findOne({ indexnumber: studentId });
  if (!student) return res.status(404).json({ message: "Student not found" });

  const resetToken = generateResetToken();

  student.resetToken = hashResetCode(resetToken);
  student.resetTokenExpiry = new Date(Date.now() + RESET_CODE_TTL_MS);
  student.resetVerified = false;
  student.resetAttempts = 0;
  await student.save();

  const sent = await sendVerificationEmail(student.email, resetToken);
  if (!sent) return res.status(500).json({ message: "Failed to send email" });

  res.json({ message: "Reset code sent" });
});

// ✅ Confirm code
router.post("/confirm-reset-code", resetLimiter, async (req, res) => {
  const { studentId, code } = req.body;
  const invalid = () =>
    res.status(400).json({ message: "Invalid or expired token" });

  const student = await StudentAuth.findOne({ indexnumber: studentId });
  if (
    !student ||
    !student.resetToken ||
    !student.resetTokenExpiry ||
    new Date() > student.resetTokenExpiry
  ) {
    return invalid();
  }

  if (!codesMatch(student.resetToken, code)) {
    student.resetAttempts = (student.resetAttempts || 0) + 1;
    // Too many wrong guesses: invalidate the code, a new one must be requested
    if (student.resetAttempts >= MAX_RESET_ATTEMPTS) clearResetState(student);
    await student.save();
    return invalid();
  }

  student.resetVerified = true;
  await student.save();

  res.json({ message: "Code confirmed" });
});

// ✅ Reset password (only after the emailed code has been confirmed)
router.post("/reset-password", resetLimiter, async (req, res) => {
  const { studentId, newPassword } = req.body;

  const student = await StudentAuth.findOne({ indexnumber: studentId });
  if (!student) return res.status(404).json({ message: "Student not found" });

  if (
    !student.resetVerified ||
    !student.resetToken ||
    !student.resetTokenExpiry ||
    new Date() > student.resetTokenExpiry
  ) {
    return res.status(400).json({ message: "Invalid or expired token" });
  }

  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  student.password = await bcrypt.hash(newPassword, 10);
  clearResetState(student);

  await student.save();
  res.json({ message: "Password reset successful" });
});

module.exports = router;
