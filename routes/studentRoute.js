const router = require("express").Router();
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

const upload = createImageUpload("students");

//@GET All students
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const students = await Student.find({
      school: req.user.school,
    });
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
  asyncHandler(async (req, res) => {
    const { sessionId, termId } = req.query;
    const terms = await Term.find({
      session: new ObjectId(sessionId),
    }).select(["term", "academicYear"]);

    const modifiedTerms = _.map(terms, ({ term, academicYear }) => ({
      term,
      academicYear,
      student: 0,
    }));

    const allLevels = await Level.find({
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
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    const { details } = req.body;

    const studentDetails = JSON.parse(details);
    const { session, personal, medical, academic, parent } = studentDetails;

    const doesStudentExists = await Student.findOne({
      indexnumber: personal?.indexnumber,
    }).select("indexnumber");

    if (!_.isEmpty(doesStudentExists)) {
      return res.status(400).json("Index Number already exist!");
    }

    let studentPhoto =
      "https://firebasestorage.googleapis.com/v0/b/fir-system-54b99.appspot.com/o/download.png?alt=media&token=c3f23cd6-8973-4681-9900-98dbadc93d2a";
    if (req.file) {
      const filename = req.file?.filename;
      studentPhoto = await uploadFile(filename, "students/");
    }

    //Add new Student
    const student = await Student.create({
      profile: studentPhoto,
      indexnumber: personal?.indexnumber,
      firstname: personal?.firstname,
      surname: personal?.surname,
      othername: personal?.othername,
      dateofbirth: personal?.dateofbirth,
      gender: personal?.gender,
      email: personal?.email,
      phonenumber: personal?.phonenumber,
      address: personal?.address,
      residence: personal?.residence,
      nationality: personal?.nationality,
      medical,
      academic,
      school: req.user.school,
      createdBy: req.user.id,
      level: academic?.level?._id,
    });

    if (_.isEmpty(student)) {
      return res.status(404).json("Error adding student info.Try again later");
    }
    const hashedPassword = await bcrypt.hash(
      personal?.phonenumber || personal?.indexnumber,
      10
    );

    //Save student auth
    const studentAuth = new StudentAuth({
      _id: student._id,
      id: student._id,
      indexnumber: personal?.indexnumber,
      email: personal?.email,
      phonenumber: personal?.phonenumber,
      password: hashedPassword,
      school: req.user.school,
    });
    const savedStudentAuth = await studentAuth.save();

    if (_.isEmpty(savedStudentAuth)) {
      return res.status(404).json("Error adding student info.Try again later");
    }

    //Add Student to current class
    const level = await Level.findByIdAndUpdate(
      academic.level?._id,
      { $push: { students: student?._id } },
      { new: true }
    );

    const stud = {
      session: session?.sessionId,
      term: session?.termId,
      level: level?._id,
      student: student._id,
      school: req.user.school,
      createdBy: req.user.id,
    };
    //create exams details for student
    await Examination.create(stud);
    await CurrentFee.create(stud);

    const modifiedParents = parent.map((par) => ({
      ...par,
      student: student._id,
      school: req.user.school,
    }));

    await Parent.insertMany(modifiedParents);

    res.status(200).json(student?._id);
  })
);

//@PUT students
router.post(
  "/many",
  asyncHandler(async (req, res) => {
    const { session, students, type } = req.body;

    const indexNumbers = _.compact(_.map(students, "indexnumber"));
    const existingStudents = await Student.find({
      school: req.user.school,
      indexnumber: {
        $in: indexNumbers,
      },
    }).select("indexnumber");

    if (!_.isEmpty(existingStudents)) {
      return res.status(400).json({
        isDuplicateError: true,

        message: `ID of some students already exist.Please check and try again.`,
        data: _.map(existingStudents, "indexnumber"),
      });
    }

    let studentIds = _.map(students, "_id");

    if (type === "file") {
      const modifiedStudents = students?.map((student) => {
        return {
          ...student,
          school: req.user.school,
          createdBy: req.user.id,
          level: session.levelId,
        };
      });
      const newStudents = await Student.create(modifiedStudents);

      const studentAuths = newStudents.map((student) => {
        const hashedPassword = bcrypt.hashSync(
          student?.phonenumber || student?.indexnumber,
          10
        );
        return {
          _id: student._id,
          id: student._id,
          indexnumber: student?.indexnumber,
          email: student?.email,
          phonenumber: student?.phonenumber,
          password: hashedPassword,
          school: req.user.school,
          level: session.levelId,
        };
      });

      await StudentAuth.insertMany(studentAuths);

      if (_.isEmpty(newStudents)) {
        return res
          .status(404)
          .json("Error adding student info.Try again later.");
      }

      studentIds = _.map(newStudents, "_id");
    }

    //Add Students to current class
    await Level.findByIdAndUpdate(
      session.levelId,
      {
        $push: { students: studentIds },
      },
      { new: true }
    );

    //Create Exams and fees details for each inserted Student
    const studentDetails = studentIds.map((student) => {
      return {
        session: session.sessionId,
        term: session.termId,
        level: session.levelId,
        student: student,
        createdBy: req.user.id,
      };
    });

    await Examination.insertMany(studentDetails);
    await CurrentFee.insertMany(studentDetails);

    res.status(200).json("Student Information Saved!!!");
  })
);

//@PUT students
router.put(
  "/",
  asyncHandler(async (req, res) => {
    const id = req.body._id;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(403)
        .json("Error updating student info.Try again later.");
    }

    const modifiedStudent = req.body;
    let updatedStudent = null;
    if (req.body?.type === "medical") {
      updatedStudent = await Student.findByIdAndUpdate(id, {
        $set: {
          medical: modifiedStudent.medical,
        },
      });
    }
    if (req.body?.type === "academic") {
      updatedStudent = await Student.findByIdAndUpdate(
        id,
        {
          $set: {
            academic: modifiedStudent?.academic,
            level: modifiedStudent?.level,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      if (updatedStudent.level !== modifiedStudent?.level) {
        await Level.findByIdAndUpdate(
          modifiedStudent?.level,
          { $push: { students: id } },
          { new: true }
        );
      }
    } else {
      updatedStudent = await Student.findByIdAndUpdate(id, modifiedStudent, {
        upsert: true,
        new: true,
      });

      await StudentAuth.findOneAndUpdate(
        { indexnumber: updatedStudent?.indexnumber },
        {
          email: updatedStudent?.email,
          phonenumber: updatedStudent?.phonenumber,
        }
      );
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
  upload.single("profile"),
  asyncHandler(async (req, res) => {
    const { _id } = req.body;

    if (_.isEmpty(req.file)) {
      return res.status(400).json("Please upload a file");
    }

    const filename = req.file?.filename;
    const studentPhoto = await uploadFile(filename, "students/");

    const updatedStudent = await Student.findByIdAndUpdate(_id, {
      $set: {
        profile: studentPhoto,
      },
    });

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
  upload.array("profile", 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json("No files uploaded");
    }

    const uploadedUrls = await uploadMultipleImages(req.files, "students/");

    const updatedStudents = uploadedUrls?.map(async (student) => {
      return await Student.findOneAndUpdate(
        {
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
  asyncHandler(async (req, res) => {
    const { id, active } = req.query;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(403)
        .json("Error updating student info.Try again later.");
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        $set: { active: active === "Yes" ? false : true },
      },
      {
        upsert: true,
        new: true,
      }
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
router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const id = req.query.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.json({
        error: true,
        message: "Invalid Student id",
      });
    }

    const student = await Student.findByIdAndDelete(id);
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
