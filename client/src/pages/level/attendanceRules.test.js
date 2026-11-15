import { describe, it, expect } from "vitest";
import { latestWeekday, mergeMarks, countMarked, entryOf, isWeekendDay } from "./attendanceRules";

describe("attendance rules", () => {
  it("moves a weekend date back to Friday", () => {
    expect(latestWeekday("2026-11-15")).toBe("2026-11-13"); // Sunday
    expect(latestWeekday("2026-11-14")).toBe("2026-11-13"); // Saturday
    expect(latestWeekday("2026-11-13")).toBe("2026-11-13"); // Friday stays
    expect(latestWeekday("2026-11-16")).toBe("2026-11-16"); // Monday stays
  });
  it("knows weekends", () => {
    expect(isWeekendDay("2026-11-15")).toBe(true);
    expect(isWeekendDay("2026-11-16")).toBe(false);
  });
  it("lays unsaved marks over the saved register without changing it", () => {
    const saved = [{ _id: "a", status: "" }, { _id: "b", status: "Present" }];
    const rows = mergeMarks(saved, { a: { status: "Absent", reason: "Sick" } });
    expect(rows[0]).toEqual({ _id: "a", status: "Absent", reason: "Sick" });
    expect(rows[1]).toBe(saved[1]);
    expect(saved[0].status).toBe("");
  });
  it("counts only Present/Absent as marked", () => {
    expect(countMarked([{ status: "Present" }, { status: "Absent" }, { status: "" }, {}])).toBe(2);
  });
  it("drops the reason unless absent, and keeps it for absent", () => {
    expect(entryOf({ _id: "a", fullName: "A", gender: "male", status: "Present", reason: "old" }).reason).toBe("");
    expect(entryOf({ _id: "a", fullName: "A", gender: "male", status: "Absent", reason: "Sick" }).reason).toBe("Sick");
    expect(entryOf({ _id: "a" }).status).toBe("");
  });
});
