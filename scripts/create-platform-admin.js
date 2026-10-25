/**
 * One-off CLI to create the first platform administrator (the account that creates
 * schools and their first administrators; it belongs to no school).
 *
 *   PLATFORM_USERNAME=... PLATFORM_PASSWORD=... PLATFORM_EMAIL=... \
 *   PLATFORM_FIRSTNAME=... PLATFORM_LASTNAME=... \
 *   node scripts/create-platform-admin.js
 *
 * The database is chosen exactly like the app does (MONGO_URL in production,
 * MONGO_URL_LOCAL otherwise). Further platform administrators are created the same way.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../db/DBConnection");
const User = require("../models/userModel");

const required = [
  "PLATFORM_USERNAME",
  "PLATFORM_PASSWORD",
  "PLATFORM_EMAIL",
  "PLATFORM_FIRSTNAME",
  "PLATFORM_LASTNAME",
];

async function main() {
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  if (process.env.PLATFORM_PASSWORD.length < 12) {
    throw new Error("PLATFORM_PASSWORD must be at least 12 characters");
  }

  await db.asPromise();

  const existing = await User.findOne({
    $or: [
      { username: process.env.PLATFORM_USERNAME },
      { email: process.env.PLATFORM_EMAIL.toLowerCase() },
    ],
  }).select("_id");
  if (existing) {
    throw new Error("A user with that username or email already exists");
  }

  const user = await User.create({
    firstname: process.env.PLATFORM_FIRSTNAME,
    lastname: process.env.PLATFORM_LASTNAME,
    username: process.env.PLATFORM_USERNAME,
    email: process.env.PLATFORM_EMAIL,
    role: "platform_admin",
    password: await bcrypt.hash(process.env.PLATFORM_PASSWORD, 10),
  });

  console.log(`Platform administrator created: ${user.username} (${user._id})`);
}

main()
  .then(() => db.close())
  .catch(async (error) => {
    console.error(error.message);
    await db.close().catch(() => {});
    process.exitCode = 1;
  });
