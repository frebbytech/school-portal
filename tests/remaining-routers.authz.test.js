const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const User = require("../models/userModel");
const Student = require("../models/studentModel");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Course = require("../models/courseModel");
const Subject = require("../models/subjectModel");
const Grade = require("../models/gradeModel");
const Department = require("../models/departmentModel");
const House = require("../models/houseModel");
const Parent = require("../models/parentModel");
const Event = require("../models/eventModel");
const Announcement = require("../models/announcementModel");
const Holiday = require("../models/holidayModel");
const Note = require("../models/noteModel");
const Notification = require("../models/notificationModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

describe("remaining routers: roles, school scope and allow-lists (Stage 4d)", () => {
  let schoolA, schoolB;
  let adminA, teacherA, adminB, teacherB;
  let adminTok, teacherTok, adminBTok, teacherBTok, studentTokA;
  let sessionA, sessionB, termA, termB, levelA, levelB, subjectA, subjectB;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    teacherB = await createUser(schoolB, "teacher");
    adminTok = staffToken(adminA);
    teacherTok = staffToken(teacherA);
    adminBTok = staffToken(adminB);
    teacherBTok = staffToken(teacherB);
    studentTokA = studentToken(oid(), schoolA);

    sessionA = await make(Session, { school: schoolA._id, academicYear: "2026/2027", name: "A session" });
    sessionB = await make(Session, { school: schoolB._id, academicYear: "2026/2027", name: "B session" });
    termA = await make(Term, { school: schoolA._id, session: sessionA._id, term: "1", academicYear: "2026/2027" });
    termB = await make(Term, { school: schoolB._id, session: sessionB._id, term: "1", academicYear: "2026/2027" });
    levelA = await make(Level, {
      school: schoolA._id, session: sessionA._id, term: termA._id,
      level: { name: "Basic ", type: "A" }, initials: "BA", createdBy: adminA._id,
    });
    levelB = await make(Level, {
      school: schoolB._id, session: sessionB._id, term: termB._id,
      level: { name: "Basic ", type: "B" }, initials: "BB", createdBy: adminB._id,
    });
    subjectA = await make(Subject, { session: sessionA._id, term: termA._id, code: "MTH", name: "MATHEMATICS" });
    subjectB = await make(Subject, { session: sessionB._id, term: termB._id, code: "MTH", name: "MATHEMATICS" });
  });

  describe("sessions", () => {
    it("lets staff read, only their own school, and not students", async () => {
      const res = await as(request(app).get(`${base}/sessions`), teacherTok);
      expect(res.status).toBe(200);
      const ids = res.body.map((s) => String(s._id));
      expect(ids).toContain(String(sessionA._id));
      expect(ids).not.toContain(String(sessionB._id));
      expect((await as(request(app).get(`${base}/sessions`), studentTokA)).status).toBe(403);
    });

    it("only administrators create; school and createdBy come from the token", async () => {
      const other = oid();
      expect((await as(request(app).post(`${base}/sessions`).send({ name: "x" }), teacherTok)).status).toBe(403);
      const res = await as(
        request(app).post(`${base}/sessions`).send({ name: "New", academicYear: "2027/2028", school: schoolB._id, createdBy: other }),
        adminTok
      );
      expect(res.status).toBe(200);
      const saved = await Session.findById(res.body._id);
      expect(String(saved.school)).toBe(String(schoolA._id));
      expect(String(saved.createdBy)).toBe(String(adminA._id));
    });

    it("cannot edit or delete another school's session", async () => {
      const put = await as(request(app).put(`${base}/sessions`).send({ id: sessionB._id, name: "hacked" }), adminTok);
      expect(put.status).toBe(404);
      await as(request(app).delete(`${base}/sessions/${sessionB._id}`), adminTok);
      expect((await Session.findById(sessionB._id)).name).toBe("B session");
    });

    it("refuses to delete a session that still has terms", async () => {
      const res = await as(request(app).delete(`${base}/sessions/${sessionA._id}`), adminTok);
      expect(res.status).toBe(409);
      expect(await Session.findById(sessionA._id)).not.toBeNull();
    });
  });

  describe("grades, subjects, departments, houses", () => {
    it("rejects non-admin writes", async () => {
      expect((await as(request(app).post(`${base}/grades`).send({ session: sessionA._id, term: termA._id, name: uniq("g") }), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/departments`).send({ name: "Sci" }), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/houses`).send({ name: "Red" }), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/subjects`).send({ session: sessionA._id, term: termA._id, subjects: [] }), teacherTok)).status).toBe(403);
    });

    it("creates a grade only under the caller's own session and term", async () => {
      const bad = await as(request(app).post(`${base}/grades`).send({ session: sessionB._id, term: termB._id, name: uniq("g") }), adminTok);
      expect(bad.status).toBe(403);
      const good = await as(request(app).post(`${base}/grades`).send({ session: sessionA._id, term: termA._id, name: uniq("g"), school: schoolB._id }), adminTok);
      expect(good.status).toBe(201);
      const saved = await Grade.findOne({ session: sessionA._id, term: termA._id });
      expect(String(saved.school)).toBe(String(schoolA._id));
    });

    it("cannot edit or delete another school's grade, department or house", async () => {
      const grade = await make(Grade, { school: schoolB._id, session: sessionB._id, term: termB._id, name: uniq("gb") });
      const dept = await make(Department, { school: schoolB._id, name: "BDept" });
      const house = await make(House, { school: schoolB._id, name: "BHouse" });

      expect((await as(request(app).put(`${base}/grades`).send({ _id: grade._id, name: "x" }), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/departments/${dept._id}`).send({ name: "x" }), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/houses/${house._id}`).send({ name: "x" }), adminTok)).status).toBe(404);

      await as(request(app).delete(`${base}/grades/${grade._id}`), adminTok);
      expect((await as(request(app).delete(`${base}/departments/${dept._id}`), adminTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/houses/${house._id}`), adminTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/departments/remove`).send({ departments: [dept._id] }), adminTok)).status).toBe(404);

      expect(await Grade.findById(grade._id)).not.toBeNull();
      expect(await Department.findById(dept._id)).not.toBeNull();
      expect(await House.findById(house._id)).not.toBeNull();
    });

    it("does not list or return another school's records", async () => {
      const dept = await make(Department, { school: schoolB._id, name: "Hidden" });
      const list = await as(request(app).get(`${base}/departments`), teacherTok);
      expect(list.body.map((d) => String(d._id))).not.toContain(String(dept._id));
      const byId = await as(request(app).get(`${base}/departments/${dept._id}`), teacherTok);
      expect(byId.body).toBeNull();
    });

    it("subjects: other school's term yields nothing and cannot be written to", async () => {
      const list = await as(request(app).get(`${base}/subjects?session=${sessionB._id}&term=${termB._id}`), adminTok);
      expect(list.body).toEqual([]);
      const own = await as(request(app).get(`${base}/subjects?session=${sessionA._id}&term=${termA._id}`), teacherTok);
      expect(own.body.map((s) => String(s._id))).toContain(String(subjectA._id));

      const create = await as(request(app).post(`${base}/subjects`).send({ session: sessionB._id, term: termB._id, subjects: [{ name: "Art", code: "ART" }] }), adminTok);
      expect(create.status).toBe(403);
      expect(await Subject.countDocuments({ term: termB._id })).toBe(1);

      expect((await as(request(app).put(`${base}/subjects`).send({ _id: subjectB._id, name: "hacked" }), adminTok)).status).toBe(404);
      await as(request(app).delete(`${base}/subjects/${subjectB._id}`), adminTok);
      expect((await Subject.findById(subjectB._id)).name).toBe("MATHEMATICS");
    });
  });

  describe("parents", () => {
    let studentA, studentB, parentB;

    beforeAll(async () => {
      studentA = await make(Student, { indexnumber: uniq("pa"), school: schoolA._id, level: levelA._id, firstname: "Ann", phonenumber: "0240000011" });
      studentB = await make(Student, { indexnumber: uniq("pb"), school: schoolB._id, level: levelB._id, firstname: "Bob", phonenumber: "0240000012" });
      parentB = await make(Parent, { school: schoolB._id, student: studentB._id, firstname: "Pat" });
    });

    it("rejects student tokens and hides other schools", async () => {
      expect((await as(request(app).get(`${base}/parents`), studentTokA)).status).toBe(403);
      const list = await as(request(app).get(`${base}/parents`), teacherTok);
      expect(list.status).toBe(200);
      expect(list.body.map((p) => String(p._id))).not.toContain(String(parentB._id));
      const byStudent = await as(request(app).get(`${base}/parents/student?id=${studentB._id}`), teacherTok);
      expect(byStudent.body).toEqual({});
      const byId = await as(request(app).get(`${base}/parents/${parentB._id}`), teacherTok);
      expect(byId.body).toEqual({});
    });

    it("only administrators create, and only for their own students", async () => {
      const payload = (student) => ({ parents: [{ firstname: "Pam", student, school: schoolB._id }] });
      expect((await as(request(app).post(`${base}/parents`).send(payload(studentA._id)), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/parents`).send(payload(studentB._id)), adminTok)).status).toBe(403);
      const ok = await as(request(app).post(`${base}/parents`).send(payload(studentA._id)), adminTok);
      expect(ok.status).toBe(201);
      const saved = await Parent.findOne({ student: studentA._id });
      expect(String(saved.school)).toBe(String(schoolA._id));
    });

    it("cannot edit or deactivate another school's parent; deactivation never deletes", async () => {
      expect((await as(request(app).put(`${base}/parents`).send({ _id: parentB._id, firstname: "x" }), adminTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/parents/${parentB._id}`), adminTok)).status).toBe(404);
      expect((await Parent.findById(parentB._id)).active).toBe(true);

      const own = await Parent.findOne({ student: studentA._id });
      expect((await as(request(app).delete(`${base}/parents/${own._id}`), adminTok)).status).toBe(201);
      const after = await Parent.findById(own._id);
      expect(after).not.toBeNull();
      expect(after.active).toBe(false);
    });
  });

  describe("teachers", () => {
    it("rejects student tokens; teachers can read but not manage", async () => {
      expect((await as(request(app).get(`${base}/teachers`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/teachers`), teacherTok)).status).toBe(200);
      const body = { username: uniq("t"), phonenumber: "0241112222", firstname: "N", lastname: "T", email: `${uniq("e")}@x.com` };
      expect((await as(request(app).post(`${base}/teachers`).send(body), teacherTok)).status).toBe(403);
      expect((await as(request(app).put(`${base}/teachers`).send({ _id: teacherA._id, firstname: "x" }), teacherTok)).status).toBe(403);
      expect((await as(request(app).delete(`${base}/teachers/${teacherA._id}`), teacherTok)).status).toBe(403);
    });

    it("an administrator creates a teacher in their own school with a forced role", async () => {
      const username = uniq("t");
      const res = await as(
        request(app).post(`${base}/teachers`).send({
          username, phonenumber: "0241112223", firstname: "New", lastname: "Teacher",
          email: `${uniq("e")}@x.com`, role: "administrator", school: schoolB._id, permissions: ["all"],
        }),
        adminTok
      );
      expect(res.status).toBe(201);
      const saved = await User.findOne({ username });
      expect(saved.role).toBe("teacher");
      expect(String(saved.school)).toBe(String(schoolA._id));
    });

    it("does not read another school's teacher by id", async () => {
      const res = await as(request(app).get(`${base}/teachers/${teacherB._id}`), adminTok);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it("update is allow-listed, never upserts, and cannot reach other schools or admins", async () => {
      const res = await as(
        request(app).put(`${base}/teachers`).send({ _id: teacherA._id, firstname: "Renamed", role: "administrator", password: "x", school: schoolB._id }),
        adminTok
      );
      expect(res.status).toBe(201);
      const after = await User.findById(teacherA._id);
      expect(after.role).toBe("teacher");
      expect(String(after.school)).toBe(String(schoolA._id));
      expect(after.password).not.toBe("x");

      const before = await User.countDocuments();
      expect((await as(request(app).put(`${base}/teachers`).send({ _id: oid(), firstname: "ghost" }), adminTok)).status).toBe(404);
      expect(await User.countDocuments()).toBe(before);

      expect((await as(request(app).put(`${base}/teachers`).send({ _id: teacherB._id, firstname: "hacked" }), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/teachers`).send({ _id: adminA._id, firstname: "hacked" }), adminTok)).status).toBe(404);
      expect((await User.findById(teacherB._id)).firstname).not.toBe("hacked");
    });

    it("deactivates (never deletes) and only inside the school", async () => {
      expect((await as(request(app).delete(`${base}/teachers/${teacherB._id}`), adminTok)).status).toBe(400);
      expect((await User.findById(teacherB._id)).active).not.toBe(false);
      const victim = await createUser(schoolA, "teacher");
      expect((await as(request(app).delete(`${base}/teachers/${victim._id}`), adminTok)).status).toBe(200);
      const after = await User.findById(victim._id);
      expect(after).not.toBeNull();
      expect(after.active).toBe(false);
    });
  });

  describe("courses", () => {
    it("only administrators assign; references must be in the school", async () => {
      const body = { session: sessionA._id, term: termA._id, level: levelA._id, subject: subjectA._id, teacher: teacherA._id, subjectName: "Maths", levelName: "A" };
      expect((await as(request(app).post(`${base}/courses`).send(body), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/courses`).send({ ...body, level: levelB._id }), adminTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/courses`).send({ ...body, teacher: teacherB._id }), adminTok)).status).toBe(403);
      expect(await Course.countDocuments({ school: schoolA._id })).toBe(0);
    });

    it("a teacher sees only their own dashboard and course list", async () => {
      const course = await make(Course, { school: schoolA._id, session: sessionA._id, term: termA._id, level: levelA._id, subject: subjectA._id, teacher: teacherA._id, active: true });
      const q = (t) => `session=${sessionA._id}&term=${termA._id}&teacher=${t}`;
      const own = await as(request(app).get(`${base}/courses/teacher?${q(teacherA._id)}`), teacherTok);
      expect(own.status).toBe(200);
      expect(own.body.map((c) => String(c._id))).toContain(String(course._id));

      const other = await createUser(schoolA, "teacher");
      expect((await as(request(app).get(`${base}/courses/teacher?${q(other._id)}`), teacherTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/courses/dashboard?${q(other._id)}`), teacherTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/courses/teacher?${q(teacherA._id)}`), studentTokA)).status).toBe(403);
      // an administrator may look at any teacher of their school, but not another school's
      expect((await as(request(app).get(`${base}/courses/teacher?${q(teacherA._id)}`), adminTok)).status).toBe(200);
      expect((await as(request(app).get(`${base}/courses/teacher?${q(teacherB._id)}`), adminTok)).status).toBe(403);
    });

    it("cannot update or delete another school's course", async () => {
      const course = await make(Course, { school: schoolB._id, session: sessionB._id, term: termB._id, level: levelB._id, subject: subjectB._id, teacher: teacherB._id, active: true });
      expect((await as(request(app).put(`${base}/courses`).send({ id: course._id, active: false }), adminTok)).status).toBe(404);
      await as(request(app).delete(`${base}/courses/${course._id}`), adminTok);
      const after = await Course.findById(course._id);
      expect(after).not.toBeNull();
      expect(after.active).toBe(true);
    });
  });

  describe("terms", () => {
    it("rejects student tokens and non-admin writes", async () => {
      expect((await as(request(app).get(`${base}/terms`), studentTokA)).status).toBe(403);
      expect((await as(request(app).put(`${base}/terms`).send({ termId: termA._id, core: { name: "x" } }), teacherTok)).status).toBe(403);
      expect((await as(request(app).delete(`${base}/terms/${termA._id}`), teacherTok)).status).toBe(403);
      expect((await as(request(app).patch(`${base}/terms/${termA._id}?status=current`), teacherTok)).status).toBe(403);
    });

    it("does not return or modify another school's term", async () => {
      expect((await as(request(app).get(`${base}/terms/${termB._id}`), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/terms`).send({ termId: termB._id, core: { name: "hacked" } }), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/terms/account`).send({ id: termB._id, active: true }), adminTok)).status).toBe(404);
      expect((await as(request(app).patch(`${base}/terms/${termB._id}?status=current`), adminTok)).status).toBe(404);
      await as(request(app).put(`${base}/terms/remove`).send([termB._id]), adminTok);
      await as(request(app).delete(`${base}/terms/${termB._id}`), adminTok);
      const after = await Term.findById(termB._id);
      expect(after).not.toBeNull();
      expect(after.status).toBe("upcoming");
    });

    it("rejects an invalid status and ignores protected fields on update", async () => {
      expect((await as(request(app).patch(`${base}/terms/${termA._id}?status=banana`), adminTok)).status).toBe(400);
      const res = await as(
        request(app).put(`${base}/terms`).send({ termId: termA._id, core: { name: "Renamed", school: schoolB._id, status: "archived" } }),
        adminTok
      );
      expect(res.status).toBe(201);
      const after = await Term.findById(termA._id);
      expect(after.name).toBe("Renamed");
      expect(String(after.school)).toBe(String(schoolA._id));
      expect(after.status).toBe("upcoming");
    });
  });

  describe("levels", () => {
    it("POST /levels/delete/many never deletes anything it was not asked to (was: deleted every level)", async () => {
      for (const body of [[], {}, { ids: [] }, { ids: {} }, { ids: "all" }]) {
        const res = await as(request(app).post(`${base}/levels/delete/many`).send(body), adminTok);
        expect(res.status).toBe(404);
      }
      expect(await Level.countDocuments({ _id: { $in: [levelA._id, levelB._id] } })).toBe(2);
    });

    it("delete/many is admin only and limited to the caller's school", async () => {
      expect((await as(request(app).post(`${base}/levels/delete/many`).send([levelA._id]), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/levels/delete/many`).send([levelB._id]), adminTok)).status).toBe(404);
      expect(await Level.findById(levelB._id)).not.toBeNull();
      expect(await Level.findById(levelA._id)).not.toBeNull();
    });

    it("students may only use the dashboard counts and birthdays", async () => {
      const q = `session=${sessionA._id}&term=${termA._id}`;
      expect((await as(request(app).get(`${base}/levels/dashboard-info?${q}`), studentTokA)).status).toBe(200);
      expect((await as(request(app).get(`${base}/levels/recent/birthday`), studentTokA)).status).toBe(200);
      expect((await as(request(app).get(`${base}/levels/session?${q}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/levels/${levelA._id}`), studentTokA)).status).toBe(403);
    });

    it("staff cannot read another school's levels", async () => {
      expect((await as(request(app).get(`${base}/levels/session?session=${sessionB._id}&term=${termB._id}`), adminTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/levels/dashboard-info?session=${sessionB._id}&term=${termB._id}`), adminTok)).status).toBe(403);
      const byId = await as(request(app).get(`${base}/levels/${levelB._id}`), adminTok);
      expect(byId.body).toBeNull();
      const own = await as(request(app).get(`${base}/levels/session?session=${sessionA._id}&term=${termA._id}`), teacherTok);
      expect(own.status).toBe(200);
    });

    it("writes are admin only, allow-listed and school-checked", async () => {
      const body = { session: sessionA._id, term: termA._id, level: { name: "Basic ", type: "Z" }, initials: "BZ" };
      expect((await as(request(app).post(`${base}/levels`).send(body), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/levels`).send({ ...body, term: termB._id }), adminTok)).status).toBe(403);
      const ok = await as(request(app).post(`${base}/levels`).send({ ...body, school: schoolB._id }), adminTok);
      expect(ok.status).toBe(201);
      const saved = await Level.findOne({ term: termA._id, initials: "BZ" });
      expect(String(saved.school)).toBe(String(schoolA._id));

      expect((await as(request(app).put(`${base}/levels`).send({ _id: levelB._id, level: { name: "x" } }), adminTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/levels?id=${levelB._id}`), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/levels/assign-teacher`).send({ _id: levelA._id, teacher: teacherB._id }), adminTok)).status).toBe(400);
      expect((await as(request(app).put(`${base}/levels/unassign-teacher?id=${levelB._id}`), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/levels/grade`).send({ levels: [levelB._id], grade: oid() }), adminTok)).status).toBe(403);
      expect(await Level.findById(levelB._id)).not.toBeNull();
    });
  });

  describe("events, announcements, holidays", () => {
    it("students and staff read their own school only; only administrators write", async () => {
      const mine = await make(Event, { school: schoolA._id, title: "Sports day" });
      const theirs = await make(Event, { school: schoolB._id, title: "Their day" });
      const list = await as(request(app).get(`${base}/events`), studentTokA);
      expect(list.status).toBe(200);
      const ids = list.body.map((e) => String(e._id));
      expect(ids).toContain(String(mine._id));
      expect(ids).not.toContain(String(theirs._id));
      expect((await as(request(app).get(`${base}/events/${theirs._id}`), studentTokA)).body).toBeNull();

      expect((await as(request(app).post(`${base}/events`).send({ title: "x" }), studentTokA)).status).toBe(403);
      expect((await as(request(app).post(`${base}/events`).send({ title: "x" }), teacherTok)).status).toBe(403);
      expect((await as(request(app).put(`${base}/events`).send({ _id: theirs._id, title: "hacked" }), adminTok)).status).toBe(404);
      await as(request(app).delete(`${base}/events/${theirs._id}`), adminTok);
      await as(request(app).put(`${base}/events/remove`).send({ events: [theirs._id] }), adminTok);
      expect((await Event.findById(theirs._id)).title).toBe("Their day");
    });

    it("an event notifies only the staff of its own school", async () => {
      const res = await as(request(app).post(`${base}/events`).send({ title: "Fan-out", caption: "hello", session: sessionA._id, term: termA._id }), adminTok);
      expect(res.status).toBe(200);
      expect(await Notification.countDocuments({ user: teacherA._id, title: "Fan-out" })).toBe(1);
      expect(await Notification.countDocuments({ user: teacherB._id, title: "Fan-out" })).toBe(0);
      expect(await Notification.countDocuments({ user: adminB._id, title: "Fan-out" })).toBe(0);
    });

    it("an announcement for everyone stays inside the school", async () => {
      const res = await as(
        request(app).post(`${base}/announcements`).send({ title: "Notice", description: "d", group: "all", session: sessionA._id, term: termA._id }),
        adminTok
      );
      expect(res.status).toBe(200);
      expect(await Notification.countDocuments({ user: teacherA._id, title: "Notice" })).toBe(1);
      expect(await Notification.countDocuments({ user: teacherB._id, title: "Notice" })).toBe(0);
      expect((await as(request(app).post(`${base}/announcements`).send({ title: "x" }), teacherTok)).status).toBe(403);
      const theirs = await make(Announcement, { school: schoolB._id, title: "Theirs" });
      expect((await as(request(app).put(`${base}/announcements`).send({ _id: theirs._id, title: "hacked" }), adminTok)).status).toBe(404);
      await as(request(app).delete(`${base}/announcements/${theirs._id}`), adminTok);
      expect((await Announcement.findById(theirs._id)).title).toBe("Theirs");
    });

    it("holidays: members read their school, only administrators write", async () => {
      const mine = await make(Holiday, { school: schoolA._id, name: "Mine", date: new Date("2026-12-25") });
      const theirs = await make(Holiday, { school: schoolB._id, name: "Theirs", date: new Date("2026-12-26") });
      const list = await as(request(app).get(`${base}/holidays`), studentTokA);
      const ids = list.body.map((h) => String(h._id));
      expect(ids).toContain(String(mine._id));
      expect(ids).not.toContain(String(theirs._id));
      expect((await as(request(app).get(`${base}/holidays/${theirs._id}`), studentTokA)).status).toBe(404);

      const payload = { name: "New", date: "2026-12-30" };
      expect((await as(request(app).post(`${base}/holidays`).send(payload), teacherTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/holidays`).send(payload), adminTok)).status).toBe(201);
      expect((await as(request(app).put(`${base}/holidays`).send({ _id: theirs._id, name: "hacked" }), adminTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/holidays/${theirs._id}`), adminTok)).status).toBe(404);
      expect((await Holiday.findById(theirs._id)).name).toBe("Theirs");
    });
  });

  describe("notes and notifications are private", () => {
    it("a user cannot read, edit or delete someone else's note", async () => {
      const note = await make(Note, { user: teacherB._id, title: "Private", content: "secret", color: "#ffc09f" });
      const mineList = await as(request(app).get(`${base}/notes`), teacherTok);
      expect(mineList.body.map((n) => String(n._id))).not.toContain(String(note._id));

      const put = await as(request(app).put(`${base}/notes/${note._id}`).send({ title: "hacked", content: "x", color: "#ffc09f" }), teacherTok);
      expect(put.status).toBe(404);
      expect((await as(request(app).delete(`${base}/notes/${note._id}`), teacherTok)).status).toBe(404);
      const after = await Note.findById(note._id);
      expect(after.title).toBe("Private");
    });

    it("a note is always created for the caller", async () => {
      const res = await as(
        request(app).post(`${base}/notes`).send({ title: "T", content: "C", color: "#ffc09f", user: String(teacherB._id) }),
        teacherTok
      );
      expect(res.status).toBe(201);
      expect(String(res.body.user)).toBe(String(teacherA._id));
    });

    it("a user cannot read, change or delete someone else's notifications", async () => {
      const base_ = { school: schoolB._id, session: sessionB._id, term: termB._id, type: "Info", title: "For B", createdBy: adminB._id };
      const n1 = await make(Notification, { ...base_, user: teacherB._id });
      const n2 = await make(Notification, { ...base_, user: teacherB._id });

      const list = await as(request(app).get(`${base}/notifications`), teacherTok);
      expect(list.body.map((n) => String(n._id))).not.toContain(String(n1._id));
      expect((await as(request(app).get(`${base}/notifications/${n1._id}`), teacherTok)).body).toBeNull();

      await as(request(app).put(`${base}/notifications/${n1._id}/read`), teacherTok);
      expect((await as(request(app).put(`${base}/notifications/${teacherB._id}/read-all`), teacherTok)).status).toBe(403);
      expect((await as(request(app).put(`${base}/notifications`).send({ _id: n1._id, active: false }), teacherTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/notifications/${n1._id}`), teacherTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/notifications/remove`).send({ notifications: [n1._id, n2._id] }), teacherTok)).status).toBe(404);
      expect((await as(request(app).delete(`${base}/notifications/${teacherB._id}/all`), teacherTok)).status).toBe(403);

      expect((await Notification.findById(n1._id)).active).toBe(true);
      expect(await Notification.findById(n2._id)).not.toBeNull();
    });

    it("a user can manage their own notifications, and only the read state is editable", async () => {
      const mine = await make(Notification, { school: schoolA._id, session: sessionA._id, term: termA._id, type: "Info", title: "Mine", createdBy: adminA._id, user: teacherA._id });
      expect((await as(request(app).put(`${base}/notifications`).send({ _id: mine._id, active: false, title: "changed", user: teacherB._id }), teacherTok)).status).toBe(200);
      const after = await Notification.findById(mine._id);
      expect(after.active).toBe(false);
      expect(after.title).toBe("Mine");
      expect(String(after.user)).toBe(String(teacherA._id));

      expect((await as(request(app).put(`${base}/notifications/${teacherA._id}/read-all`), teacherTok)).status).toBe(200);
      expect((await as(request(app).delete(`${base}/notifications/${mine._id}`), teacherTok)).status).toBe(200);
      expect(await Notification.findById(mine._id)).toBeNull();
    });
  });
});
