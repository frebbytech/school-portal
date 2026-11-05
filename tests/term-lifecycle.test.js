const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../config/mail/mailer", () => jest.fn().mockRejectedValue(new Error("mail server down")));

const app = require("../app");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Examination = require("../models/examinationModel");
const CurrentFee = require("../models/currentFeeModel");
const Attendance = require("../models/attendanceModel");
const Course = require("../models/courseModel");
const Notification = require("../models/notificationModel");
const { createRollback } = require("../common/rollback");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

const student = (overrides = {}) => ({
  indexnumber: uniq("ix"),
  firstname: "Ama",
  surname: "Mensah",
  dateofbirth: "2015-05-05",
  gender: "female",
  ...overrides,
});
const levelDef = (name, initials) => ({ name, type: "A", initials });
const payload = (overrides = {}) => ({
  core: { name: "Test Year", from: "2031-09-01", to: "2032-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
  levels: [levelDef("Basic 1", "B1")],
  students: [{ class: levelDef("Basic 1", "B1"), isPrevious: false, data: [student()] }],
  exams: { scorePreference: "50/50" },
  report: { template: "template1", dimension: "A4" },
  ...overrides,
});

describe("rollback helper", () => {
  it("removes only what was tracked, newest first, and never throws", async () => {
    const calls = [];
    const fake = (name, fail = false) => ({
      modelName: name,
      deleteMany: async () => {
        calls.push(name);
        if (fail) throw new Error("boom");
      },
    });
    const created = createRollback();
    created.track(fake("A"), [{ _id: 1 }, { _id: 2 }]);
    created.track(fake("B", true), { _id: 3 });
    created.track(fake("C"), null);
    await expect(created.undo()).resolves.toBeUndefined();
    expect(calls).toEqual(["B", "A"]);
    expect(created.size()).toBe(0);
  });
});

describe("term lifecycle (Stage 6)", () => {
  let schoolA, schoolB, adminA, teacherA, adminB, adminTok, teacherTok, adminBTok;

  const countFor = async (schoolId) => ({
    sessions: await Session.countDocuments({ school: schoolId }),
    terms: await Term.countDocuments({ school: schoolId }),
    levels: await Level.countDocuments({ school: schoolId }),
    students: await Student.countDocuments({ school: schoolId }),
  });

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    adminTok = staffToken(adminA);
    teacherTok = staffToken(teacherA);
    adminBTok = staffToken(adminB);
  });

  describe("creating a term", () => {
    it("only administrators can create one", async () => {
      expect((await as(request(app).post(`${base}/terms`).send(payload()), teacherTok)).status).toBe(403);
    });

    it("creates the session, term, levels, students and their exam and fee records", async () => {
      const body = payload();
      const res = await as(request(app).post(`${base}/terms`).send(body), adminTok);
      expect(res.status).toBe(201);

      const term = await Term.findOne({ school: schoolA._id, academicYear: "2031/2032" });
      expect(term).toBeTruthy();
      expect(term.status).toBe("upcoming");
      const level = await Level.findOne({ term: term._id });
      expect(level.students).toHaveLength(1);
      const created = await Student.findById(level.students[0]);
      expect(String(created.school)).toBe(String(schoolA._id));
      expect(String(created.level)).toBe(String(level._id));
      expect(await Examination.countDocuments({ term: term._id })).toBe(1);
      expect(await CurrentFee.countDocuments({ term: term._id })).toBe(1);
    });

    it("ignores fields a client should not choose on imported students", async () => {
      const forged = student({ school: String(schoolB._id), active: false, _id: String(oid()), createdBy: String(oid()) });
      const res = await as(
        request(app).post(`${base}/terms`).send(
          payload({
            core: { name: "Forge", from: "2033-09-01", to: "2034-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
            students: [{ class: levelDef("Basic 1", "B1"), isPrevious: false, data: [forged] }],
          })
        ),
        adminTok
      );
      expect(res.status).toBe(201);
      const saved = await Student.findOne({ indexnumber: forged.indexnumber });
      expect(String(saved.school)).toBe(String(schoolA._id));
      expect(String(saved._id)).not.toBe(forged._id);
      expect(saved.active).not.toBe(false);
      expect(String(saved.createdBy)).toBe(String(adminA._id));
    });

    it("refuses an index number used in ANOTHER school and writes nothing", async () => {
      const taken = uniq("taken");
      await make(Student, { indexnumber: taken, school: schoolB._id, firstname: "Bob", phonenumber: "0240000041" });
      const before = await countFor(schoolA._id);

      const res = await as(
        request(app).post(`${base}/terms`).send(
          payload({
            core: { name: "Dup", from: "2035-09-01", to: "2036-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
            students: [{ class: levelDef("Basic 1", "B1"), isPrevious: false, data: [student({ indexnumber: taken })] }],
          })
        ),
        adminTok
      );
      expect(res.status).toBe(400);
      expect(res.body.isDuplicateError).toBe(true);
      expect(res.body.data).toContain(taken.toLowerCase());
      expect(await countFor(schoolA._id)).toEqual(before);
    });

    it("refuses an index number repeated inside the request", async () => {
      const same = uniq("same");
      const before = await countFor(schoolA._id);
      const res = await as(
        request(app).post(`${base}/terms`).send(
          payload({
            core: { name: "Rep", from: "2037-09-01", to: "2038-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
            students: [{ class: levelDef("Basic 1", "B1"), isPrevious: false, data: [student({ indexnumber: same }), student({ indexnumber: same })] }],
          })
        ),
        adminTok
      );
      expect(res.status).toBe(400);
      expect(res.body.isDuplicateError).toBe(true);
      expect(await countFor(schoolA._id)).toEqual(before);
    });

    it("refuses to carry over another school's student", async () => {
      const foreign = await make(Student, { indexnumber: uniq("fo"), school: schoolB._id, firstname: "Far", phonenumber: "0240000042" });
      const before = await countFor(schoolA._id);
      const res = await as(
        request(app).post(`${base}/terms`).send(
          payload({
            core: { name: "Carry", from: "2039-09-01", to: "2040-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
            students: [{ class: levelDef("Basic 1", "B1"), isPrevious: true, data: [{ _id: String(foreign._id) }] }],
          })
        ),
        adminTok
      );
      expect(res.status).toBe(403);
      expect(await countFor(schoolA._id)).toEqual(before);
    });

    it("rolls back EVERYTHING it created when a later step fails", async () => {
      const before = await countFor(schoolA._id);
      const examsBefore = await Examination.countDocuments();
      const res = await as(
        request(app).post(`${base}/terms`).send(
          payload({
            core: { name: "Boom", from: "2041-09-01", to: "2042-07-01", term: "1", isPromotionTerm: "No", active: "Yes" },
            levels: [levelDef("Basic 1", "B1"), levelDef("Basic 2", "B2")],
            students: [
              { class: levelDef("Basic 1", "B1"), isPrevious: false, data: [student()] },
              // required fields missing: the second level's students cannot be saved
              { class: levelDef("Basic 2", "B2"), isPrevious: false, data: [{ indexnumber: uniq("bad") }] },
            ],
          })
        ),
        adminTok
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(await countFor(schoolA._id)).toEqual(before);
      expect(await Examination.countDocuments()).toBe(examsBefore);
      expect(await Term.exists({ school: schoolA._id, academicYear: "2041/2042" })).toBeFalsy();
    });

    it("rejects malformed details before touching the database", async () => {
      const before = await countFor(schoolA._id);
      for (const body of [{}, payload({ core: { name: "x", from: "nope", to: "2032-07-01", term: "1" } }), payload({ levels: "all" })]) {
        expect((await as(request(app).post(`${base}/terms`).send(body), adminTok)).status).toBe(400);
      }
      expect(await countFor(schoolA._id)).toEqual(before);
    });
  });

  describe("status", () => {
    it("keeps exactly one current term per school", async () => {
      const t1 = await make(Term, { school: schoolB._id, term: "1", status: "current", active: true });
      const t2 = await make(Term, { school: schoolB._id, term: "2", status: "upcoming", active: true });
      const other = await make(Term, { school: schoolA._id, term: "9", status: "current", active: true });

      const res = await as(request(app).patch(`${base}/terms/${t2._id}?status=current`), adminBTok);
      expect(res.status).toBe(200);
      expect((await Term.findById(t2._id)).status).toBe("current");
      expect((await Term.findById(t1._id)).status).toBe("archived");
      expect((await Term.findById(other._id)).status).toBe("current"); // other schools are untouched
      expect(await Term.countDocuments({ school: schoolB._id, status: "current" })).toBe(1);
    });

    it("teachers now see the current term in /terms/sessions (it filtered on a misspelt status)", async () => {
      const school = await createSchool();
      const teacher = await createUser(school, "teacher");
      const current = await make(Term, { school: school._id, term: "1", status: "current", active: true, academicYear: "2030/2031" });
      await make(Term, { school: school._id, term: "2", status: "upcoming", active: true, academicYear: "2030/2031" });
      const res = await as(request(app).get(`${base}/terms/sessions`), staffToken(teacher));
      expect(res.status).toBe(200);
      expect(res.body.map((t) => String(t._id))).toEqual([String(current._id)]);
    });
  });

  describe("removing terms", () => {
    const emptyTerm = async (school) => {
      const session = await make(Session, { school: school._id, academicYear: uniq("ay") });
      const term = await make(Term, { school: school._id, session: session._id, term: "1" });
      const level = await make(Level, { school: school._id, session: session._id, term: term._id, initials: "E1", level: { name: "E", type: "1" }, createdBy: adminA._id, students: [] });
      return { term, level };
    };

    it("is admin only and school-scoped", async () => {
      const { term } = await emptyTerm(schoolA);
      expect((await as(request(app).delete(`${base}/terms/${term._id}`), teacherTok)).status).toBe(403);
      expect((await as(request(app).delete(`${base}/terms/${term._id}`), adminBTok)).status).toBe(404);
      expect(await Term.findById(term._id)).not.toBeNull();
    });

    it("removes an empty term together with its empty scaffolding", async () => {
      const { term, level } = await emptyTerm(schoolA);
      const res = await as(request(app).delete(`${base}/terms/${term._id}`), adminTok);
      expect(res.status).toBe(201);
      expect(await Term.findById(term._id)).toBeNull();
      expect(await Level.findById(level._id)).toBeNull();
    });

    it("refuses a term that has students, scores, payments or attendance, and removes nothing", async () => {
      const cases = {
        students: async ({ term, level }) => Level.updateOne({ _id: level._id }, { $set: { students: [oid()] } }),
        scores: async ({ term, level }) => make(Examination, { term: term._id, level: level._id, student: oid(), scores: [{ _id: "s", totalScore: 5 }] }),
        payments: async ({ term, level }) => make(CurrentFee, { term: term._id, level: level._id, student: oid(), payment: [{ paid: 10 }] }),
        attendance: async ({ term, level }) => make(Attendance, { term: term._id, level: level._id, date: new Date(), status: [] }),
      };
      for (const [name, addRecord] of Object.entries(cases)) {
        const fixture = await emptyTerm(schoolA);
        await addRecord(fixture);
        const res = await as(request(app).delete(`${base}/terms/${fixture.term._id}`), adminTok);
        expect([name, res.status]).toEqual([name, 409]);
        expect(res.body).toMatch(/Archive it instead/);
        expect(await Term.findById(fixture.term._id)).not.toBeNull();
        expect(await Level.findById(fixture.level._id)).not.toBeNull();
      }
    });

    it("bulk removal is all or nothing", async () => {
      const free = await emptyTerm(schoolA);
      const held = await emptyTerm(schoolA);
      await make(CurrentFee, { term: held.term._id, level: held.level._id, student: oid(), payment: [{ paid: 1 }] });
      const res = await as(request(app).put(`${base}/terms/remove`).send([free.term._id, held.term._id]), adminTok);
      expect(res.status).toBe(409);
      expect(await Term.findById(free.term._id)).not.toBeNull();
      expect(await Term.findById(held.term._id)).not.toBeNull();
    });

    it("rejects an empty or malformed list", async () => {
      expect((await as(request(app).put(`${base}/terms/remove`).send([]), adminTok)).status).toBe(404);
      expect((await as(request(app).put(`${base}/terms/remove`).send(["nope"]), adminTok)).status).toBe(404);
    });
  });

  describe("assignment notifications are best-effort", () => {
    it("assigning a form master succeeds even though the mail server is down", async () => {
      const session = await make(Session, { school: schoolA._id, academicYear: uniq("ay") });
      const term = await make(Term, { school: schoolA._id, session: session._id, term: "1" });
      const level = await make(Level, { school: schoolA._id, session: session._id, term: term._id, initials: "N1", level: { name: "N", type: "1" }, createdBy: adminA._id });
      const teacher = await createUser(schoolA, "teacher");

      const res = await as(request(app).put(`${base}/levels/assign-teacher`).send({ _id: String(level._id), teacher: String(teacher._id) }), adminTok);
      expect(res.status).toBe(201);
      expect(String((await Level.findById(level._id)).teacher)).toBe(String(teacher._id));
      expect(await Notification.countDocuments({ user: teacher._id })).toBe(1);

      const off = await as(request(app).put(`${base}/levels/unassign-teacher?id=${level._id}`), adminTok);
      expect(off.status).toBe(201);
      expect((await Level.findById(level._id)).teacher).toBeNull();
    });
  });
});
