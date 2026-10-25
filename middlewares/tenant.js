const { isValidObjectId } = require("mongoose");
const Student = require("../models/studentModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Subject = require("../models/subjectModel");
const User = require("../models/userModel");
const Session = require("../models/sessionModel");
const { getPrincipal } = require("./authorize");

/**
 * Tenant lookups for models that carry no `school` field of their own
 * (CurrentFee, Attendance, Examination: audit finding D-1). Ownership is derived
 * from the related Student / Term / Level, which do. All return false for a
 * malformed or unknown id so callers can answer exactly like "not found".
 */
const schoolOf = (req) => getPrincipal(req).schoolId;

const exists = async (Model, req, id) => {
  const school = schoolOf(req);
  if (!school || !id || !isValidObjectId(id)) return false;
  return Boolean(await Model.exists({ _id: id, school }));
};

const studentInSchool = (req, id) => exists(Student, req, id);
const termInSchool = (req, id) => exists(Term, req, id);
const levelInSchool = (req, id) => exists(Level, req, id);

const sessionInSchool = (req, id) => exists(Session, req, id);

/** Subjects carry no `school`: ownership comes from their term (audit D-1). */
const subjectInSchool = async (req, id) => {
  const school = schoolOf(req);
  if (!school || !id || !isValidObjectId(id)) return false;
  const subject = await Subject.findById(id).select("term");
  return Boolean(subject && (await termInSchool(req, subject.term)));
};

/** A staff member (any role) of the caller's school; with `role` it must match. */
const staffInSchool = async (req, id, role) => {
  const school = schoolOf(req);
  if (!school || !id || !isValidObjectId(id)) return false;
  const filter = { _id: id, school };
  if (role) filter.role = role;
  return Boolean(await User.exists(filter));
};

/**
 * True when every id in `ids` (nullish values are ignored) names a record of the
 * caller's school. A single bad id fails the whole set.
 */
const allInSchool = async (Model, req, ids) => {
  const school = schoolOf(req);
  const list = [].concat(ids ?? []).filter((id) => id !== undefined && id !== null && id !== "");
  if (!school) return false;
  if (list.some((id) => !isValidObjectId(id))) return false;
  const unique = [...new Set(list.map(String))];
  if (unique.length === 0) return true;
  return (await Model.countDocuments({ _id: { $in: unique }, school })) === unique.length;
};

module.exports = {
  studentInSchool,
  termInSchool,
  levelInSchool,
  sessionInSchool,
  subjectInSchool,
  staffInSchool,
  allInSchool,
};
