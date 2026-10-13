const express = require("express");
const _ = require("lodash");
const router = express.Router();
const { createImageUpload } = require("../middlewares/upload");
const School = require("../models/schoolModel");
const asyncHandler = require("express-async-handler");
const { verifyJWT } = require("../middlewares/verifyJWT");
const { uploadFile } = require("../config/uploadFile");
const {
  requireStaff,
  requireRoleEnforced,
  pickFields,
  getPrincipal,
} = require("../middlewares/authorize");

// Descriptive fields an administrator may edit on their own school. `code`,
// `unique` and the purchased module `permissions` are never client-editable.
const SCHOOL_EDITABLE_FIELDS = [
  "badge",
  "name",
  "motto",
  "address",
  "location",
  "district",
  "region",
  "email",
  "website",
  "phonenumber",
];

const upload = createImageUpload("badges");

// Get all schools
router.get(
  "/",
  verifyJWT,
  requireStaff,
  asyncHandler(async (req, res) => {
    // A school only ever sees itself (finding C-6); the response stays an array.
    const schools = await School.find({ _id: getPrincipal(req).schoolId }).sort({ name: 1 });
    res.json(schools);
  })
);

// Get single school
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const school = await School.findOne({ code: req.params.id });
    if (!school) {
      return res.status(404).json("School not found");
    }
    res.json(school);
  })
);

// Create school
router.post(
  "/",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    // `permissions` (purchased modules) cannot be chosen by the caller.
    const data = pickFields(req.body, [...SCHOOL_EDITABLE_FIELDS, "code", "unique"]);
    const school = new School(data);

    try {
      const newSchool = await school.save();
      res.status(201).json(newSchool);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

// Update school
router.put(
  "/",
  verifyJWT,
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    // An administrator can only edit their own school, whatever `_id` says.
    const { schoolId } = getPrincipal(req);
    if (req.body?._id && String(req.body._id) !== schoolId) {
      return res
        .status(403)
        .json('Couldn"t save school information.Please try again later.!!');
    }
    const school = await School.findByIdAndUpdate(
      schoolId,
      { $set: pickFields(req.body, SCHOOL_EDITABLE_FIELDS) },
      { new: true }
    );

    if (_.isEmpty(school)) {
      return res
        .status(403)
        .json('Couldn"t save school information.Please try again later.!!');
    }

    res.json(school);
  })
);

//@POST Update User profile
router.put(
  "/badge",
  verifyJWT,
  requireRoleEnforced("administrator"),
  upload.single("badge"),
  asyncHandler(async (req, res) => {
    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a badge");
    }

    const filename = req.file?.filename;
    const badge = await uploadFile(filename, "badges/");

    // Always the caller's own school; no upsert, so this cannot create schools.
    const updatedBadge = await School.findByIdAndUpdate(
      getPrincipal(req).schoolId,
      { $set: { badge } },
      { new: true }
    );

    if (_.isEmpty(updatedBadge)) {
      return res.status(400).json("Error updating logo.Try again later.");
    }

    return res.status(200).json(badge);
  })
);

/**
 * @route DELETE /:id
 * @group Schools - Operations about schools
 * @param {string} id.path.required - The ID of the school to delete
 * @returns {object} 200 - An object containing a success message
 * @returns {object} 404 - An object containing an error message if the school is not found
 * @returns {object} 500 - An object containing an error message if there is a server error
 * @example { "message": "School deleted" }
 * @example { "message": "School not found" }
 * @example { "message": "Internal server error" }
 *
 * @description Deletes a school from the database based on the provided ID.
 * If the school is successfully deleted, a success message is returned.
 * If the school is not found, a 404 error is returned.
 * In case of a server error, a 500 error is returned with the error message.
 */
router.delete(
  "/:id",
  verifyJWT,
  asyncHandler(async (req, res) => {
    // Deleting a school would orphan every student, fee and result it owns, and
    // no client calls this route. Schools are not removable through the API.
    return res.status(403).json({ message: "Schools cannot be deleted through the API" });
  })
);

module.exports = router;
