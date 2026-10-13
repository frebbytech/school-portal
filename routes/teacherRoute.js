const router = require("express").Router();
const AsyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const { createImageUpload } = require("../middlewares/upload");
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const { uploadFile, uploadMultipleImages } = require("../config/uploadFile");

const upload = createImageUpload("users");

//-------------------------------------------------------------------------------

//@GET All teachers
router.get(
  "/",
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
  AsyncHandler(async (req, res) => {
    const id = req.params.id;
    const teacher = await User.findById(id).select("-password");

    res.status(200).json(teacher);
  })
);

//@POST Teacher
router.post(
  "/",
  upload.single("profile"),
  AsyncHandler(async (req, res) => {
    const newTeacher = req.body;
    newTeacher.profile = req?.file?.filename;

    const isUserNameExists = await User.find({
      username: newTeacher?.username,
    });

    if (!_.isEmpty(isUserNameExists)) {
      return res
        .status(400)
        .json(
          `Teacher with username '${newTeacher?.username}' already exists! `
        );
    }

    let teacherPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    if (req.file) {
      const filename = req.file?.filename;
      teacherPhoto = await uploadFile(filename, "users/");
      newTeacher.profile = teacherPhoto;
    }

    const hashedPassword = await bcrypt.hash(newTeacher?.phonenumber, 10);

    const user = {
      school: req.user.school,
      profile: teacherPhoto,
      firstname: newTeacher?.firstname,
      lastname: newTeacher?.lastname,
      fullname: _.startCase(`${newTeacher?.firstname} ${newTeacher?.lastname}`),
      username: newTeacher?.username,
      dateofbirth: newTeacher?.dateofbirth,
      email: newTeacher?.email,
      gender: newTeacher?.gender,
      role: "teacher",
      phonenumber: newTeacher?.phonenumber,
      address: newTeacher?.address,
      residence: newTeacher?.residence,
      nationality: newTeacher?.nationality,
      password: hashedPassword,
      createdBy: req.user.id,
    };

    const userId = await User.create(user);
    if (_.isEmpty(userId)) {
      return res.status(404).json("Couldnt save Teacher info.Try again.");
    }

    res.status(201).json("New Teacher Added!!!");
  })
);

//@PUT students
router.post(
  "/many",
  AsyncHandler(async (req, res) => {
    const { students: teachers } = req.body;

    const usernames = _.map(teachers, "username");

    const existingTeachers = await User.find({
      school: req.user.school,
      username: {
        $in: usernames,
      },
    }).select("username");

    if (!_.isEmpty(existingTeachers)) {
      return res.status(400).json({
        isDuplicateError: true,
        isTeacher: true,
        message: `Username of some teachers already exist.Please check and try again.`,
        data: _.map(existingTeachers, "username"),
      });
    }
    let teacherPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    const newTeachers = teachers.map(async (teacher) => {
      const hashedPassword = await bcrypt.hash(teacher?.phonenumber, 10);
      const user = {
        school: req.user.school,
        profile: teacherPhoto,
        firstname: teacher?.firstname,
        lastname: teacher?.lastname,
        fullname: _.startCase(`${teacher?.firstname} ${teacher?.lastname}`),
        username: teacher?.username,
        dateofbirth: teacher?.dateofbirth,
        gender: teacher?.gender,
        email: teacher?.email,
        phonenumber: teacher?.phonenumber,
        role: "teacher",
        address: teacher?.address,
        residence: teacher?.residence,
        nationality: teacher?.nationality,
        password: hashedPassword,
        createdBy: req.user.id,
      };

      const userId = await User.create(user);
      return userId;
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
  AsyncHandler(async (req, res) => {
    let { _id, ...rest } = req.body;

    if (!mongoose.isValidObjectId(_id)) {
      return res.status(400).json("Invalid Teacher id");
    }

    const updatedTeacher = await User.findByIdAndUpdate(
      _id,
      {
        $set: {
          ...rest,
        },
      },
      {
        upsert: true,
        new: true,
      }
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
  upload.single("profile"),
  AsyncHandler(async (req, res) => {
    const { _id } = req.body;

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a file");
    }

    const filename = req.file?.filename;
    const userPhoto = await uploadFile(filename, "users/");

    const updatedTeacher = await User.findByIdAndUpdate(_id, {
      $set: {
        profile: userPhoto,
      },
    });

    if (_.isEmpty(updatedTeacher)) {
      return res
        .status(400)
        .json("Error updating profile image.Try again later.");
    }

    res.status(201).json("Profile image updated!!!");
  })
);

//@PUT Update Teacher bulk profile
router.put(
  "/bulk-profile",
  upload.array("profile", 20),
  AsyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json("No files uploaded");
    }

    const uploadedUrls = await uploadMultipleImages(req.files, "users/");

    const updatedTeachers = uploadedUrls?.map(async (teacher) => {
      return await User.findOneAndUpdate(
        {
          phonenumber: teacher?.indexnumber,
        },
        {
          $set: {
            profile: teacher?.url,
          },
        }
      );
    });
    const modifiedTeachers = await Promise.all(updatedTeachers);

    if (_.isEmpty(modifiedTeachers)) {
      return res.status(400).json("Error uploading photos.Try again later.");
    }

    res.status(201).json("Photos updated!!!");
  })
);

//@DELETE teacher
router.delete(
  "/:id",
  AsyncHandler(async (req, res) => {
    const id = req.params.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(403).json("Invalid information provided.");
    }

    const teacher = await User.findByIdAndUpdate(id, {
      $set: { active: false },
    });

    if (_.isEmpty(teacher)) {
      return res.status(400).json("Couldn't remove Teacher info.Try again.");
    }

    res.status(200).json("Changes Saved!!!");
  })
);

module.exports = router;
