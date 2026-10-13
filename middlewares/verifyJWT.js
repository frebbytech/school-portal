const jwt = require("jsonwebtoken");
const _ = require("lodash");
const User = require("../models/userModel");
const StudentAuth = require("../models/studentAuthModel");

const verifyJWT = (req, res, next) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader) {
    return res
      .status(401)
      .json("Unauthorized Access.Please contact administrator");
  }

  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json("Unauthorized Access.Please contact administrator");
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json("Session has expired.Please login again");
    }

    req.user = user;

    next();
  });
};

const verifyRefreshJWT = (req, res, next) => {
  const token = req.cookies.refresh_token;

  if (!token) {
    return res
      .status(401)
      .json("Unauthorized Access.Please contact administrator");
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json("Session has expired.Please login again");
    }
    let authUser = null;
    let loggedInUser = null;
    // Check if the user is an admin or teacher

    if (["administrator", "teacher"].includes(user?.role)) {
      authUser = await User.findById(user?.id).select("-password");

      if (_.isEmpty(authUser)) {
        return res
          .status(401)
          .json("Unauthorized Access.Please contact administrator");
      }

      // A disabled account must not be able to renew its session (finding H-1)
      if (authUser.active === false) {
        return res
          .status(401)
          .json("Unauthorized Access.Please contact administrator");
      }

      loggedInUser = {
        _id: authUser._id,
        id: authUser._id?.toString(),
        profile: authUser?.profile,
        firstname: authUser?.firstname,
        lastname: authUser?.lastname,
        fullname: authUser?.fullname,
        username: authUser?.username,
        email: authUser?.email,
        dateofbirth: authUser.dateofbirth,
        gender: authUser.gender,
        phonenumber: authUser?.phonenumber,
        role: authUser?.role,
        permissions: authUser?.permissions,
        active: authUser?.active,
        school: authUser?.school,
      };
    } else {
      authUser = await StudentAuth.findById(user?.id).select("-password");

      if (_.isEmpty(authUser)) {
        return res
          .status(401)
          .json("Unauthorized Access.Please contact administrator");
      }

      loggedInUser = {
        _id: authUser._id,
        id: authUser._id?.toString(),
        user: authUser?.studentId,
      };
    }

    req.user = loggedInUser;

    next();
  });
};

module.exports = {
  verifyJWT,
  verifyRefreshJWT,
};
