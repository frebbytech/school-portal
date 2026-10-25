const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../config/sms/messenger", () => ({ sendSMS: jest.fn().mockResolvedValue(true) }));
jest.mock("../config/mail/mailer", () => jest.fn().mockResolvedValue(true));

const { sendSMS } = require("../config/sms/messenger");
const app = require("../app");
const School = require("../models/schoolModel");
const Student = require("../models/studentModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Message = require("../models/messageModel");
const Fee = require("../models/feeModel");
const CurrentFee = require("../models/currentFeeModel");
const { createSchool, createUser, staffToken, studentToken, createPlatformAdmin, platformToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);

// Minimal records: these tests are about ownership, not about every required field
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });

describe("schools, messages and fees authorization (finding C-6)", () => {
  let schoolA, schoolB, adminA, teacherA, adminB;
  let adminTok, teacherTok, adminBTok;
  let studentA, studentB, termA, termB, levelA, levelB;
  let studentTokA;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    adminTok = staffToken(adminA);
    teacherTok = staffToken(teacherA);
    adminBTok = staffToken(adminB);

    studentA = await make(Student, { indexnumber: `a${oid().toString().slice(-10)}`, school: schoolA._id, phonenumber: "0240000001", email: "a@example.com" });
    studentB = await make(Student, { indexnumber: `b${oid().toString().slice(-10)}`, school: schoolB._id, phonenumber: "0240000002", email: "b@example.com" });
    termA = await make(Term, { school: schoolA._id });
    termB = await make(Term, { school: schoolB._id });
    levelA = await make(Level, { school: schoolA._id });
    levelB = await make(Level, { school: schoolB._id });
    studentTokA = studentToken(studentA._id, schoolA);
  });

  describe("schools", () => {
    it("lists only the caller's own school and refuses students", async () => {
      const res = await as(request(app).get(`${base}/schools`), teacherTok);
      expect(res.status).toBe(200);
      expect(res.body.map((s) => String(s._id))).toEqual([String(schoolA._id)]);
      expect((await as(request(app).get(`${base}/schools`), studentTokA)).status).toBe(403);
    });

    it("still serves a school by code without a token (login page)", async () => {
      const res = await request(app).get(`${base}/schools/${schoolA.code}`);
      expect(res.status).toBe(200);
    });

    it("lets only administrators update, and only their own school's descriptive fields", async () => {
      expect((await as(request(app).put(`${base}/schools`), teacherTok).send({ name: "X" })).status).toBe(403);

      const foreign = await as(request(app).put(`${base}/schools`), adminTok).send({ _id: String(schoolB._id), name: "Hijacked" });
      expect(foreign.status).toBe(403);
      expect((await School.findById(schoolB._id)).name).toBe("Test School");

      const own = await as(request(app).put(`${base}/schools`), adminTok).send({
        _id: String(schoolA._id),
        name: "Own New Name",
        code: "HIJACK",
        permissions: ["Settings"],
      });
      expect(own.status).toBe(200);
      const after = await School.findById(schoolA._id);
      expect(after.name).toBe("Own New Name");
      expect(after.code).not.toBe("HIJACK");
      expect(after.permissions).not.toContain("Settings");
    });

    it("only a platform administrator creates schools, and cannot choose the permission set here", async () => {
      const body = { name: "Created", code: `NEW${oid().toString().slice(-8)}`, permissions: ["Settings", "Users"] };
      expect((await as(request(app).post(`${base}/schools`), teacherTok).send(body)).status).toBe(403);
      expect((await as(request(app).post(`${base}/schools`), adminTok).send(body)).status).toBe(403);
      expect(await School.exists({ code: body.code })).toBeFalsy();

      const platform = platformToken(await createPlatformAdmin());
      const res = await as(request(app).post(`${base}/schools`), platform).send(body);
      expect(res.status).toBe(201);
      expect(res.body.permissions).not.toContain("Settings");
    });

    it("cannot delete a school through the API", async () => {
      const res = await as(request(app).delete(`${base}/schools/${schoolB._id}`), adminBTok);
      expect(res.status).toBe(403);
      expect(await School.exists({ _id: schoolB._id })).toBeTruthy();
    });
  });

  describe("messages", () => {
    beforeEach(() => sendSMS.mockClear());

    it("refuses students and teachers on the group route", async () => {
      expect((await as(request(app).get(`${base}/messages`), studentTokA)).status).toBe(403);
      const res = await as(request(app).post(`${base}/messages/bulk`), teacherTok).send({
        type: "sms", group: "students", title: "t", message: "m",
      });
      expect(res.status).toBe(403);
      expect(sendSMS).not.toHaveBeenCalled();
    });

    it("sends a group message only to the caller's own school", async () => {
      const res = await as(request(app).post(`${base}/messages/bulk`), adminTok).send({
        type: "sms", group: "students", title: "t", message: "m",
      });
      expect(res.status).toBe(200);
      expect(sendSMS).toHaveBeenCalledTimes(1);
      const numbers = sendSMS.mock.calls[0][1];
      expect(numbers).toContain("0240000001");
      expect(numbers).not.toContain("0240000002");
    });

    it("resends the stored message of the caller's school, not posted content", async () => {
      const mine = await make(Message, {
        school: schoolA._id, type: "sms",
        recipient: { type: "Individual", phonenumber: ["0240000001"], email: [] },
        body: { title: "stored", message: "stored text" },
      });
      const res = await as(request(app).post(`${base}/messages/resend`), teacherTok).send({
        id: String(mine._id), type: "sms", body: { message: "evil" }, recipient: { phonenumber: ["0200000000"] },
      });
      expect(res.status).toBe(200);
      expect(sendSMS.mock.calls[0][0].message).toBe("stored text");
      expect(sendSMS.mock.calls[0][1]).toEqual(["0240000001"]);
    });

    it("does not resend or delete another school's message", async () => {
      const theirs = await make(Message, {
        school: schoolB._id, type: "sms",
        recipient: { type: "Individual", phonenumber: ["0240000002"], email: [] },
        body: { title: "b", message: "b" },
      });
      expect((await as(request(app).post(`${base}/messages/resend`), adminTok).send({ id: String(theirs._id) })).status).toBe(404);
      expect(sendSMS).not.toHaveBeenCalled();
      expect((await as(request(app).delete(`${base}/messages/${theirs._id}`), adminTok)).status).toBe(404);
      expect(await Message.exists({ _id: theirs._id })).toBeTruthy();
      expect((await as(request(app).delete(`${base}/messages/${theirs._id}`), teacherTok)).status).toBe(403);
    });
  });

  describe("fees", () => {
    it("refuses students and non-administrators changing fees", async () => {
      expect((await as(request(app).get(`${base}/fees`), studentTokA)).status).toBe(403);
      const body = { session: String(oid()), term: String(termA._id), level: String(levelA._id), amount: [{ name: "Tuition", amount: 100 }] };
      expect((await as(request(app).post(`${base}/fees`), teacherTok).send(body)).status).toBe(403);
    });

    it("creates a fee in the caller's school only for a level of that school", async () => {
      const session = String(oid());
      const foreign = await as(request(app).post(`${base}/fees`), adminTok).send({
        session, term: String(termA._id), level: String(levelB._id), amount: [{ name: "T", amount: 1 }],
      });
      expect(foreign.status).toBe(404);

      const own = await as(request(app).post(`${base}/fees`), adminTok).send({
        session, term: String(termA._id), level: String(levelA._id), school: String(schoolB._id), amount: [{ name: "T", amount: 1 }],
      });
      expect(own.status).toBe(201);
      const fee = await Fee.findOne({ level: levelA._id, session });
      expect(String(fee.school)).toBe(String(schoolA._id));
    });

    it("cannot read, update or delete another school's fee", async () => {
      const theirs = await make(Fee, { school: schoolB._id, level: levelB._id, amount: [{ name: "T", amount: 5 }] });
      expect((await as(request(app).get(`${base}/fees/${theirs._id}`), adminTok)).body).toEqual([]);
      expect((await as(request(app).put(`${base}/fees`), adminTok).send({ _id: String(theirs._id), amount: [] })).status).toBe(404);
      await as(request(app).delete(`${base}/fees/${theirs._id}`), adminTok);
      const after = await Fee.findById(theirs._id);
      expect(after).toBeTruthy();
      expect(after.amount).toHaveLength(1);
    });
  });

  describe("current fees", () => {
    let cfA, cfB;
    beforeAll(async () => {
      cfA = await make(CurrentFee, { term: termA._id, level: levelA._id, student: studentA._id, payment: [] });
      cfB = await make(CurrentFee, { term: termB._id, level: levelB._id, student: studentB._id, payment: [{ paid: 10 }] });
    });

    it("lets a student read only their own fee summary and history", async () => {
      expect((await as(request(app).get(`${base}/current-fees/current/${studentA._id}`), studentTokA)).status).toBe(200);
      expect((await as(request(app).get(`${base}/current-fees/history?studentId=${studentA._id}`), studentTokA)).status).toBe(200);
      expect((await as(request(app).get(`${base}/current-fees/current/${studentB._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/current-fees/history?studentId=${studentB._id}`), studentTokA)).status).toBe(403);
    });

    it("keeps students out of every other current-fee route", async () => {
      expect((await as(request(app).get(`${base}/current-fees`), studentTokA)).status).toBe(403);
      expect((await as(request(app).get(`${base}/current-fees/${cfA._id}`), studentTokA)).status).toBe(403);
      expect((await as(request(app).post(`${base}/current-fees/summary`), studentTokA).send({ term: String(termA._id) })).status).toBe(403);
      expect((await as(request(app).post(`${base}/current-fees`), studentTokA).send({ _id: String(cfA._id), payment: { paid: 1 } })).status).toBe(403);
    });

    it("keeps staff to their own school's students and records", async () => {
      expect((await as(request(app).get(`${base}/current-fees/current/${studentB._id}`), teacherTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/current-fees/current/${studentA._id}`), teacherTok)).status).toBe(200);

      const list = await as(request(app).get(`${base}/current-fees`), teacherTok);
      const ids = list.body.map((c) => String(c._id));
      expect(ids).toContain(String(cfA._id));
      expect(ids).not.toContain(String(cfB._id));

      const foreign = await as(request(app).get(`${base}/current-fees/${cfB._id}`), teacherTok);
      expect(foreign.status).toBe(200);
      expect(foreign.body).toBeNull();
    });

    it("cannot record a payment on, edit, or delete another school's record", async () => {
      expect((await as(request(app).post(`${base}/current-fees`), adminTok).send({ _id: String(cfB._id), payment: { paid: 999 } })).status).toBe(404);
      expect((await as(request(app).put(`${base}/current-fees`), adminTok).send({ id: String(cfB._id), payment: [] })).status).toBe(404);
      await as(request(app).delete(`${base}/current-fees/${cfB._id}`), adminTok);
      const after = await CurrentFee.findById(cfB._id);
      expect(after).toBeTruthy();
      expect(after.payment).toHaveLength(1);
    });

    it("lets only administrators record or edit payments", async () => {
      const before = await CurrentFee.findById(cfA._id);
      expect((await as(request(app).post(`${base}/current-fees`), teacherTok).send({ _id: String(cfA._id), payment: { paid: 5 } })).status).toBe(403);
      expect((await as(request(app).put(`${base}/current-fees`), teacherTok).send({ id: String(cfA._id), payment: [] })).status).toBe(403);
      expect((await as(request(app).post(`${base}/current-fees`), studentTokA).send({ _id: String(cfA._id), payment: { paid: 5 } })).status).toBe(403);
      const after = await CurrentFee.findById(cfA._id);
      expect(after.payment).toHaveLength(before.payment.length);
    });

    it("records a payment in the caller's school with server-set issuer fields", async () => {
      const res = await as(request(app).post(`${base}/current-fees`), adminTok).send({
        _id: String(cfA._id), payment: { paid: 50, issuerID: "forged" },
      });
      expect(res.status).toBe(200);
      expect(res.body.paid).toBe(50);
      expect(res.body.issuerID).toBe(String(adminA._id));
    });

    it("does not let an update move a record to another student", async () => {
      const res = await as(request(app).put(`${base}/current-fees`), adminTok).send({
        id: String(cfA._id), student: String(studentB._id), payment: [{ paid: 1 }],
      });
      expect(res.status).toBe(200);
      const after = await CurrentFee.findById(cfA._id);
      expect(String(after.student)).toBe(String(studentA._id));
    });

    it("lets only administrators delete a current-fee record", async () => {
      expect((await as(request(app).delete(`${base}/current-fees/${cfA._id}`), teacherTok)).status).toBe(403);
      expect(await CurrentFee.exists({ _id: cfA._id })).toBeTruthy();
    });
  });
});
