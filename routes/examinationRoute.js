const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const School = require("../models/schoolModel");
const Examination = require("../models/examinationModel");
const Level = require("../models/levelModel");
const Grade = require("../models/gradeModel");
const _ = require("lodash");
const pLimit = require("p-limit");
const moment = require("moment");
const {
  Types: { ObjectId },
} = require("mongoose");
const { sendReportMail } = require("../config/mail/mail2");
const generateTotalGrade = require("../config/generateTotalGrade");
const generateReportTemplate = require("../config/generateReportTemplate");
const generateReport = require("../config/generateReport");
const generateRemarks = require("../config/generateRemarks");
const { convertImageToBase64, SUBJECT_OPTIONS } = require("../config/helper");
const { sendReportSMS } = require("../config/sms/messenger");
const {
  getBestOverallScore,
  getStudentPosition,
  getAveragePerformanceIndex,
  calculatePerformanceIndex,
  getTopSubjects,
  getTopOverallScores,
  getMyPosition,
  getSubjectPosition,
  preparePerformanceIndexChartData,
  getTrend,
} = require("../config/helpers/examination");
const {
  requireStaff,
  getPrincipal,
  authzEnabled,
} = require("../middlewares/authorize");
const {
  FORBIDDEN,
  requireLevelAccess,
  requireExamAccess,
  requireStudentAccess,
  canGradeSubjects,
} = require("../middlewares/access");
const { isValidObjectId } = require("mongoose");

// Results are tenant-scoped through the level (Examination has no `school`, audit
// D-1) and, for teachers, limited to levels they are the class teacher of or teach a
// course in; a course teacher may only touch their own subjects. A student may read
// only their own results (the student portal calls the three GET routes below).
const deny = (res) => res.status(403).json(FORBIDDEN);

// A student may open only their own examination record; staff go through the
// level checks (publishing a report needs the whole level: class teacher/admin).
const examinationRead = async (req, res, next) => {
  try {
    const principal = getPrincipal(req);
    if (principal.kind === "student" && authzEnabled()) {
      if (req.query.publish || !isValidObjectId(req.params.id)) return deny(res);
      const exam = await Examination.findById(req.params.id).select("student level");
      const sameSchool = exam && (await Level.exists({ _id: exam.level, school: principal.schoolId }));
      if (!exam || !sameSchool || String(exam.student) !== principal.id) return deny(res);
      return next();
    }
    return requireStaff(req, res, (err) =>
      err
        ? next(err)
        : requireExamAccess((r) => r.params.id, { full: Boolean(req.query.publish) })(req, res, next)
    );
  } catch (error) {
    next(error);
  }
};

// Subject-level rule for a course teacher on a subject-specific read.
const requireSubjectAccess = (req, res, next) => {
  const access = req.levelAccess;
  if (access && !access.full && !access.subjectIds.has(String(req.query.subject))) {
    return deny(res);
  }
  next();
};

// Examination records addressed by session/term/student are resolved to their id so
// the same record-level checks apply.
const resolveUpdateTarget = async (req, res, next) => {
  try {
    const session = req.body?.session || {};
    if (!session.examsId && session.studentId) {
      const exam = await Examination.findOne({
        session: session.sessionId,
        term: session.termId,
        student: session.studentId,
      }).select("_id");
      if (exam) session.examsId = String(exam._id);
    }
    next();
  } catch (error) {
    next(error);
  }
};

//@GET

