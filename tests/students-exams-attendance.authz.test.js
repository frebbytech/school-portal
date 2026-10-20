const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const Student = require("../models/studentModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Course = require("../models/courseModel");
const Examination = require("../models/examinationModel");
const Attendance = require("../models/attendanceModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const idx = (p) => `${p}${oid().toString().slice(-10)}`;

describe("students, results and attendance authorization (finding C-6, teacher scope)", () => {
  let schoolA, schoolB;
  let adminA, classTeacher, courseTeacher, outsider, adminB;
  let adminTok, classTok, courseTok, outsiderTok, adminBTok;
  let levelA, levelB, termA, studentA, studentA2, studentB, studentTokA;
  let subject1, subject2, examA, examA2, examB;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    classTeacher = await createUser(schoolA, "teacher");
    courseTeacher = await createUser(schoolA, "teacher");
    outsider = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    adminTok = staffToken(adminA);
    classTok = staffToken(classTeacher);
    courseTok = staffToken(courseTeacher);
    outsiderTok = staffToken(outsider);
    adminBTok = staffToken(adminB);

    levelA = await make(Level, { school: schoolA._id, teacher: classTeacher._id });
    levelB = await make(Level, { school: schoolB._id });
    termA = await make(Term, {
      school: schoolA._id,
      active: true,
      from: new Date("2026-09-01"),
      to: new Date("2026-12-20"),
    });

    studentA = await make(Student, { indexnumber: idx("a"), school: schoolA._id, level: levelA._id, firstname: "Ann", phonenumber: "0240000001" });
    studentA2 = await make(Student, { indexnumber: idx("c"), school: schoolA._id, level: levelA._id, firstname: "Cy", phonenumber: "0240000003" });
    studentB = await make(Student, { indexnumber: idx("b"), school: schoolB._id, level: levelB._id, firstname: "Bob", phonenumber: "0240000002" });
    studentTokA = studentToken(studentA._id, schoolA);

    subject1 = oid();
    subject2 = oid();
    await make(Course, { school: schoolA._id, level: levelA._id, teacher: courseTeacher._id, subject: subject1, active: true });

    const scores = [
      { _id: String(subject1), subject: "Maths", totalScore: 10 },
      { _id: String(subject2), subject: "English", totalScore: 20 },
    ];
    examA = await make(Examination, { session: oid(), term: termA._id, level: levelA._id, student: studentA._id, scores });
    examA2 = await make(Examination, { session: oid(), term: termA._id, level: levelA._id, student: studentA2._id, scores: [] });
    examB = await make(Examination, { session: oid(), term: oid(), level: levelB._id, student: studentB._id, scores: [] });
  });

  describe("students", () => {
    it("lets staff list their school's students and keeps students out", async () => {
      const res = await as(request(app).get(`${base}/students`), outsiderTok);
      expect(res.status).toBe(200);
      const ids = res.body.map((s) => String(s._id));
      expect(ids).toContain(String(studentA._id));
      expect(ids).not.toContain(String(studentB._id));
      expect((await as(request(app).get(`${base}/students`), studentTokA)).status).toBe(403);
    });

    it("lets a student read only their own record", async () => {
      expect((await as(request(app).get(`${base}/students/${studentA._id}`), studentTokA)).status).toBe(200);
      expect((await as(request(app).get(`${base}/students/${studentA2._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/students/${studentA._id}/profile`), studentTokA)).status).toBe(403);
    });

    it("hides other schools' students from staff", async () => {
      expect((await as(request(app).get(`${base}/students/${studentB._id}`), adminTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/students/${studentB._id}/profile`), adminTok)).status).toBe(403);
    });

    it("lets only administrators change students", async () => {
      expect((await as(request(app).put(`${base}/students`), outsiderTok).send({ _id: String(studentA._id), firstname: "X" })).status).toBe(403);
      expect((await as(request(app).patch(`${base}/students/disable?id=${studentA._id}&active=Yes`), outsiderTok)).status).toBe(403);
      expect((await as(request(app).delete(`${base}/students?id=${studentA._id}`), outsiderTok)).status).toBe(403);
      expect((await Student.findById(studentA._id)).active).toBe(true);
    });

    it("edits only allowed fields of a student in the same school, without upsert", async () => {
      const res = await as(request(app).put(`${base}/students`), adminTok).send({
        _id: String(studentA2._id),
        firstname: "Cyrus",
        school: String(schoolB._id),
        active: false,
        indexnumber: "hijacked",
      });
      expect(res.status).toBe(200);
      const after = await Student.findById(studentA2._id);
      expect(after.firstname.toLowerCase()).toBe("cyrus"); // the model lower-cases names
      expect(String(after.school)).toBe(String(schoolA._id));
      expect(after.active).toBe(true);
      expect(after.indexnumber).not.toBe("hijacked");

      const before = await Student.countDocuments();
      const foreign = await as(request(app).put(`${base}/students`), adminTok).send({ _id: String(studentB._id), firstname: "Hijacked" });
      expect(foreign.status).toBe(404);
      const missing = await as(request(app).put(`${base}/students`), adminTok).send({ _id: String(oid()), firstname: "Ghost" });
      expect(missing.status).toBe(404);
      expect(await Student.countDocuments()).toBe(before);
      expect((await Student.findById(studentB._id)).firstname).toBe("bob");
    });

    it("deactivates (never deletes) and can re-enable", async () => {
      const target = await make(Student, { indexnumber: idx("d"), school: schoolA._id, firstname: "Dee" });
      const res = await as(request(app).delete(`${base}/students?id=${target._id}`), adminTok);
      expect(res.status).toBe(200);
      const after = await Student.findById(target._id);
      expect(after).toBeTruthy();
      expect(after.active).toBe(false);

      const enable = await as(request(app).patch(`${base}/students/disable?id=${target._id}&active=No`), adminTok);
      expect(enable.status).toBe(200);
      expect((await Student.findById(target._id)).active).toBe(true);
    });

    it("cannot deactivate another school's student", async () => {
      await as(request(app).delete(`${base}/students?id=${studentB._id}`), adminTok);
      expect((await Student.findById(studentB._id)).active).toBe(true);
      const res = await as(request(app).patch(`${base}/students/disable?id=${studentB._id}&active=Yes`), adminTok);
      expect(res.status).toBe(404);
      expect((await Student.findById(studentB._id)).active).toBe(true);
    });

    it("refuses to enrol a student into another school's class", async () => {
      const details = {
        session: { sessionId: String(oid()), termId: String(termA._id) },
        personal: { indexnumber: idx("n"), firstname: "New", phonenumber: "0240000009" },
        academic: { level: { _id: String(levelB._id) } },
        parent: [],
      };
      const res = await as(request(app).post(`${base}/students`), adminTok).send({ details: JSON.stringify(details) });
      expect(res.status).toBe(403);
      expect(await Student.exists({ indexnumber: details.personal.indexnumber })).toBeNull();
    });
  });

  describe("attendance", () => {
    const day = "2026-10-12"; // a Monday

    it("keeps students and unrelated teachers out", async () => {
      expect((await as(request(app).get(`${base}/attendances`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/attendances/${levelA._id}?date=${day}`), outsiderTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/attendances/history/${levelA._id}`), outsiderTok)).status).toBe(403);
      const post = await as(request(app).post(`${base}/attendances`), outsiderTok).send({ level: String(levelA._id), date: day, status: [] });
      expect(post.status).toBe(403);
    });

    it("lets the class teacher, a course teacher and an administrator of the school in", async () => {
      expect((await as(request(app).get(`${base}/attendances/${levelA._id}?date=${day}`), classTok)).status).toBe(200);
      expect((await as(request(app).get(`${base}/attendances/history/${levelA._id}`), courseTok)).status).toBe(200);
      expect((await as(request(app).get(`${base}/attendances/history/${levelA._id}`), adminTok)).status).toBe(200);
    });

    it("keeps another school's administrator out of the level", async () => {
      expect((await as(request(app).get(`${base}/attendances/history/${levelA._id}`), adminBTok)).status).toBe(403);
      const post = await as(request(app).post(`${base}/attendances`), adminBTok).send({ level: String(levelA._id), date: day, status: [] });
      expect(post.status).toBe(403);
    });

    it("lists only accessible levels' registers", async () => {
      const mineA = await make(Attendance, { level: levelA._id, term: termA._id, date: new Date("2026-10-13"), status: [], active: true });
      const theirsB = await make(Attendance, { level: levelB._id, date: new Date("2026-10-13"), status: [], active: true });

      const admin = (await as(request(app).get(`${base}/attendances`), adminTok)).body.map((a) => String(a._id));
      expect(admin).toContain(String(mineA._id));
      expect(admin).not.toContain(String(theirsB._id));

      const outsiderList = (await as(request(app).get(`${base}/attendances`), outsiderTok)).body.map((a) => String(a._id));
      expect(outsiderList).not.toContain(String(mineA._id));
    });

    it("shows a student their own level's register with only their own entry", async () => {
      const reg = await make(Attendance, {
        level: levelA._id,
        term: termA._id,
        date: new Date("2026-10-14"),
        active: true,
        status: [
          { _id: String(studentA._id), status: "Present" },
          { _id: String(studentA2._id), status: "Absent" },
        ],
      });
      const other = await make(Attendance, { level: levelB._id, date: new Date("2026-10-14"), active: true, status: [{ _id: String(studentB._id), status: "Present" }] });

      const res = await as(request(app).get(`${base}/attendances/level/${levelA._id}`), studentTokA);
      expect(res.status).toBe(200);
      const mine = res.body.find((a) => String(a._id) === String(reg._id));
      expect(mine).toBeTruthy();
      expect(mine.status).toHaveLength(1);
      expect(mine.status[0]._id).toBe(String(studentA._id));
      expect(res.body.map((a) => String(a._id))).not.toContain(String(other._id));
    });

    it("lets a register be edited only through status/active, only for accessible levels", async () => {
      const reg = await make(Attendance, { level: levelA._id, term: termA._id, date: new Date("2026-10-15"), active: true, status: [] });
      expect((await as(request(app).put(`${base}/attendances`), outsiderTok).send({ id: String(reg._id), status: [{ x: 1 }] })).status).toBe(403);

      const res = await as(request(app).put(`${base}/attendances`), classTok).send({
        id: String(reg._id), status: [{ _id: "s", status: "Present" }], level: String(levelB._id),
      });
      expect(res.status).toBe(201);
      const after = await Attendance.findById(reg._id);
      expect(after.status).toHaveLength(1);
      expect(String(after.level)).toBe(String(levelA._id));
    });
  });

  describe("examinations", () => {
    it("lets a student open only their own results and never publish", async () => {
      expect((await as(request(app).get(`${base}/examinations/${examA._id}`), studentTokA)).status).not.toBe(403);
      expect((await as(request(app).get(`${base}/examinations/${examA2._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/${examA._id}?publish=true&type=sms`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/analytics/${studentA2._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/academic/${studentA2._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/analytics/${studentA._id}`), studentTokA)).status).not.toBe(403);
    });

    it("keeps students out of the staff-only result routes", async () => {
      expect((await as(request(app).get(`${base}/examinations/details?level=${levelA._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).post(`${base}/examinations`), studentTokA).send({ examsId: String(examA._id), scores: [] })).status).toBe(403);
    });

    it("applies the teacher scope to reading results", async () => {
      expect((await as(request(app).get(`${base}/examinations/${examA._id}`), outsiderTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/${examA._id}`), classTok)).status).not.toBe(403);
      expect((await as(request(app).get(`${base}/examinations/${examA._id}`), courseTok)).status).not.toBe(403);
      expect((await as(request(app).get(`${base}/examinations/details?level=${levelA._id}`), outsiderTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/analytics/${studentA._id}`), outsiderTok)).status).toBe(403);
    });

    it("keeps another school's administrator out", async () => {
      expect((await as(request(app).get(`${base}/examinations/${examA._id}`), adminBTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/details?level=${levelA._id}`), adminBTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/${examB._id}`), adminTok)).status).toBe(403);
    });

    it("limits a course teacher to their own subject when reading by subject", async () => {
      const own = await as(request(app).get(`${base}/examinations/subject?id=${levelA._id}&subject=${subject1}`), courseTok);
      expect(own.status).toBe(200);
      const other = await as(request(app).get(`${base}/examinations/subject?id=${levelA._id}&subject=${subject2}`), courseTok);
      expect(other.status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/subject?id=${levelA._id}&subject=${subject2}`), classTok)).status).toBe(200);
    });

    it("limits a course teacher to their own subject when entering scores", async () => {
      const mine = { _id: String(subject1), subject: "Maths", classScore: 20, examsScore: 30, totalScore: 50 };
      const theirs = { _id: String(subject2), subject: "English", classScore: 40, examsScore: 50, totalScore: 90 };

      const bad = await as(request(app).post(`${base}/examinations`), courseTok).send({ examsId: String(examA._id), scores: [theirs] });
      expect(bad.status).toBe(403);
      expect((await as(request(app).post(`${base}/examinations`), outsiderTok).send({ examsId: String(examA._id), scores: [mine] })).status).toBe(403);
      expect((await Examination.findById(examA._id)).scores.find((s) => s._id === String(subject2)).totalScore).toBe(20);

      const ok = await as(request(app).post(`${base}/examinations`), courseTok).send({ examsId: String(examA._id), scores: [mine] });
      expect(ok.status).toBe(201);
    });

    it("never lets a course teacher's update remove or change other subjects' scores", async () => {
      const fresh = await make(Examination, {
        session: oid(), term: termA._id, level: levelA._id, student: studentA2._id,
        scores: [
          { _id: String(subject1), subject: "Maths", totalScore: 10 },
          { _id: String(subject2), subject: "English", totalScore: 20 },
        ],
      });
      const res = await as(request(app).post(`${base}/examinations/update`), courseTok).send({
        session: { examsId: String(fresh._id) },
        scores: [{ _id: String(subject1), subject: "Maths", totalScore: 55 }],
      });
      expect(res.status).toBe(201);
      const after = await Examination.findById(fresh._id);
      expect(after.scores.find((s) => s._id === String(subject1)).totalScore).toBe(55);
      expect(after.scores.find((s) => s._id === String(subject2)).totalScore).toBe(20);

      const forbidden = await as(request(app).post(`${base}/examinations/update`), courseTok).send({
        session: { examsId: String(fresh._id) },
        scores: [{ _id: String(subject2), totalScore: 99 }],
      });
      expect(forbidden.status).toBe(403);
    });

    it("limits bulk uploads and comments", async () => {
      const bulk = await as(request(app).post(`${base}/examinations/bulk`), courseTok).send({
        session: String(oid()), term: String(termA._id), level: String(levelA._id),
        results: [{ _id: String(subject2), indexnumber: "x", subject: "English", totalScore: 1 }],
      });
      expect(bulk.status).toBe(403);
      expect((await as(request(app).post(`${base}/examinations/bulk`), outsiderTok).send({ level: String(levelA._id), results: [] })).status).toBe(403);

      expect((await as(request(app).put(`${base}/examinations/comments`), courseTok).send({ _id: String(examA._id), comments: "x" })).status).toBe(403);
      const ok = await as(request(app).put(`${base}/examinations/comments`), classTok).send({ _id: String(examA._id), comments: "Well done" });
      expect(ok.status).toBe(201);
      expect((await Examination.findById(examA._id)).comments).toBe("Well done");
    });

    it("needs the whole level (class teacher or administrator) for report cards", async () => {
      const q = `sessionId=${oid()}&termId=${termA._id}&levelId=${levelA._id}`;
      expect((await as(request(app).get(`${base}/examinations/reports?${q}`), courseTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/publish?${q}&type=sms`), courseTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/examinations/reports?${q}`), adminBTok)).status).toBe(403);
    });
  });
});
