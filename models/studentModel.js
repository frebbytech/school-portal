const mongoose = require("mongoose");
const db = require("../db/DBConnection");
const _ = require("lodash");

const StudentSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "School",
      required: true,
      index: true, // Optimized for school-based lookups
    },
    profile: {
      type: String,
      trim: true,
    },
    indexnumber: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 50, // Avoids excessively long names
    },
    surname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 50,
    },
    othername: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: 50,
    },
    dateofbirth: {
      type: Date, // Changed from String to Date for better date handling
      // type: String,
      required: true,
    },
    gender: {
      type: String,
      lowercase: true,
      enum: ["male", "female", "other"],
      set: (value) => {
        const lower = String(value ?? "").toLowerCase();
        return ["male", "female"].includes(lower) ? lower : "other";
      },
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      // unique: true,
      // sparse: true, // Allows null values but enforces uniqueness
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"], // Basic email validation
    },
    phonenumber: {
      type: String,
      trim: true,
      match: [/^\d{10,15}$/, "Invalid phone number format"], // Ensures valid numbers
    },
    address: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    residence: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    medical: {
      type: mongoose.SchemaTypes.Mixed, // Flexible for structured medical data
    },
    academic: {
      type: mongoose.SchemaTypes.Mixed, // Flexible for academic records
    },
    level: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Level",
      required: true,
      index: true, 
    },
    active: {
      type: Boolean,
      default: true,
      index: true, // Optimized for filtering active students
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true, // Faster lookup for user-created records
    },
  },
  {
    timestamps: true, // Auto add createdAt & updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔹 Virtual Full Name Field (No Lodash Dependency)
StudentSchema.virtual("fullName").get(function () {
  const name = `${this.surname} ${this.firstname} ${
    this.othername || ""
  }`.trim();
  return _.upperCase(name);
});

// 🔹 Compound Indexes for Performance
StudentSchema.index({ school: 1, indexnumber: 1 }); // Fast lookup within a school

module.exports = db.model("Student", StudentSchema);