router.get(
  "/details",
  requireStaff,
  requireLevelAccess((req) => req.query.level),
  asyncHandler(async (req, res) => {
    const { level } = req.query;

    //GET all Students scores
    const students = await Examination.find({ level })
      .populate({
        path: "level",
        select: ["subjects", "level"],
        populate: {
          path: "subjects",
        },
      })
      .populate({
        path: "student",
        select: [
          "firstname",
          "surname",
          "othername",
          "indexnumber",
          "profile",
          "gender",
          "dateofbirth",
        ],
      })
      .select("overallScore scores");

    if (_.isEmpty(students)) {
      return res.status(200).json({
        noOfStudents: 0,
        highestMarks: 0,
        lowestMarks: 0,
        averageMarks: 0,
        passStudents: 0,
        failStudents: 0,
        students: [],
      });
    }

    const examsDetails = {
      noOfStudents: students.length ?? 0,
      highestMarks: _.maxBy(students, "overallScore").overallScore ?? 0,
      lowestMarks: _.minBy(students, "overallScore").overallScore ?? 0,
      averageMarks: Math.round(
        _.sumBy(students, "overallScore") / students.length ?? 0
      ),
    };

    //FIND Numnber of subjects
    const noOfSubjects = students[0]?.level?.subjects?.length ?? 0;
    //Calculate cumulative marks
    let passMark = (noOfSubjects * 100) / 2;

    const studentsAboveAverage = [];
    const studentsBelowAverage = [];

    students.forEach(({ overallScore }) => {
      if (overallScore >= passMark) {
        studentsAboveAverage.push(overallScore);
      } else {
        studentsBelowAverage.push(overallScore);
      }
    });
    examsDetails.passStudents = studentsAboveAverage.length ?? 0;
    examsDetails.failStudents = studentsBelowAverage.length ?? 0;

    //is Results complete
    const totalTargetResults = Number(noOfSubjects) * students?.length;
    const completedResults = _.sumBy(
      students,
      (student) => student?.scores?.length
    );
    const resultsComplete = parseInt(
      Number(completedResults / totalTargetResults) * 100
    );

    //is Results complete
    const totalOverallScore = _.sumBy(students, "overallScore") ?? 0;
    const totalExpectedScore = Number(noOfSubjects) * students?.length * 100;
    const scorePercentage = parseInt(
      Number(totalOverallScore / totalExpectedScore) * 100
    );

    const selectedStudents = students.map(
      ({ _id, student, level, scores, overallScore }) => {
        return {
          _id: _id,
          studentId: student?._id,
          indexnumber: student?.indexnumber,
          profile: student?.profile || "",
          fullName: student?.fullName,
          gender: student?.gender,
          dateofbirth: student?.dateofbirth,
          level: level?.levelName,
          overallScore,
          entry: {
            completed: scores?.length || 0,
            total: level?.subjects?.length || 0,
            percent: parseInt(
              Number(scores?.length / level?.subjects?.length) * 100
            ),
          },
        };
      }
    );

    res.status(200).json({
      ...examsDetails,
      students: selectedStudents,
      resultsCompleted: resultsComplete,
      scorePercentage,
    });
  })
);

router.get(
  "/reports",
  requireStaff,
  requireLevelAccess((req) => req.query.levelId, { full: true }),
  asyncHandler(async (req, res) => {
    const { sessionId, termId, levelId } = req.query;

    const studentRecords = await Examination.find({
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
      level: new ObjectId(levelId),
    })
      .populate("term")
      .populate({
        path: "level",
        select: ["level", "students", "subjects"],
        populate: {
          path: "subjects",
          select: "name",
        },
      })
      .populate({
        path: "student",
        select: [
          "firstname",
          "surname",
          "othername",
          "indexnumber",
          "email",
          "profile",
        ],
      });

    if (_.isEmpty(studentRecords)) {
      return res.status(200).json([]);
    }

    const subjects = studentRecords[0]?.level?.subjects.sort(
      (a, b) =>
        SUBJECT_OPTIONS.indexOf(a.name) - SUBJECT_OPTIONS.indexOf(b.name)
    );

    const generatedResults = studentRecords.map(async (report) => {
      const position = await getMyPosition(termId, levelId, report?._id);
      //GENERATE STUDENT RESULTS
      const generatedResult = await studentReportDetails(
        report,
        position,
        "preview"
      );
      return generatedResult;
    });

    const results = await Promise.all(generatedResults);

    res.status(200).json({
      subjects,
      results,
    });
  })
);

