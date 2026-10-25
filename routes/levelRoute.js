const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Level = require("../models/levelModel");
const User = require("../models/userModel");
const Examination = require("../models/examinationModel");
const Notification = require("../models/notificationModel");
const Department = require("../models/departmentModel");
const House = require("../models/houseModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const Attendance = require("../models/attendanceModel");
const _ = require("lodash");
const {
  Types: { ObjectId },
} = require("mongoose");
const {
  getAttendanceByGender,
  processGeneralWeeklyAttendance,
} = require("../config/helper");
const sendMail = require("../config/mail/mailer");
const { LEVEL_OPTIONS } = require("../config/helper");
const { isValidObjectId } = require("mongoose");
const Grade = require("../models/gradeModel");
const {
  requireStaff,
  requireMember,
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
  allInSchool,
} = require("../middlewares/tenant");

const adminOnly = requireRoleEnforced("administrator");
const FORBIDDEN = "You do not have permission to perform this action.";
const LEVEL_CREATABLE_FIELDS = [
  "session",
  "term",
  "department",
  "teacher",
  "fee",
  "level",
  "initials",
  "subjects",
  "grades",
  "rollNumber",
  "attendance",
];
const MAX_BATCH = 200;
const schoolOf = (req) => getPrincipal(req).schoolId;

/** session and term query/body values must be valid ids of the caller's school. */
const sessionTermOk = async (req, session, term) =>
  isValidObjectId(session) &&
  isValidObjectId(term) &&
  (await sessionInSchool(req, session)) &&
  (await termInSchool(req, term));

//@GET all current level by current school session
router.get(
  "/session",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term } = req.query;
    if (!(await sessionTermOk(req, session, term))) return res.status(403).json(FORBIDDEN);

    const levels = await Level.find({
      school: schoolOf(req),
      session: new ObjectId(session),
      term: new ObjectId(term),
      active: true,
    })
      .populate({
        path: "students",
        match: { active: true },
      })
      .populate("subjects") // Populate subjects
      .populate("grades") // Populate grades
      .populate("fee") // Populate fees
      .populate({
        path: "teacher",
        select: ["firstname", "lastname", "profile"],
      }); // Populate Teacher

    const modifiedLevels = levels.sort(
      (a, b) =>
        LEVEL_OPTIONS.indexOf(a?.level?.name) -
        LEVEL_OPTIONS.indexOf(b?.level?.name)
    );

    const currentSubjects = await Subject.find({
      session: new ObjectId(session),
      term: new ObjectId(term),
    }).countDocuments();

    if (_.isEmpty(modifiedLevels)) {
      return res.status(200).json({
        students: [],
        subjects: currentSubjects,
        levelsOption: [],
        fees: [],
        levelSummary: {
          noOfLevels: 0,
          noOfSubjects: 0,
          noOfAssignedTeachers: 0,
        },
      });
    }

    const selectedLevels = modifiedLevels?.map(
      ({ _id, level, fee, students, subjects, teacher }) => {
        return {
          _id,
          level,
          type: `${level?.name}${level?.type || ""}`,
          noOfStudents: students?.length,
          noOfSubjects: subjects?.length,
          teacher: {
            _id: teacher?._id,
            fullName: teacher?.fullname,
            profile: teacher?.profile,
          },
          fee: _.isUndefined(fee)
            ? null
            : {
                _id: fee?._id,
                levelId: _id,
                levelName: `${level?.name}${level?.type || ""}`,
                amount: fee?.amount || 0,
                fees: _.sumBy(fee?.amount, (fees) => fees.amount),
              },
        };
      }
    );

    // NUMBER OF LEVELS
    const noOfLevels = levels.length;

    //NUMBER OF ASSIGNED TEACHERS
    const modifiedTeachers = _.filter(levels, "teacher");
    const noOfAssignedTeachers = _.isEmpty(modifiedTeachers)
      ? 0
      : modifiedTeachers.length;

    //SUBJECTS
    const subjects = _.flatMap(levels, "subjects");
    //FEES
    const fees = _.compact(_.map(selectedLevels, "fee"));

    //STUDENTS
    const modifiedStudents = levels.flatMap(({ _id, students, level }) => {
      return students.map((student) => {
        return {
          ...student._doc,
          fullName: student.fullName,
          levelId: _id,
          levelName: `${level?.name}${level.type || ""}`,
        };
      });
    });

    const departments = await Department.find({
      school: req.user.school,
      active: true,
    }).select("_id name");
    const houses = await House.find({
      school: req.user.school,
      active: true,
    }).select("_id name");

    res.status(200).json({
      students: modifiedStudents,
      subjects: currentSubjects,
      fees,
      departments,
      houses,
      levelsOption: selectedLevels,
      levelSummary: {
        noOfLevels,
        noOfSubjects: subjects?.length,
        noOfAssignedTeachers,
      },
    });
  })
);

