const router = require("express").Router();
const _ = require("lodash");
const asyncHandler = require("express-async-handler");
const Course = require("../models/courseModel");
const Level = require("../models/levelModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Attendance = require("../models/attendanceModel");
const {
  Types: { ObjectId },
} = require("mongoose");
const moment = require("moment/moment");
const {
  processWeeklyAttendance,
  getTotalAttendance,
  getAttendanceByGender,
} = require("../config/helper");
const sendMail = require("../config/mail/mailer");
const { isValidObjectId } = require("mongoose");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
  authzEnabled,
} = require("../middlewares/authorize");
const {
  termInSchool,
  sessionInSchool,
  levelInSchool,
  subjectInSchool,
  staffInSchool,
} = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");
const FORBIDDEN = "You do not have permission to perform this action.";
const COURSE_CREATABLE_FIELDS = ["session", "term", "level", "subject", "teacher"];
const COURSE_EDITABLE_FIELDS = ["teacher", "active"];

/**
 * session / term / teacher query parameters of the two teacher views. They must be
 * valid ids, and a teacher may only ask about themselves (administrators: any
 * teacher of their school).
 */
const teacherView = async (req, res) => {
  const { session, term, teacher } = req.query;
  const principal = getPrincipal(req);

  if (![session, term, teacher].every((id) => isValidObjectId(id))) {
    res.status(400).json("Invalid information provided.");
    return null;
  }
  if (authzEnabled() && principal.role === "teacher" && teacher !== principal.id) {
    res.status(403).json(FORBIDDEN);
    return null;
  }
  if (!(await staffInSchool(req, teacher)) || !(await termInSchool(req, term))) {
    res.status(403).json(FORBIDDEN);
    return null;
  }
  return { session, term, teacher, schoolId: principal.schoolId };
};

//@GET All school courses
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const courses = await Course.find({
      school: getPrincipal(req).schoolId,
    });
    res.status(200).json(courses);
  })
);

//@GET All school courses
router.get(
  "/dashboard",
  requireStaff,
  asyncHandler(async (req, res) => {
    const view = await teacherView(req, res);
    if (!view) return;
    const { session, term, teacher, schoolId } = view;

    //Get course assigned to teacher
    const courses = await Course.find({
      school: schoolId,
      session: new ObjectId(session),
      term: new ObjectId(term),
      teacher: new ObjectId(teacher),
    }).countDocuments();

    //Get levels assigned to teacher
    const levels = await Level.find({
      school: schoolId,
      session: new ObjectId(session),
      term: new ObjectId(term),
      teacher: teacher,
    })
      .select(["teacher", "level"])
      .populate({
        path: "students",
        match: { active: true },
      });

    //Get total students in each level
    const studentInEachLevel = levels.map((level) => {
      return {
        level: level?.levelName,
        students: level?.students?.length || 0,
      };
    });

    // find males and females
    const totalStudents = levels.flatMap(({ students }) => students);
    const groupedStudents = _.groupBy(totalStudents, "gender");

    // const attendances=await Attendance.find({
    //   level: level?._id,
    // })

    //Get attendance for today
    const attendances = levels.flatMap(async (level) => {
      const attendance = await Attendance.find({
        level: new ObjectId(level?._id),
      })
        .populate({
          path: "level",
          select: "level",
        })
        .select(["date", "status"]);

      const data = attendance.map((at) => {
        return {
          level: level?.levelName,
          date: at?.date,
          status: at?.status,
        };
      });

      return data;
    });

    const allAttendances = await Promise.all(attendances);
    // console.log(allAttendances)

    const modifiedAttendance = _.flatMap(allAttendances);
    const totalAttendance = getTotalAttendance(modifiedAttendance);
    const genderAttendance = getAttendanceByGender(modifiedAttendance);

    const weeklyAttendances = processWeeklyAttendance(modifiedAttendance);

    const dashboardInfo = {
      courses: courses ?? 0,
      levels: levels?.length,
      students: totalStudents?.length,
      studentInEachLevel: studentInEachLevel,
      groupedStudents:
        groupedStudents !== undefined
          ? groupedStudents
          : { male: [], female: [] },
      present: totalAttendance.Present,
      absent: totalAttendance?.Absent,
      unknown: totalAttendance?.Unknown,
      weeklyAttendances,
      genderAttendance,
    };
    res.status(200).json(dashboardInfo);
  })
);

