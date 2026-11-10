const router = require("express").Router();
const { withPagination } = require("../common/pagination");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  Types: { ObjectId },
} = require("mongoose");
const _ = require("lodash");
const { createImageUpload } = require("../middlewares/upload");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Parent = require("../models/parentModel");
const Examination = require("../models/examinationModel");
const CurrentFee = require("../models/currentFeeModel");
const Fee = require("../models/feeModel");
const { uploadFile, uploadMultipleImages } = require("../config/uploadFile");
const StudentAuth = require("../models/studentAuthModel");
const { LEVEL_OPTIONS } = require("../config/helper");
const {
  requireStaff,
  requireRoleEnforced,
  pickFields,
} = require("../middlewares/authorize");
const { requireStudentAccess } = require("../middlewares/access");
const { levelInSchool, termInSchool } = require("../middlewares/tenant");
const { createRollback } = require("../common/rollback");

// Students are read by any staff member of their school and managed (created,
// edited, deactivated) by administrators only. A student may read only their own
// record (the student portal calls GET /students/:id).
const adminOnly = requireRoleEnforced("administrator");

const PERSONAL_FIELDS = [
  "profile",
  "firstname",
  "surname",
  "othername",
  "dateofbirth",
  "gender",
  "email",
  "phonenumber",
  "address",
  "residence",
  "nationality",
];
const FORBIDDEN = "You do not have permission to perform this action.";

const STUDENT_ROW_FIELDS = [...PERSONAL_FIELDS, "indexnumber", "medical", "academic"];
const PARENT_FIELDS = [
  "profile", "firstname", "surname", "relationship", "gender",
  "email", "phonenumber", "address", "residence", "nationality",
];
const MAX_IMPORT_ROWS = 1000;
const MAX_PARENTS_PER_STUDENT = 5;
const DEFAULT_PHOTO =
  "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";

const normalizeIndex = (value) => String(value ?? "").trim().toLowerCase();

// Returns a message for the first problem with a student's details, or null. Checked
// before any write so a bad row never leaves a half-created student behind.
const validateStudentRow = (row) => {
  const isText = (v) => typeof v === "string" && v.trim().length > 0;
  if (!isText(row.indexnumber)) return "Index number is required.";
  if (!isText(row.firstname) || !isText(row.surname)) return "First name and surname are required.";
  if (!row.dateofbirth || Number.isNaN(new Date(row.dateofbirth).getTime())) {
    return "A valid date of birth is required.";
  }
  if (!isText(row.gender)) return "Gender is required.";
  if (row.phonenumber && !/^\d{10,15}$/.test(String(row.phonenumber).trim())) {
    return "Phone number must be 10 to 15 digits.";
  }
  if (row.email && !/^\S+@\S+\.\S+$/.test(String(row.email).trim())) {
    return "Invalid email format.";
  }
  return null;
};

const upload = createImageUpload("students");

//@GET All students
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const filter = { school: req.user.school };
    const students = await withPagination(
      req,
      res,
      Student.find(filter).sort({ _id: 1 }), // stable order so pages do not overlap
      () => Student.countDocuments(filter)
    );
    res.json(students);
  })
);
// //@GET All students
// router.get(
//   "/ids",
//   asyncHandler(async (req, res) => {
//     const existingStudents = await Student.find({
//       school: req.user.school,
//     });
//     const students = _.map(existingStudents, "indexnumber");
//     res.json(students);
//   })
// );

