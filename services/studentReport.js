const _ = require("lodash");
const moment = require("moment");
const Grade = require("../models/gradeModel");
const generateTotalGrade = require("../config/generateTotalGrade");
const { convertImageToBase64, SUBJECT_OPTIONS } = require("../config/helper");
const { getSubjectPosition } = require("../config/helpers/examination");

// The figures and wording of one student's report card (used by the report screen, by
// printing and by publishing). Moved out of the examination route unchanged.
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

module.exports = { studentReportDetails };
