const router = require("express").Router();
const AsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const { createImageUpload } = require("../middlewares/upload");
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const { uploadFile, uploadMultipleImages } = require("../config/uploadFile");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");

const adminOnly = requireRoleEnforced("administrator");
const NOT_FOUND = "Invalid information provided.";
const MAX_BATCH = 200;

// Only administrators manage teacher accounts (owner decision 2026-10-12).
const TEACHER_EDITABLE_FIELDS = [
  "firstname",
  "lastname",
  "username",
  "dateofbirth",
  "gender",
  "email",
  "phonenumber",
  "address",
  "residence",
  "nationality",
  "active",
];
const fullnameOf = (t) => _.startCase(`${t?.firstname} ${t?.lastname}`);
const teacherInSchool = (req, id) =>
  mongoose.isValidObjectId(id)
    ? User.findOne({ _id: id, school: getPrincipal(req).schoolId, role: "teacher" })
    : null;

const upload = createImageUpload("users");

//-------------------------------------------------------------------------------

//@GET All teachers
router.get(
  "/",
  requireStaff,
  AsyncHandler(async (req, res) => {
    const teachers = await User.find({
      school: req.user.school,
      role: "teacher",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json(teachers);
  })
);

//@GET Teacher by id
router.get(
  "/courses",
  requireStaff,
  AsyncHandler(async (req, res) => {
    const id = req.params.id;

    //Get course assigned to teacher
    const courses = await Course.find({
      school: req.user.school,
    })
      .populate({
        path: "term",
        select: ["name", "term", "academicYear"],
      })
      .populate({
        path: "level",
        select: ["level"],
      })
      .populate({
        path: "level",
        select: ["level"],
      })
      .populate({
        path: "subject",
        select: ["name", "code"],
      })
      .populate({
        path: "teacher",
        select: ["firstname", "lastname", "profile"],
      });


    const modifiedCourses = courses.map((course) => ({
      _id: course._id,
      academicYear: course.term?.academicYear,
      term: course.term?.term,
      teacher: {
        _id: course.teacher?._id,
        profile: course.teacher?.profile,
        fullname: course.teacher?.fullname,
      },
      level: course.level?.levelName,
      noOfStudents: course.level?.noOfStudents,
      subject: course.subject?.name,
    }));

 

    res.status(200).json(modifiedCourses);
  })
);
//@GET Teacher by id
router.get(
  "/:id",
  requireStaff,
  AsyncHandler(async (req, res) => {
    const id = req.params.id;
    const teacher = mongoose.isValidObjectId(id)
      ? await User.findOne({ _id: id, school: getPrincipal(req).schoolId }).select("-password")
      : null;

    res.status(200).json(teacher);
  })
);

//@POST Teacher
router.post(
  "/",
  adminOnly, // before the upload middleware so others cannot upload files
  upload.single("profile"),
  AsyncHandler(async (req, res) => {
    const newTeacher = pickFields(req.body, TEACHER_EDITABLE_FIELDS);

    if (typeof newTeacher.username !== "string" || !newTeacher.username ||
        typeof newTeacher.phonenumber !== "string" || !newTeacher.phonenumber) {
      return res.status(400).json("Username and phone number are required.");
    }

    // usernames are unique across every school
    const isUserNameExists = await User.exists({ username: newTeacher.username });
    if (isUserNameExists) {
      return res
        .status(400)
        .json(`Teacher with username '${newTeacher.username}' already exists! `);
    }

    let teacherPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    if (req.file) {
      teacherPhoto = await uploadFile(req.file.filename, "users/");
    }

    const hashedPassword = await bcrypt.hash(newTeacher.phonenumber, 10);
    const principal = getPrincipal(req);

    const user = {
      ...newTeacher,
      school: principal.schoolId,
      profile: teacherPhoto,
      fullname: fullnameOf(newTeacher),
      role: "teacher",
      password: hashedPassword,
      createdBy: principal.id,
    };
    delete user.active;

    const created = await User.create(user);
    if (_.isEmpty(created)) {
      return res.status(404).json("Couldnt save Teacher info.Try again.");
    }

    res.status(201).json("New Teacher Added!!!");
  })
);

//@POST many teachers (the legacy payload key is `students`)
router.post(
  "/many",
  adminOnly,
  AsyncHandler(async (req, res) => {
    const { students: incoming } = req.body || {};
    if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > MAX_BATCH) {
      return res.status(400).json("Error adding teachers info.Try again later.");
    }

    const teachers = incoming.map((t) => pickFields(t, TEACHER_EDITABLE_FIELDS));
    if (teachers.some((t) => typeof t.username !== "string" || !t.username ||
        typeof t.phonenumber !== "string" || !t.phonenumber)) {
      return res.status(400).json("Every teacher needs a username and phone number.");
    }

    // usernames are unique across every school, so the check is global
    const usernames = _.map(teachers, "username");
    const existingTeachers = await User.find({ username: { $in: usernames } }).select("username");

    if (!_.isEmpty(existingTeachers) || new Set(usernames).size !== usernames.length) {
      return res.status(400).json({
        isDuplicateError: true,
        isTeacher: true,
        message: `Username of some teachers already exist.Please check and try again.`,
        data: _.map(existingTeachers, "username"),
      });
    }

    const teacherPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    const principal = getPrincipal(req);

    const newTeachers = teachers.map(async (teacher) => {
      const user = {
        ...teacher,
        school: principal.schoolId,
        profile: teacherPhoto,
        fullname: fullnameOf(teacher),
        role: "teacher",
        password: await bcrypt.hash(teacher.phonenumber, 10),
        createdBy: principal.id,
      };
      delete user.active;
      return User.create(user);
    });

    const allTeachers = await Promise.all(newTeachers);
    if (_.isEmpty(allTeachers)) {
      return res
        .status(404)
        .json("Error adding teachers info.Try again later.");
    }

    res.status(200).json("Teachers Information Saved!!!");
  })
);

//@PUT teacher
router.put(
  "/",
  adminOnly,
  AsyncHandler(async (req, res) => {
    const { _id } = req.body || {};

    if (!mongoose.isValidObjectId(_id)) {
      return res.status(400).json("Invalid Teacher id");
    }

    const update = pickFields(req.body, TEACHER_EDITABLE_FIELDS);
    if (update.firstname !== undefined || update.lastname !== undefined) {
      const current = await teacherInSchool(req, _id);
      if (current) {
        update.fullname = fullnameOf({
          firstname: update.firstname ?? current.firstname,
          lastname: update.lastname ?? current.lastname,
        });
      }
    }

    // no upsert: an unknown id must never create a record
    const updatedTeacher = await User.findOneAndUpdate(
      { _id, school: getPrincipal(req).schoolId, role: "teacher" },
      { $set: update },
      { new: true }
    );

    if (_.isEmpty(updatedTeacher)) {
      return res.status(404).json("Couldnt update Teacher info.Try again.");
    }

    res.status(201).json("Changes Saved!!!");
  })
);

//@PUT Update Teacher profile
router.put(
  "/profile",
  adminOnly,
  upload.single("profile"),
  AsyncHandler(async (req, res) => {
    const { _id } = req.body;

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a file");
    }
    if (!(await teacherInSchool(req, _id))) {
      return res.status(400).json("Error updating profile image.Try again later.");
    }

    const userPhoto = await uploadFile(req.file.filename, "users/");

    await User.updateOne(
      { _id, school: getPrincipal(req).schoolId, role: "teacher" },
      { $set: { profile: userPhoto } }
    );

    res.status(201).json("Profile image updated!!!");
  })
);

