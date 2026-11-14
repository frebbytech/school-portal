const request = require("supertest");
const mongoose = require("mongoose");

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

describe("examination details summary", () => {
  let tok, level;

  beforeAll(async () => {
    const school = await createSchool();
    const admin = await createUser(school, "administrator");
    tok = staffToken(admin);
    const session = await make(Session, { school: school._id });
    const term = await make(Term, { school: school._id, session: session._id, active: true, status: "current" });
    const subjects = [];
    for (const name of ["Maths", "English"]) subjects.push(await make(Subject, { school: school._id, name, subject: name }));
    const students = [];
    for (let i = 0; i < 3; i++) students.push(await make(Student, { indexnumber: uniq("x"), school: school._id, firstname: `S${i}`, surname: "T", gender: "female" }));
    level = await make(Level, { school: school._id, session: session._id, term: term._id, subjects: subjects.map((s) => s._id), students: students.map((s) => s._id) });
    const exam = (student, scores, overallScore) =>
      make(Examination, { session: session._id, term: term._id, level: level._id, student: student._id, school: school._id, createdBy: admin._id, scores, overallScore });
    const sc = (subject, total) => ({ _id: subject._id, subject: subject.name, classScore: total / 2, examsScore: total / 2, totalScore: total });
    await exam(students[0], [sc(subjects[0], 80), sc(subjects[1], 70)], 150); // complete, passes (pass mark 100)
    await exam(students[1], [sc(subjects[0], 30)], 30);                       // only one subject so far
    await exam(students[2], [], 0);                                           // nothing entered
  });

  it("counts pass and fail only for students whose results are complete", async () => {
    const res = await request(app).get(`${base}/examinations/details?level=${level._id}`).set("Authorization", `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      noOfStudents: 3,
      completeStudents: 1,
      incompleteStudents: 2,
      passStudents: 1,
      failStudents: 0,
      passMark: 100,
      maxScore: 200,
      highestMarks: 150,
      lowestMarks: 30,
    });
    expect(res.body.students).toHaveLength(3);
    for (const s of res.body.students) expect(Number.isFinite(s.entry.percent)).toBe(true);
  });
});
