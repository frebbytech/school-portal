const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Fee = require("../models/feeModel");
const CurrentFee = require("../models/currentFeeModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

describe("fees ledger (Stage 8)", () => {
  let school, admin, teacher, adminTok, teacherTok;
  let session, term1, term2, level1, level2, stud, record1, record2;

  beforeAll(async () => {
    school = await createSchool();
    admin = await createUser(school, "administrator");
    teacher = await createUser(school, "teacher");
    adminTok = staffToken(admin);
    teacherTok = staffToken(teacher);

    session = await make(Session, { school: school._id });
    term1 = await make(Term, { school: school._id, session: session._id, status: "archived" });
    term2 = await make(Term, { school: school._id, session: session._id, status: "current", active: true });
    level1 = await make(Level, { school: school._id, session: session._id, term: term1._id, name: "B1" });
    level2 = await make(Level, { school: school._id, session: session._id, term: term2._id, name: "B2" });
    stud = await make(Student, { indexnumber: uniq("fs"), school: school._id, firstname: "Ama", level: level2._id });

    // Term 1 fee 300, paid 100 -> 200 still owed. Term 2 fee 500.1 (0.1 + 500)
    await make(Fee, { school: school._id, session: session._id, term: term1._id, level: level1._id, amount: [{ name: "Tuition", amount: 300 }] });
    await make(Fee, { school: school._id, session: session._id, term: term2._id, level: level2._id, amount: [{ name: "Tuition", amount: 500 }, { name: "PTA", amount: 0.1 }] });
    record1 = await make(CurrentFee, { school: school._id, session: session._id, term: term1._id, level: level1._id, student: stud._id, payment: [{ paid: 100 }] });
    record2 = await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: level2._id, student: stud._id, payment: [] });
  });

  const info = (extra = {}) =>
    as(request(app).post(`${base}/current-fees/student`), adminTok).send({
      session: String(session._id), term: String(term2._id), level: String(level2._id), student: String(stud._id), ...extra,
    });

  describe("student fee summary", () => {
    it("includes arrears from earlier terms (they were always 0 before)", async () => {
      const res = await info();
      expect(res.status).toBe(200);
      expect(res.body.previous).toEqual({ fees: 300, paid: 100, remaining: 200 });
      expect(res.body.current.fees).toBe(500.1);
      expect(res.body.current.remaining).toBe(500.1);
      expect(res.body.totalOutstanding).toBe(700.1);
    });

    it("uses this term's fee for the class, not another term's", async () => {
      await make(Fee, { school: school._id, session: session._id, term: term1._id, level: level2._id, amount: [{ name: "Wrong", amount: 9999 }] });
      expect((await info()).body.current.fees).toBe(500.1);
    });

    it("creates the term record when missing instead of failing, once", async () => {
      const lvl = await make(Level, { school: school._id, session: session._id, term: term2._id, name: "B3" });
      const other = await make(Student, { indexnumber: uniq("fs"), school: school._id, firstname: "Kojo", level: lvl._id });
      const body = { session: String(session._id), term: String(term2._id), level: String(lvl._id), student: String(other._id) };
      const first = await as(request(app).post(`${base}/current-fees/student`), adminTok).send(body);
      const second = await as(request(app).post(`${base}/current-fees/student`), adminTok).send(body);
      expect(first.status).toBe(200);
      expect(second.body.current._id).toBe(first.body.current._id);
      expect(await CurrentFee.countDocuments({ student: other._id, term: term2._id })).toBe(1);
    });

    it("does not divide by zero when no fee is set (student overview)", async () => {
      const lvl = await make(Level, { school: school._id, session: session._id, term: term2._id, name: "B4", active: true });
      const other = await make(Student, { indexnumber: uniq("fs"), school: school._id, firstname: "Yaw", level: lvl._id });
      await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, student: other._id, payment: [] });
      const res = await as(request(app).get(`${base}/current-fees/current/${other._id}`), adminTok);
      expect(res.status).toBe(200);
      expect(res.body.activeLevel.percentage).toBe(0);
    });

    it("refuses a session of another school", async () => {
      const otherSchool = await createSchool();
      const foreign = await make(Session, { school: otherSchool._id });
      expect((await info({ session: String(foreign._id) })).status).toBe(403);
    });
  });

  describe("recording payments", () => {
    const pay = (payment, tok = adminTok, id = record2._id) =>
      as(request(app).post(`${base}/current-fees`), tok).send({ _id: String(id), payment });

    it("rejects amounts that are not valid money and records nothing", async () => {
      for (const bad of [0, -10, "abc", 12.345, null, undefined, {}]) {
        expect((await pay({ paid: bad })).status).toBe(400);
      }
      expect((await pay("nope")).status).toBe(400);
      expect((await CurrentFee.findById(record2._id)).payment).toHaveLength(0);
    });

    it("stores a numeric amount even when sent as text, and sets receipt fields itself", async () => {
      const res = await pay({ paid: "25.50", method: "cash", id: "forged", createdAt: "2000-01-01", issuerName: "forged" });
      expect(res.status).toBe(200);
      expect(res.body.paid).toBe(25.5);
      expect(res.body.method).toBe("cash");
      expect(res.body.id).not.toBe("forged");
      expect(new Date(res.body.createdAt).getFullYear()).not.toBe(2000);
      expect(res.body.issuerID).toBe(String(admin._id));
    });

    it("rejects operator keys such as $where and records nothing", async () => {
      const before = (await CurrentFee.findById(record2._id)).payment.length;
      expect((await pay({ paid: 1, $where: "x" })).status).toBe(400);
      expect((await CurrentFee.findById(record2._id)).payment).toHaveLength(before);
    });

    it("keeps both payments when two arrive at the same time and sums them exactly", async () => {
      const before = (await CurrentFee.findById(record2._id)).payment.length;
      await Promise.all([pay({ paid: 0.1 }), pay({ paid: 0.2 })]);
      const after = await CurrentFee.findById(record2._id);
      expect(after.payment).toHaveLength(before + 2);
      const res = await info();
      expect(res.body.current.paid).toBe(25.8); // 25.5 + 0.1 + 0.2, no float drift
    });

    it("only administrators may record payments", async () => {
      expect((await pay({ paid: 5 }, teacherTok)).status).toBe(403);
    });
  });

  describe("editing and deleting payment records", () => {
    it("validates edited payments and leaves the record unchanged when invalid", async () => {
      const before = (await CurrentFee.findById(record1._id)).payment;
      const res = await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(record1._id), payment: [{ paid: -1 }] });
      expect(res.status).toBe(400);
      expect((await CurrentFee.findById(record1._id)).payment).toHaveLength(before.length);
      const notArray = await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(record1._id), payment: "x" });
      expect(notArray.status).toBe(400);
    });

    it("accepts a valid correction", async () => {
      const res = await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(record1._id), payment: [{ paid: "100" }] });
      expect(res.status).toBe(200);
      expect((await CurrentFee.findById(record1._id)).payment[0].paid).toBe(100);
    });

    it("never deletes a fee record that holds payments", async () => {
      const res = await as(request(app).delete(`${base}/current-fees/${record1._id}`), adminTok);
      expect(res.status).toBe(409);
      expect(await CurrentFee.exists({ _id: record1._id })).toBeTruthy();
    });

    it("deletes an empty fee record", async () => {
      const empty = await make(CurrentFee, { school: school._id, term: term2._id, level: level2._id, student: oid(), payment: [] });
      expect((await as(request(app).delete(`${base}/current-fees/${empty._id}`), adminTok)).status).toBe(201);
      expect(await CurrentFee.exists({ _id: empty._id })).toBeFalsy();
    });
  });

  describe("fee structures", () => {
    const create = (overrides = {}) =>
      as(request(app).post(`${base}/fees`), adminTok).send({
        session: String(session._id), term: String(term2._id), level: String(level2._id),
        amount: [{ name: "Tuition", amount: 100 }], ...overrides,
      });

    it("rejects invalid fee items", async () => {
      for (const amount of [undefined, [], "x", [{ name: "T", amount: -5 }], [{ name: "T", amount: "abc" }], [{ name: "T" }]]) {
        expect((await create({ amount })).status).toBe(400);
      }
    });

    it("refuses a term or session of another school", async () => {
      const otherSchool = await createSchool();
      const foreignTerm = await make(Term, { school: otherSchool._id });
      const foreignSession = await make(Session, { school: otherSchool._id });
      expect((await create({ term: String(foreignTerm._id) })).status).toBe(404);
      expect((await create({ session: String(foreignSession._id) })).status).toBe(404);
    });

    it("validates updates after checking ownership", async () => {
      const fee = await Fee.findOne({ school: school._id, term: term2._id, level: level2._id });
      expect((await as(request(app).put(`${base}/fees`), adminTok).send({ _id: String(fee._id), amount: [{ name: "T", amount: -1 }] })).status).toBe(400);
      expect((await as(request(app).put(`${base}/fees`), adminTok).send({ _id: String(fee._id), amount: [{ name: "Tuition", amount: 450 }] })).status).toBe(201);
      expect((await Fee.findById(fee._id)).amount[0].amount).toBe(450);
    });

    it("does not delete a fee that has payments recorded against it", async () => {
      const fee = await Fee.findOne({ school: school._id, term: term1._id, level: level1._id });
      const res = await as(request(app).delete(`${base}/fees/${fee._id}`), adminTok);
      expect(res.status).toBe(409);
      expect(await Fee.exists({ _id: fee._id })).toBeTruthy();
    });

    it("lists fees without crashing when a level is missing", async () => {
      await make(Fee, { school: school._id, level: oid(), amount: [{ name: "Orphan", amount: 1 }] });
      expect((await as(request(app).get(`${base}/fees`), adminTok)).status).toBe(200);
      const bad = await as(request(app).get(`${base}/fees/all?session=bad&term=bad`), adminTok);
      expect(bad.status).toBe(200);
      expect(bad.body).toEqual([]);
    });
  });
});
