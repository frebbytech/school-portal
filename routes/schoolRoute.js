const express = require("express");
const _ = require("lodash");
const router = express.Router();
const { createImageUpload } = require("../middlewares/upload");
const School = require("../models/schoolModel");
const asyncHandler = require("express-async-handler");
const { verifyJWT } = require("../middlewares/verifyJWT");
const { uploadFile } = require("../config/uploadFile");

const upload = createImageUpload("badges");

// Get all schools
router.get(
  "/",
  verifyJWT,
  asyncHandler(async (req, res) => {
    const schools = await School.find().sort({ name: 1 });
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
  asyncHandler(async (req, res) => {
    const data = req.body;
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
  asyncHandler(async (req, res) => {
    const { _id, ...rest } = req.body;
    const school = await School.findByIdAndUpdate(
      _id,
      {
        $set: {
          ...rest,
        },
      },
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
  upload.single("badge"),
  asyncHandler(async (req, res) => {
    const data = req.body;

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a badge");
    }

    const filename = req.file?.filename;
    const badge = await uploadFile(filename, "badges/");

    const updatedBadge = await School.findOneAndUpdate(
      {
        code: data?.code,
      },
      {
        $set: {
          badge,
        },
      },
      {
        new: true,
        upsert: true,
      }
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
    const school = await School.findByIdAndDelete(req.params.id);
    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }
    res.json({ message: "School deleted" });
  })
);

module.exports = router;