router.get(
  "/publish",
  requireStaff,
  requireLevelAccess((req) => req.query.levelId, { full: true }),
  asyncHandler(async (req, res) => {
    const publishType = req.query.type || "sms";
    const { sessionId, termId, levelId } = req.query;

    const studentRecords = await Examination.find({
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
      level: new ObjectId(levelId),
    })
      .populate("term")
      .populate({
        path: "level",
        select: ["level", "students", "grades"],
      })
      .populate({
        path: "student",
        select: [
          "firstname",
          "surname",
          "othername",
          "indexnumber",
          "phonenumber",
          "email",
          "profile",
        ],
      });

    if (_.isEmpty(studentRecords)) {
      return res.status(200).json([]);
    }
    const school = await School.findById(req.user.school);

    const scorePreference =
      studentRecords[0]?.term?.exams?.scorePreference?.split("/") || [
        "50",
        "50",
      ];
    const termDetails = {
      report: studentRecords[0]?.term?.report,
      class: scorePreference[0],
      exams: scorePreference[1],
      headmaster: studentRecords[0]?.term?.headmaster,
    };
    school.termDetails = termDetails;

    //CONVERT IMAGE TO BASE64
    let SCHOOL_PHOTO = "";

    if (!_.isEmpty(school)) {
      if (school.badge) {
        SCHOOL_PHOTO = await convertImageToBase64(school.badge);
      }
    }

    school.badge = SCHOOL_PHOTO;

    try {
      //GENERATE STUDENT RESULTS

      const generatedResults = studentRecords.map(async (report) => {
        //GET student position
        const position = await getMyPosition(
          termId,
          levelId,
          studentRecords?._id
        );
        //GENERATE STUDENT RESULTS
        const generatedResult = await studentReportDetails(
          report,
          position,
          "print"
        );
        return generatedResult;
      });

      //WAIT FOR ALL RESULTS TO FINISH
      const mainResults = await Promise.all(generatedResults);

      const results =
        process.env.NODE_ENV === "production"
          ? mainResults
          : _.take(mainResults, 1);

      const limit = pLimit(5);

      //SEND REPORTS TO STUDENT SMS
      if (publishType === "sms") {
        const response = results.map(async (result) => {
          return limit(() => sendReportSMS(result, school));
        });

        await Promise.all(response);

        return res.status(200).json("ok");
      }

      //GENERATE ALL REPORT TEMPLATES
      const allTemplates = results.map(async (result) => {
        try {
          const template = await generateReportTemplate({
            report: result,
            school,
          });

          if (template) {
            return {
              id: result?.report_id,
              template,
            };
          }
        } catch (error) {
          return res.status(404).json(error.message);
        }
      });

      //WAIT FOR ALL TEMPLATES TO FINISH LOADING
      const generatedTemplates = await Promise.all(allTemplates);

      //GENERATE REPORTS
      const generatedReports = generatedTemplates.map((template) => {
        return limit(() => generateReport(template));
      });

      const allReports = await Promise.all(generatedReports);

      // return res.status(200).json("ok");

      if (publishType === "email") {
        if (allReports) {
          const mailedReports = results.map(
            async ({ fullName, email, report_id }) => {
              const mailResults = limit(() =>
                sendReportMail({
                  school: {
                    name: school?.name,
                    email: school?.email,
                    phonenumber: school?.phonenumber,
                  },
                  id: report_id,
                  email: email,
                  fullName,
                })
              );

              return mailResults?.messageId;
            }
          );

          await Promise.all(mailedReports);
        }
      }

      if (publishType === "both") {
        //SEND REPORTS TO STUDENT SMS
        const response = results.map(async (result) => {
          return limit(() => sendReportSMS(result, school));
        });

        const mailedReports = results.map(
          async ({ fullName, email, report_id }) => {
            const mailResults = limit(() =>
              sendReportMail({
                school: {
                  name: school?.name,
                  email: school?.email,
                  phonenumber: school?.phonenumber,
                },
                id: report_id,
                email: email,
                fullName,
              })
            );

            return mailResults?.messageId;
          }
        );

        await Promise.all([mailedReports, response]);
      }

      return res.status(200).json("ok");
    } catch (error) {
      console.log(error);
      return res.status(400).json("An unknown error has occured.");
    }
  })
);

