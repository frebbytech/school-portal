const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const rateLimit = require("express-rate-limit");
const _ = require("lodash");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createImageUpload } = require("../middlewares/upload");
const { validate, text, objectId } = require("../common/validation");
const { verifyJWT, verifyRefreshJWT } = require("../middlewares/verifyJWT");
const {
  requireRole,
  isSameSchool,
  requireStaff,
  requireMember,
  requireRoleEnforced,
  isSelf,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const User = require("../models/userModel");
const Teacher = require("../models/teacherModel");
const School = require("../models/schoolModel");
const { isValidObjectId } = require("mongoose");
const { uploadFile } = require("../config/uploadFile");

const upload = createImageUpload("users");

// Fields a user may change on their own record, and the extra ones only an
// administrator of the same school may change (finding C-5: mass assignment).
const SELF_EDITABLE_FIELDS = [
  "profile",
  "firstname",
  "lastname",
  "username",
  "dateofbirth",
  "gender",
  "email",
  "phonenumber",
  "address",
  "residence",
  "nationality",
];
const ADMIN_EDITABLE_FIELDS = [...SELF_EDITABLE_FIELDS, "role", "permissions", "active"];
const CREATABLE_FIELDS = [...SELF_EDITABLE_FIELDS, "role", "permissions", "password"];
const CREATABLE_ROLES = ["administrator", "teacher"];

const SCHOOL_EDITABLE_FIELDS = [
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
];

const NOT_ALLOWED = "You do not have permission to perform this action.";

/**
 * Decide whether the caller may modify user `id`.
 * - the user themself: profile fields only
 * - an administrator of the same school: profile fields plus role/permissions/active
 * Returns { target, isAdmin } or { status, message }. A user of another school is
 * reported exactly like a missing one so ids cannot be probed.
 */
const resolveEditableUser = async (req, id) => {
  if (!isValidObjectId(id)) return { status: 404, message: "Error updating user info.Try Again Later." };
  const principal = getPrincipal(req);
  const target = await User.findById(id).select("school role");
  if (!target) return { status: 404, message: "Error updating user info.Try Again Later." };

  const isAdmin = principal.role === "administrator" && isSameSchool(req, target.school);
  const self = isSelf(req, id) && principal.kind === "staff";

  if (isAdmin || self) return { target, isAdmin };
  if (principal.role === "administrator") {
    return { status: 404, message: "Error updating user info.Try Again Later." };
  }
  return { status: 403, message: NOT_ALLOWED };
};

const buildUserUpdate = async (body, isAdmin) => {
  const update = pickFields(body, isAdmin ? ADMIN_EDITABLE_FIELDS : SELF_EDITABLE_FIELDS);
  if (typeof body.password === "string" && body.password.length > 0) {
    update.password = await bcrypt.hash(body.password, 10);
  }
  return update;
};

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message:
    "Too many requests from this user, please try again after some time!",
  handler: (req, res) => {
    return res
      .status(429)
      .json(
        "Too many requests from this user, please try again after some time!"
      );
  },
});

//@GET all users
router.get(
  "/",
  verifyJWT,
  requireStaff,
  asyncHandler(async (req, res) => {
    const users = await User.find({ school: req.user.school })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(users);
  })
);

// GET School Information
// Returns the caller's own school (it used to return the first school in the database
// to anyone, signed in or not)
router.get(
  "/school",
  verifyJWT,
  requireMember,
  asyncHandler(async (req, res) => {
    const school = await School.findById(req.user.school);

    res.status(200).json(school);
  })
);

//@GET all users
router.get(
  "/:id",
  verifyJWT,
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) return res.status(404).json("Not Found!");

    const user = await User.findById(id).select("-password");

    // Users of other schools are reported as missing.
    if (!user || !isSameSchool(req, user.school)) {
      return res.status(404).json("Not Found!");
    }

    const loggedInUser = {
      _id: user._id?.toString(),
      id: user._id?.toString(),
      profile: user.profile,
      firstname: user.firstname,
      lastname: user.lastname,
      fullname: user.fullname,
      username: user.username,
      dateofbirth: user.dateofbirth,
      gender: user.gender,
      email: user.email,
      phonenumber: user.phonenumber,
      address: user.address,
      residence: user.residence,
      nationality: user.nationality,
      role: user.role,
      permissions: user?.permissions,
      active: user.active,
    };

    res.status(200).json(loggedInUser);
  })
);

