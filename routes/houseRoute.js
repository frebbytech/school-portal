const router = require("express").Router();
const _ = require("lodash");
const asyncHandler = require("express-async-handler");
const { isValidObjectId } = require("mongoose");
const Model = require("../models/houseModel");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const { sessionInSchool, staffInSchool } = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");

const CREATABLE_FIELDS = ["session", "name", "initials", "color", "master"];
const EDITABLE_FIELDS = ["session", "name", "initials", "color", "master", "active"];
const FORBIDDEN = "You do not have permission to perform this action.";

// session and master must belong to the caller's school
const referencesOk = async (req, data) =>
  (data.session === undefined || (await sessionInSchool(req, data.session))) &&
  (data.master === undefined ||
    data.master === null ||
    (await staffInSchool(req, data.master)));

//GET house list
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const items = await Model.find({ school: getPrincipal(req).schoolId })
      .populate("master", "firstname lastname")
      .sort({ createdAt: -1 });

    res.status(200).json(items);
  })
);

//@GET house by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const item = isValidObjectId(id)
      ? await Model.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;
    res.status(200).json(item);
  })
);

router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = pickFields(req.body, CREATABLE_FIELDS);
    if (!(await referencesOk(req, data))) return res.status(403).json(FORBIDDEN);

    const principal = getPrincipal(req);
    const created = await Model.create({
      ...data,
      school: principal.schoolId,
      createdBy: principal.id,
    });

    if (_.isEmpty(created)) {
      return res.status(404).json("Error occurred.Try again later...");
    }

    res.status(200).json("Changes Saved!");
  })
);

router.put(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = pickFields(req.body, EDITABLE_FIELDS);
    if (!isValidObjectId(id)) return res.status(404).json("Error occurred.Try again later...");
    if (!(await referencesOk(req, data))) return res.status(403).json(FORBIDDEN);

    const updated = await Model.findOneAndUpdate(
      { _id: id, school: getPrincipal(req).schoolId },
      { $set: data },
      { new: true }
    );

    if (_.isEmpty(updated)) {
      return res.status(404).json("Error occurred.Try again later...");
    }

    res.status(200).json("Changes Saved!");
  })
);

router.delete(
  "/remove",
  adminOnly,
  asyncHandler(async (req, res) => {
    const ids = [].concat(req.body?.houses ?? []);
    if (ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
      return res.status(404).json("Error removing house.Try again later...");
    }

    const result = await Model.deleteMany({
      _id: { $in: ids },
      school: getPrincipal(req).schoolId,
    });

    if (!result?.deletedCount) {
      return res.status(404).json("Error removing house.Try again later...");
    }

    res.status(200).json("House Removed!");
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const removed = isValidObjectId(id)
      ? await Model.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    if (_.isEmpty(removed)) {
      return res.status(404).json("Error removing house.Try again later...");
    }

    res.status(200).json("House deleted successfully!!!");
  })
);

module.exports = router;
