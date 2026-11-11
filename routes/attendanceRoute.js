const router = require("express").Router();
const _ = require("lodash");
const moment = require("moment");
const asyncHandler = require("express-async-handler");
const Attendance = require("../models/attendanceModel");
const Level = require("../models/levelModel");
const User = require("../models/userModel");
const Term = require("../models/termModel");
const {
  Types: { ObjectId },
} = require("mongoose");
const { isWeekend } = require("../config/helper");
const {
  requireStaff,
  getPrincipal,
  authzEnabled,
  pickFields,
} = require("../middlewares/authorize");
const {
  requireLevelAccess,
  requireAttendanceAccess,
  accessibleLevelIds,
} = require("../middlewares/access");
const Student = require("../models/studentModel");
const { isValidObjectId } = require("mongoose");
const { withPagination } = require("../common/pagination");
const { termInSchool, sessionInSchool } = require("../middlewares/tenant");

// Attendance has no `school` field (audit D-1): ownership comes from its level.
// Staff reach it only through levels they may work with (administrator: the whole
// school; teacher: their own levels). The student portal reads one route below.
const levelFromBody = (req) => req.body?.level;
const levelFromParams = (req) => req.params.id;

//@GET All school Attendance
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const levels = await accessibleLevelIds(req);
    const filter = { active: true, level: { $in: levels } };
    const attendance = await withPagination(
      req,
      res,
      Attendance.find(filter).sort({ _id: 1 }),
      () => Attendance.countDocuments(filter)
    );
    if (_.isEmpty(attendance)) {
      return res.status(200).json([]);
    }

    res.status(200).json(attendance);
  })
);

//@GET School Attendance History
router.get(
  "/level/:id",
  asyncHandler(async (req, res) => {
    const user = req.user;
    const principal = getPrincipal(req);
    // const { date, session, term } = req.query;

    const term = await Term.findOne({
      school: user?.school,
      active: true,
    }).select(["session", "from", "to", "name", "term"]);

    if (!term) return res.status(200).json([]);

    // Only attendance of the caller's own school (it used to be every school's).
    let levels;
    let ownId;
    if (principal.kind === "student") {
      // The student portal calls this route (audit 13.2): a student sees their own
      // level, and only their own entry in each register.
      const student = await Student.findOne({ _id: principal.id, school: principal.schoolId }).select("level");
      levels = student?.level ? [student.level] : [];
      ownId = principal.id;
    } else if (principal.kind === "staff") {
      levels = await accessibleLevelIds(req);
    } else {
      return res.status(403).json("You do not have permission to perform this action.");
    }

    const attendance = await Attendance.find({
      date: {
        $gte: new Date(term.from),
        $lte: new Date(term.to),
      },
      level: { $in: levels },
      active: true,
    });

    if (ownId && authzEnabled()) {
      const own = attendance.map((record) => {
        const doc = record.toObject();
        doc.status = (doc.status || []).filter((entry) => String(entry?._id) === ownId);
        return doc;
      });
      return res.status(200).json(own);
    }

    res.status(200).json(attendance);
  })
);
//@GET School Attendance History
router.get(
  "/history/:id",
  requireStaff,
  requireLevelAccess(levelFromParams),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { session, term } = req.query;
    // //console.log(id, date);
    if (!isValidObjectId(session) || !isValidObjectId(term)) return res.status(200).json([]);

    const attendance = await Attendance.find({
      session,
      term,
      level: new ObjectId(id),
      active: true,
    });

    // One lookup for every creator (it was one query per register)
    const creators = await User.find({
      _id: { $in: _.uniq(attendance.map((a) => String(a.createdBy)).filter(isValidObjectId)) },
    }).select(["firstname", "lastname"]);
    const creatorById = new Map(creators.map((u) => [String(u._id), u]));

    const attendances = attendance.map(({ _id, status, date, createdBy }) => {
      const user = creatorById.get(String(createdBy));
      return {
        _id,
        date,
        present: _.filter(status, ({ status }) => status === "Present").length,
        absent: _.filter(status, ({ status }) => status === "Absent").length,
        createdBy: {
          id: user?._id,
          name: user?.fullname,
        },
      };
    });
    const attendanceHistory = _.orderBy(attendances, "date", "desc");

    res.status(200).json(attendanceHistory);
  })
);
// --- registers are keyed by class + calendar day --------------------------------
// The three writers used different date formats and keys ({session,term,level,date}
// versus {level,date}, Date versus "YYYY-MM-DD"), so one day could get several registers.
// Every route now finds the register by class and the UTC day, and stores midnight UTC.
const dayRange = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const start = moment.utc(parsed).startOf("day");
  return { start: start.toDate(), end: start.clone().add(1, "day").toDate() };
};

const findRegister = (level, range) =>
  Attendance.findOne({ level, date: { $gte: range.start, $lt: range.end } });

const MAX_STATUS_LENGTH = 20;

// Entries must be students of this class; their names come from the server, not the client.
const cleanEntries = async (levelId, entries) => {
  if (!Array.isArray(entries) || entries.length > 1000) return null;
  const level = await Level.findById(levelId)
    .populate({ path: "students", select: "firstname surname othername gender" })
    .select("students");
  const roster = new Map((level?.students || []).filter(Boolean).map((s) => [String(s._id), s]));

  const clean = [];
  for (const entry of entries) {
    const student = roster.get(String(entry?._id));
    const status = entry?.status ?? "";
    if (!student || typeof status !== "string" || status.length > MAX_STATUS_LENGTH) return null;
    clean.push({
      _id: student._id,
      fullName: student.fullName,
      gender: student.gender,
      status,
    });
  }
  return clean;
};

