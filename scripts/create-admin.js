/**
 * One-off CLI to create an administrator account.
 * Replaces the removed `GET /users/admin/add/:token` HTTP backdoor.
 *
 * Usage (values come from the environment so nothing is stored in shell history files
 * if you export them first, and nothing is ever committed):
 *
 *   ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_EMAIL=... \
 *   ADMIN_FIRSTNAME=... ADMIN_LASTNAME=... ADMIN_PHONE=... ADMIN_SCHOOL_CODE=... \
 *   node scripts/create-admin.js
 *
 * The database is chosen exactly like the app does (MONGO_URL in production,
 * MONGO_URL_LOCAL otherwise).
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db/DBConnection");
const User = require("../models/userModel");
const School = require("../models/schoolModel");

const required = [
  "ADMIN_USERNAME",
  "ADMIN_PASSWORD",
  "ADMIN_EMAIL",
  "ADMIN_FIRSTNAME",
  "ADMIN_LASTNAME",
  "ADMIN_SCHOOL_CODE",
];

async function main() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  if (process.env.ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters");
  }

  await db.asPromise();

  const school = await School.findOne({ code: process.env.ADMIN_SCHOOL_CODE });
  if (!school) {
    throw new Error("No school found with that ADMIN_SCHOOL_CODE");
  }

  const existing = await User.findOne({
    $or: [
      { username: process.env.ADMIN_USERNAME },
      { email: process.env.ADMIN_EMAIL.toLowerCase() },
    ],
  }).select("_id");
  if (existing) {
    throw new Error("A user with that username or email already exists");
  }

  const user = await User.create({
    school: school._id,
    firstname: process.env.ADMIN_FIRSTNAME,
    lastname: process.env.ADMIN_LASTNAME,
    username: process.env.ADMIN_USERNAME,
    email: process.env.ADMIN_EMAIL,
    phonenumber: process.env.ADMIN_PHONE,
    gender: process.env.ADMIN_GENDER || "other",
    role: "administrator",
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
  });

  console.log(`Administrator created: ${user.username} (${user._id})`);
}

main()
  .then(() => db.close())
  .catch(async (error) => {
    console.error(error.message);
    await db.close().catch(() => {});
    process.exitCode = 1;
  });