//Get dashboard info
router.get(
  "/dashboard-info",
  requireMember,
  asyncHandler(async (req, res) => {
    const { session, term } = req.query;
    if (!(await sessionTermOk(req, session, term))) return res.status(403).json(FORBIDDEN);

    //No of teachers
    const noOfTeachers = await User.find({
      school: req.user.school,
      role: "teacher",
    }).countDocuments({ active: true });

    //No of levels
    const levels = await Level.find({
      school: req.user.school,
      session: new ObjectId(session),
      term: new ObjectId(term),
    })
      .populate({
        path: "students",
        match: { active: true },
      })
      .populate("subjects") // Populate subjects
      .populate("grades"); // Populate grades

    //No of Students
    const students = _.flatMap(levels, "students");

    const maleCount = students?.filter((student) => {
      return student?.gender === "male";
    });

    const femaleCount = students?.filter((student) => {
      return student?.gender === "female";
    });

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

    const modifiedAttendance = _.flatMap(allAttendances);
    const weeklyAttendances =
      processGeneralWeeklyAttendance(modifiedAttendance);
    const genderAttendance = getAttendanceByGender(modifiedAttendance);

    //No of Levels
    const noOfLevels = levels.length;

    // No of Subjects
    const subjects = await Subject.find({
      session,
      term,
    }).countDocuments();

    const dashboardInfo = {
      teachers: noOfTeachers,
      levels: noOfLevels,
      courses: subjects,
      students: students?.length,
      studentCount: {
        male: maleCount?.length,
        female: femaleCount?.length,
      },
      weeklyAttendances,
      genderAttendance,
    };

    res.status(200).json(dashboardInfo);
  })
);
//@GET all current level by current school session
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const id = req.query.id;
    const level = isValidObjectId(id)
      ? await Level.findOne({ _id: id, school: schoolOf(req) })
          .populate({
            path: "students",
            match: { active: true },
          })
          .populate("subjects") // Populate subjects
          .populate("grades") // Populate grades
      : null;

    if (!level) return res.status(200).json(null);

    if (level.students?.length !== 0) {
      const modifiedStudents = level?.students.map((student) => {
        return {
          ...student?._doc,
          fullName: student.fullName,
          levelId: id,
          levelName: `${level.level?.name}${level.level?.type}`,
        };
      });

      const modifiedLevel = {
        ...level?._doc,
        students: modifiedStudents,
      };
      // //console.log(modifiedLevel);
      return res.status(200).json(modifiedLevel);
    }

    res.status(200).json(level);
  })
);
//@GET all current level by current school session
router.get(
  "/previous",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term, student } = req.query;
    if (!(await sessionTermOk(req, session, term))) return res.status(200).json([]);

    const levels = await Level.find({
      school: schoolOf(req),
      session,
      term,
    })
      .populate({
        path: "students",
        match: { active: true },
      })
      .select("level");

    let modifiedLevel = [];

    if (student) {
      modifiedLevel = levels?.map((level) => {
        const students = level?.students?.map((student) => ({
          _id: student?._id,
          indexnumber: student?.indexnumber,
          firstname: student?.firstname,
          surname: student?.surname,
          othername: student?.othername,
          dateofbirth: student?.dateofbirth,
          gender: student?.gender,
          email: student?.email,
          phonenumber: student?.phonenumber,
          address: student?.address,
          residence: student?.residence,
          nationality: student?.nationality,
        }));

        return {
          _id: level?._id,
          level: level?.level,
          file: level?.levelName,
          data: students,
        };
      });
    } else {
      modifiedLevel = levels?.map((level) => {
        return {
          _id: level?._id,
          levelName: level?.levelName,
          ...level?.level,
        };
      });
    }

    res.status(200).json(modifiedLevel);
  })
);

