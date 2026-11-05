const router = require("express").Router();
const _ = require("lodash");
const asyncHandler = require("express-async-handler");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Grade = require("../models/gradeModel");
const Term = require("../models/termModel");
const Session = require("../models/sessionModel");
const Examination = require("../models/examinationModel");
const CurrentFee = require("../models/currentFeeModel");
const Attendance = require("../models/attendanceModel");
const Course = require("../models/courseModel");
const Fee = require("../models/feeModel");
const Subject = require("../models/subjectModel");
const {
  Types: { ObjectId },
} = require("mongoose");
const { isValidObjectId } = require("mongoose");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");

const adminOnly = requireRoleEnforced("administrator");
const { createRollback } = require("../common/rollback");
const { allInSchool } = require("../middlewares/tenant");
const MAX_LEVELS_PER_TERM = 100;
const MAX_STUDENTS_PER_LEVEL = 1000;
// Fields accepted for a student created together with a term
const STUDENT_IMPORT_FIELDS = [
  "indexnumber",
  "profile",
  "firstname",
  "surname",
  "othername",
  "dateofbirth",
  "gender",
  "email",
  "phonenumber",
  "address",
  "residence",
  "nationality",
];
const TERM_STATUSES = ["upcoming", "current", "archived"];
// Term details an administrator may edit (`active`, `status`, `school`, `session`
// have their own endpoints or are fixed at creation).
const TERM_CORE_FIELDS = [
  "name",
  "from",
  "to",
  "term",
  "academicYear",
  "vacationDate",
  "reOpeningDate",
  "isPromotionTerm",
];
const moment = require("moment/moment");
const { query } = require("express-validator");
// const knex = require("../db/knex");

async function setActive(termId, schoolId, active = true) {
  // 1️⃣ Set all items to inactive
  await Term.updateMany({ school: schoolId }, { $set: { active } });

  // 2️⃣ Set the specific item to active
  await Term.updateOne({ _id: termId, school: schoolId }, { $set: { active } });
}

//@GET All school Terms
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, type } = req.query;
    const { role, school } = req.user;

    let query = {
      school,
    };

    if (session) {
      query.session = session;
    }

    if (role === "teacher") {
      query.status = "current";
      query.active = true;
    }

    const terms = await Term.find(query).populate("session");

    if (_.isEmpty(terms)) {
      return res.status(200).json([]);
    }

    const modifiedTerms = terms.map((term) => {
      if (type === "dropdown") {
        return {
          _id: term?._id,
          sessionId: term?.session?._id,
          term: term?.term,
          name: `${term?.academicYear} ${term?.term}`,
          academicYear: term?.academicYear,
          status: term?.status,
          active: term?.active,
          createdAt: term?.createdAt,
        };
      }
      
      const newTerm = {
        core: {
          name: term?.name,
          from: term?.from,
          to: term?.to,
          term: term?.term,
          academicYear: term?.academicYear,
          vacationDate: term?.vacationDate,
          reOpeningDate: term?.reOpeningDate,
          isPromotionTerm: term?.isPromotionTerm,
        },
        headmaster: term?.headmaster,
        report: term?.report,
        exams: term?.exams,
        termId: term._id,
        sessionId: term?.session?._id,
        status: term?.status,
        active: term?.active,
      };

      return newTerm;
    });

    const sortedTerms = _.sortBy(modifiedTerms, ["academicYear", "term"]);

    res.status(200).json(sortedTerms);
  })
);

//@GET All school Terms
router.get(
  "/sessions",
  requireStaff,
  asyncHandler(async (req, res) => {
    const session = req.query?.session;
    const { role, school } = req.user;

    let query = {
      school,
    };

    if (session) {
      query.session = session;
    }

    if (role === "teacher") {
      query.status = "current";
      query.active = true;
    }

    const terms = await Term.find(query).populate("session");

    if (_.isEmpty(terms)) {
      return res.status(200).json([]);
    }
    const modifiedTerms = terms.map((term) => {
      return {
        _id: term?._id,
        sessionId: term?.session,
        term: term?.term,
        name: `${term?.academicYear} ${term?.term}`,
        academicYear: term?.academicYear,
        status: term?.status,
        active: term?.active,
        createdAt: term?.createdAt,
      };
    });

    const sortedTerms = _.sortBy(modifiedTerms, ["academicYear", "term"]);

    res.status(200).json(sortedTerms);
  })
);

