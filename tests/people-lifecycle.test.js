const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const app = require("../app");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const StudentAuth = require("../models/studentAuthModel");
const Parent = require("../models/parentModel");
const Examination = require("../models/examinationModel");
const CurrentFee = require("../models/currentFeeModel");
const User = require("../models/userModel");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

const row = (overrides = {}) => ({
  indexnumber: uniq("ix"),
  firstname: "Ama",
  surname: "Mensah",
  dateofbirth: "2015-05-05",
  gender: "female",
  phonenumber: "0240000001",
  ...overrides,
});

describe("people lifecycle (Stage 7)", () => {
  let schoolA, schoolB, adminA, teacherA, adminB, adminTok, teacherTok, adminBTok;
  let session, term, level, levelB;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    adminTok = staffToken(adminA);
    teacherTok = staffToken(teacherA);
    adminBTok = staffToken(adminB);
    session = await make(Session, { school: schoolA._id });
    term = await make(Term, { school: schoolA._id, session: session._id, status: "current", active: true });
    level = await make(Level, { school: schoolA._id, session: session._id, term: term._id, name: "Basic 1", students: [] });
    levelB = await make(Level, { school: schoolB._id, name: "Basic 1", students: [] });
  });

  const importBody = (students, overrides = {}) => ({
    type: "file",
    session: { levelId: String(level._id), termId: String(term._id), sessionId: String(session._id) },
    students,
    ...overrides,
  });
  const counts = async () => ({
    students: await Student.countDocuments({ school: schoolA._id }),
    auths: await StudentAuth.countDocuments({ school: schoolA._id }),
    exams: await Examination.countDocuments({ term: term._id }),
    fees: await CurrentFee.countDocuments({ term: term._id }),
  });

  describe("importing students from a file", () => {
    it("only administrators can import", async () => {
      const res = await as(request(app).post(`${base}/students/many`).send(importBody([row()])), teacherTok);
      expect(res.status).toBe(403);
    });

    it("creates students, logins flagged for a password change, exam and fee records with the school", async () => {
      const r = row();
      const res = await as(request(app).post(`${base}/students/many`).send(importBody([r])), adminTok);
      expect(res.status).toBe(200);

      const saved = await Student.findOne({ indexnumber: r.indexnumber });
      expect(String(saved.school)).toBe(String(schoolA._id));
      const auth = await StudentAuth.findById(saved._id);
      expect(auth.mustChangePassword).toBe(true);
      expect(await bcrypt.compare(r.phonenumber, auth.password)).toBe(true);
      const exam = await Examination.findOne({ student: saved._id });
      expect(String(exam.school)).toBe(String(schoolA._id));
      expect(await CurrentFee.countDocuments({ student: saved._id, school: schoolA._id })).toBe(1);
      expect((await Level.findById(level._id)).students.map(String)).toContain(String(saved._id));
    });

    it("rejects a bad row up front and writes nothing", async () => {
      const before = await counts();
      const res = await as(
        request(app).post(`${base}/students/many`).send(importBody([row(), row({ dateofbirth: "not a date" })])),
        adminTok
      );
      expect(res.status).toBe(400);
      expect(res.body).toMatch(/Row 2/);
      expect(await counts()).toEqual(before);
    });

    it("rejects an index number repeated inside the file, or used in another school", async () => {
      const taken = uniq("taken");
      await make(Student, { indexnumber: taken, school: schoolB._id, firstname: "Bob" });
      const before = await counts();

      const dup = row();
      const inFile = await as(request(app).post(`${base}/students/many`).send(importBody([dup, { ...dup }])), adminTok);
      expect(inFile.status).toBe(400);
      expect(inFile.body.isDuplicateError).toBe(true);

      const other = await as(request(app).post(`${base}/students/many`).send(importBody([row({ indexnumber: taken.toUpperCase() })])), adminTok);
      expect(other.status).toBe(400);
      expect(other.body.isDuplicateError).toBe(true);
      expect(await counts()).toEqual(before);
    });

    it("ignores fields the client should not choose", async () => {
      const r = row({ school: String(schoolB._id), active: false, _id: String(oid()), createdBy: String(oid()) });
      const res = await as(request(app).post(`${base}/students/many`).send(importBody([r])), adminTok);
      expect(res.status).toBe(200);
      const saved = await Student.findOne({ indexnumber: r.indexnumber });
      expect(String(saved.school)).toBe(String(schoolA._id));
      expect(String(saved._id)).not.toBe(r._id);
      expect(saved.active).not.toBe(false);
      expect(String(saved.createdBy)).toBe(String(adminA._id));
    });

    it("refuses a class or term from another school", async () => {
      const res = await as(
        request(app).post(`${base}/students/many`).send(importBody([row()], {
          session: { levelId: String(levelB._id), termId: String(term._id), sessionId: String(session._id) },
        })),
        adminTok
      );
      expect(res.status).toBe(403);
    });

    it("cleans up completely when a later step fails", async () => {
      const before = await counts();
      const spy = jest.spyOn(CurrentFee, "insertMany").mockRejectedValueOnce(new Error("db down"));
      const res = await as(request(app).post(`${base}/students/many`).send(importBody([row(), row()])), adminTok);
      spy.mockRestore();
      expect(res.status).toBe(500);
      expect(await counts()).toEqual(before);
    });
  });

  describe("adding existing students to a class", () => {
    it("is idempotent: no duplicate exam or fee records and no duplicate class entries", async () => {
      const s = await make(Student, { indexnumber: uniq("ex"), school: schoolA._id, firstname: "Kofi" });
      const body = importBody([{ _id: String(s._id) }], { type: "existing" });

      expect((await as(request(app).post(`${base}/students/many`).send(body), adminTok)).status).toBe(200);
      expect((await as(request(app).post(`${base}/students/many`).send(body), adminTok)).status).toBe(200);

      expect(await Examination.countDocuments({ student: s._id, term: term._id })).toBe(1);
      expect(await CurrentFee.countDocuments({ student: s._id, term: term._id })).toBe(1);
      const members = (await Level.findById(level._id)).students.map(String);
      expect(members.filter((id) => id === String(s._id))).toHaveLength(1);
    });

    it("refuses students of another school", async () => {
      const other = await make(Student, { indexnumber: uniq("ot"), school: schoolB._id, firstname: "Yaw" });
      const res = await as(
        request(app).post(`${base}/students/many`).send(importBody([{ _id: String(other._id) }], { type: "existing" })),
        adminTok
      );
      expect(res.status).toBe(403);
    });
  });

  describe("creating one student", () => {
    const details = (personal, extra = {}) => ({
      details: JSON.stringify({
        session: { termId: String(term._id), sessionId: String(session._id) },
        personal,
        medical: {},
        academic: { level: { _id: String(level._id) } },
        parent: [{ firstname: "Esi", surname: "Mensah", relationship: "mother", school: String(schoolB._id) }],
        ...extra,
      }),
    });

    it("creates the student with parents, flagged login and records", async () => {
      const personal = row();
      const res = await as(request(app).post(`${base}/students`).send(details(personal)), adminTok);
      expect(res.status).toBe(200);
      const saved = await Student.findOne({ indexnumber: personal.indexnumber });
      expect((await StudentAuth.findById(saved._id)).mustChangePassword).toBe(true);
      const parents = await Parent.find({ student: saved._id });
      expect(parents).toHaveLength(1);
      expect(String(parents[0].school)).toBe(String(schoolA._id)); // client-sent school ignored
      expect((await Level.findById(level._id)).students.map(String)).toContain(String(saved._id));
    });

    it("works without parents and refuses a duplicate index number in any school or case", async () => {
      const personal = row();
      expect((await as(request(app).post(`${base}/students`).send(details(personal, { parent: undefined })), adminTok)).status).toBe(200);
      const again = await as(request(app).post(`${base}/students`).send(details({ ...personal, indexnumber: personal.indexnumber.toUpperCase() })), adminTok);
      expect(again.status).toBe(400);
      const otherSchool = await as(request(app).post(`${base}/students`).send(details(personal)), adminBTok);
      expect(otherSchool.status).toBe(403); // admin B cannot use school A's class
    });

    it("rejects invalid details with nothing written", async () => {
      const before = await counts();
      const res = await as(request(app).post(`${base}/students`).send(details(row({ firstname: "" }))), adminTok);
      expect(res.status).toBe(400);
      expect(await counts()).toEqual(before);
    });

    it("rolls back every record when a later step fails", async () => {
      const before = await counts();
      const personal = row();
      const spy = jest.spyOn(CurrentFee, "create").mockRejectedValueOnce(new Error("db down"));
      const res = await as(request(app).post(`${base}/students`).send(details(personal)), adminTok);
      spy.mockRestore();
      expect(res.status).toBe(500);
      expect(await counts()).toEqual(before);
      expect(await Student.exists({ indexnumber: personal.indexnumber })).toBeFalsy();
    });
  });

  describe("student edits", () => {
    it("does not touch another school's login when syncing contact details", async () => {
      const s = await make(Student, { indexnumber: uniq("ed"), school: schoolA._id, firstname: "Ama", phonenumber: "0240000002" });
      await make(StudentAuth, { _id: s._id, indexnumber: s.indexnumber, school: schoolA._id, phonenumber: "0240000002", password: "x" });
      const res = await as(request(app).put(`${base}/students`).send({ _id: String(s._id), phonenumber: "0240000009" }), adminTok);
      expect(res.status).toBe(200);
      expect((await StudentAuth.findById(s._id)).phonenumber).toBe("0240000009");
    });
  });

  describe("teachers", () => {
    it("new teachers are flagged to change the default password, and changing it clears the flag", async () => {
      const username = uniq("tch");
      const res = await as(
        request(app).post(`${base}/teachers`).send({ username, firstname: "Kojo", lastname: "Ade", phonenumber: "0241112222", email: `${username}@example.com` }),
        adminTok
      );
      expect(res.status).toBe(201);
      const t = await User.findOne({ username });
      expect(t.mustChangePassword).toBe(true);
      expect(String(t.school)).toBe(String(schoolA._id));
    });

    it("bulk creation is all-or-nothing", async () => {
      const a = uniq("bt"), b = uniq("bt");
      const spy = jest.spyOn(User, "create")
        .mockImplementationOnce((doc) => new User(doc).save())
        .mockRejectedValueOnce(new Error("db down"));
      const res = await as(
        request(app).post(`${base}/teachers/many`).send({
          students: [
            { username: a, firstname: "A", lastname: "A", phonenumber: "0240000011" },
            { username: b, firstname: "B", lastname: "B", phonenumber: "0240000012" },
          ],
        }),
        adminTok
      );
      spy.mockRestore();
      expect(res.status).toBe(400);
      expect(await User.countDocuments({ username: { $in: [a, b] } })).toBe(0);
    });
  });

  describe("student login", () => {
    it("reports whether the password is still the default", async () => {
      const s = await make(Student, { indexnumber: uniq("lg"), school: schoolA._id, firstname: "Ama", level: level._id, active: true });
      await make(StudentAuth, {
        _id: s._id, indexnumber: s.indexnumber, school: schoolA._id, phonenumber: "0240000003",
        password: await bcrypt.hash("0240000003", 4), mustChangePassword: true,
      });
      const res = await request(app).post(`${base}/student-auth/login`).send({ studentId: s.indexnumber, password: "0240000003" });
      expect(res.status).toBe(200);
      expect(res.body.mustChangePassword).toBe(true);
    });
  });
});
