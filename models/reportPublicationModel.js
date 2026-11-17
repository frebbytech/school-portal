const mongoose = require("mongoose");
const db = require("../db/DBConnection");

// One request to send report cards (a whole class, or one student) by SMS and/or email.
// It is the record of what was sent, to whom and when: it stops the same class being
// published twice by accident, and lets a screen show progress after a page reload.
const ReportPublicationSchema = new mongoose.Schema(
  {
    school: { type: mongoose.SchemaTypes.ObjectId, ref: "School", required: true, index: true },
    session: { type: mongoose.SchemaTypes.ObjectId, ref: "Session" },
    term: { type: mongoose.SchemaTypes.ObjectId, ref: "Term", required: true },
    level: { type: mongoose.SchemaTypes.ObjectId, ref: "Level", required: true },
    // Set for a single student's report card; empty for a whole class
    examination: { type: mongoose.SchemaTypes.ObjectId, ref: "Examination" },
    scope: { type: String, enum: ["class", "student"], required: true },
    type: { type: String, enum: ["sms", "email", "both"], required: true },
    requestedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "User", required: true },
    // true when the person confirmed sending again after an earlier completed publish
    resend: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    phase: { type: String, enum: ["preparing", "sending"], default: undefined },
    // Progress: messages attempted so far out of those to attempt
    done: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    // Counts per channel and the names of those who missed out (see common/reportDelivery.js)
    summary: { type: mongoose.SchemaTypes.Mixed },
    message: { type: String },
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true }
);

ReportPublicationSchema.index({ school: 1, level: 1, term: 1, createdAt: -1 });

module.exports = db.model("ReportPublication", ReportPublicationSchema);