//@GET All students details
router.get(
  "/details",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { sessionId, termId } = req.query;
    const terms = await Term.find({
      school: req.user.school,
      session: new ObjectId(sessionId),
    }).select(["term", "academicYear"]);

    const modifiedTerms = _.map(terms, ({ term, academicYear }) => ({
      term,
      academicYear,
      student: 0,
    }));

    const allLevels = await Level.find({
      school: req.user.school,
      session: new ObjectId(sessionId),
    })
      .populate("term", ["term", "academicYear"])
      .select(["level", "students"]);

    //group students into terms
    const groupedLevels = _.groupBy(allLevels, "term.term");

    const groupedTerms = Object.values(groupedLevels).map((level) => {
      return level.flatMap(({ term: { term, academicYear }, noOfStudents }) => {
        return {
          academicYear,
          term,
          noOfStudents,
        };
      });
    });

    //No of students for each term

    const noOfStudents = groupedTerms.map((term) => {
      return {
        academicYear: term[0].academicYear,
        term: term[0].term,
        student: _.sumBy(term, "noOfStudents"),
      };
    });

    //Students in each term
    const students = _.values(
      _.merge(_.keyBy([...modifiedTerms, ...noOfStudents], "term"))
    );

    //Current Students in current sessions
    const currentStudents = await Level.find({
      school: req.user.school,
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
    })
      .populate({
        path: "students",
        match: { active: true },
      })
      .select("level");

    const maleStudents = [];
    const femaleStudents = [];

    //Get number of males and females
    const modifiedStudents = currentStudents.flatMap(
      ({ _id, levelName, students }) => {
        return students.map((student) => {
          if (student.gender === "male") {
            maleStudents.push(student);
          }
          if (student.gender === "female") {
            femaleStudents.push(student);
          }
          student._doc.fullName = _.startCase(
            `${student?.surname} ${student?.firstname} ${student?.othername}`
          );
          student._doc.levelName = levelName;
          student._doc.levelId = _id;

          return student;
        });
      }
    );

    //Get all recently added students
    const recentStudents = _.take(
      _.orderBy(modifiedStudents, "createdAt", "desc"),
      10
    );

    //Get total no of students in each class
    const noOfStudentsInEachLevel = currentStudents.map(
      ({ noOfStudents, levelName }) => {
        return {
          level: levelName,
          students: noOfStudents,
        };
      }
    );

    const noOFStudentsInLevels = noOfStudentsInEachLevel.sort(
      (a, b) =>
        LEVEL_OPTIONS.indexOf(a?.level) - LEVEL_OPTIONS.indexOf(b?.level)
    );

    const details = {
      recentStudents,
      noOfStudentsInEachLevel: noOFStudentsInLevels,
      noOfStudentsForEachTerm: students,
      students: modifiedStudents.length ?? 0,
      males: maleStudents.length ?? 0,
      females: femaleStudents.length ?? 0,
    };

    //console.log(details);

    res.status(200).json(details);
  })
);

//@GET student by student index number
router.get(
  "/index-number",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.query;

    const student = await Student.findOne({
      indexnumber: id,
    });

    if (!_.isEmpty(student)) {
      return res.status(400).json("Index Number already exist!");
    }
    res.sendStatus(204);
  })
);

//@GET student by student id
router.get(
  "/:id",
  requireStudentAccess((req) => req.params.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    //Personal Info
    const student = await Student.findById(id).populate("level", ["level"]);

    if (_.isEmpty(student)) {
      return res.status(400).json("No Such Student exists");
    }
    //School Fees
    const currentFees = await CurrentFee.find({
      student: id,
    })
      .sort({ createdAt: -1 })
      // .populate("student")
      .populate({
        path: "term",
        select: ["term", "academicYear"],
      })
      .populate({
        path: "level",
        select: ["level"],
      })
      .select("payment");

    const modifiedFees = currentFees.map(async (currentFee) => {
      const fee = await Fee.findOne({
        level: currentFee?.level?._id,
        term: currentFee?.term?._id,
      });

      return {
        _id: currentFee?._id,
        academicYear: currentFee?.term?.academicYear,
        term: currentFee?.term?.term,
        levelId: currentFee?.level?._id,
        level: currentFee?.level?.levelName,
        fee: _.sumBy(fee?.amount, "amount"),
        payment: currentFee?.payment,
        paid: _.sumBy(currentFee?.payment, "paid"),
      };
    });

    const allFees = await Promise.all(modifiedFees);
    //Group selected terms in ascending order
    const groupfeesByTerms = _.groupBy(
      _.sortBy(allFees, "term"),
      "academicYear"
    );
    const feesDetails = Object.entries(groupfeesByTerms);

    //Examination
    const examination = await Examination.find({
      student: id,
    })
      .populate("term", ["academicYear", "term"])
      .populate("level", ["level", "subjects"]);

    const modifiedExams = examination.map(({ _id, term, level }) => {
      return {
        _id,
        academicYear: term?.academicYear,
        term: term?.term,
        levelName: level?.levelName,
        subjects: level.subjects,
      };
    });

    //Group selected terms in ascending order
    const groupExamsByTerms = _.groupBy(
      _.sortBy(modifiedExams, "term"),
      "academicYear"
    );
    const examsDetails = Object.entries(groupExamsByTerms);

    //Parents
    const parents = await Parent.find({
      student: id,
    });

    // console.log(student)

    res.status(200).json({
      profile: student || [],
      fees: feesDetails || [],
      exams: examsDetails || [],
      parents: parents || [],
    });
  })
);
//@GET student by student id
router.get(
  "/:id/profile",
  requireStaff,
  requireStudentAccess((req) => req.params.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    //Personal Info
    const student = await Student.findById(id).populate("level", ["level"]);

    if (_.isEmpty(student)) {
      return res.status(400).json("No Such Student exists");
    }

    //Parents
    const parents = await Parent.find({
      student: id,
    });

    res.status(200).json({
      ...student?._doc,
      parents: parents || [],
    });
  })
);