//@GET all current subjects by level id
router.get(
  "/subject",
  requireStaff,
  asyncHandler(async (req, res) => {
    const levelId = req.query.levelId;
    const subjects = isValidObjectId(levelId)
      ? await Level.findOne({ _id: levelId, school: schoolOf(req) }).select("subjects grades")
      : null;
    // console.log(subjects);

    res.status(200).json(subjects);
  })
);

//@GET all current level by current school session
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const level = isValidObjectId(id)
      ? await Level.findOne({ _id: id, school: schoolOf(req) })
          .populate({
            path: "students",
            match: { active: true },
          })
          .populate("subjects") // Populate subjects
          .populate("grades") // Populate grades
          .populate("fee") // Populate fees
          .populate({
            path: "teacher",
            select: ["firstname", "lastname", "profile"],
          }) // Populate Teacher
      : null;

    res.status(200).json(level);
  })
);

router.post(
  "/students/all",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { sessionId, termId } = req.body || {};
    if (!(await sessionTermOk(req, sessionId, termId))) return res.status(200).json([]);

    const AllStudents = await Level.find({
      school: schoolOf(req),
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
    }).populate({
      path: "students",
      match: { active: true },
    });

    if (_.isEmpty(AllStudents)) {
      return res.status(200).json([]);
    }

    const modifiedStudents = AllStudents.flatMap(({ _id, students, level }) => {
      return students.map((student) => {
        return {
          ...student._doc,
          fullName: student.fullName,
          levelId: _id,
          levelName: `${level?.name}${level.type}`,
        };
      });
    });

    res.status(200).json(modifiedStudents);
  })
);

//Generate next term level details if not exists
router.post(
  "/generate",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { sessionId, termId } = req.body || {};
    if (!(await sessionTermOk(req, sessionId, termId))) return res.status(403).json(FORBIDDEN);

    //FInd if current level exists
    const currentLevels = await Level.find({
      school: schoolOf(req),
      session: sessionId,
      term: termId,
    });

    if (!_.isEmpty(currentLevels)) {
      return res.status(200).json([]);
    }

    //find prevoius levels
    //FInd if levels exists
    const levels = await Level.find({
      school: schoolOf(req),
      session: sessionId,
    });

    if (_.isEmpty(levels)) {
      return res.status(200).json([]);
    }

    //GET all existing students
    const previousLevels = await Level.find({
      school: schoolOf(req),
      session: sessionId,
    });

    const selectedLevels = previousLevels.map(({ level }) => {
      return {
        levelName: `${level.name}${level.type}`,
      };
    });

    // //Merge all levels with same name
    const mergedLevels = _.values(
      _.merge(_.keyBy(selectedLevels, "levelName"))
    );

    //GENERATE New Level info
    const students = mergedLevels.map(
      ({ level, teacher, subjects, students, grades }) => {
        return {
          session: sessionId,
          term: termId,
          teacher,
          level,
          subjects,
          grades,
          students: _.uniqWith(students, _.isEqual),
          rollNumber: students?.length || 0,
          attendance: 0,
        };
      }
    );

    //ADD Students to new class
    const newLevels = await Level.insertMany(students);

    //GENERATE examination info of students
    const newStudents = newLevels.flatMap(({ _id, students }) => {
      return students.map((student) => {
        return {
          session: sessionId,
          term: termId,
          level: _id,
          student: student?._id,
          scores: [],
          overallScore: 0,
          comments: {},
        };
      });
    });

    await Examination.insertMany(newStudents);

    res.sendStatus(201);
  })
);

