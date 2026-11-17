const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../config/sms/messenger", () => ({
  sendSMS: jest.fn(),
  sendReportSMS: jest.fn(),
}));
jest.mock("../config/mail/mail2", () => ({ sendReportMail: jest.fn() }));

const { sendReportSMS } = require("../config/sms/messenger");
const app = require("../app");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const Examination = require("../models/examinationModel");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

describe("publishing report cards", () => {
  let tok, session, term, level, emptyLevel, query;

  beforeAll(async () => {
    const school = await createSchool();
    const admin = await createUser(school, "administrator");
    tok = staffToken(admin);
    session = await make(Session, { school: school._id });
    term = await make(Term, { school: school._id, session: session._id, active: true, status: "current" });
    const maths = await make(Subject, { school: school._id, name: "Maths", subject: "Maths" });
    // One student with a phone number and no email
    const student = await make(Student, {
      indexnumber: uniq("p"), school: school._id, firstname: "Ama", surname: "T", gender: "female", phonenumber: "0240000001",
    });
    level = await make(Level, { school: school._id, session: session._id, term: term._id, subjects: [maths._id], students: [student._id] });
    emptyLevel = await make(Level, { school: school._id, session: session._id, term: term._id, subjects: [maths._id], students: [] });
    await make(Examination, {
      session: session._id, term: term._id, level: level._id, student: student._id, school: school._id, createdBy: admin._id,
      scores: [{ _id: maths._id, subject: "Maths", classScore: 20, examsScore: 40, totalScore: 60 }], overallScore: 60,
    });
    query = (lvl, type) => `sessionId=${session._id}&termId=${term._id}&levelId=${lvl._id}&type=${type}`;
  });

  const publish = (lvl, type) => request(app).get(`${base}/examinations/publish?${query(lvl, type)}`).set("Authorization", `Bearer ${tok}`);

  beforeEach(() => sendReportSMS.mockReset());

  it("refuses a publish type it does not know", async () => {
    const res = await publish(level, "fax");
    expect(res.status).toBe(400);
    expect(sendReportSMS).not.toHaveBeenCalled();
  });

  it("says there is nothing to publish when no results exist (it used to say success)", async () => {
    const res = await publish(emptyLevel, "sms");
    expect(res.status).toBe(404);
    expect(res.body).toMatch(/nothing to publish/);
  });

  it("answers with the counts when the message goes out", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    const res = await publish(level, "sms");
    expect(res.status).toBe(200);
    expect(res.body.sms).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(res.body.message).toMatch(/SMS: 1 sent/);
  });

  it("does not claim success when the SMS provider refuses every message", async () => {
    sendReportSMS.mockResolvedValue(undefined);
    const res = await publish(level, "sms");
    expect(res.status).toBe(502);
    expect(res.body).toMatch(/None of the reports could be sent/);
  });

  it("says so when nobody has the contact detail needed (no email on record)", async () => {
    const res = await publish(level, "email");
    expect(res.status).toBe(422);
    expect(res.body).toMatch(/email address/);
  });
});