//@GET Parent by student ID
router.get(
  "/:id/parent",
  requireStaff,
  requireStudentAccess((req) => req.query.id),
  asyncHandler(async (req, res) => {
    const { id } = req.query;
    const parent = await Parent.findOne({
      student: new ObjectId(id),
    });

    if (_.isEmpty(parent)) {
      return res.status(200).json({});
    }

    res.json(parent);
  })
);
//@POST students
router.post(
  "/",
  adminOnly,
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    const { details } = req.body;

    let studentDetails;
    try {
      studentDetails = JSON.parse(details);
    } catch (error) {
      return res.status(400).json("Invalid student details");
    }
    const { session, personal, medical, academic, parent } = studentDetails || {};

    // The class and term must belong to the caller's school.
    if (
      !(await levelInSchool(req, academic?.level?._id)) ||
      !(await termInSchool(req, session?.termId))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    // Validate everything before anything is written (or any photo uploaded).
    const row = pickFields(personal || {}, STUDENT_ROW_FIELDS);
    const rowError = validateStudentRow(row);
    if (rowError) return res.status(400).json(rowError);

    const parents = Array.isArray(parent) ? parent : [];
    if (parents.length > MAX_PARENTS_PER_STUDENT) {
      return res.status(400).json("Too many parents/guardians supplied.");
    }

    // Index numbers are unique across every school.
    if (await Student.exists({ indexnumber: normalizeIndex(row.indexnumber) })) {
      return res.status(400).json("Index Number already exist!");
    }

    let studentPhoto = DEFAULT_PHOTO;
    if (req.file) {
      studentPhoto = await uploadFile(req.file?.filename, "students/");
    }

    const created = createRollback();
    try {
      const student = created.track(
        Student,
        await Student.create({
          ...row,
          profile: studentPhoto,
          medical,
          academic,
          school: req.user.school,
          createdBy: req.user.id,
          level: academic?.level?._id,
        })
      );

      created.track(
        StudentAuth,
        await new StudentAuth({
          _id: student._id,
          id: student._id,
          indexnumber: student.indexnumber,
          email: row.email,
          phonenumber: row.phonenumber,
          password: await bcrypt.hash(row.phonenumber || row.indexnumber, 10),
          mustChangePassword: true,
          school: req.user.school,
        }).save()
      );

      const stud = {
        session: session?.sessionId,
        term: session?.termId,
        level: academic.level._id,
        student: student._id,
        school: req.user.school,
        createdBy: req.user.id,
      };
      created.track(Examination, await Examination.create(stud));
      created.track(CurrentFee, await CurrentFee.create(stud));

      if (parents.length) {
        created.track(
          Parent,
          await Parent.insertMany(
            parents.map((par) => ({
              ...pickFields(par || {}, PARENT_FIELDS),
              student: student._id,
              school: req.user.school,
            }))
          )
        );
      }

      // Last step, so there is nothing to un-push if an earlier step failed.
      await Level.findOneAndUpdate(
        { _id: academic.level._id, school: req.user.school },
        { $addToSet: { students: student._id } }
      );

      res.status(200).json(student._id);
    } catch (error) {
      await created.undo();
      throw error;
    }
  })
);