//@POST add new level to current school session
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const newLevel = pickFields(req.body, LEVEL_CREATABLE_FIELDS);

    const referencesOk =
      (await sessionTermOk(req, newLevel.session, newLevel.term)) &&
      (newLevel.teacher == null || (await staffInSchool(req, newLevel.teacher, "teacher"))) &&
      (await allInSchool(Grade, req, newLevel.grades)) &&
      (newLevel.department === undefined ||
        (await allInSchool(Department, req, newLevel.department)));
    if (!referencesOk) return res.status(403).json(FORBIDDEN);

    const level = await Level.create({
      ...newLevel,
      school: schoolOf(req),
      createdBy: getPrincipal(req).id,
    });

    if (_.isEmpty(level)) {
      return res.status(404).json("Error creating new levels.Try again later");
    }

    res.status(201).json("New Level created successfully!!!");
  })
);
//@POST add new level to current school session
router.post(
  "/many",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { session, term, levels } = req.body || {};

    if (
      !Array.isArray(levels) ||
      levels.length === 0 ||
      levels.length > MAX_BATCH ||
      !(await sessionTermOk(req, session, term)) ||
      !(await allInSchool(
        Level,
        req,
        levels.filter((l) => l?.importStudents).map((l) => l?.previousLevelId)
      ))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    const existingLevels = await Level.find({
      school: req.user.school,
      session,
      term,
      level: {
        $in: _.map(levels, (level) => ({
          name: level.name,
          type: level.type,
          initials: level.initials,
        })),
      },
    }).select(["level", "school", "session", "term"]);

    if (!_.isEmpty(existingLevels)) {
      return res.status(400).json({
        isDuplicateError: true,
        message: `Some Levels already exist.Please check and try again.`,
        data: _.map(existingLevels, "levelName"),
      });
    }

    const modifiedLevels = levels.map(async (level) => {
      if (!_.isEmpty(level?.previousLevelId) && level?.importStudents) {
        const previousLevel = await Level.findOne({
          _id: level?.previousLevelId,
          school: req.user.school,
        }).select(["students"]);
        const newLevel = await Level.create({
          school: req.user.school,
          session,
          term,
          level: {
            name: level.name,
            type: level.type,
            initials: level.initials,
          },
          initials: level.initials,
          students: previousLevel?.students || [],
          createdBy: req.user?.id,
        });
        await Student.updateMany(
          {
            school: req.user.school,
            _id: {
              $in: previousLevel?.students,
            },
          },
          {
            $set: {
              level: newLevel?._id,
            },
          }
        );
        return newLevel;
      } else {
        const newLevel = await Level.create({
          school: req.user.school,
          level: {
            name: level.name,
            type: level.type,
            initials: level.initials,
          },
          initials: level.initials,
          session,
          term,
          createdBy: req.user?.id,
        });

        return newLevel;
      }
    });

    const newLevels = await Promise.all(modifiedLevels);

    if (_.isEmpty(newLevels)) {
      return res.status(404).json("Error creating new levels.Try again later");
    }

    res.status(201).json("News Level created successfully!!!");
  })
);

router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const updatedLevel = req.body || {};
    if (
      !isValidObjectId(updatedLevel._id) ||
      (updatedLevel.teacher != null &&
        !(await staffInSchool(req, updatedLevel.teacher, "teacher")))
    ) {
      return res.status(404).json("Error updating level info.Try again later");
    }

    const level = await Level.findOneAndUpdate(
      { _id: updatedLevel._id, school: schoolOf(req) },
      {
        $set: {
          level: updatedLevel?.level,
          teacher: updatedLevel?.teacher,
        },
      },
      {
        new: true,
      }
    );

    if (_.isEmpty(level)) {
      return res.status(404).json("Error updating level info.Try again later");
    }

    res.status(201).json("Level details updated successfully!!!");
  })
);

