import { describe, expect, it } from "vitest";
import { importProblem, repeatedIndexNumbers, rowsWithoutIndexNumber } from "./importCheck";

describe("student file check", () => {
  it("finds repeated index numbers whatever the case or spaces", () => {
    expect(repeatedIndexNumbers([{ indexnumber: "A1" }, { indexnumber: " a1 " }, { indexnumber: "B2" }])).toEqual(["A1"]);
  });
  it("lists the rows without an index number, numbered as in the sheet", () => {
    expect(rowsWithoutIndexNumber([{ indexnumber: "A1" }, { indexnumber: "" }, {}, { indexnumber: "B" }])).toEqual([2, 3]);
  });
  it("describes the first problem, or nothing when the file looks fine", () => {
    expect(importProblem([])).toBe("The file has no students.");
    expect(importProblem([{ indexnumber: "A1" }, {}])).toBe("Row 2 has no index number.");
    expect(importProblem([{ indexnumber: "A1" }, { indexnumber: "a1" }])).toMatch(/more than once.*A1/);
    expect(importProblem([{ indexnumber: "A1" }, { indexnumber: "B1" }])).toBe("");
  });
});
