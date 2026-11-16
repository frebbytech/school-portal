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

  describe("no advance payments (owner decision 2026-11-15)", () => {
    let lvl, s2, rec;
    const pay = (payment, id = rec._id) =>
      as(request(app).post(`${base}/current-fees`), adminTok).send({ _id: String(id), payment });

    beforeAll(async () => {
      // A fresh student: this term's fee is 100, no earlier terms.
      lvl = await make(Level, { school: school._id, session: session._id, term: term2._id, name: "NA1" });
      s2 = await make(Student, { indexnumber: uniq("na"), school: school._id, firstname: "Esi", level: lvl._id });
      await make(Fee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, amount: [{ name: "Tuition", amount: 100 }] });
      rec = await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, student: s2._id, payment: [] });
    });

    it("refuses a payment of more than is owed and records nothing", async () => {
      const res = await pay({ paid: 100.01 });
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Advance payments are not accepted/);
      expect((await CurrentFee.findById(rec._id)).payment).toHaveLength(0);
    });

    it("accepts exactly what is owed, and stores the balance worked out by the server", async () => {
      const first = await pay({ paid: 60, outstanding: 99999 }); // the browser's figure is ignored
      expect(first.status).toBe(200);
      expect(first.body.outstanding).toBe(40);
      const second = await pay({ paid: 40 });
      expect(second.status).toBe(200);
      expect(second.body.outstanding).toBe(0);
    });

    it("refuses any further payment once fully paid", async () => {
      const res = await pay({ paid: 0.01 });
      expect(res.status).toBe(400);
      expect(res.text).toMatch(/Nothing is owed/);
      expect((await CurrentFee.findById(rec._id)).payment).toHaveLength(2);
    });

    it("two payments that together exceed the balance cannot both be recorded", async () => {
      const s3 = await make(Student, { indexnumber: uniq("na"), school: school._id, firstname: "Kofi", level: lvl._id });
      const r3 = await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, student: s3._id, payment: [] });
      const results = await Promise.all([pay({ paid: 70 }, r3._id), pay({ paid: 70 }, r3._id)]);
      const codes = results.map((r) => r.status).sort();
      expect(codes[0]).toBe(200);
      expect([400, 409]).toContain(codes[1]); // refused up front, or by the atomic check if both got past it
      expect((await CurrentFee.findById(r3._id)).payment).toHaveLength(1);
    });

    it("lets money beyond this term's fee clear earlier arrears, and no more than that", async () => {
      // stud has 200 arrears from term 1 and this term's fee of 500.1 (record2, already part-paid above)
      const before = (await info()).body;
      const owed = before.totalOutstanding;
      const tooMuch = await pay({ paid: owed + 1 }, record2._id);
      expect(tooMuch.status).toBe(400);
      const exact = await pay({ paid: owed }, record2._id);
      expect(exact.status).toBe(200);
      const after = (await info()).body;
      expect(after.totalOutstanding).toBe(0);
      expect(after.previous.remaining).toBe(0);
    });

    it("a receipt can be fetched again by its number, with the figures it had", async () => {
      const s4 = await make(Student, { indexnumber: uniq("na"), school: school._id, firstname: "Efua", surname: "Mensah", level: lvl._id });
      const r4 = await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, student: s4._id, payment: [] });
      const made = await pay({ paid: 30, paymentMethod: "Cash", payer: "x" }, r4._id);
      expect(made.status).toBe(200);
      const res = await as(request(app).get(`${base}/current-fees/receipt/${made.body.id}`), adminTok);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: made.body.id, paid: 30, outstanding: 70, fee: 100, arreas: 0, feePaid: 0, levelName: "NA1" });
      expect(res.body.studentName).toMatch(/Mensah/);
    });

    it("does not show a receipt to another school, or one that does not exist", async () => {
      const made = await pay({ paid: 1 }, (await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl._id, student: s2._id, payment: [] }))._id);
      const otherSchool = await createSchool();
      const outsider = staffToken(await createUser(otherSchool, "administrator"));
      expect((await as(request(app).get(`${base}/current-fees/receipt/${made.body.id}`), outsider)).status).toBe(404);
      expect((await as(request(app).get(`${base}/current-fees/receipt/NOPE`), adminTok)).status).toBe(404);
    });

    it("fees cannot be lowered below what a student has already paid", async () => {
      const s5 = await make(Student, { indexnumber: uniq("na"), school: school._id, firstname: "Yaa", level: lvl._id });
      const lvl5 = await make(Level, { school: school._id, session: session._id, term: term2._id, name: "NA5" });
      const fee5 = await make(Fee, { school: school._id, session: session._id, term: term2._id, level: lvl5._id, amount: [{ fee: "Tuition", amount: 100 }] });
      const r5 = await make(CurrentFee, { school: school._id, session: session._id, term: term2._id, level: lvl5._id, student: s5._id, payment: [] });
      expect((await pay({ paid: 80 }, r5._id)).status).toBe(200);
      const put = (total) => as(request(app).put(`${base}/fees`), adminTok).send({ _id: String(fee5._id), amount: [{ fee: "Tuition", amount: total }] });
      const refused = await put(50);
      expect(refused.status).toBe(409);
      expect(refused.text).toMatch(/already paid GHS 30.00 more/);
      expect((await Fee.findById(fee5._id)).amount[0].amount).toBe(100);
      expect((await put(80)).status).toBe(201); // exactly what was paid is fine
      expect((await put(500)).status).toBe(201); // raising is always fine
    });

    it("an edit cannot raise the total above what is owed, but may lower it", async () => {
      const raise = await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(rec._id), payment: [{ paid: 100 }, { paid: 50 }] });
      expect(raise.status).toBe(400);
      const lower = await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(rec._id), payment: [{ paid: 60 }, { paid: 30 }] });
      expect(lower.status).toBe(200);
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
