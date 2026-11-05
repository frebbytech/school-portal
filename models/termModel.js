const mongoose = require("mongoose");
const db = require("../db/DBConnection");

const TermSchema = new mongoose.Schema(
  {
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "School",
    },
    session: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Session",
    },
    name: String,
    from: String,
    to: String,
    term: String,
    isPromotionTerm: String,
    academicYear: String,
    vacationDate: String,
    reOpeningDate: String,
    headmaster: {
      type: mongoose.SchemaTypes.Mixed,
    },
    exams: {
      type: mongoose.SchemaTypes.Mixed,
    },
    report: {
      template: {
        type: String,
        default: "template1",
      },
      dimension: {
        type: String,
        default: "A4",
      },
    },
    active: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      lowercase: true,
      enum: ["upcoming", "current", "archived"],
      default: "upcoming",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

TermSchema.index({ school: 1 });
TermSchema.index({ session: 1 });
// (Removed: an index declaration that put `unique` and `partialFilterExpression` in the
// key list instead of the options. MongoDB rejects that key pattern, so it never
// existed and only logged an error at startup. The real rule, "one current term per
// school", is a partial unique index created by scripts/migrations/001-one-current-term.js
// after the data has been checked, not by the application at startup.)

module.exports = db.model("Term", TermSchema);
