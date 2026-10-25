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
      query.status = "curent";
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

//Add new School Term
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { core, levels, students, exams, report } = req.body;

    const { name, from, to, term, isPromotionTerm, active } = core;
    const { grade, ...examsRest } = exams;

    const academicStart = moment(new Date(from)).year();
    const academicEnd = moment(new Date(to)).year();
    const academicYear = `${academicStart}/${academicEnd}`;

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

    //Find if a session already exits
    const session = await Session.findOne({
      school: req.user.school,
      academicYear,
    });
    let sessionId = session?._id;

    if (_.isEmpty(session)) {
      //Create new Session
      const newSession = await Session.create({
        school: req.user.school,
        from: academicStart,
        to: academicEnd,
        academicYear,
        name,

        createdBy: req.user.id,
      });

      if (_.isEmpty(newSession)) {
        return res
          .status(404)
          .json("Error creating new session.Try again later!!!");
      }
      sessionId = newSession._id;
    }

    //Create new term with new Session id
    const newTerm = await Term.create({
      school: req.user.school,
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
      exams: {
        scorePreference: "50/50",
        ...examsRest,
      },
      report,
    });

    if (_.isEmpty(newTerm)) {
      return res
        .status(404)
        .json("Error creating new session.Try again later!!!");
    }

    // if (newTerm?.active) {
    //   // Set the new term as active
    //   await setActive(newTerm._id, req.user.school, true);
    // }

    let grades = null;
    if (!_.isEmpty(grade)) {
      const itGradeExisting = await Grade.findOne({
        name: grade.name,
        school: req.user.school,
      });

      if (_.isEmpty(itGradeExisting)) {
        const newGrade = await Grade.create({
          ...grade,
          school: req.user.school,
          session: sessionId,
          term: newTerm._id,
          createdBy: req.user.id,
        });

        grades = newGrade?._id;
      } else {
        grades = itGradeExisting?._id;
      }
    }

    if (!_.isEmpty(levels)) {
      // create levels
      const modifiedLevels = levels.map(async (level) => {
        // update student data in the session
        const newLevel = await Level.create({
          school: req.user.school,
          session: sessionId,
          term: newTerm._id,
          level,
          students: [],
          grades: grades,
          createdBy: req.user.id,
        });

        const student = students.find((student) =>
          _.isEqual(student?.class, level)
        );

        if (!_.isEmpty(student?.data)) {
          // const existingIndexNumbers = _.flatMap(
          //   students,
          //   (student) => student?.data
          // );
          const indexNumbers = _.compact(_.map(student?.data, "indexnumber"));

          const existingStudents = await Student.find({
            school: req.user.school,
            indexnumber: {
              $in: indexNumbers,
            },
          }).select("indexnumber");

          if (!_.isEmpty(existingStudents)) {
            return res.status(400).json({
              isDuplicateError: true,
              message: `ID of some students already exist.Please check and try again.`,
              data: _.map(existingStudents, "indexnumber"),
            });
          }
        }

        const modifiedStudents = student?.data?.map((student) => {
          return {
            ...student,
            school: req.user.school,
            createdBy: req.user.id,
            level: newLevel._id,
          };
        });

        let studentIds = [];
        if (student?.isPrevious) {
          studentIds = _.map(student?.data, "_id");
        } else {
          const createdStudents = await Student.insertMany(modifiedStudents, {
            ordered: false,
          });
          studentIds = _.map(createdStudents, "_id");
        }

        // update student data in the session
        await Level.findByIdAndUpdate(
          newLevel._id,
          {
            students: studentIds,
          },
          { new: true }
        );

        //Create Exams and fees details for each inserted Student
        const examsDetails = studentIds.map((student) => {
          return {
            session: sessionId,
            term: newTerm._id,
            level: newLevel?._id,
            student: student,
            createdBy: req.user.id,
          };
        });

        await Examination.insertMany(examsDetails);
        await CurrentFee.insertMany(examsDetails);

        return newLevel;
      });

      await Promise.all(modifiedLevels);
      return res.status(201).json("New Session created Successfully!!!");
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
//Enable or Disable a particular Term
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
        { school: schoolId, status: "current" },
        { $set: { status: "archived" } }
      );
    }

    // 2️⃣ Set the specific item to active
    const updatedTerm = await Term.updateOne(
      { _id: id, school: schoolId },
      { $set: { status } },
      {
        new: true,
      }
    );

    if (!updatedTerm?.matchedCount) {
      return res.status(404).json("Error updating Session info");
    }

    res.json(`Changes Saved`);
  })
);

router.put(
  "/remove",
  adminOnly,
  asyncHandler(async (req, res) => {
    const sessions = [].concat(req.body ?? []);
    if (sessions.length === 0 || !sessions.every((id) => isValidObjectId(id))) {
      return res
        .status(404)
        .json("Error removing session info.Try again later");
    }

    const deletedTerms = await Term.deleteMany({
      _id: { $in: sessions },
      school: getPrincipal(req).schoolId,
    });

    if (!deletedTerms?.deletedCount) {
      return res
        .status(404)
        .json("Error removing session info.Try again later");
    }

    res.status(201).json(" Session have been removed successfully!!!");
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const deletedTerm = isValidObjectId(id)
      ? await Term.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    // const deletedTerm = await knex("terms").where("_id", id).del();

    if (_.isEmpty(deletedTerm)) {
      return res
        .status(404)
        .json("Error removing session info.Try again later");
    }

    res.status(201).json(" Session have been removed successfully!!!");
  })
);

module.exports = router;
