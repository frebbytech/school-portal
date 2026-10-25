const db = require("../db/DBConnection");
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "School",
      index: true, // Optimized for school-based queries
    },
    profile: {
      type: String,
      trim: true,
      default: "",
    },
    firstname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    lastname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true, // Ensures uniqueness
      index: true, // Optimized for lookups
    },
    dateofbirth: {
      type: String,
      // type: Date
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"], // Standardized values
      set: (value) => {
        const lower = value ? value?.toLowerCase() : "";
        return ["male", "female"].includes(lower) ? lower : "other";
      },
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Ensures uniqueness
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
      index: true, // Optimized for queries
    },
    role: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: ["administrator", "teacher", "student", "parent", "platform_admin"], // Predefined roles ("platform_admin" has no school)
      index: true,
    },
    permissions: {
      type: Array,
      default: [],
    },
    phonenumber: {
      type: String,
      trim: true,
      match: /^\+?[0-9]{10,15}$/, // Basic phone validation
    },
    address: {
      type: String,
      trim: true,
    },
    residence: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6, // Enforce password security
    },
    active: {
      type: Boolean,
      default: true,
      index: true, // Frequently queried field
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔹 Virtual Field for Full Name (Avoids Extra Storage)
UserSchema.virtual("fullname").get(function () {
  return `${this.firstname} ${this.lastname}`;
});

// 🔹 Optimized Query Method
UserSchema.statics.findByUsername = function (username) {
  return this.findOne({ username });
};

// 🔹 Optimized Query Method
UserSchema.statics.findByUsernameAndSchool = function ({ username, school }) {
  return this.findOne({ school, username });
};

// 🔹 Compound Indexes for Faster Queries
UserSchema.index({ school: 1, username: 1 });
UserSchema.index({ email: 1, username: 1 });
UserSchema.index({ school: 1, role: 1 });

module.exports = db.model("User", UserSchema);
