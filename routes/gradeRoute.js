const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const { isValidObjectId } = require("mongoose");
const Grade = require("../models/gradeModel");
const Level = require("../models/levelModel");
const _ = require("lodash");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const { termInSchool, sessionInSchool } = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");

const CREATABLE_FIELDS = ["session", "term", "name", "ratings"];
const EDITABLE_FIELDS = ["name", "ratings"];

//@GET All school grades
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term } = req.query;
    const { schoolId } = getPrincipal(req);

    if (!session || !term || !isValidObjectId(session) || !isValidObjectId(term)) {
      return res.status(200).json([]);
    }

    const grades = await Grade.find({ school: schoolId, session, term });

    const modifiedGrades = grades.map(async (grade) => {
      const assignedLevels = await Level.find({
        school: schoolId,
        session,
        term,
        grades: grade?._id,
      }).select("level");

      return {
        _id: grade?._id,
        name: grade?.name,
        ratings: grade?.ratings,
        assignedLevels: _.map(assignedLevels, ({ levelName, _id }) => {
          return { levelName, _id };
        }),
      };
    });

    res.status(200).json(await Promise.all(modifiedGrades));
  })
);

//@GET School Grade by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const grade = isValidObjectId(id)
      ? await Grade.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    res.status(200).json(grade);
  })
);

//Add new School Grade
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = pickFields(req.body, CREATABLE_FIELDS);

    if (
      !(await sessionInSchool(req, data.session)) ||
      !(await termInSchool(req, data.term))
    ) {
      return res.status(403).json("You do not have permission to perform this action.");
    }

    const principal = getPrincipal(req);
    const grades = await Grade.create({
      ...data,
      school: principal.schoolId,
      createdBy: principal.id,
    });
    if (_.isEmpty(grades)) {
      return res.status(404).send("Error creating new grades.Try again later");
    }
    res.status(201).json("Grades Saved!");
  })
);

//@PUT Update Existing School Grade
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id } = req.body || {};
    if (!isValidObjectId(_id)) {
      return res.status(404).send("Error updating grade info.Try again later");
    }

    const modifiedGrade = await Grade.findOneAndUpdate(
      { _id, school: getPrincipal(req).schoolId },
      { $set: pickFields(req.body, EDITABLE_FIELDS) },
      { new: true }
    );

    if (_.isEmpty(modifiedGrade)) {
      return res.status(404).send("Error updating grade info.Try again later");
    }

    res.status(201).send("Changes Saved");
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (isValidObjectId(id)) {
      await Grade.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId });
    }

    res.status(204).send("Grade removed");
  })
);

module.exports = router;
