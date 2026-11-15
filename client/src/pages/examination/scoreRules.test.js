import { describe, expect, it } from "vitest";
import { checkImportRows, parseScorePreference, scoreProblem, toScore, totalOf } from "./scoreRules";

describe("score split", () => {
  it("reads the term's split", () => {
    expect(parseScorePreference("40/60")).toEqual({ classMax: 40, examsMax: 60 });
    expect(parseScorePreference("30/70")).toEqual({ classMax: 30, examsMax: 70 });
  });
  it("falls back to 50/50 for missing or odd values", () => {
    for (const v of [undefined, null, "", "abc", "50", "x/y", "-5/105", "0/0"]) {
      expect(parseScorePreference(v)).toEqual({ classMax: 50, examsMax: 50 });
    }
  });
});

describe("score values", () => {
  it("turns text into numbers and blanks into null", () => {
    expect(toScore("12.5")).toBe(12.5);
    expect(toScore(" 7 ")).toBe(7);
    expect(toScore("")).toBeNull();
    expect(toScore("abc")).toBeNull();
    expect(toScore(undefined)).toBeNull();
  });
  it("adds a total, treating a blank as 0", () => {
    expect(totalOf("30", 45)).toBe(75);
    expect(totalOf("", 10)).toBe(10);
  });
  it("describes the limit that was broken", () => {
    const split = { classMax: 40, examsMax: 60 };
    expect(scoreProblem(41, 10, split)).toBe("Class score must be from 0 to 40");
    expect(scoreProblem(10, 61, split)).toBe("Exams score must be from 0 to 60");
    expect(scoreProblem(-1, 10, split)).toBe("Class score must be from 0 to 40");
    expect(scoreProblem("", "", split)).toBe("No scores");
    expect(scoreProblem(40, 60, split)).toBe("");
  });
});

describe("checking an imported sheet", () => {
  const ctx = { studentIndexNumbers: ["ab1", "AB2", "ab3"], classMax: 40, examsMax: 60 };
  const rows = [
    { "index number": "AB1", student: "Ama", "class score": 30, "exams score": 50 },
    { "index number": "ab2", student: "Kofi", "class score": 45, "exams score": 10 },
    { "index number": "zz9", student: "Nobody", "class score": 1, "exams score": 1 },
    { "index number": "ab3", student: "Yaw", "class score": 20, "exams score": 20 },
    { "index number": "ab3", student: "Yaw again", "class score": 20, "exams score": 20 },
    { "index number": "", student: "Blank", "class score": 1, "exams score": 1 },
  ];

  it("keeps good rows and explains each bad one, numbering rows as in the spreadsheet", () => {
    const { valid, problems } = checkImportRows(rows, ctx);
    expect(valid.map((r) => r.indexnumber)).toEqual(["AB1", "ab3"]);
    expect(problems).toEqual([
      { row: 3, indexnumber: "ab2", message: "Class score must be from 0 to 40" },
      { row: 4, indexnumber: "zz9", message: "This index number is not in this class" },
      { row: 6, indexnumber: "ab3", message: "This student appears more than once" },
      { row: 7, indexnumber: "", message: "No index number" },
    ]);
  });

  it("accepts the column names the old import accepted", () => {
    const { valid } = checkImportRows([{ indexnumber: "ab1", classscore: "10", examsscore: "20" }], ctx);
    expect(valid).toEqual([{ indexnumber: "ab1", student: "", classScore: 10, examsScore: 20 }]);
  });

  it("reports an empty sheet as nothing to import", () => {
    expect(checkImportRows([], ctx)).toEqual({ valid: [], problems: [] });
    expect(checkImportRows(undefined, ctx)).toEqual({ valid: [], problems: [] });
  });
});
