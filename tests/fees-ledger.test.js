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
      // The student owes 200 from term 1, so these go to the older term first.
      const before = (await CurrentFee.findById(record1._id)).payment.length;
      await Promise.all([pay({ paid: 0.1 }), pay({ paid: 0.2 })]);
      const after = await CurrentFee.findById(record1._id);
      expect(after.payment).toHaveLength(before + 2);
      const res = await info();
      expect(res.body.previous.paid).toBe(125.8); // 100 + 25.5 + 0.1 + 0.2, no float drift
      expect(res.body.current.paid).toBe(0);
    });

    it("only administrators may record payments", async () => {
      expect((await pay({ paid: 5 }, teacherTok)).status).toBe(403);
    });
  });

  describe("no advance payments (owner decision 2026-11-15)", () => {
    let lvl, s2, rec;
    const sumPaid = (doc) => Math.round(doc.payment.reduce((n, p) => n + Number(p.paid || 0), 0) * 100) / 100;
    const pay = (payment, id = rec._id) =>
      as(request(app).post(`${base}/current-fees`), adminTok).send({ _id: String(id), payment });

    beforeAll(async () => {
      // A fresh student: this term's fee is 100, no earlier terms.
      lvl = await make(Level, { school: school._id, session: session._id, term: term2._id, level: { name: "NA1" } });
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

    describe("oldest term first", () => {
      let recOld, recNew, tNew, lNew;
      const summary = () =>
        as(request(app).post(`${base}/current-fees/student`), adminTok).send({
          session: String(session._id), term: String(tNew._id), level: String(lNew._id), student: String(recNew.student),
        });

      beforeAll(async () => {
        const tOld = await make(Term, { school: school._id, session: session._id, status: "archived", from: "2020-01-01", term: "1" });
        tNew = await make(Term, { school: school._id, session: session._id, status: "archived", from: "2020-06-01", term: "2" });
        const lOld = await make(Level, { school: school._id, session: session._id, term: tOld._id, name: "OF1" });
        lNew = await make(Level, { school: school._id, session: session._id, term: tNew._id, name: "OF2" });
        const stu = await make(Student, { indexnumber: uniq("of"), school: school._id, firstname: "Adwoa", level: lNew._id });
        await make(Fee, { school: school._id, session: session._id, term: tOld._id, level: lOld._id, amount: [{ fee: "Tuition", amount: 200 }] });
        await make(Fee, { school: school._id, session: session._id, term: tNew._id, level: lNew._id, amount: [{ fee: "Tuition", amount: 100 }] });
        recOld = await make(CurrentFee, { school: school._id, session: session._id, term: tOld._id, level: lOld._id, student: stu._id, payment: [{ paid: 50 }] });
        recNew = await make(CurrentFee, { school: school._id, session: session._id, term: tNew._id, level: lNew._id, student: stu._id, payment: [] });
      });

      it("shows the arrears from the older term and the balance of this one", async () => {
        const res = await summary();
        expect(res.body.previous.remaining).toBe(150);
        expect(res.body.current.remaining).toBe(100);
        expect(res.body.totalOutstanding).toBe(250);
      });

      it("a small payment goes entirely to the older term", async () => {
        const made = await pay({ paid: 100 }, recNew._id);
        expect(made.status).toBe(200);
        expect(made.body.paid).toBe(100);
        expect(made.body.outstanding).toBe(150);
        expect(sumPaid(await CurrentFee.findById(recOld._id))).toBe(150); // 50 before + 100
        expect(sumPaid(await CurrentFee.findById(recNew._id))).toBe(0);
        const after = (await summary()).body;
        expect(after.previous.remaining).toBe(50);
        expect(after.current.remaining).toBe(100);
      });

      it("the rest of a payment goes to this term once the older one is cleared", async () => {
        const made = await pay({ paid: 120 }, recNew._id); // 50 to the older term, 70 to this one
        expect(made.status).toBe(200);
        expect(made.body.outstanding).toBe(30);
        expect(made.body.appliedTo.map((p) => p.amount)).toEqual([50, 70]);
        const old = await CurrentFee.findById(recOld._id);
        const cur = await CurrentFee.findById(recNew._id);
        expect(sumPaid(old)).toBe(200);
        expect(sumPaid(cur)).toBe(70);
        // one receipt number, stored on both terms
        expect(old.payment.at(-1).id).toBe(made.body.id);
        expect(cur.payment.at(-1).id).toBe(made.body.id);
        const after = (await summary()).body;
        expect(after.previous.remaining).toBe(0);
        expect(after.totalOutstanding).toBe(30);
      });

      it("the receipt shows the whole payment and where it went", async () => {
        const last = (await CurrentFee.findById(recNew._id)).payment.at(-1);
        const res = await as(request(app).get(`${base}/current-fees/receipt/${last.id}`), adminTok);
        expect(res.status).toBe(200);
        expect(res.body.paid).toBe(120);
        expect(res.body.appliedTo).toHaveLength(2);
        expect(res.body.arreas).toBe(50);
        expect(res.body.paidThisTerm).toBe(70);
      });

      it("refuses more than is owed across all terms, and nothing is written", async () => {
        const res = await pay({ paid: 30.01 }, recNew._id);
        expect(res.status).toBe(400);
        expect(res.text).toMatch(/Advance payments are not accepted/);
        expect(sumPaid(await CurrentFee.findById(recNew._id))).toBe(70);
        expect((await pay({ paid: 30 }, recNew._id)).status).toBe(200);
        expect((await summary()).body.totalOutstanding).toBe(0);
      });

      it("a payment is never applied to a LATER term", async () => {
        // paying against the older record may only clear the older term
        const res = await pay({ paid: 1 }, recOld._id);
        expect(res.status).toBe(400);
        expect(res.text).toMatch(/Nothing is owed/);
      });
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