//@GET School Term by id
router.get(
  "/valid",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { academicYear, term } = req.query;
    //Find if a term already exits
    const exists = await Term.findOne({
      school: req.user.school,
      academicYear,
      term,
      active: true,
    });

    //Check if term already exists
    if (!_.isEmpty(exists)) {
      return res
        .status(400)
        .json(
          `Academic year ${academicYear} with the term ${term} already exists.`
        );
    }

    res.status(200).json(exists);
  })
);
//@GET School Term by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const term = isValidObjectId(id)
      ? await Term.findOne({ _id: id, school: getPrincipal(req).schoolId }).populate("session")
      : null;
    if (!term) return res.status(404).json("Term not found");

    const modifiedTerm = {
      core: {
        name: term?.name,
        from: term?.from,
        to: term?.to,
        term: term?.term,
        academicYear: term?.academicYear,
        vacationDate: term?.vacationDate,
        reOpeningDate: term?.reOpeningDate,
        isPromotionTerm: term?.isPromotionTerm,
      },
      report: term?.report,
      headmaster: term?.headmaster,
      exams: term?.exams,
      termId: term._id,
      sessionId: term?.session?._id,
      status: term?.status,
      active: term?.active,
    };
    res.status(200).json(modifiedTerm);
  })
);

//Add new School Term (with its session, grade system, levels, students, exam and fee records)
//
// Everything is validated BEFORE anything is written, and the writes run one level at
// a time. If a step fails, everything this request created is removed again, so a
// failure no longer leaves a half-built term. (It used to answer twice, and leave the
// term behind, when a student index number already existed.)
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { core, levels = [], students = [], exams, report } = req.body || {};
    const principal = getPrincipal(req);
    const schoolId = principal.schoolId;
    const bad = (message) => res.status(400).json(message);

    if (!core || typeof core !== "object" || !exams || typeof exams !== "object") {
      return bad("Invalid session details.");
    }
    const { name, from, to, term, isPromotionTerm, active } = core;
    const { grade, ...examsRest } = exams;

    if (
      typeof term !== "string" || !term ||
      Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) ||
      !Array.isArray(levels) || levels.length > MAX_LEVELS_PER_TERM ||
      !Array.isArray(students)
    ) {
      return bad("Invalid session details.");
    }

    const academicStart = moment(new Date(from)).year();
    const academicEnd = moment(new Date(to)).year();
    const academicYear = `${academicStart}/${academicEnd}`;

    // Find if a term already exists
    const exists = await Term.findOne({ school: schoolId, academicYear, term, active: true });
    if (!_.isEmpty(exists)) {
      return bad(`Academic year ${academicYear} with the term ${term} already exists.`);
    }

    // ---- validate the student lists up front -----------------------------------
    const groups = levels.map((level) => {
      const group = students.find((entry) => _.isEqual(entry?.class, level));
      const data = Array.isArray(group?.data) ? group.data : [];
      return { level, isPrevious: Boolean(group?.isPrevious), data };
    });
    if (groups.some((g) => g.data.length > MAX_STUDENTS_PER_LEVEL)) {
      return bad("Too many students in one class.");
    }

    // Index numbers are unique across ALL schools (owner decision), so the check is global
    const newIndexNumbers = groups
      .filter((g) => !g.isPrevious)
      .flatMap((g) => g.data.map((s) => String(s?.indexnumber ?? "").trim().toLowerCase()))
      .filter(Boolean);
    const repeated = newIndexNumbers.filter((n, i) => newIndexNumbers.indexOf(n) !== i);
    const taken = newIndexNumbers.length
      ? await Student.find({ indexnumber: { $in: newIndexNumbers } }).select("indexnumber")
      : [];
    if (taken.length || repeated.length) {
      return res.status(400).json({
        isDuplicateError: true,
        message: `ID of some students already exist.Please check and try again.`,
        data: _.uniq([..._.map(taken, "indexnumber"), ...repeated]),
      });
    }

    // Existing students that are carried over must belong to this school
    const previousIds = groups.filter((g) => g.isPrevious).flatMap((g) => g.data.map((s) => s?._id));
    if (!(await allInSchool(Student, req, previousIds))) {
      return res.status(403).json("You do not have permission to perform this action.");
    }

    // ---- write, with rollback --------------------------------------------------
    const created = createRollback();
    try {
      let session = await Session.findOne({ school: schoolId, academicYear });
      let sessionId = session?._id;

      if (_.isEmpty(session)) {
        const newSession = created.track(
          Session,
          await Session.create({
            school: schoolId,
            from: academicStart,
            to: academicEnd,
            academicYear,
            name,
            createdBy: principal.id,
          })
        );
        sessionId = newSession._id;
      }

      const newTerm = created.track(
        Term,
        await Term.create({
          school: schoolId,
          session: sessionId,
          name,
          from,
          to,
          term,
          academicYear,
          vacationDate: to,
          reOpeningDate: to,
          isPromotionTerm,
          status: active === "Yes" ? "upcoming" : "archived",
          active: active === "Yes" ? true : false,
          exams: { scorePreference: "50/50", ...examsRest },
          report: pickFields(report, ["template", "dimension"]),
        })
      );

      // A grade system is reused only when it belongs to this school
      let grades = null;
      if (!_.isEmpty(grade)) {
        const existing = await Grade.findOne({ name: grade.name, school: schoolId });
        if (_.isEmpty(existing)) {
          const newGrade = created.track(
            Grade,
            await Grade.create({
              ...pickFields(grade, ["name", "ratings"]),
              school: schoolId,
              session: sessionId,
              term: newTerm._id,
              createdBy: principal.id,
            })
          );
          grades = newGrade._id;
        } else {
          grades = existing._id;
        }
      }

      for (const { level, isPrevious, data } of groups) {
        const newLevel = created.track(
          Level,
          await Level.create({
            school: schoolId,
            session: sessionId,
            term: newTerm._id,
            level,
            initials: level?.initials, // required by the model (it is also inside `level`)
            students: [],
            grades,
            createdBy: principal.id,
          })
        );

        let studentIds;
        if (isPrevious) {
          studentIds = _.map(data, "_id");
        } else {
          const docs = data.map((student) => ({
            ...pickFields(student, [...STUDENT_IMPORT_FIELDS]),
            school: schoolId,
            createdBy: principal.id,
            level: newLevel._id,
          }));
          const createdStudents = created.track(Student, await Student.insertMany(docs, { ordered: true }));
          studentIds = _.map(createdStudents, "_id");
        }

        await Level.updateOne({ _id: newLevel._id }, { $set: { students: studentIds } });

        // Examination and fee records for each student of the level
        const records = studentIds.map((student) => ({
          session: sessionId,
          term: newTerm._id,
          level: newLevel._id,
          student,
          createdBy: principal.id,
        }));
        created.track(Examination, await Examination.insertMany(records));
        created.track(CurrentFee, await CurrentFee.insertMany(records));
      }
    } catch (error) {
      await created.undo();
      throw error;
    }

    res.status(201).json("New Session created Successfully!!!");
  })
);

