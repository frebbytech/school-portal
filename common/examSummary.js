/**
 * Summary numbers for one level's examination page.
 *
 * Earlier every student counted, so a student with no results entered yet scored 0 and
 * was reported as "failed" (49 "failed" students when only one had any results). Now:
 *  - a student is COMPLETE when results exist for every subject of the level;
 *  - pass and fail are decided only among complete students;
 *  - students whose results are not complete yet are reported separately;
 *  - highest, lowest and average scores use only students who have at least one result.
 * The pass mark stays half of the maximum (50 per subject, as before).
 */
const percent = (part, whole) => (whole > 0 ? Math.floor((part / whole) * 100) : 0);

function summarizeExams(students, noOfSubjects) {
  const subjects = Number(noOfSubjects) || 0;
  const list = Array.isArray(students) ? students : [];
  const count = (s) => Number(s?.scoresCount) || 0;
  const total = (s) => Number(s?.overallScore) || 0;

  const entered = list.filter((s) => count(s) > 0);
  const complete = subjects > 0 ? list.filter((s) => count(s) >= subjects) : [];
  const passMark = subjects * 50;

  const totals = entered.map(total);
  const completedResults = list.reduce((sum, s) => sum + Math.min(count(s), subjects || count(s)), 0);

  return {
    noOfStudents: list.length,
    enteredStudents: entered.length,
    completeStudents: complete.length,
    incompleteStudents: list.length - complete.length,
    highestMarks: totals.length ? Math.max(...totals) : 0,
    lowestMarks: totals.length ? Math.min(...totals) : 0,
    averageMarks: totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0,
    passMark,
    maxScore: subjects * 100,
    passStudents: complete.filter((s) => total(s) >= passMark).length,
    failStudents: complete.filter((s) => total(s) < passMark).length,
    resultsCompleted: percent(completedResults, subjects * list.length),
    scorePercentage: percent(list.reduce((sum, s) => sum + total(s), 0), subjects * list.length * 100),
  };
}

module.exports = { summarizeExams, percent };
