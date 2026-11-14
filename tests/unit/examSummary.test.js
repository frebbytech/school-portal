const { summarizeExams } = require("../../common/examSummary");

// 3 subjects: maximum 300 per student, pass mark 150.
const st = (overallScore, scoresCount) => ({ overallScore, scoresCount });

describe("exam summary", () => {
  it("does not count students with no results as failed", () => {
    const s = summarizeExams([st(210, 3), st(0, 0), st(0, 0), st(0, 0)], 3);
    expect(s.noOfStudents).toBe(4);
    expect(s.completeStudents).toBe(1);
    expect(s.incompleteStudents).toBe(3);
    expect(s.passStudents).toBe(1);
    expect(s.failStudents).toBe(0);
  });

  it("decides pass and fail only among complete students, at half the maximum", () => {
    const s = summarizeExams([st(150, 3), st(149, 3), st(300, 3), st(40, 1)], 3);
    expect(s.passMark).toBe(150);
    expect(s.passStudents).toBe(2);
    expect(s.failStudents).toBe(1);
    expect(s.incompleteStudents).toBe(1);
  });

  it("uses only students with at least one result for highest, lowest and average", () => {
    const s = summarizeExams([st(200, 3), st(100, 2), st(0, 0)], 3);
    expect(s.highestMarks).toBe(200);
    expect(s.lowestMarks).toBe(100);
    expect(s.averageMarks).toBe(150);
    expect(s.enteredStudents).toBe(2);
    expect(s.maxScore).toBe(300);
  });

  it("reports progress as a percentage of results entered", () => {
    const s = summarizeExams([st(210, 3), st(50, 1), st(0, 0), st(0, 0)], 3);
    expect(s.resultsCompleted).toBe(Math.floor((4 / 12) * 100));
    expect(s.scorePercentage).toBe(Math.floor((260 / 1200) * 100));
  });

  it("returns zeros, not NaN, for a level with no students or no subjects", () => {
    for (const [list, n] of [[[], 0], [[st(0, 0)], 0], [undefined, 3]]) {
      const s = summarizeExams(list, n);
      for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
      expect(s.passStudents + s.failStudents).toBe(0);
    }
  });

  it("never treats a level without subjects as having complete students", () => {
    const s = summarizeExams([st(0, 0), st(10, 2)], 0);
    expect(s.completeStudents).toBe(0);
    expect(s.incompleteStudents).toBe(2);
  });

  it("ignores missing or non-numeric values", () => {
    const s = summarizeExams([{ overallScore: undefined, scoresCount: undefined }, { overallScore: "abc", scoresCount: 3 }], 3);
    expect(s.completeStudents).toBe(1);
    expect(s.failStudents).toBe(1);
    expect(Number.isFinite(s.averageMarks)).toBe(true);
  });
});