//@PUT Update Existing School Session
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { termId, ...rest } = req.body;

    if (!isValidObjectId(termId)) {
      return res
        .status(404)
        .send("Error updating session info.Try again later");
    }

    // Only the sections that were sent are replaced (an omitted `report` used to be
    // overwritten with an empty object).
    const update = pickFields(rest?.core, TERM_CORE_FIELDS);
    for (const section of ["exams", "report", "headmaster"]) {
      if (rest?.[section] !== undefined && rest[section] !== null) {
        update[section] = { ...rest[section] };
      }
    }

    const modifiedTerm = await Term.findOneAndUpdate(
      { _id: termId, school: getPrincipal(req).schoolId },
      { $set: update }
    );

    // const modifiedTerm = await knex("terms")
    //   .where({ _id: id })
    //   .update({
    //     ...rest,
    //   });

    if (_.isEmpty(modifiedTerm)) {
      return res
        .status(404)
        .send("Error updating session info.Try again later");
    }

    res.status(201).json("Changes Saved!");
  })
);

//@PUT Update Existing School Session
router.patch(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { termId, type, ...rest } = req.body;

    if (!isValidObjectId(termId)) {
      return res
        .status(404)
        .send("Error updating session info.Try again later");
    }

    let query = {};
    if (type === "headmaster") {
      query = {
        headmaster: {
          ...rest?.headmaster,
        },
      };
    }
    if (type === "report") {
      query = {
        report: {
          ...rest?.report,
        },
      };
    }
    const modifiedTerm = await Term.findOneAndUpdate(
      { _id: termId, school: getPrincipal(req).schoolId },
      { $set: query }
    );

    if (_.isEmpty(modifiedTerm)) {
      return res
        .status(404)
        .send("Error updating session info.Try again later");
    }

    res.status(201).json("Changes Saved!");
  })
);