//@GET user by username
router.post(
  "/login",
  apiLimiter,
  validate(
    text("body", "username", { max: 100 }),
    text("body", "password", { max: 200 }),
    objectId("body", "code", { optional: true })
  ),
  asyncHandler(async (req, res) => {
    const { username, code, password } = req.body;
    const user = await User.findByUsernameAndSchool({ username, school: code });

    // Platform administrators sign in at /platform/login only
    if (_.isEmpty(user) || user.role === "platform_admin") {
      return res.status(404).json(" Username or Password is incorrect !");
    }
    const isTrue = bcrypt.compareSync(password, user.password);
    if (!isTrue) {
      return res.status(404).json(" Username or Password is incorrect !");
    }

    if (user.active === false) {
      return res
        .status(404)
        .json(
          "Your account has been disabled! Try contacting your administrator."
        );
    }

    // console.log(user)

    const loggedInUser = {
      _id: user._id?.toString(),
      id: user._id?.toString(),
      profile: user.profile,
      firstname: user.firstname,
      lastname: user.lastname,
      fullname: user.fullname,
      username: user.username,
      dateofbirth: user.dateofbirth,
      gender: user.gender,
      email: user.email,
      phonenumber: user.phonenumber,
      role: user.role,
      permissions: user?.permissions,
      active: user.active,
      school: user?.school,
    };

    const schoolInfo = await School.findById(user?.school);

    // Generate JWT token
    const token = jwt.sign(loggedInUser, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const refresh_token = jwt.sign(
      loggedInUser,
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: "30d",
      }
    );

    res.cookie("refresh_token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "none", // Cross-site allowed
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/api/frebbys/v1/users/verify",
      domain:
        process.env.NODE_ENV === "production"
          ? "school-portal-aivn.onrender.com" // Leading dot for subdomains
          : undefined, // Localhost works without domain
    });

    res.status(200).json({
      token,
      school: schoolInfo,
    });
  })
);

//@GET all users
router.post(
  "/verify",
  verifyRefreshJWT,
  asyncHandler(async (req, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json("Unauthorized Access.Please login again");
    }
    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Update session with new user data
    req.session.user = {
      ...user,
    };

    res.status(200).json({
      token,
    });
  })
);

//@POST add new user
router.post(
  "/",
  verifyJWT,
  requireRoleEnforced("administrator"),
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    // Only listed fields are accepted; the school always comes from the token.
    const newUser = pickFields(req.body, CREATABLE_FIELDS);
    const username = newUser.username;

    if (!CREATABLE_ROLES.includes(newUser.role)) {
      return res.status(400).json("Invalid role");
    }
    if (typeof newUser.password !== "string" || newUser.password.length < 6) {
      return res.status(400).json("Password must be at least 6 characters");
    }

    const itExists = await User.findOne({ username });

    if (!_.isEmpty(itExists)) {
      return res
        .status(400)
        .json("An account with this Username already exits!");
    }

    const hashedPassword = await bcrypt.hash(newUser.password, 10);
    newUser.password = hashedPassword;

    let userPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    if (req.file) {
      const filename = req.file?.filename;
      userPhoto = await uploadFile(filename, "users/");
      newUser.profile = userPhoto;
    }

    const user = await User.create({
      ...newUser,
      school: req.user.school,
    });
    // await knex('users').insert(newUser);

    if (!user) {
      return res.status(404).json("Error Saving user info!");
    }

    res.status(201).json("New user has been added successfully!!!");
  })
);

//@Update User Information
router.put(
  "/",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const { _id, isOnlyUpdate } = req.body;

    const access = await resolveEditableUser(req, _id);
    if (!access.target) return res.status(access.status).json(access.message);

    const update = await buildUserUpdate(req.body, access.isAdmin);

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $set: update },
      { new: true }
    );

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info.Try Again Later.");
    }

    if (isOnlyUpdate) {
      return res.status(201).json("Profile Updated!!!");
    }

    const loggedInUser = {
      id: updatedUser._id?.toString(),
      profile: updatedUser.profile,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      fullname: updatedUser.fullname,
      username: updatedUser.username,
      dateofbirth: updatedUser.dateofbirth,
      gender: updatedUser.gender,
      email: updatedUser.email,
      phonenumber: updatedUser.phonenumber,
      role: updatedUser.role,
      permissions: updatedUser?.permissions,
      active: updatedUser.active,
      school: updatedUser?.school,
    };

    const token = jwt.sign(loggedInUser, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  })
);

//@POST Update User profile
router.put(
  "/profile",
  verifyJWT,
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    const { _id, user } = req.body;

    const access = await resolveEditableUser(req, _id);
    if (!access.target) return res.status(access.status).json(access.message);

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a file");
    }

    const filename = req.file?.filename;
    const userPhoto = await uploadFile(filename, "users/");

    const updatedUser = await User.findByIdAndUpdate(_id, {
      $set: {
        profile: userPhoto,
      },
    });

    if (_.isEmpty(updatedUser)) {
      return res
        .status(400)
        .json("Error updating profile image.Try again later.");
    }

    if (updatedUser.role === "teacher") {
      await Teacher.findByIdAndUpdate(_id, {
        $set: {
          profile: userPhoto,
        },
      });
    }

    if (!_.isEmpty(user)) {
      const loggedInUser = {
        _id: updatedUser._id,
        id: updatedUser._id?.toString(),
        profile: updatedUser.profile,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        dateofbirth: updatedUser.dateofbirth,
        gender: updatedUser.gender,
        email: updatedUser.email,
        phonenumber: updatedUser.phonenumber,
        role: updatedUser.role,
        permissions: updatedUser?.permissions,
        active: updatedUser.active,
        school: updatedUser?.school,
      };

      const token = jwt.sign(loggedInUser, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res.status(200).json({ token });
    }
    res.status(201).json("Profile Updated");
  })
);