//@GET students results by subject
router.get(
  "/subject",
  requireStaff,
  requireLevelAccess((req) => req.query.id),
  requireSubjectAccess,
  asyncHandler(async (req, res) => {
    const { id, subject } = req.query;

    const studentRecord = await Examination.find({
      level: new ObjectId(id),
    })
      .populate("level", "level")
      .populate({
        path: "student",
        select: ["firstname", "surname", "othername", "indexnumber"],
      })
      .select("scores");

    const levelSubjects = await Level.findById(id)
      .populate({
        path: "subjects",
        select: ["name"],
        match: { _id: subject },
      })
      .select("subjects");

    const selectedSubject = levelSubjects?.subjects[0];

    const result = studentRecord.map(
      async ({ _id, scoresWithTotal, scores, student }) => {
        const newGenerateScore = await scoresWithTotal;
        const course = newGenerateScore?.find(
          (course) => course?._id === subject
        );

        return {
          _id: _id,
          studentId: student?._id,
          indexnumber: student?.indexnumber,
          student: student?.fullName,
          course:
            course !== undefined
              ? course
              : {
                  _id: selectedSubject?._id,
                  subject: selectedSubject?.name,
                  classScore: "",
                  examsScore: "",
                  totalScore: "",
                  grade: "",
                  remarks: "",
                },
        };
      }
    );
    const results = await Promise.all(result);
    const isCompleted = _.filter(results, (result) =>
      _.isNumber(result?.course?.totalScore)
    );
    const overallScore = _.sumBy(results, "course.totalScore");
    const totalOverAllScore = results?.length * 100;
    const topScore = _.maxBy(results, "course.totalScore");
    const lowScore = _.minBy(results, "course.totalScore");

    const scores = _.map(results, "course.totalScore");
    const totalPossibleScore = scores.length * 100;

    const totalScore = _.sum(scores);
    const overallPerformancePercentage =
      (totalScore / totalPossibleScore) * 100;

    const isCompletedPercentage = (isCompleted?.length / results?.length) * 100;

    res.status(200).json({
      students: studentRecord?.length,
      results,
      overallScore,
      totalOverAllScore,
      topScore: topScore?.course?.totalScore,
      lowScore: lowScore?.course?.totalScore,
      performanceIndex: overallPerformancePercentage.toFixed(1),
      completedResult: isCompletedPercentage.toFixed(0),
    });
  })
);

//@GET students dashboard data

router.get(
  "/analytics/:id",
  requireStudentAccess((req) => req.params.id, { teacherScoped: true }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const records = await Examination.find({
      student: id,
    })
      .select(["_id", "level", "term", "scores", "overallScore"])
      .populate({
        path: "level",
        select: ["level"],
      })
      .populate({
        path: "term",
        select: ["term"],
      });

    if (_.isEmpty(records)) {
      return res.status(404).json("No records found for this student");
    }

    const modifiedRecords = records?.map(async (record) => {
      const scores = await record?.scoresWithTotal;
      return {
        _id: record?._id,
        level: record?.level?.levelName,
        term: record?.term?.term,
        scores: scores,
        overallScore: record?.overallScore,
      };
    });
    const record = await Promise.all(modifiedRecords);
    const averageIndex = getAveragePerformanceIndex(record);

    // console.log(averageIndex);

    const chartData = preparePerformanceIndexChartData(record);
    // console.log(chartData);

    const resultsArray = calculatePerformanceIndex(record);

    const indices = resultsArray.map((i) => i.performanceIndex);
    const trend = getTrend(indices);

    res.status(200).json({
      averageIndex,
      chartData,
      trend,
    });
  })
);

//GET Student academic dashboard information
router.get(
  "/academic/:studentId",
  requireStudentAccess((req) => req.params.studentId, { teacherScoped: true }),
  asyncHandler(async (req, res) => {
    const { studentId } = req.params;

    const records = await Examination.find({
      student: new ObjectId(studentId),
    })
      .select(["_id", "level", "scores", "overallScore"])
      .populate({
        path: "level",
        select: ["level", "subjects", "active"],
      })
      .populate({
        path: "term",
        select: ["term", "academicYear"],
      });

    if (_.isEmpty(records)) {
      return res.status(404).json("No records found for this student");
    }

    const activeLevel = records.find((record) => record.level?.active);
    const currentPosition = await getMyPosition(
      activeLevel?.term?._id,
      activeLevel?.level?._id,
      activeLevel?._id
    );

    const averagePerformanceIndex = getAveragePerformanceIndex(records);
    const performanceIndexes = calculatePerformanceIndex(records);
    const position = await getStudentPosition(records, studentId);
    const bestOverall = getBestOverallScore(records);
    const bestOverallScore = {
      _id: bestOverall._id,
      term: bestOverall.term.term,
      level: bestOverall.level.level,
      scores: bestOverall.scores,
      overallScore: bestOverall.overallScore,
    };

    //GET best subject score
    // const bestOverallSubject = getOverallBestSubject(records);
    const bestOverallSubject = _.first(getTopSubjects(records, 1));
    const bestSubjectScore = {
      term: bestOverallSubject?.term,
      level: bestOverallSubject?.level,
      subject: bestOverallSubject.subject,
      score: bestOverallSubject.score,
    };

    const bestSubjectsScores = getTopSubjects(records);

    const bestOverallScores = getTopOverallScores(records);

    res.status(200).json({
      averagePerformanceIndex,
      bestOverallScore,
      bestSubjectScore,
      bestPosition: position,
      bestSubjectsScores,
      bestOverallScores,

      performanceTrend: {
        labels: _.map(performanceIndexes, "levelType"),
        dataset: _.map(performanceIndexes, "performanceIndex"),
      },
      activeLevel: {
        level: activeLevel?.level?.levelName,
        position: currentPosition,
      },
    });
  })
);