//@POST many students: new students from a file, or existing students added to a class
router.post(
  "/many",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { session, students, type } = req.body || {};

    if (!Array.isArray(students) || students.length === 0 || students.length > MAX_IMPORT_ROWS) {
      return res.status(400).json(`Provide between 1 and ${MAX_IMPORT_ROWS} students.`);
    }
    if (
      !(await levelInSchool(req, session?.levelId)) ||
      !(await termInSchool(req, session?.termId))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    const isFile = type === "file";
    let studentIds;
    let rows = [];

    if (isFile) {
      rows = students.map((s) => pickFields(s || {}, STUDENT_ROW_FIELDS));
      for (let i = 0; i < rows.length; i++) {
        const problem = validateStudentRow(rows[i]);
        if (problem) return res.status(400).json(`Row ${i + 1}: ${problem}`);
      }

      const indexNumbers = rows.map((r) => normalizeIndex(r.indexnumber));
      const repeated = indexNumbers.filter((n, i) => indexNumbers.indexOf(n) !== i);
      // Index numbers are unique across every school, so the check is global.
      const existing = await Student.find({ indexnumber: { $in: indexNumbers } }).select("indexnumber");
      if (existing.length || repeated.length) {
        return res.status(400).json({
          isDuplicateError: true,
          message: `ID of some students already exist.Please check and try again.`,
          data: _.uniq([..._.map(existing, "indexnumber"), ...repeated]),
        });
      }
      studentIds = rows.map(() => new ObjectId());
    } else {
      // Existing students being added to a class must belong to this school.
      studentIds = _.uniq(_.compact(_.map(students, "_id")).map(String));
      const owned = studentIds.every((id) => mongoose.isValidObjectId(id))
        ? await Student.countDocuments({ _id: { $in: studentIds }, school: req.user.school })
        : -1;
      if (studentIds.length === 0 || owned !== studentIds.length) {
        return res.status(403).json(FORBIDDEN);
      }
    }

    const created = createRollback();
    try {
      if (isFile) {
        // Ids are assigned up front and registered before the writes, so a failure
        // part-way through inserts is still fully cleaned up.
        created.trackIds(Student, studentIds);
        created.trackIds(StudentAuth, studentIds);
        const docs = rows.map((row, i) => ({
          ...row,
          _id: studentIds[i],
          school: req.user.school,
          createdBy: req.user.id,
          level: session.levelId,
        }));
        await Student.insertMany(docs);

        const auths = [];
        for (const chunk of _.chunk(docs, 25)) {
          auths.push(
            ...(await Promise.all(
              chunk.map(async (s) => ({
                _id: s._id,
                id: s._id,
                indexnumber: normalizeIndex(s.indexnumber),
                email: s.email,
                phonenumber: s.phonenumber,
                password: await bcrypt.hash(s.phonenumber || normalizeIndex(s.indexnumber), 10),
                mustChangePassword: true,
                school: req.user.school,
                level: session.levelId,
              }))
            ))
          );
        }
        await StudentAuth.insertMany(auths);
      }

      // Existing students may already have this term's records; never duplicate them.
      const already = await Examination.find({
        term: session.termId,
        level: session.levelId,
        student: { $in: studentIds },
      }).select("student");
      const skip = new Set(already.map((e) => String(e.student)));
      const details = studentIds
        .filter((id) => !skip.has(String(id)))
        .map((student) => ({
          session: session.sessionId,
          term: session.termId,
          level: session.levelId,
          student,
          school: req.user.school,
          createdBy: req.user.id,
        }));

      if (details.length) {
        const exams = await Examination.insertMany(details);
        created.track(Examination, exams);
        created.track(CurrentFee, await CurrentFee.insertMany(details));
      }

      // Last step, so there is nothing to un-push if an earlier step failed.
      await Level.findOneAndUpdate(
        { _id: session.levelId, school: req.user.school },
        { $addToSet: { students: { $each: studentIds } } }
      );

      res.status(200).json("Student Information Saved!!!");
    } catch (error) {
      await created.undo();
      throw error;
    }
  })
);

