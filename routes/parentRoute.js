const router = require("express").Router();
const _ = require("lodash");
const asyncHandler = require("express-async-handler");
const { isValidObjectId } = require("mongoose");
const Parent = require("../models/parentModel");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const { allInSchool } = require("../middlewares/tenant");
const Student = require("../models/studentModel");

const adminOnly = requireRoleEnforced("administrator");
const FORBIDDEN = "You do not have permission to perform this action.";

const PARENT_FIELDS = [
  "profile",
  "firstname",
  "surname",
  "relationship",
  "gender",
  "email",
  "phonenumber",
  "address",
  "residence",
  "nationality",
];
// `student` can be set when a parent is created but never moved afterwards
const CREATABLE_FIELDS = [...PARENT_FIELDS, "student"];
const MAX_BATCH = 200;

//@GET All  Parents
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const parents = await Parent.find({ school: getPrincipal(req).schoolId });
    res.status(200).json(parents);
  })
);

//@GET Parent by student ID
router.get(
  "/student",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = req.query.id;
    if (!isValidObjectId(id)) return res.status(200).json({});

    const parents = await Parent.find({
      school: getPrincipal(req).schoolId,
      student: id,
    });

    if (_.isEmpty(parents)) {
      return res.status(200).json({});
    }

    res.status(200).json(parents);
  })
);

//@GET  Parent by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const parent = isValidObjectId(id)
      ? await Parent.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    if (_.isEmpty(parent)) {
      return res.status(200).json({});
    }

    res.status(200).json(parent);
  })
);

//Add new School Parent
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const incoming = req.body?.parents;
    if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_BATCH) {
      return res.status(400).json("Error creating new parent.Try again later!!!");
    }

    const parents = incoming.map((parent) => pickFields(parent, CREATABLE_FIELDS));
    if (!(await allInSchool(Student, req, parents.map((parent) => parent.student)))) {
      return res.status(403).json(FORBIDDEN);
    }

    const { schoolId } = getPrincipal(req);
    const newParent = await Parent.insertMany(
      parents.map((parent) => ({ ...parent, school: schoolId }))
    );

    if (_.isEmpty(newParent)) {
      return res
        .status(404)
        .json("Error creating new parent.Try again later!!!");
    }

    res.status(201).json("New Parents created Successfully!!!");
  })
);

//@PUT Update Existing School Parent
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id } = req.body || {};
    if (!isValidObjectId(_id)) {
      return res.status(404).send("Error updating parent info.Try again later");
    }

    const modifiedParent = await Parent.findOneAndUpdate(
      { _id, school: getPrincipal(req).schoolId },
      { $set: pickFields(req.body, [...PARENT_FIELDS, "active"]) }
    );

    if (_.isEmpty(modifiedParent)) {
      return res.status(404).send("Error updating parent info.Try again later");
    }

    res.status(201).json("Parent information has been updated successfully!!!");
  })
);

// Parents are deactivated, never deleted
router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedParent = isValidObjectId(id)
      ? await Parent.findOneAndUpdate(
          { _id: id, school: getPrincipal(req).schoolId },
          { $set: { active: false } }
        )
      : null;

    if (_.isEmpty(deletedParent)) {
      return res.status(404).json("Error removing parent info.Try again later");
    }

    res.status(201).json(" Parent have been removed successfully!!!");
  })
);

module.exports = router;
