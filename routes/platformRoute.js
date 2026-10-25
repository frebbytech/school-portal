const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isValidObjectId } = require("mongoose");
const School = require("../models/schoolModel");
const User = require("../models/userModel");
const { verifyJWT } = require("../middlewares/verifyJWT");
const { requireRole, pickFields } = require("../middlewares/authorize");
const { platformLoginLimiter } = require("../middlewares/rateLimiters");

/**
 * Platform administration: the only place schools are created and their purchased
 * modules (`permissions`) are set. A platform administrator belongs to no school and
 * is deliberately NOT a "staff" principal, so every school-level endpoint refuses
 * the token. The role guards here are not affected by ENFORCE_AUTHZ.
 */
const platformOnly = [verifyJWT, requireRole("platform_admin")];

const SCHOOL_FIELDS = [
  "code",
  "unique",
  "badge",
  "name",
  "motto",
  "address",
  "location",
  "district",
  "region",
  "email",
  "website",
  "phonenumber",
  "permissions",
];
const ADMIN_FIELDS = [
  "firstname",
  "lastname",
  "username",
  "email",
  "phonenumber",
  "gender",
  "dateofbirth",
];
const BAD_LOGIN = " Username or Password is incorrect !";

// Platform administrator sign-in: username + password (no school code). The token
// lives one hour and there is no refresh cookie, so signing in again is required.
router.post(
  "/login",
  platformLoginLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string") {
      return res.status(404).json(BAD_LOGIN);
    }

    const user = await User.findOne({ username, role: "platform_admin" });
    if (!user || !(await bcrypt.compare(password, user.password)) || user.active === false) {
      return res.status(404).json(BAD_LOGIN);
    }

    const token = jwt.sign(
      {
        _id: user._id.toString(),
        id: user._id.toString(),
        username: user.username,
        fullname: user.fullname,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({ token });
  })
);

// All schools
router.get(
  "/schools",
  ...platformOnly,
  asyncHandler(async (req, res) => {
    res.status(200).json(await School.find().sort({ name: 1 }));
  })
);

// Create a school
router.post(
  "/schools",
  ...platformOnly,
  asyncHandler(async (req, res) => {
    try {
      const school = await new School(pickFields(req.body, SCHOOL_FIELDS)).save();
      res.status(201).json(school);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

// Edit a school (including its purchased modules)
router.put(
  "/schools/:id",
  ...platformOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(404).json("School not found");

    try {
      const school = await School.findByIdAndUpdate(
        id,
        { $set: pickFields(req.body, SCHOOL_FIELDS) },
        { new: true, runValidators: true }
      );
      if (!school) return res.status(404).json("School not found");
      res.status(200).json(school);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

// Create a school's administrator (the first account of a new school)
router.post(
  "/schools/:id/administrators",
  ...platformOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const school = isValidObjectId(id) ? await School.findById(id).select("_id") : null;
    if (!school) return res.status(404).json("School not found");

    const data = pickFields(req.body, ADMIN_FIELDS);
    const { password } = req.body || {};
    if (typeof data.username !== "string" || !data.username) {
      return res.status(400).json("Username is required");
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json("Password must be at least 8 characters");
    }
    if (await User.exists({ $or: [{ username: data.username }, { email: String(data.email || "").toLowerCase() }] })) {
      return res.status(400).json("An account with this Username or Email already exists!");
    }

    try {
      const user = await User.create({
        ...data,
        school: school._id,
        role: "administrator",
        password: await bcrypt.hash(password, 10),
        createdBy: req.user.id,
      });
      res.status(201).json({ _id: user._id, username: user.username, school: school._id });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

module.exports = router;