//@PUT Reset Password
router.put(
  "/reset",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const { id, oldPassword, newPassword } = req.body;

    // Changing a password with the old one is something a user does for themself.
    if (!isSelf(req, id)) {
      return res.status(403).json(NOT_ALLOWED);
    }

    const user = await User.findById(id);
    // const user = await knex('users').where('id', id).first();

    if (_.isEmpty(user)) {
      return res.status(404).json("User does not exist");
    }
    const isTrue = await bcrypt.compare(oldPassword, user.password);
    if (!isTrue) {
      return res.status(404).json("Password is incorrect!!!");
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updatedUser = await User.findByIdAndUpdate(id, {
      password: hashedPassword,
    });

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info.Try Again Later.");
    }

    res.json("User information updated !!!");
  })
);
//@POST Reset User Password
router.put(
  "/reset-password",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    const { id, password } = req.body;

    const target = isValidObjectId(id) ? await User.findById(id).select("school") : null;
    if (!target || !isSameSchool(req, target.school)) {
      return res.status(404).json("Error updating user info.Try Again Later.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        password: hashedPassword,
      },
      {
        new: true,
      }
    );

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info.Try Again Later.");
    }

    res.status(200).json("Password updated !!!");
  })
);

router.put(
  "/logout",
  verifyJWT,
  asyncHandler(async (req, res) => {
    // res.clearCookie("refresh_token");
    req.user = null;
    res.clearCookie("refresh_token", {
      domain:
        process.env.NODE_ENV === "production"
          ? "school-portal-aivn.onrender.com" // Leading dot for subdomains
          : undefined, // Localhost works without domain
      path: "/api/frebbys/v1/users/verify",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    return res.sendStatus(204);
  })
);

//@PUT Reset Password
router.patch(
  "/admin/reset-password",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    const { id, password } = req.body;
    const user = isValidObjectId(id) ? await User.findById(id) : null;

    if (_.isEmpty(user) || !isSameSchool(req, user.school)) {
      return res.status(404).json("User does not exist");
    }

    const hashedPassword = await bcrypt.hash(password?.trim(), 10);

    const updatedUser = await User.findByIdAndUpdate(id, {
      password: hashedPassword,
    });

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info.Try Again Later.");
    }

    res.json("User password updated !!!");
  })
);

router.patch(
  "/",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const access = await resolveEditableUser(req, req.body.id);
    if (!access.target) return res.status(access.status).json(access.message);

    const update = await buildUserUpdate(req.body, access.isAdmin);

    const updatedUser = await User.findByIdAndUpdate(
      req.body.id,
      { $set: update },
      { new: true }
    );

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info");
    }

    res.status(200).json(true);
  })
);

//Enable or Disable User Account
router.put(
  "/account",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    const { id, active } = req.body;

    const target = isValidObjectId(id) ? await User.findById(id).select("school") : null;
    if (!target || !isSameSchool(req, target.school)) {
      return res.status(404).json("Error updating user info");
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: { active: Boolean(active) } },
      {
        new: true,
      }
    );

    if (_.isEmpty(updatedUser)) {
      return res.status(404).json("Error updating user info");
    }

    res.json(
      updatedUser.active === true
        ? "User account enabled!"
        : "User account disabled!"
    );
  })
);

//@DELETE user (administrators only, own school only)
router.delete(
  "/:id",
  verifyJWT,
  requireRole("administrator"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    if (!isValidObjectId(id)) {
      return res.status(401).json("Invalid User information");
    }

    const target = await User.findById(id).select("school");

    // Same response for "missing" and "other school" so ids of other schools
    // cannot be probed.
    if (_.isEmpty(target) || !isSameSchool(req, target.school)) {
      return res.status(403).json("No User with such id");
    }

    await User.findByIdAndDelete(id);

    res.status(200).json("User has been removed successfully !!!");
  })
);

// EDIT School Information
router.put(
  "/school",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    // An administrator edits their own school only, and only descriptive fields
    // (never code, unique or the purchased module permissions). No upsert: this
    // route can no longer create schools.
    const schoolInfo = pickFields(req.body, SCHOOL_EDITABLE_FIELDS);
    const school = await School.findByIdAndUpdate(
      req.user.school,
      { $set: schoolInfo },
      { new: true }
    );

    if (_.isEmpty(school)) {
      return res
        .status(403)
        .json('Couldn"t save school information.Please try again later.!!');
    }
    res.status(200).json("School Information Updated!!!");
  })
);

module.exports = router;
