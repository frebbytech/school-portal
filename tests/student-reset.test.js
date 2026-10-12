const request = require("supertest");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

jest.mock("../config/mail/mails", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
}));

const { sendVerificationEmail } = require("../config/mail/mails");
const app = require("../app");
const StudentAuth = require("../models/studentAuthModel");
const { createSchool } = require("./helpers");

const base = "/api/frebbys/v1/student-auth";
const post = (path, body) => request(app).post(`${base}${path}`).send(body);

const createStudentAuth = async () => {
  const school = await createSchool();
  const n = new mongoose.Types.ObjectId().toString().slice(-10);
  return StudentAuth.create({
    school: school._id,
    indexnumber: `stu${n}`,
    email: `stu${n}@example.com`,
    phonenumber: "0240000000",
    password: await bcrypt.hash("old-password", 4),
  });
};

const requestCode = async (indexnumber) => {
  sendVerificationEmail.mockClear();
  const res = await post("/reset-password-request", { studentId: indexnumber });
  expect(res.status).toBe(200);
  return sendVerificationEmail.mock.calls[0][1]; // the plain code that was emailed
};

describe("student password reset (finding C-4)", () => {
  it("refuses to reset a password when no code was ever requested or confirmed", async () => {
    const student = await createStudentAuth();
    const res = await post("/reset-password", { studentId: student.indexnumber, newPassword: "hacked-pass" });
    expect(res.status).toBe(400);
    const stored = await StudentAuth.findById(student._id);
    expect(await bcrypt.compare("old-password", stored.password)).toBe(true);
  });

  it("refuses to reset after a code was requested but not confirmed", async () => {
    const student = await createStudentAuth();
    await requestCode(student.indexnumber);
    const res = await post("/reset-password", { studentId: student.indexnumber, newPassword: "hacked-pass" });
    expect(res.status).toBe(400);
  });

  it("stores only a hash of the code and generates a 6-digit code", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);
    expect(code).toMatch(/^\d{6}$/);
    const stored = await StudentAuth.findById(student._id);
    expect(stored.resetToken).not.toBe(code);
    expect(stored.resetToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects a wrong code", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);
    const wrong = code === "123456" ? "654321" : "123456";
    const res = await post("/confirm-reset-code", { studentId: student.indexnumber, code: wrong });
    expect(res.status).toBe(400);
  });

  it("completes the full flow once, then refuses a replay", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);

    const confirm = await post("/confirm-reset-code", { studentId: student.indexnumber, code });
    expect(confirm.status).toBe(200);

    const reset = await post("/reset-password", { studentId: student.indexnumber, newPassword: "new-password" });
    expect(reset.status).toBe(200);

    const stored = await StudentAuth.findById(student._id);
    expect(await bcrypt.compare("new-password", stored.password)).toBe(true);
    expect(stored.resetToken).toBeNull();
    expect(stored.resetVerified).toBe(false);

    const replay = await post("/reset-password", { studentId: student.indexnumber, newPassword: "another-pass" });
    expect(replay.status).toBe(400);
  });

  it("invalidates the code after too many wrong attempts, even if the right code is then used", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);
    const wrong = code === "123456" ? "654321" : "123456";

    for (let i = 0; i < 5; i++) {
      const res = await post("/confirm-reset-code", { studentId: student.indexnumber, code: wrong });
      expect(res.status).toBe(400);
    }
    const res = await post("/confirm-reset-code", { studentId: student.indexnumber, code });
    expect(res.status).toBe(400);
  });

  it("refuses an expired code", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);
    await StudentAuth.updateOne({ _id: student._id }, { resetTokenExpiry: new Date(Date.now() - 1000) });
    const res = await post("/confirm-reset-code", { studentId: student.indexnumber, code });
    expect(res.status).toBe(400);
  });

  it("enforces a minimum password length after confirmation", async () => {
    const student = await createStudentAuth();
    const code = await requestCode(student.indexnumber);
    await post("/confirm-reset-code", { studentId: student.indexnumber, code });
    const res = await post("/reset-password", { studentId: student.indexnumber, newPassword: "123" });
    expect(res.status).toBe(400);
  });
});