//@PUT students
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = req.body._id;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(403)
        .json("Error updating student info.Try again later.");
    }

    // Only students of the caller's school; no upsert, so this cannot create or
    // move records, and only the fields each kind of edit is meant to change.
    const scope = { _id: id, school: req.user.school };
    const modifiedStudent = req.body;
    let updatedStudent = null;

    if (modifiedStudent?.type === "medical") {
      updatedStudent = await Student.findOneAndUpdate(
        scope,
        { $set: { medical: modifiedStudent.medical } },
        { new: true }
      );
    } else if (modifiedStudent?.type === "academic") {
      if (!(await levelInSchool(req, modifiedStudent?.level))) {
        return res.status(403).json(FORBIDDEN);
      }
      const before = await Student.findOne(scope).select("level");
      updatedStudent = await Student.findOneAndUpdate(
        scope,
        {
          $set: {
            academic: modifiedStudent?.academic,
            level: modifiedStudent?.level,
          },
        },
        { new: true }
      );

      if (updatedStudent && String(before?.level) !== String(modifiedStudent?.level)) {
        await Level.findOneAndUpdate(
          { _id: modifiedStudent?.level, school: req.user.school },
          { $addToSet: { students: id } },
          { new: true }
        );
      }
    } else {
      updatedStudent = await Student.findOneAndUpdate(
        scope,
        { $set: pickFields(modifiedStudent, PERSONAL_FIELDS) },
        { new: true }
      );

      if (updatedStudent) {
        await StudentAuth.findOneAndUpdate(
          { indexnumber: updatedStudent?.indexnumber, school: req.user.school },
          {
            email: updatedStudent?.email,
            phonenumber: updatedStudent?.phonenumber,
          }
        );
      }
    }

    if (_.isEmpty(updatedStudent)) {
      return res
        .status(404)
        .json("Error updating student info.Try again later.");
    }

    res.status(200).json("Changes Saved!!!");
  })
);

//@POST Update Student profile
router.put(
  "/profile",
  adminOnly,
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    const { _id } = req.body;

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a file");
    }

    const filename = req.file?.filename;
    const studentPhoto = await uploadFile(filename, "students/");

    const updatedStudent = mongoose.isValidObjectId(_id)
      ? await Student.findOneAndUpdate(
          { _id, school: req.user.school },
          { $set: { profile: studentPhoto } }
        )
      : null;

    if (_.isEmpty(updatedStudent)) {
      return res
        .status(400)
        .json("Error updating profile image.Try again later.");
    }

    res.status(201).json("Profile image updated!!!");
  })
);

//@POST Update Student bulk profile
router.put(
  "/bulk-profile",
  adminOnly,
  upload.array("profile", 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json("No files uploaded");
    }

    const uploadedUrls = await uploadMultipleImages(req.files, "students/");

    const updatedStudents = uploadedUrls?.map(async (student) => {
      return await Student.findOneAndUpdate(
        {
          school: req.user.school,
          indexnumber: student?.indexnumber,
        },
        {
          $set: {
            profile: student?.url,
          },
        }
      );
    });

    const modifiedStudents = await Promise.all(updatedStudents);

    if (_.isEmpty(modifiedStudents)) {
      return res.status(400).json("Error uploading photos.Try again later.");
    }

    res.status(201).json("Photos updated!!!");
  })
);

//@DISABLE Student account
router.patch(
  "/disable",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id, active } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(403)
        .json("Error updating student info.Try again later.");
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: id, school: req.user.school },
      {
        $set: { active: active === "Yes" ? false : true },
      },
      { new: true }
    );
    if (_.isEmpty(updatedStudent)) {
      return res
        .status(404)
        .json("Error updating student info.Try again later.");
    }

    res
      .status(200)
      .json(
        `Student Account ${updatedStudent?.active ? "Enabled" : "Disabled"}!!!`
      );
  })
);

//@DELETE student
// Owner decision: students are never deleted, only deactivated. This route keeps its
// path and its response (the student record) but deactivates instead of removing, so
// the student's results, fees and attendance stay intact and they can be re-enabled.
router.delete(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = req.query.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.json({
        error: true,
        message: "Invalid Student id",
      });
    }

    const student = await Student.findOneAndUpdate(
      { _id: id, school: req.user.school },
      { $set: { active: false } },
      { new: true }
    );
    if (student === null) {
      return res.json({
        error: true,
        mesaage: "No Student with such id",
      });
    }
    res.json(student);
  })
);

module.exports = router;
