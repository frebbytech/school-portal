import { describe, expect, it } from "vitest";
import { getSavedLoginInfo, purgeSavedPassword, saveLoginInfo } from "./sessionHandler";

describe("remember me", () => {
  it("keeps the student ID only", () => {
    saveLoginInfo("stu1", true);
    expect(getSavedLoginInfo()).toEqual({ studentId: "stu1" });
    expect(localStorage.getItem("rememberPassword")).toBeNull();
  });

  it("forgets the ID when unticked", () => {
    saveLoginInfo("stu1", true);
    saveLoginInfo("stu1", false);
    expect(getSavedLoginInfo()).toEqual({ studentId: "" });
  });

  it("removes a password saved by an older version", () => {
    localStorage.setItem("rememberStudentId", "stu1");
    localStorage.setItem("rememberPassword", "secret-pass");
    purgeSavedPassword();
    expect(localStorage.getItem("rememberPassword")).toBeNull();
    expect(getSavedLoginInfo().studentId).toBe("stu1");
  });
});