//Enable or Disable a particular Term
router.put(
  "/account",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id, active } = req.body;

    const updatedTerm =
      isValidObjectId(id) && typeof active === "boolean"
        ? await Term.findOneAndUpdate(
            { _id: id, school: getPrincipal(req).schoolId },
            { $set: { active } },
            { new: true }
          )
        : null;

    // await setActive(id, req.user.school, active);

    if (_.isEmpty(updatedTerm)) {
      return res.status(404).json("Error updating Session info");
    }

    res.json(
      updatedTerm.active === true ? "Session  enabled" : "Session  disabled"
    );
  })
);
// Change a term's status (upcoming | current | archived).
// Only one term per school can be "current": every other current term is archived
// FIRST and the chosen one is set after, so a failure part-way can never leave a school
// with two current terms (at worst it has none, and the call can simply be repeated).
router.patch(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;
    const schoolId = getPrincipal(req).schoolId;

    if (!isValidObjectId(id) || !TERM_STATUSES.includes(status)) {
      return res.status(400).json("Invalid information provided.");
    }
    if (!(await Term.exists({ _id: id, school: schoolId }))) {
      return res.status(404).json("Error updating Session info");
    }

    if (status === "current") {
      await Term.updateMany(
        { school: schoolId, status: "current", _id: { $ne: id } },
        { $set: { status: "archived" } }
      );
    }

    const updatedTerm = await Term.updateOne({ _id: id, school: schoolId }, { $set: { status } });

    if (!updatedTerm?.matchedCount) {
      return res.status(404).json("Error updating Session info");
    }

    res.json(`Changes Saved`);
  })
);

/**
 * Terms that hold real records cannot be removed: a term is history (results, fees,
 * attendance). Only a term with no enrolled students, no recorded scores, no payments
 * and no attendance can be removed, together with its empty scaffolding. Anything else
 * should be archived instead (PATCH /terms/:id?status=archived).
 */
async function termBlockers(schoolId, termId) {
  const [levelsWithStudents, scored, paid, attendance] = await Promise.all([
    Level.countDocuments({ school: schoolId, term: termId, "students.0": { $exists: true } }),
    Examination.countDocuments({ term: termId, "scores.0": { $exists: true } }),
    CurrentFee.countDocuments({ term: termId, "payment.0": { $exists: true } }),
    Attendance.countDocuments({ term: termId }),
  ]);
  const reasons = [];
  if (levelsWithStudents) reasons.push(`${levelsWithStudents} class(es) with students`);
  if (scored) reasons.push(`${scored} student result record(s) with scores`);
  if (paid) reasons.push(`${paid} fee record(s) with payments`);
  if (attendance) reasons.push(`${attendance} attendance register(s)`);
  return reasons;
}

async function removeTerms(req, res, ids) {
  const { schoolId } = getPrincipal(req);
  const NOT_REMOVED = "Error removing session info.Try again later";

  if (ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
    return res.status(404).json(NOT_REMOVED);
  }

  const owned = await Term.find({ _id: { $in: ids }, school: schoolId }).select("_id");
  if (owned.length === 0) return res.status(404).json(NOT_REMOVED);

  // All or nothing: if any term is protected, none is removed
  for (const { _id } of owned) {
    const reasons = await termBlockers(schoolId, _id);
    if (reasons.length) {
      return res
        .status(409)
        .json(
          `This session cannot be removed because it holds records (${reasons.join(
            ", "
          )}). Archive it instead.`
        );
    }
  }

  const termIds = owned.map((t) => t._id);
  await Promise.all([
    Level.deleteMany({ school: schoolId, term: { $in: termIds } }),
    Course.deleteMany({ school: schoolId, term: { $in: termIds } }),
    Fee.deleteMany({ school: schoolId, term: { $in: termIds } }),
    Examination.deleteMany({ term: { $in: termIds } }),
    CurrentFee.deleteMany({ term: { $in: termIds } }),
    Subject.deleteMany({ term: { $in: termIds } }),
  ]);
  // A grade system is removed only when nothing else uses it
  for (const grade of await Grade.find({ school: schoolId, term: { $in: termIds } }).select("_id")) {
    if (!(await Level.exists({ grades: grade._id }))) await Grade.deleteOne({ _id: grade._id });
  }
  await Term.deleteMany({ _id: { $in: termIds }, school: schoolId });

  return res.status(201).json(" Session have been removed successfully!!!");
}

router.put(
  "/remove",
  adminOnly,
  asyncHandler(async (req, res) => removeTerms(req, res, [].concat(req.body ?? [])))
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => removeTerms(req, res, [req.params.id]))
);

module.exports = router;
