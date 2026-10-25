const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Subject = require("../models/subjectModel");
const _ = require("lodash");
const { isValidObjectId } = require("mongoose");
const Term = require("../models/termModel");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const {
  termInSchool,
  sessionInSchool,
  subjectInSchool,
} = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");
const FORBIDDEN = "You do not have permission to perform this action.";
const SUBJECT_FIELDS = ["code", "name", "isCore"];

const SUBJECT_OPTIONS = [
  "ENGLISH LANGUAGE",
  "MATHEMATICS",
  "INTEGRATED SCIENCE",
  "NATURAL SCIENCE",
  "HISTORY",
  "SOCIAL STUDIES",
  "OUR WORLD OUR PEOPLE",
  "RELIGIOUS AND MORAL EDUCATION",
  "COMPUTING",
  "INFORMATION AND COMMUNICATION TECHNOLOGY",
  "CREATIVE ARTS AND DESIGN",
  "CAREER TECHNOLOGY",
  "GHANAIAN LANGUAGE",
  "FRENCH",
  "ARABIC",
  "PHYSICAL EDUCATION",
  "PHYSICAL AND HEALTH EDUCATION",
  "READING",
  "WRITING",
  "MUSIC & DANCE",
  "ORALS & RHYMES",
];
//@GET All school subjects
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term } = req.query;

    if (
      !session ||
      !term ||
      !isValidObjectId(session) ||
      !isValidObjectId(term) ||
      !(await termInSchool(req, term))
    ) {
      return res.status(200).send([]);
    }

    const subjects = await Subject.find({ session, term });
    if (_.isEmpty(subjects)) {
      return res.status(200).send([]);
    }

    const modifiedSubjects = subjects.sort(
      (a, b) =>
        SUBJECT_OPTIONS.indexOf(a.name) - SUBJECT_OPTIONS.indexOf(b.name)
    );

    res.status(200).json(modifiedSubjects);
  })
);

//@GET School Subject by name (searched within the caller's school only)
router.get(
  "/:name",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const terms = await Term.find({ school: getPrincipal(req).schoolId }).distinct("_id");
    const subject = await Subject.findOne({ name, term: { $in: terms } });
    res.status(200).json(subject);
  })
);

//Add new School Subject
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { session, term, subjects } = req.body || {};

    if (
      !Array.isArray(subjects) ||
      !(await sessionInSchool(req, session)) ||
      !(await termInSchool(req, term))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    const modifiedSubjects = subjects.map(async (subject) => {
      const fields = pickFields(subject, SUBJECT_FIELDS);
      const name = _.trim(_.upperCase(subject?.name));
      const existing = await Subject.find({ session, term, name });

      if (_.isEmpty(existing)) {
        return await Subject.create({ ...fields, session, term });
      }
      return await Subject.findOneAndUpdate(
        { session, term, name },
        { $set: { ...fields, session, term } },
        { new: true }
      );
    });

    const updatedSubjects = await Promise.all(modifiedSubjects);

    if (_.isEmpty(updatedSubjects)) {
      return res
        .status(404)
        .send("Error creating new subjects.Try again later");
    }
    res.status(200).send("Subjects Saved!");
  })
);

//@PUT Update Existing School Subject
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id } = req.body || {};
    if (!(await subjectInSchool(req, _id))) {
      return res
        .status(404)
        .send("Error updating subject info.Try again later");
    }

    const modifiedSubject = await Subject.findByIdAndUpdate(
      _id,
      { $set: pickFields(req.body, SUBJECT_FIELDS) },
      { new: true }
    );

    if (_.isEmpty(modifiedSubject)) {
      return res
        .status(404)
        .send("Error updating subject info.Try again later");
    }

    res.status(201).send("Changes Saved");
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (await subjectInSchool(req, id)) {
      await Subject.findByIdAndDelete(id);
    }

    res.status(204).send("Subject removed");
  })
);

module.exports = router;
