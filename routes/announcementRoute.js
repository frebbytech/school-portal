const router = require("express").Router();
const _ = require("lodash");
const asyncHandler = require("express-async-handler");
const { isValidObjectId } = require("mongoose");
const User = require("../models/userModel");
const Announcement = require("../models/announcementModel");
const Notification = require("../models/notificationModel");
const StudentAuth = require("../models/studentAuthModel");
const { truncateWords } = require("../config/helper");
const {
  requireMember,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");
const { sessionInSchool, termInSchool } = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");
const FORBIDDEN = "You do not have permission to perform this action.";
const ANNOUNCEMENT_FIELDS = [
  "session",
  "term",
  "title",
  "description",
  "priority",
  "bgColor",
  "active",
];

const referencesOk = async (req, data) =>
  (data.session === undefined || (await sessionInSchool(req, data.session))) &&
  (data.term === undefined || (await termInSchool(req, data.term)));

//GET announcement (staff and students of the school)
router.get(
  "/",
  requireMember,
  asyncHandler(async (req, res) => {
    const announcements = await Announcement.find({
      school: getPrincipal(req).schoolId,
    }).sort({ createdAt: -1 });

    res.status(200).json(announcements);
  })
);

//@GET Announcement by id
router.get(
  "/:id",
  requireMember,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const announcement = isValidObjectId(id)
      ? await Announcement.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;
    res.status(200).json(announcement);
  })
);

//POST announcement
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    // `group` only decides who is notified; it is not stored on the announcement
    const group = req.body?.group;
    const newAnnouncement = pickFields(req.body, ANNOUNCEMENT_FIELDS);
    if (!(await referencesOk(req, newAnnouncement))) return res.status(403).json(FORBIDDEN);

    const principal = getPrincipal(req);
    const announcement = await Announcement.create({
      ...newAnnouncement,
      school: principal.schoolId,
      createdBy: principal.id,
    });

    if (_.isEmpty(announcement)) {
      return res
        .status(404)
        .json("Couldnt create announcement.Please try again later...");
    }

    // Recipients are limited to THIS school (this used to notify every user and
    // student of every school, and pushed an array in place of a student id)
    const recipients = (await User.find({ school: principal.schoolId }, "_id")).map((u) => u._id);

    if (["all", "students"].includes(group)) {
      const students = await StudentAuth.find({ school: principal.schoolId }, "_id");
      students.forEach((student) => recipients.push(student._id));
    }

    const notifications = recipients.map((id) => ({
      user: id,
      school: principal.schoolId,
      session: newAnnouncement?.session,
      term: newAnnouncement?.term,
      type: "Announcement",
      title: newAnnouncement?.title,
      description: truncateWords(newAnnouncement?.description, 20),
      album: null,
      link: `/announcements?_title=${encodeURIComponent(announcement.title ?? "")}`,
      createdBy: principal.id,
    }));

    await Notification.insertMany(notifications);

    res.status(200).json("Announcement Created!");
  })
);

//Edit announcement
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id } = req.body || {};
    const data = pickFields(req.body, ANNOUNCEMENT_FIELDS);

    if (!isValidObjectId(_id)) return res.status(404).json("Error occurred.Try again later...");
    if (!(await referencesOk(req, data))) return res.status(403).json(FORBIDDEN);

    const updatedAnnouncement = await Announcement.findOneAndUpdate(
      { _id, school: getPrincipal(req).schoolId },
      { $set: data },
      { new: true }
    );

    if (_.isEmpty(updatedAnnouncement)) {
      return res.status(404).json("Error occurred.Try again later...");
    }

    res.status(200).json("Chnages Saved!");
  })
);

//DELETE announcements (bulk)
router.put(
  "/remove",
  adminOnly,
  asyncHandler(async (req, res) => {
    const ids = [].concat(req.body?.announcements ?? []);
    if (ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
      return res.status(404).json("Error removing announcement.Try again later...");
    }

    const result = await Announcement.deleteMany({
      _id: { $in: ids },
      school: getPrincipal(req).schoolId,
    });

    if (!result?.deletedCount) {
      return res.status(404).json("Error removing announcement.Try again later...");
    }

    res.status(200).json("Announcement Removed!");
  })
);

//DELETE announcement
router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const announcement = isValidObjectId(id)
      ? await Announcement.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId })
      : null;

    if (_.isEmpty(announcement)) {
      return res
        .status(404)
        .json("Error removing announcement.Try again later...");
    }

    res.status(200).json("Announcement deleted successfully!!!");
  })
);

module.exports = router;
