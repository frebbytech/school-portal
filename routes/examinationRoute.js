const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Examination = require("../models/examinationModel");
const Level = require("../models/levelModel");
const _ = require("lodash");
const pLimit = require("p-limit");
const moment = require("moment");
const {
  Types: { ObjectId },
} = require("mongoose");
const generateTotalGrade = require("../config/generateTotalGrade");
const generateRemarks = require("../config/generateRemarks");
const { SUBJECT_OPTIONS } = require("../config/helper");
const { studentReportDetails } = require("../services/studentReport");
const { channelsFor } = require("../common/reportDelivery");
const ReportPublication = require("../models/reportPublicationModel");
const { enqueue } = require("../jobs/queue");
const {
  getBestOverallScore,
  getStudentPosition,
  getAveragePerformanceIndex,
  calculatePerformanceIndex,
  getTopSubjects,
  getTopOverallScores,
  getMyPosition,
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
const Term = require("../models/termModel");
const { termInSchool } = require("../middlewares/tenant");
const { ConflictError } = require("../common/errors");
const { logger } = require("../common/logger");
const { summarizeExams, percent } = require("../common/examSummary");
const {
  scorePreferences,
  cleanScore,
  cleanScores,
  mergeBy,
  overallOf,
  nextComments,
  cleanComments,
} = require("../common/scores");

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
        ...summarizeExams([], 0),
        resultsCompleted: 0,
        students: [],
      });
    }

    // Pass and fail are decided only for students whose results are complete (see
    // common/examSummary.js); students with nothing entered are no longer counted as failed.
    const noOfSubjects = students[0]?.level?.subjects?.length ?? 0;
    const summary = summarizeExams(
      students.map(({ overallScore, scores }) => ({ overallScore, scoresCount: scores?.length || 0 })),
      noOfSubjects
    );
    const { resultsCompleted, ...examsDetails } = summary;
    const resultsComplete = resultsCompleted;

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
            percent: percent(scores?.length || 0, level?.subjects?.length || 0),
          },
        };
      }
    );

    res.status(200).json({
      ...examsDetails,
      students: selectedStudents,
      resultsCompleted: resultsComplete,
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

const PUBLISH_TYPE_MESSAGE = "Choose how to publish: SMS, email or both.";
const PUBLISH_IN_PROGRESS = "Report cards for this class are already being sent. Wait for that to finish.";

// Queues a publication and answers at once (202). Sending takes minutes, so it runs in the
// background (see jobs/queue.js); progress and the result reach the browser over the socket
// and can always be read back from GET /examinations/publications.
const startPublication = async (req, res, { scope, sessionId, termId, levelId, examination }) => {
  const type = req.body?.type || "sms";
  if (!channelsFor(type)) return res.status(400).json(PUBLISH_TYPE_MESSAGE);

  const school = req.user.school;
  const sameClass = { school, level: levelId, term: termId };

  // Two sends to the same class at once would message families twice
  const running = await ReportPublication.findOne({ ...sameClass, status: { $in: ["queued", "running"] } });
  if (running) {
    return res.status(409).json({ message: PUBLISH_IN_PROGRESS, code: "PUBLISH_IN_PROGRESS", publicationId: String(running._id) });
  }

  // Sending the same thing again has to be a decision, not an accident
  const resend = req.body?.resend === true;
  const earlier = await ReportPublication.findOne({
    ...sameClass,
    scope,
    type,
    ...(examination ? { examination } : {}),
    status: "completed",
  }).sort({ createdAt: -1 });
  if (earlier && !resend) {
    return res.status(409).json({
      message: `These report cards were already sent on ${moment(earlier.finishedAt || earlier.createdAt).format("Do MMMM YYYY [at] h:mm a")}. Send them again?`,
      code: "ALREADY_PUBLISHED",
      publishedAt: earlier.finishedAt || earlier.createdAt,
      publicationId: String(earlier._id),
    });
  }

  const publication = await ReportPublication.create({
    school,
    session: sessionId,
    term: termId,
    level: levelId,
    examination,
    scope,
    type,
    requestedBy: req.user.id,
    resend: Boolean(earlier),
  });

  try {
    await enqueue("publish-reports", { publicationId: String(publication._id) }, { jobId: String(publication._id) });
  } catch (error) {
    logger.error("could not queue the publication", { err: error });
    await ReportPublication.updateOne(
      { _id: publication._id },
      { status: "failed", finishedAt: new Date(), message: "Publishing could not be started. Nothing was sent; please try again." }
    );
    return res.status(503).json("Publishing could not be started. Nothing was sent; please try again.");
  }

  return res.status(202).json({ publicationId: String(publication._id), status: "queued" });
};

// Publish a whole class's report cards: { sessionId, termId, levelId, type: sms|email|both, resend? }
router.post(
  "/publish",
  requireStaff,
  requireLevelAccess((req) => req.body?.levelId, { full: true }),
  asyncHandler(async (req, res) => {
    const { sessionId, termId, levelId } = req.body || {};
    if (!isValidObjectId(sessionId) || !isValidObjectId(termId)) {
      return res.status(400).json("Choose the session, term and class to publish.");
    }

    const anyResults = await Examination.exists({ school: req.user.school, session: sessionId, term: termId, level: levelId });
    if (!anyResults) {
      return res.status(404).json("No results have been entered for this class this term, so there is nothing to publish.");
    }

    return startPublication(req, res, { scope: "class", sessionId, termId, levelId });
  })
);

// Publish one student's report card: { type: sms|email|both, resend? }
router.post(
  "/:id/publish",
  requireStaff,
  requireExamAccess((req) => req.params.id, { full: true }),
  asyncHandler(async (req, res) => {
    const record = await Examination.findById(req.params.id).select("session term level");
    return startPublication(req, res, {
      scope: "student",
      sessionId: record.session,
      termId: record.term,
      levelId: record.level,
      examination: record._id,
    });
  })
);

// What has been published for a class this term (newest first): for the status shown on the
// report screens, and to pick up where things stand after a page reload.
router.get(
  "/publications",
  requireStaff,
  requireLevelAccess((req) => req.query.levelId, { full: true }),
  asyncHandler(async (req, res) => {
    const { levelId, termId } = req.query;
    if (!isValidObjectId(termId)) return res.status(400).json("Choose the term.");

    const publications = await ReportPublication.find({ school: req.user.school, level: levelId, term: termId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("scope examination type status phase done total summary message startedAt finishedAt createdAt requestedBy")
      .populate("requestedBy", "fullname");
    return res.status(200).json(publications);
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
    const { id } = req.params;

    // Used to send messages from a GET. Sending is POST /examinations/:id/publish now.
    if (publish) {
      return res.status(405).json("Publishing report cards now uses POST /examinations/:id/publish.");
    }

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
      "preview"
    );

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

    //create new exams Details for the term (createdBy is required; it was missing,
    //so this create could not succeed)
    if (_.isEmpty(exists)) {
      await Examination.create({
        session,
        term,
        level,
        student,
        school: req.user.school,
        createdBy: req.user.id,
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
        subjects: level?.subjects,
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

// The term's score split (e.g. "30/70") bounds each component of a score.
const termScorePreferences = async (termId) =>
  scorePreferences(isValidObjectId(termId) ? await Term.findById(termId).select("exams") : null);

/**
 * Read-modify-write of an examination's scores with a version (__v) check: if another teacher
 * saved the same record in between, the change is recomputed from the newer data
 * instead of silently overwriting it (lost update).
 */
const saveWithRetry = async (examId, build) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await Examination.findById(examId);
    if (!current) return null;
    const changes = build(current);
    // __v is bumped on every save, so two saves in the same millisecond still conflict.
    const saved = await Examination.findOneAndUpdate(
      { _id: current._id, __v: current.__v },
      { $set: changes, $inc: { __v: 1 } },
      { new: true }
    );
    if (saved) return saved;
  }
  throw new ConflictError("These results are being edited by someone else. Please try again.");
};

const logScores = (message, req, examId, scores) =>
  logger.info(message, {
    examination: String(examId),
    subjects: scores.map((s) => s.subject),
    by: String(req.user.id),
  });

//@POST scores for one student
router.post(
  "/",
  requireStaff,
  requireExamAccess((req) => req.body?.examsId),
  asyncHandler(async (req, res) => {
    const newExamsScore = req.body;

    // A course teacher may only enter scores for their own subjects.
    const submitted = (Array.isArray(newExamsScore.scores) ? newExamsScore.scores : []).map((score) => score?._id);
    if (!canGradeSubjects(req.levelAccess, submitted)) return deny(res);

    const examsInfo = await Examination.findById(newExamsScore.examsId).select("term");
    const { scores, error } = cleanScores(
      newExamsScore.scores,
      await termScorePreferences(examsInfo?.term)
    );
    if (error) return res.status(400).json(error);

    // Merge scores with the same subject; totals and the overall score are computed here.
    const updated = await saveWithRetry(newExamsScore.examsId, (current) => {
      const merged = mergeBy(current.scores, scores, "subject");
      const overallScore = overallOf(merged);
      return { scores: merged, overallScore, comments: nextComments(current.comments, overallScore) };
    });

    logScores("scores saved", req, newExamsScore.examsId, scores);
    res.status(201).json(updated);
  })
);

//@POST scores for many students of a class (one row per student and subject)
router.post(
  "/bulk",
  requireStaff,
  requireLevelAccess((req) => req.body?.level),
  asyncHandler(async (req, res) => {
    const { session, term, level, results } = req.body;

    if (!Array.isArray(results) || results.length === 0 || results.length > 5000) {
      return res.status(400).json("Provide between 1 and 5000 result rows.");
    }
    if (!canGradeSubjects(req.levelAccess, _.uniq(results.map((r) => r?._id)))) {
      return deny(res);
    }
    if (!(await termInSchool(req, term)) || !isValidObjectId(session)) return deny(res);

    // Validate every row before anything is written.
    const prefs = await termScorePreferences(term);
    const rows = [];
    for (let i = 0; i < results.length; i++) {
      const { score, error } = cleanScore(results[i], prefs);
      if (error) return res.status(400).json(`Row ${i + 1}: ${error}`);
      rows.push({ index: String(results[i]?.indexnumber ?? "").trim().toLowerCase(), score });
    }

    //Students of this class, matched by index number (case does not matter)
    const selectedLevel = await Level.findOne({ _id: level, school: req.user.school })
      .populate("students", "indexnumber")
      .select("students");
    const studentByIndex = new Map(
      (selectedLevel?.students || []).filter(Boolean).map((s) => [String(s.indexnumber).toLowerCase(), s._id])
    );

    const exams = await Examination.find({
      session,
      term,
      level,
      student: { $in: [...studentByIndex.values()] },
    }).select("student");
    const examByStudent = new Map(exams.map((e) => [String(e.student), e._id]));

    // Group rows per student; rows for unknown students are skipped, not written as blanks
    const perExam = new Map();
    let skipped = 0;
    for (const { index, score } of rows) {
      const examId = examByStudent.get(String(studentByIndex.get(index)));
      if (!examId) {
        skipped++;
        continue;
      }
      perExam.set(String(examId), [...(perExam.get(String(examId)) || []), score]);
    }

    const limit = pLimit(5);
    await Promise.all(
      [...perExam.entries()].map(([examId, scores]) =>
        limit(() =>
          saveWithRetry(examId, (current) => {
            const merged = mergeBy(current.scores, scores, "subject");
            const overallScore = overallOf(merged);
            return { scores: merged, overallScore, comments: nextComments(current.comments, overallScore) };
          })
        )
      )
    );

    logger.info("bulk scores saved", { level, students: perExam.size, skipped, by: String(req.user.id) });
    // Still a plain string, as before; the skipped rows are now mentioned so the person
    // importing knows some rows were not saved.
    return res
      .status(200)
      .json(
        skipped > 0
          ? `Results uploaded! ${skipped} row${skipped === 1 ? " was" : "s were"} skipped because the student is not in this class or has no exam record.`
          : "Results uploaded!"
      );
  })
);

//@POST replace a student's scores (omitted subjects are removed, as before)
router.post(
  "/update",
  requireStaff,
  resolveUpdateTarget,
  requireExamAccess((req) => req.body?.session?.examsId),
  asyncHandler(async (req, res) => {
    const { session } = req.body;

    // A course teacher may only change their own subjects; scores for the other
    // subjects stay exactly as they are (the route treats omitted scores as deleted).
    const access = req.levelAccess;
    if (!canGradeSubjects(access, (Array.isArray(req.body.scores) ? req.body.scores : []).map((score) => score?._id))) {
      return deny(res);
    }

    const examsInfo = await Examination.findById(session.examsId).select("term");
    const { scores, error } = cleanScores(
      req.body.scores,
      await termScorePreferences(examsInfo?.term),
      { requireId: true }
    );
    if (error) return res.status(400).json(error);

    const updated = await saveWithRetry(session.examsId, (current) => {
      const latest = mergeBy(current.scores, scores, "_id");

      //Remove all deleted Scores
      let filtered = _.intersectionBy(latest, scores, "_id");
      if (!access.full) {
        const untouched = (current.scores || []).filter(
          (score) => !access.subjectIds.has(String(score?._id))
        );
        filtered = [...untouched, ...filtered];
      }
      const overallScore = overallOf(filtered);
      return { scores: filtered, overallScore, comments: nextComments(current.comments, overallScore) };
    });
    if (!updated) return res.status(404).json("Exams record not found.");

    logScores("scores replaced", req, session.examsId, scores);
    res.status(201).json("Exams Scores updated!!!");
  })
);

//@PUT hand-written comments (no longer overwritten by automatic ones afterwards)
router.put(
  "/comments",
  requireStaff,
  requireExamAccess((req) => req.body?._id, { full: true }),
  asyncHandler(async (req, res) => {
    const comments = cleanComments(req.body.comments);
    if (!comments) return res.status(400).json("Error saving remarks.Try again later!!!");

    const updatedScores = await Examination.findByIdAndUpdate(
      req.body._id,
      { $set: { comments } },
      { new: true }
    );
    if (_.isEmpty(updatedScores)) {
      return res.status(400).json("Error saving remarks.Try again later!!!");
    }

    res.status(201).json("Remarks updated successfully!!!");
  })
);

module.exports = router;
