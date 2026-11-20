const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Course = require("../models/courseModel");

/**
 * Takes a teacher off the work they are still carrying: the classes they are class teacher
 * of and the courses they teach, in terms that are not archived (upcoming and current).
 * Archived terms keep their teacher, so past report cards and history do not change.
 *
 * Used whenever a teacher account is deactivated or removed (owner decision 2026-11-20).
 * Reactivating the account does not give the work back. Safe to run twice.
 * Returns how many classes and courses were released.
 */
const releaseTeacherWork = async (schoolId, teacherId) => {
  const terms = await Term.find({ school: schoolId, status: { $ne: "archived" } }).select("_id");
  const termIds = terms.map((t) => t._id);
  if (termIds.length === 0) return { levels: 0, courses: 0 };

  const [levels, courses] = await Promise.all([
    Level.updateMany({ school: schoolId, teacher: teacherId, term: { $in: termIds } }, { $set: { teacher: null } }),
    Course.updateMany({ school: schoolId, teacher: teacherId, term: { $in: termIds } }, { $set: { teacher: null } }),
  ]);

  return { levels: levels.modifiedCount ?? 0, courses: courses.modifiedCount ?? 0 };
};

module.exports = { releaseTeacherWork };