//@GET School Course by teacher
router.get(
  "/teacher",
  requireStaff,
  asyncHandler(async (req, res) => {
    const view = await teacherView(req, res);
    if (!view) return;
    const { session, term, teacher, schoolId } = view;

    const courses = await Course.find({
      school: schoolId,
      session: new ObjectId(session),
      term: new ObjectId(term),
      teacher: new ObjectId(teacher),
    })
      .populate("level")
      .populate("subject");

    if (_.isEmpty(courses)) {
      return res.status(200).send([]);
    }

    const modifiedCourses = courses.map(({ _id, level, subject }) => {
      return {
        _id,
        subject,
        levelId: level?._id,
        level: level?.levelName,
        students: level?.students?.length,
      };
    });

    res.status(200).json(modifiedCourses);
  })
);

//@GET School Course by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = isValidObjectId(id)
      ? await Course.findOne({ _id: id, school: getPrincipal(req).schoolId }).populate("subject")
      : null;
    res.status(200).json(course);
  })
);

//Add new School Course
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = pickFields(req.body, COURSE_CREATABLE_FIELDS);
    const { subject, level, term, session, teacher } = data;
    const { subjectName, levelName } = req.body;
    const principal = getPrincipal(req);

    const referencesOk =
      (await sessionInSchool(req, session)) &&
      (await termInSchool(req, term)) &&
      (await levelInSchool(req, level)) &&
      (await subjectInSchool(req, subject)) &&
      (teacher === undefined || teacher === null || (await staffInSchool(req, teacher, "teacher")));
    if (!referencesOk) return res.status(403).json(FORBIDDEN);

    const courses = await Course.find({
      school: principal.schoolId,
      session,
      term,
      level,
      subject,
    });

    if (!_.isEmpty(courses)) {
      return res.status(400).json("Course already assigned to teacher");
    }

    //Create new Course
    const course = await Course.create({
      ...data,
      school: principal.schoolId,
    });

    if (!course) {
      return res.status(404).json("Error creating new course.Try again later");
    }

    if (teacher) {
      const notification = {
        user: teacher,
        school: principal.schoolId,
        session: session,
        term: term,
        type: "Information",
        title: `Course Assignment - ${subjectName}`,
        description: `You have been assigned to teach ${subjectName} for ${levelName}. Please login to your dashboard to view more details.`,
        album: null,
        link: "/course/assign",
        createdBy: principal.id,
      };

      await Notification.create(notification);

      const teacherUser = await User.findById(teacher);

      const body = {
        title: `Course Assignment - ${subjectName}`,
        message: `Dear ${teacherUser?.firstname} ${teacherUser?.lastname}, You have been assigned to teach ${subjectName} for ${levelName}. Please login to your dashboard to view more details.`,
      };

      await sendMail(body, teacherUser?.email);
    }

    res.status(201).json("New Course assigned!");
  })
);

//@PUT Update Existing School Course
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    const update = pickFields(req.body, COURSE_EDITABLE_FIELDS);

    if (
      !isValidObjectId(id) ||
      (update.teacher && !(await staffInSchool(req, update.teacher, "teacher")))
    ) {
      return res.status(404).json("Error updating course info.Try again later");
    }

    const modifiedCourse = await Course.findOneAndUpdate(
      { _id: id, school: getPrincipal(req).schoolId },
      { $set: update }
    );

    if (!modifiedCourse) {
      return res.status(404).json("Error updating course info.Try again later");
    }

    res.json(modifiedCourse);
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (isValidObjectId(id)) {
      await Course.findOneAndDelete({ _id: id, school: getPrincipal(req).schoolId });
    }

    res.status(204).json("Course Removed!");
  })
);

module.exports = router;