const mergeEntries = (existing, incoming) =>
  _.values(_.keyBy([...(existing || []), ...incoming], (entry) => String(entry._id)));

// A register belongs to the caller's school through its term and session.
const termAndSessionOk = async (req, term, session) =>
  (await termInSchool(req, term)) && (await sessionInSchool(req, session));

const MAX_DAYS_AHEAD = 1;

// Shared by the two save routes. `merge`: keep entries already saved for students not in
// the request (the per-student route); otherwise the request replaces the whole register.
const saveRegister = (merge) =>
  asyncHandler(async (req, res) => {
    const { date, level, status, session, term } = req.body;

    const range = dayRange(date);
    if (!range) return res.status(400).json("A valid date is required.");
    if (range.start > moment.utc().add(MAX_DAYS_AHEAD, "day").toDate()) {
      return res.status(400).json("Attendance cannot be taken for a future date.");
    }
    if (!(await termAndSessionOk(req, term, session))) {
      return res.status(403).json("You do not have permission to perform this action.");
    }
    const entries = await cleanEntries(level, status);
    if (!entries) return res.status(400).json("Attendance entries must be students of this class.");

    const existing = await findRegister(level, range);
    if (!existing) {
      await Attendance.create({
        session,
        term,
        level,
        date: range.start,
        status: entries,
        createdBy: req.user.id,
        active: true,
      });
      return res.status(merge ? 200 : 201).json(merge ? "Attendance Saved!" : "Attendance saved Successfully!!!");
    }

    await Attendance.updateOne(
      { _id: existing._id },
      { $set: { status: merge ? mergeEntries(existing.status, entries) : entries, active: true } }
    );
    return res.status(201).json("Attendance saved Successfully!!!");
  });

//@GET School Attendance by id
router.get(
  "/:id",
  requireStaff,
  requireLevelAccess(levelFromParams),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, session, term } = req.query;

    const range = dayRange(date);
    if (!range) return res.status(400).json("A valid date is required.");

    const attendance = await findRegister(id, range);

    if (_.isEmpty(attendance)) {
      if (isWeekend(range.start)) {
        return res.status(200).json({
          level: id,
          date,
          status: [],
        });
      }

      if (!(await termAndSessionOk(req, term, session))) {
        return res.status(403).json("You do not have permission to perform this action.");
      }

      //Select students from the level with this id
      const level = await Level.findById(id).populate({
        path: "students",
        match: { active: true },
      });

      const students = (level?.students || []).map((student) => {
        return {
          _id: student?._id,
          fullName: student?.fullName,
          gender: student?.gender,
          status: "",
        };
      });

      // A blank register is created the first time a day is opened (inactive until saved).
      const savedAttendance = await Attendance.create({
        session,
        term,
        level: id,
        date: range.start,
        status: students,
        createdBy: req.user.id,
      });
      return res.status(200).json(savedAttendance);
    }

    res.status(200).json(attendance);
  })
);

//Add new School Attendance (replaces the day's register)
router.post("/", requireStaff, requireLevelAccess(levelFromBody), saveRegister(false));

//Add or update individual students in the day's register
router.post("/student", requireStaff, requireLevelAccess(levelFromBody), saveRegister(true));

//@PUT Update Existing School Attendance
router.put(
  "/",
  requireStaff,
  requireAttendanceAccess((req) => req.body?.id),
  asyncHandler(async (req, res) => {
    // Only the register itself can change; not its level, term, session or date.
    const changes = pickFields(req.body, ["status", "active"]);
    if ("status" in changes) {
      const entries = await cleanEntries(req.attendance.level, changes.status);
      if (!entries) return res.status(400).json("Attendance entries must be students of this class.");
      changes.status = entries;
    }
    if ("active" in changes && typeof changes.active !== "boolean") {
      return res.status(400).json("Invalid value for active.");
    }

    const modifiedAttendance = await Attendance.findByIdAndUpdate(
      req.attendance._id,
      { $set: changes }
    );

    if (_.isEmpty(modifiedAttendance)) {
      return res
        .status(404)
        .send("Error updating attendance info.Try again later");
    }

    res
      .status(201)
      .json("Attendance information has been updated successfully!!!");
  })
);

router.delete(
  "/:id",
  requireStaff,
  requireAttendanceAccess(levelFromParams),
  asyncHandler(async (req, res) => {
    const id = req.attendance._id;
    const deletedAttendance = await Attendance.findByIdAndUpdate(id, {
      $set: {
        active: false,
      },
    });

    if (_.isEmpty(deletedAttendance)) {
      return res
        .status(404)
        .json("Error removing attendance info.Try again later");
    }

    res.status(201).json(" Attendance removed successfully!!!");
  })
);

// router.delete(
//   "/:id",
//   asyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const deletedAttendance = await Attendance.findByIdAndDelete(id);

//     if (_.isEmpty(deletedAttendance)) {
//       return res
//         .status(404)
//         .json("Error removing attendance info.Try again later");
//     }

//     res.status(201).json(" Attendance have been removed successfully!!!");
//   })
// );

module.exports = router;