//@GET
router.get(
  "/:id",
  examinationRead,
  asyncHandler(async (req, res) => {
    const publish = req.query.publish || "";
    const publishType = req.query.type || "sms";
    const { id } = req.params;

    const studentRecord = await Examination.findById(id)
      .populate("term")
      .populate({
        path: "level",
        select: ["level", "students", "subjects", "grades"],
        populate: {
          path: "level",
        },
      })
      .populate({
        path: "student",
        select: [
          "firstname",
          "surname",
          "othername",
          "indexnumber",
          "phonenumber",
          "email",
          "profile",
          "academic",
        ],
      });

    // console.log(studentRecord?.student);

    const scorePreference = studentRecord?.term?.exams?.scorePreference?.split(
      "/"
    ) || ["50", "50"];

    const termDetails = {
      report: studentRecord?.term?.report,
      class: scorePreference[0],
      exams: scorePreference[1],
      headmaster: studentRecord?.term?.headmaster,
    };

    //GET student position
    const position = await getMyPosition(
      studentRecord?.term?._id,
      studentRecord?.level?._id,
      studentRecord._id
    );

    let generatedResult = await studentReportDetails(
      studentRecord,
      position,
      publish ? "print" : "preview"
    );

    if (_.isEmpty(publish)) {
      const expectedScore = studentRecord?.level.subjects?.length * 100;
      const scorePercentage = parseInt(
        Number(generatedResult.overallScore / expectedScore) * 100
      );

      const noOfSubjects = studentRecord?.level?.subjects?.length || 0;
      const noOfScores = generatedResult?.scores?.length || 0;

      generatedResult = {
        ...generatedResult,
        scorePercentage,
        entry: {
          completed: noOfScores || 0,
          total: noOfSubjects,
          percent: parseInt(Number(noOfScores / noOfSubjects) * 100),
          bestScoreSubject: _.maxBy(generatedResult?.scores, "totalScore"),
          worstScoreSubject: _.minBy(generatedResult?.scores, "totalScore"),
        },

        session: termDetails,
      };
      // console.log(generatedResult);

      return res.status(200).json(generatedResult);
    }

    const school = await School.findById(req.user.school);

    school.termDetails = termDetails;

    //CONVERT IMAGE TO BASE64
    let SCHOOL_PHOTO = "";

    if (!_.isEmpty(school)) {
      if (school.badge) {
        SCHOOL_PHOTO = await convertImageToBase64(school.badge);
      }
    }

    school.badge = SCHOOL_PHOTO;

    //SEND REPORTS TO STUDENT SMS
    if (publishType === "sms") {
      await sendReportSMS(generatedResult, school);

      return res.status(200).json("ok");
    }

    //GENERATE ALL REPORT TEMPLATES
    const template = await generateReportTemplate({
      report: generatedResult,
      school,
    });

    //GENERATE REPORTS
    const generatedReports = await generateReport({
      id: generatedResult?.report_id,
      template,
    });

    // return res.status(200).json("ok");

    if (publishType === "email") {
      if (generatedReports) {
        //SEND REPORTS TO STUDENT EMAIL
        await sendReportMail({
          school: {
            name: school?.name,
            email: school?.email,
            phonenumber: school?.phonenumber,
          },
          id: generatedResult.report_id,
          email: generatedResult?.email,
          fullName: generatedResult?.fullName,
        });
      }
    }

    if (publishType === "both") {
      await sendReportSMS(generatedResult, school);
      if (generatedReports) {
        //SEND REPORTS TO STUDENT EMAIL
        await sendReportMail({
          school: {
            name: school?.name,
            email: school?.email,
            phonenumber: school?.phonenumber,
          },
          id: generatedResult.report_id,
          email: generatedResult?.email,
          fullName: generatedResult?.fullName,
        });
      }
    }

    return res.status(200).json("ok");
  })
);

