const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const School = require("../models/schoolModel");
const User = require("../models/userModel");

// Unique per call and per test file (modules are re-evaluated for every test file,
// so a plain counter would collide in the shared test database)
const next = () => new mongoose.Types.ObjectId().toString().slice(-10);

const createSchool = (overrides = {}) =>
  School.create({ code: `SCH${next()}`, name: "Test School", ...overrides });

const createUser = async (school, role = "teacher", overrides = {}) => {
  const n = next();
  return User.create({
    school: school._id,
    firstname: "First",
    lastname: `Last${n}`,
    username: `user${n}`,
    email: `user${n}@example.com`,
    role,
    password: await bcrypt.hash("password123", 4),
    ...overrides,
  });
};

// Same claim shape the real login endpoints put in the access token
const staffToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), _id: user._id.toString(), school: user.school.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

// Student access tokens have no `role` claim
const studentToken = (id, school) =>
  jwt.sign({ id: id.toString(), _id: id.toString(), school: school._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

// A platform administrator belongs to no school
const createPlatformAdmin = async (overrides = {}) => {
  const n = next();
  return User.create({
    firstname: "Platform",
    lastname: `Admin${n}`,
    username: `platform${n}`,
    email: `platform${n}@example.com`,
    role: "platform_admin",
    password: await bcrypt.hash("platform-pass-123", 4),
    ...overrides,
  });
};

const platformToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), _id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

module.exports = { createSchool, createUser, staffToken, studentToken, createPlatformAdmin, platformToken };