router.put(
  "/grade",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { levels, grade } = req.body || {};

    if (
      !Array.isArray(levels) ||
      levels.length === 0 ||
      !isValidObjectId(grade) ||
      !(await allInSchool(Level, req, levels)) ||
      !(await allInSchool(Grade, req, grade))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    const level = await Level.updateMany(
      {
        school: schoolOf(req),
        _id: {
          $in: levels,
        },
      },
      {
        $set: {
          grades: new ObjectId(grade),
        },
      },
      {
        new: true,
      }
    );

    if (_.isEmpty(level)) {
      return res.status(404).json("Error assigning grades.Try again later");
    }

    res.status(201).json("Grades Assigned Successfully!!!");
  })
);

router.delete(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.query;
    const deletedLevel = isValidObjectId(id)
      ? await Level.findOneAndDelete({ _id: id, school: schoolOf(req) })
      : null;

    if (_.isEmpty(deletedLevel)) {
      return res.status(404).json("Error removing level info.Try again later");
    }

    res.status(201).json(" Level has been removed successfully!!!");
  })
);

// Used to pass the request body straight to `deleteMany` as the filter, so a body
// without `ids` (the admin client sends a bare array) matched, and deleted, EVERY
// level of EVERY school. Now: a list of level ids of the caller's school, nothing else.
router.post(
  "/delete/many",
  adminOnly,
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body) ? req.body : req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => isValidObjectId(id))) {
      return res.status(404).json("Error removing levels info.Try again later");
    }

    const deletedLevels = await Level.deleteMany({
      _id: { $in: ids },
      school: schoolOf(req),
    });

    if (!deletedLevels?.deletedCount) {
      return res.status(404).json("Error removing levels info.Try again later");
    }

    res.status(201).json(" Levels Removed!");
  })
);

////////////......................SUBJECTS........................\\\\\\\\\\\\\\

//@POST add new subjects to current level

router.put(
  "/subject",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { levelId, subjects } = req.body || {};

    if (!Array.isArray(subjects) || !(await levelInSchool(req, levelId))) {
      return res.status(404).send("Error creating new Subjects.Try again later");
    }
    for (const subject of subjects) {
      if (!(await subjectInSchool(req, subject))) return res.status(403).json(FORBIDDEN);
    }

    const newSubjects = await Level.findOneAndUpdate(
      { _id: levelId, school: schoolOf(req) },
      { subjects: _.map(subjects, (subject) => new ObjectId(subject)) }
    );
    if (_.isEmpty(newSubjects)) {
      return res
        .status(404)
        .send("Error creating new Subjects.Try again later");
    }

    res.status(201).json("New Courses Added !!!");
  })
);

//@GET Teacher current level
router.post(
  "/assign-teacher",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { sessionId, termId, teacher } = req.body || {};
    const principal = getPrincipal(req);

    if (!(await sessionTermOk(req, sessionId, termId)) || !isValidObjectId(teacher)) {
      return res.status(403).json(FORBIDDEN);
    }
    // a teacher can look up only their own class
    if (authzEnabled() && principal.role === "teacher" && teacher !== principal.id) {
      return res.status(403).json(FORBIDDEN);
    }

    // (`level` is an embedded object, not a reference, so it is not populated)
    const level = await Level.findOne({
      school: principal.schoolId,
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
      teacher: new ObjectId(teacher),
    });

    const modifiedLevel = {
      _id: level?._id || "",
      type: level ? `${level.level?.name}${level.level?.type}` : "",
    };

    res.status(200).json(modifiedLevel);
  })
);