//@PUT Update Teacher bulk profile
router.put(
  "/bulk-profile",
  adminOnly,
  upload.array("profile", 20),
  AsyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json("No files uploaded");
    }

    const { schoolId } = getPrincipal(req);
    const uploadedUrls = await uploadMultipleImages(req.files, "users/");

    const updatedTeachers = uploadedUrls?.map(async (teacher) => {
      // matched on phone number, but only inside the caller's school
      return await User.findOneAndUpdate(
        { school: schoolId, role: "teacher", phonenumber: teacher?.indexnumber },
        { $set: { profile: teacher?.url } }
      );
    });
    const modifiedTeachers = await Promise.all(updatedTeachers);

    if (_.isEmpty(modifiedTeachers)) {
      return res.status(400).json("Error uploading photos.Try again later.");
    }

    res.status(201).json("Photos updated!!!");
  })
);

//@DELETE teacher (deactivates; nothing is removed)
router.delete(
  "/:id",
  adminOnly,
  AsyncHandler(async (req, res) => {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(403).json(NOT_FOUND);
    }

    const teacher = await User.findOneAndUpdate(
      { _id: id, school: getPrincipal(req).schoolId, role: "teacher" },
      { $set: { active: false } }
    );

    if (_.isEmpty(teacher)) {
      return res.status(400).json("Couldn't remove Teacher info.Try again.");
    }

    res.status(200).json("Changes Saved!!!");
  })
);

module.exports = router;
