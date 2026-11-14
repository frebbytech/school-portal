import { describe, expect, it } from "vitest";
import { examSummaryView, ofComplete, outOf } from "./examSummaryView";

describe("examSummaryView", () => {
  it("reads the new server answer", () => {
    const v = examSummaryView({ noOfStudents: 50, enteredStudents: 1, completeStudents: 1, incompleteStudents: 49, highestMarks: 504, lowestMarks: 504, maxScore: 700, passStudents: 1, failStudents: 0, resultsCompleted: 2 });
    expect(v).toMatchObject({ students: 50, highest: 504, lowest: 504, maxScore: 700, passed: 1, failed: 0, complete: 1, incomplete: 49, progress: 2 });
  });

  it("shows no highest or lowest while nothing has been entered", () => {
    const v = examSummaryView({ noOfStudents: 4, enteredStudents: 0, completeStudents: 0, incompleteStudents: 4, highestMarks: 0, lowestMarks: 0 });
    expect(v.highest).toBeNull();
    expect(v.lowest).toBeNull();
  });

  it("still works with an older server that sends only the original numbers", () => {
    const v = examSummaryView({ noOfStudents: 50, highestMarks: 504, lowestMarks: 0, passStudents: 1, failStudents: 49, resultsCompleted: 2 });
    expect(v).toMatchObject({ students: 50, highest: 504, lowest: 0, passed: 1, failed: 49, complete: null, incomplete: null, maxScore: null });
  });

  it("copes with no data at all", () => {
    expect(examSummaryView(undefined)).toMatchObject({ students: 0, passed: 0, failed: 0, progress: 0 });
  });

  it("builds the hints", () => {
    expect(outOf(700)).toBe("out of 700");
    expect(outOf(null)).toBeUndefined();
    expect(ofComplete(3)).toBe("of 3 with complete results");
    expect(ofComplete(null)).toBeUndefined();
  });
});