//@PUT Assign a Teacher
router.put(
  "/assign-teacher",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id, teacher } = req.body || {};

    if (!(await staffInSchool(req, teacher, "teacher"))) {
      return res.status(400).json("Error assigning Level.Try again later");
    }

    const isLevelAssigned = isValidObjectId(_id)
      ? await Level.findOne({ _id, school: schoolOf(req) }).populate({
          path: "teacher",
          select: ["firstname", "lastname", "profile"],
        })
      : null;

    if (!isLevelAssigned) {
      return res.status(400).json("Error assigning Level.Try again later");
    }

    if (!_.isEmpty(isLevelAssigned.teacher)) {
      return res
        .status(400)
        .json(`Level already assigned to ${isLevelAssigned.teacher?.fullname}`);
    }

    const level = await Level.findOneAndUpdate(
      { _id, school: schoolOf(req) },
      {
        $set: {
          teacher,
        },
      },
      {
        new: true,
      }
    );

    if (_.isEmpty(level)) {
      return res.status(400).json("Error assigning Level.Try again later");
    }

    const notification = {
      user: teacher,
      school: req.user.school,
      session: isLevelAssigned?.session,
      term: isLevelAssigned?.term,
      type: "Information",
      title: `Level Assignment - ${level?.levelName}`,
      description: `You have been assigned to ${level?.levelName} as Form Master.`,
      album: null,
      link: "/course/level",
      createdBy: req.user.id,
    };

    await Notification.create(notification);

    const teacherUser = await User.findById(teacher);

    const body = {
      title: `Level Assignment - ${level?.levelName}`,
      message: `Dear ${teacherUser?.firstname} ${teacherUser?.lastname}, You have been assigned to ${level?.levelName} as Form Master. Please login to your dashboard to view more details.`,
    };

    await sendMail(body, teacherUser?.email);

    res.status(201).json("Level has been assigned successfully!!!");
  })
);

router.put(
  "/unassign-teacher",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = req.query.id;
    const level = isValidObjectId(id)
      ? await Level.findOneAndUpdate(
          { _id: id, school: schoolOf(req) },
          { $set: { teacher: null } }
        )
      : null;

    if (_.isEmpty(level)) {
      return res.status(404).json("Error updating info.Try again later");
    }

    // nobody was assigned, so there is nobody to tell
    if (!level.teacher) {
      return res.status(201).json("Changes Saved!!!");
    }

    const notification = {
      user: level?.teacher,
      school: req.user.school,
      session: level?.session,
      term: level?.term,
      type: "Information",
      title: "Level Unassignment",
      description: `You have been unassigned from ${level?.levelName} as Form Master. If this is a mistake, please contact the administrator.`,
      album: null,
      link: "/course/level",
      createdBy: req.user.id,
    };

    await Notification.create(notification);

    const teacherUser = await User.findById(level?.teacher);

    const body = {
      title: "Level Unassignment",
      message: `Dear ${teacherUser?.firstname} ${teacherUser?.lastname}, You have been unassigned from ${level?.levelName} as Form Master. If this is a mistake, please contact the administrator.`,
    };

    await sendMail(body, teacherUser?.email);

    res.status(201).json("Changes Saved!!!");
  })
);

// Birthdays

router.get(
  "/recent/birthday",
  requireMember,
  asyncHandler(async (req, res) => {
    const targetDate = new Date();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    // return res.status(200).json([]);

    const students = await Student.find({
      school: getPrincipal(req).schoolId,
      $expr: {
        $and: [
          { $eq: [{ $month: { $toDate: "$dateofbirth" } }, month + 1] }, // +1 since JS months are 0-based
          { $eq: [{ $dayOfMonth: { $toDate: "$dateofbirth" } }, day] },
        ],
      },
      active: true,
    });

    const bds = students.map((student) => {
      return {
        _id: student?._id,
        profile: student?.profile,
        fullname: student?.fullName,
        dob: student?.dateofbirth,
      };
    });

    res.status(200).json(bds);
  })
);

module.exports = router;
