const { isValidObjectId } = require("mongoose");
const Student = require("../models/studentModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
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

module.exports = { studentInSchool, termInSchool, levelInSchool };