router.post(
  "/student/academics",
  requireStaff,
  requireLevelAccess((req) => req.body?.level),
  requireStudentAccess((req) => req.body?.student),
  asyncHandler(async (req, res) => {
    const { session, term, level, student } = req.body;

    //find if current term exams details exists
    const exists = await Examination.findOne({
      session,
      level,
      term,
      student,
    });

    //create new exams Details for the term
    if (_.isEmpty(exists)) {
      await Examination.create({
        session,
        term,
        level,
        student,
        scores: [],
        overallScore: 0,
      });
    }

    const examination = await Examination.find({
      student,
    })
      .populate("term", "term")
      .populate("session", "academicYear")
      .populate("level");

    const modifiedTerms = examination.map(({ _id, session, term, level }) => {
      return {
        _id,
        academicYear: session?.academicYear,
        term: term?.term,
        levelName: level?.levelName,
        subjects: level.subjects,
      };
    });

    //Group selected terms in ascending order
    const groupedTerms = _.groupBy(
      _.sortBy(modifiedTerms, "term"),
      "academicYear"
    );
    const results = Object.entries(groupedTerms);

    res.status(200).json(results);
  })
);

//@POST

router.post(
  "/",
  requireStaff,
  requireExamAccess((req) => req.body?.examsId),
  asyncHandler(async (req, res) => {
    const newExamsScore = req.body;

    // A course teacher may only enter scores for their own subjects.
    const submitted = (newExamsScore.scores || []).map((score) => score?._id);
    if (!canGradeSubjects(req.levelAccess, submitted)) return deny(res);

    // Find if student exam details exists
    const examsInfo = await Examination.findById(newExamsScore.examsId);

    // Merge scores with  with same subjects
    const newScores = _.values(
      _.merge(
        _.keyBy([...examsInfo.scores, ...newExamsScore.scores], "subject")
      )
    );

    const overallScore = _.sumBy(newScores, "totalScore");
    const comments = generateRemarks(overallScore);

    const updatedScores = await Examination.findByIdAndUpdate(
      examsInfo._id,
      {
        $set: {
          scores: newScores,
          overallScore,
          comments,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
    res.status(201).json(updatedScores);
  })
);

router.post(
  "/bulk",
  requireStaff,
  requireLevelAccess((req) => req.body?.level),
  asyncHandler(async (req, res) => {
    const { session, term, level, results } = req.body;

    if (!canGradeSubjects(req.levelAccess, _.uniq((results || []).map((r) => r?._id)))) {
      return deny(res);
    }

    //Extract student index numbers from a specific level
    const selectedLevel = await Level.findById(level)
      .populate("students", "indexnumber")
      .select("students");

    const r = selectedLevel.students?.map(async (student) => {
      if (_.isEmpty(student)) return;
      const exams = await Examination.findOne({
        session,
        term,
        level,
        student: new ObjectId(student?._id),
      })
        .populate("student", "indexnumber")
        .select(["student", "scores"]);

      const result = results?.find(
        ({ indexnumber }) => indexnumber === exams?.student?.indexnumber
      );

      const scores = [
        {
          _id: result?._id,
          subject: result?.subject,
          classScore: result?.classScore,
          examsScore: result?.examsScore,
          totalScore: result?.totalScore,
          grade: result?.grade,
          remarks: result?.remarks,
        },
      ];

      const newScores = _.values(
        _.merge(_.keyBy([...exams.scores, ...scores], "subject"))
      );

      const overallScore = _.sumBy(newScores, "totalScore");
      const comments = generateRemarks(overallScore);
      const updatedScores = await Examination.findByIdAndUpdate(
        exams._id,
        {
          $set: {
            scores: newScores,
            overallScore,
            comments,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      return updatedScores;
    });

    await Promise.all(r);

    return res.status(200).json("Results uploaded!");
  })
);

router.post(
  "/update",
  requireStaff,
  resolveUpdateTarget,
  requireExamAccess((req) => req.body?.session?.examsId),
  asyncHandler(async (req, res) => {
    const { session, scores } = req.body;

    // A course teacher may only change their own subjects; scores for the other
    // subjects stay exactly as they are (the route treats omitted scores as deleted).
    const access = req.levelAccess;
    if (!canGradeSubjects(access, (scores || []).map((score) => score?._id))) {
      return deny(res);
    }

    let examsInfo = {};

    if (session.examsId) {
      // Find if student exam details exists
      examsInfo = await Examination.findById(session.examsId);
    } else {
      // Find if student exam details exists
      examsInfo = await Examination.findOne({
        session: new ObjectId(session.sessionId),
        term: new ObjectId(session.termId),
        student: new ObjectId(session.studentId),
      });
    }

    // Merge scores with  with same subjects
    const newScores = _.merge(
      _.keyBy([...examsInfo?.scores, ...scores], "_id")
    );

    const latestScores = _.values(newScores);

    //Remove all deleted Scores
    let filteredScores = _.intersectionBy(latestScores, scores, "_id");
    if (!access.full) {
      const untouched = (examsInfo?.scores || []).filter(
        (score) => !access.subjectIds.has(String(score?._id))
      );
      filteredScores = [...untouched, ...filteredScores];
    }

    const overallScore = _.sumBy(filteredScores, (score) =>
      Number(score?.totalScore)
    );
    const comments = generateRemarks(overallScore);

    const t = await Examination.findByIdAndUpdate(
      examsInfo._id,
      {
        $set: {
          scores: filteredScores,
          overallScore,
          comments,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(201).json("Exams Scores updated!!!");
  })
);

//@POST

router.put(
  "/comments",
  requireStaff,
  requireExamAccess((req) => req.body?._id, { full: true }),
  asyncHandler(async (req, res) => {
    const newExamsComments = req.body;

    const updatedScores = await Examination.findByIdAndUpdate(
      newExamsComments._id,
      {
        $set: {
          comments: newExamsComments.comments,
        },
      },
      {
        upsert: true,
        new: true,
      }
    );
    if (_.isEmpty(updatedScores)) {
      return res.status(400).json("Error saving remarks.Try again later!!!");
    }

    res.status(201).json("Remarks updated successfully!!!");
  })
);

const studentReportDetails = async (
  report,
  position,
  reportType = "preview"
) => {
  const {
    _id,
    term,
    level,
    scores,
    scoresWithTotal,
    overallScore,
    comments,
    student,
  } = report;

  const newGenerateScore = await scoresWithTotal;

  const modifiedScores = newGenerateScore.map(async (score) => {
    const position = await getSubjectPosition(term?._id, level?._id, _id, {
      _id: score._id,
      subject: score.subject,
    });

    return {
      ...score,
      position: position,
    };
  });

  const finalScores = await Promise.all(modifiedScores);
  //SORT SCORES ACCORDING TO SUBJECT_OPTIONS
  const sortedScores = finalScores.sort(
    (a, b) =>
      SUBJECT_OPTIONS.indexOf(a.subject) - SUBJECT_OPTIONS.indexOf(b.subject)
  );

  //CONVERT IMAGE TO BASE64
  let STUDENT_PHOTO = "";
  if (student?.profile && reportType === "print") {
    STUDENT_PHOTO = await convertImageToBase64(student?.profile);
  }

  //GET Student Grade
  const grade = await generateTotalGrade(scores, level?._id);
  const gradingSystem = await Grade.findById(level?.grades).select("ratings");
  // console.log("gradingSystem", gradingSystem.ratings);

  const modifiedStudentRecord = {
    _id,
    academicYear: term.academicYear,
    term: term.term,
    vacationDate: moment(new Date(term.vacationDate)).format("Do MMMM,YYYY"),
    reOpeningDate: moment(new Date(term.reOpeningDate)).format("Do MMMM,YYYY"),
    isPromotionTerm: term?.isPromotionTerm,
    report_id: `${student?.fullName}_${level?.levelName}_${term.term}`,
    rollNumber: level.noOfStudents,
    totalLevelAttendance: 0,
    indexnumber: _.toUpper(student?.indexnumber),
    phonenumber: student?.phonenumber,
    fullName: student?.fullName,
    department: student?.academic?.department?.name,
    house: student?.academic?.house?.name,
    email: student?.email,
    level: `${level?.levelName}`,
    levelId: level?._id,
    profile:
      reportType === "preview" ? student?.profile || null : STUDENT_PHOTO,
    scores: sortedScores,
    overallScore,
    position: position,
    // position: ordinal(position),
    grade,
    comments,
    gradingSystem: gradingSystem?.ratings || [],
  };

  return modifiedStudentRecord;
};

module.exports = router;
