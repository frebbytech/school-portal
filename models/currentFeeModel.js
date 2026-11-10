const mongoose = require("mongoose");
const db = require("../db/DBConnection");

const CurrentFeeSchema = new mongoose.Schema(
  {
    // Added in Stage 7/8 so records can be scoped to a school directly. Older records
    // do not have it; ownership is still derived from the term for those.
    school: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "School",
      index: true,
    },
    session: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Session",
    },
    term: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Term",
    },
    level: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Level",
    },
    student: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Student",
    },
    fee: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Fee",
    },

    payment: {
      type: Array,
      default: []
    },
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }

);
CurrentFeeSchema.index({ session: 1 });
CurrentFeeSchema.index({ term: 1 });
CurrentFeeSchema.index({ level: 1 });
CurrentFeeSchema.index({ student: 1 });
CurrentFeeSchema.index({ fee: 1 });
module.exports = db.model("CurrentFee", CurrentFeeSchema);
