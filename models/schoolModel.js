const mongoose = require("mongoose");
const db = require("../db/DBConnection");

const SchoolSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
    },
    unique: String,
    badge: String,
    name: String,
    motto: String,
    address: String,
    location: String,
    district: String,
    region: String,
    email: {
      type: String,
      lowercase: true,
    },
    website: String,
    phonenumber: String,
    permissions: {
      type: [String],
      default: [
        "School Sessions",
        "Levels",
        "Subjects",
        "Grades",
        "Students",
        "Teachers",
        "Examination Portal",
      ],

      enum: [
        "School Sessions",
        "Departments & Houses",
        "Departments",
        "Houses",
        "Levels",
        "Subjects",
        "Grades",
        "Students",
        "Teachers",
        "School Fees",
        "Examination Portal",
        "Data Imports",
        "Messages",
        "Events",
        "Announcements",
        "Users",
        "Settings",
        "Notes Board",
      ],
    },
  },

  {
    timestamps: true,
  }
);
// `code` is already indexed (unique) on the field above; a second index here was a duplicate.
module.exports = db.model("School", SchoolSchema);
