// Turns the exam details answer into what the summary cards show.
//
// Older servers send only pass/fail counts over every student (so a student with nothing
// entered counted as failed). Newer ones also send completeStudents / incompleteStudents,
// pass and fail only among complete students, and the maximum score. This works with both:
// the extra cards and hints appear only when the server provides the numbers for them.
export function examSummaryView(data) {
  const d = data || {};
  const hasCompletion = typeof d.completeStudents === "number";
  const complete = hasCompletion ? d.completeStudents : null;
  const maxScore = Number(d.maxScore) > 0 ? Number(d.maxScore) : null;
  const noResultsYet = hasCompletion && (d.enteredStudents ?? 0) === 0;

  return {
    students: d.noOfStudents ?? 0,
    highest: noResultsYet ? null : d.highestMarks ?? 0,
    lowest: noResultsYet ? null : d.lowestMarks ?? 0,
    maxScore,
    passed: d.passStudents ?? 0,
    failed: d.failStudents ?? 0,
    complete,
    incomplete: hasCompletion ? d.incompleteStudents ?? 0 : null,
    progress: d.resultsCompleted ?? 0,
  };
}

// "of 700" next to a score, "of 1 complete" next to pass and fail.
export const outOf = (n) => (n ? `out of ${n}` : undefined);
export const ofComplete = (complete) =>
  typeof complete === "number" ? `of ${complete} with complete results` : undefined;
