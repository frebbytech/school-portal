// models/Student.js
const mongoose = require("mongoose");
const db = require("../db/DBConnection");

const StudentAuthSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "School",
      index: true, // Optimized for school-based queries
    },
    indexnumber: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: { type: String },
    phonenumber: { type: String, required: true },
    password: { type: String, required: true, default: "" },
    // SHA-256 hash of the 6-digit reset code (never the code itself)
    resetToken: String,
    resetTokenExpiry: Date,
    // Set once the emailed code has been confirmed; required to set a new password
    resetVerified: { type: Boolean, default: false },
    // Failed code confirmations for the current reset request
    resetAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = db.model("StudentAuth", StudentAuthSchema);
