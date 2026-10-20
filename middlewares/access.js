const { isValidObjectId } = require("mongoose");
const Level = require("../models/levelModel");
const Course = require("../models/courseModel");
const Examination = require("../models/examinationModel");
const Attendance = require("../models/attendanceModel");
const Student = require("../models/studentModel");
const { getPrincipal, authzEnabled } = require("./authorize");

/**
 * Tenant and teacher-scope access for level-based data (results, attendance).
 *
 * Two layers, deliberately separate:
 *  - tenant check (the level / student / record belongs to the caller's school):
 *    ALWAYS enforced;
 *  - role and teacher-scope rules: skipped when ENFORCE_AUTHZ=false (rollback).
 *
 * Teacher rule (owner decision 2026-10-12): a teacher works only with levels they
 * are the class teacher of (`Level.teacher`) or teach a course in (`Course.teacher`).
 * A class teacher has the whole level; a course teacher only their own subjects.
 * Administrators have every level of their school.
 */
const FORBIDDEN = "You do not have permission to perform this action.";
const DENY = { ok: false };

const FULL = (level) => ({ ok: true, full: true, subjectIds: null, level });

/** Resolve what the caller may do on a level. */
const levelAccess = async (req, levelId) => {
  const principal = getPrincipal(req);
  if (!principal.schoolId || !levelId || !isValidObjectId(levelId)) return DENY;

  const level = await Level.findOne({ _id: levelId, school: principal.schoolId }).select("teacher");
  if (!level) return DENY;

  if (!authzEnabled()) return FULL(level);
  if (principal.role === "administrator") return FULL(level);

  if (principal.role === "teacher") {
    if (level.teacher && String(level.teacher) === principal.id) return FULL(level);
    const subjects = await Course.find({
      level: levelId,
      teacher: principal.id,
      school: principal.schoolId,
      active: true,
    }).distinct("subject");
    if (subjects.length > 0) {
      return { ok: true, full: false, subjectIds: new Set(subjects.map(String)), level };
    }
  }
  return DENY;
};

/** Every level id the caller may work with (for list endpoints). */
const accessibleLevelIds = async (req) => {
  const principal = getPrincipal(req);
  if (!principal.schoolId) return [];
  const inSchool = { school: principal.schoolId };

  if (!authzEnabled() || principal.role === "administrator") {
    return Level.find(inSchool).distinct("_id");
  }
  if (principal.role === "teacher") {
    const [classLevels, courseLevels] = await Promise.all([
      Level.find({ ...inSchool, teacher: principal.id }).distinct("_id"),
      Course.find({ ...inSchool, teacher: principal.id, active: true }).distinct("level"),
    ]);
    const seen = new Map();
    [...classLevels, ...courseLevels].forEach((id) => seen.set(String(id), id));
    return [...seen.values()];
  }
  return [];
};

/** True when the access covers every one of the given subject ids. */
const canGradeSubjects = (access, subjectIds) => {
  if (!access?.ok) return false;
  if (access.full) return true;
  return subjectIds.every((id) => id && access.subjectIds.has(String(id)));
};

const guard = (resolve, { full = false } = {}) => async (req, res, next) => {
  try {
    const access = await resolve(req);
    if (!access?.ok || (full && !access.full)) {
      return res.status(403).json(FORBIDDEN);
    }
    req.levelAccess = access;
    next();
  } catch (error) {
    next(error);
  }
};

/** Middleware: the level named by `getLevelId(req)` must be accessible. */
const requireLevelAccess = (getLevelId, options) =>
  guard((req) => levelAccess(req, getLevelId(req)), options);

/** Middleware: the examination record named by `getExamId(req)` must be accessible. */
const requireExamAccess = (getExamId, options) =>
  guard(async (req) => {
    const id = getExamId(req);
    if (!id || !isValidObjectId(id)) return DENY;
    const exam = await Examination.findById(id).select("level student");
    if (!exam) return DENY;
    const access = await levelAccess(req, exam.level);
    if (!access.ok) return DENY;
    req.examination = exam;
    return access;
  }, options);

/** Middleware: the attendance record named by `getId(req)` must be accessible. */
const requireAttendanceAccess = (getId, options) =>
  guard(async (req) => {
    const id = getId(req);
    if (!id || !isValidObjectId(id)) return DENY;
    const record = await Attendance.findById(id).select("level");
    if (!record) return DENY;
    const access = await levelAccess(req, record.level);
    if (access.ok) req.attendance = record;
    return access;
  }, options);

/**
 * Student-centred access. A student may reach only their own record; staff need the
 * student to be in their school; with `teacherScoped` a teacher additionally needs
 * access to the student's level (use it for results, not for the student list).
 */
const requireStudentAccess = (getStudentId, { teacherScoped = false } = {}) =>
  async (req, res, next) => {
    try {
      const principal = getPrincipal(req);
      const studentId = getStudentId(req);
      if (!principal.schoolId || !studentId || !isValidObjectId(studentId)) {
        return res.status(403).json(FORBIDDEN);
      }

      const student = await Student.findOne({ _id: studentId, school: principal.schoolId }).select("level");
      if (!student) return res.status(403).json(FORBIDDEN);

      if (authzEnabled()) {
        if (principal.kind === "student") {
          if (principal.id !== String(studentId)) return res.status(403).json(FORBIDDEN);
        } else if (principal.kind !== "staff") {
          return res.status(403).json(FORBIDDEN);
        } else if (teacherScoped && principal.role === "teacher") {
          const access = await levelAccess(req, student.level);
          if (!access.ok) return res.status(403).json(FORBIDDEN);
        }
      }
      req.student = student;
      next();
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  FORBIDDEN,
  levelAccess,
  accessibleLevelIds,
  canGradeSubjects,
  requireLevelAccess,
  requireExamAccess,
  requireAttendanceAccess,
  requireStudentAccess,
};
