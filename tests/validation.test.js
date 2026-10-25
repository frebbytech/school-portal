const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../config/sms/messenger", () => ({ sendSMS: jest.fn().mockResolvedValue(true) }));
jest.mock("../config/mail/mailer", () => jest.fn().mockResolvedValue(true));

const app = require("../app");
const { sendSMS } = require("../config/sms/messenger");
const Notification = require("../models/notificationModel");
const Student = require("../models/studentModel");
const { parsePagination } = require("../common/pagination");
const { isUnsafe } = require("../middlewares/sanitizeInput");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

describe("input validation, operator-injection guard and opt-in pagination (Stage 5)", () => {
  describe("unit: parsePagination", () => {
    it("is off unless page or limit is given", () => {
      expect(parsePagination({})).toBeNull();
    });

    it("computes the page window and caps the limit", () => {
      expect(parsePagination({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, skip: 20 });
      expect(parsePagination({ limit: "100000" }).limit).toBe(200);
      expect(parsePagination({ page: "2" })).toEqual({ page: 2, limit: 50, skip: 50 });
    });

    it("rejects zero, negative, fractional, non-numeric and repeated values", () => {
      for (const query of [{ limit: "0" }, { page: "-1" }, { limit: "1.5" }, { limit: "abc" }, { page: ["1", "2"] }]) {
        expect(() => parsePagination(query)).toThrow(/positive whole number/);
      }
    });
  });

  describe("unit: isUnsafe", () => {
    it("flags operator and prototype keys at any depth, and over-deep nesting", () => {
      expect(isUnsafe({ a: { $ne: 1 } })).toBe(true);
      expect(isUnsafe({ list: [{ ok: 1 }, { $where: "1" }] })).toBe(true);
      expect(isUnsafe(JSON.parse('{"__proto__":{"admin":true}}'))).toBe(true);
      expect(isUnsafe({ constructor: { prototype: {} } })).toBe(true);
      let deep = {};
      let node = deep;
      for (let i = 0; i < 30; i++) node = node.a = {};
      expect(isUnsafe(deep)).toBe(true);
    });

    it("lets ordinary data through", () => {
      expect(isUnsafe({ name: "Ama", scores: [{ _id: "1", totalScore: 10 }], nested: { a: [1, 2] } })).toBe(false);
      expect(isUnsafe(null)).toBe(false);
      expect(isUnsafe("text")).toBe(false);
    });
  });

  describe("operator-injection guard", () => {
    it("refuses $operator keys in a JSON body", async () => {
      const res = await request(app).post(`${base}/users/login`).send({ username: { $ne: "" }, password: { $ne: "" } });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
      expect(typeof res.body.message).toBe("string");
      expect(res.body.requestId).toBeTruthy();
      expect(JSON.stringify(res.body)).not.toContain("$ne");
    });

    it("refuses $operator keys in the query string", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher");
      const res = await as(request(app).get(`${base}/notifications?user[$ne]=1`), staffToken(user));
      expect(res.status).toBe(400);
    });

    it("refuses a __proto__ key in a raw JSON body", async () => {
      const res = await request(app)
        .post(`${base}/users/login`)
        .set("Content-Type", "application/json")
        .send('{"username":"x","password":"y","__proto__":{"admin":true}}');
      expect(res.status).toBe(400);
    });
  });

  describe("login input", () => {
    it("rejects values that are not text and a malformed school code, but still signs in a valid user", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher");

      const number = await request(app).post(`${base}/users/login`).send({ username: 12345, password: "password123" });
      expect(number.status).toBe(400);
      const badCode = await request(app).post(`${base}/users/login`).send({ username: user.username, password: "password123", code: "not-an-id" });
      expect(badCode.status).toBe(400);

      const ok = await request(app).post(`${base}/users/login`).send({ username: user.username, password: "password123", code: String(school._id) });
      expect(ok.status).toBe(200);
      expect(ok.body.token).toBeTruthy();
    });
  });

  describe("messages", () => {
    let admin, adminTok;

    beforeAll(async () => {
      const school = await createSchool();
      admin = await createUser(school, "administrator");
      adminTok = staffToken(admin);
    });
    beforeEach(() => sendSMS.mockClear());

    it("quick: validates type, text and recipient before anything is sent", async () => {
      const bad = [
        { type: "pigeon", phonenumber: "0241234567", message: "hi" },
        { type: "sms", phonenumber: ["0241234567"], message: "hi" },
        { type: "sms", phonenumber: "0241234567", message: { text: "hi" } },
        { type: "sms", phonenumber: "0241234567", message: "x".repeat(1001) },
        { type: "email", email: "not-an-email", message: "hi" },
      ];
      for (const body of bad) {
        const res = await as(request(app).post(`${base}/messages/quick`).send(body), adminTok);
        expect(res.status).toBe(400);
      }
      expect(sendSMS).not.toHaveBeenCalled();
    });

    it("quick: accepts the shapes the admin client sends", async () => {
      const res = await as(
        request(app).post(`${base}/messages/quick`).send({ type: "sms", phonenumber: "+233(024)1234567", title: "", message: "Hello", rate: "quick" }),
        adminTok
      );
      expect(res.status).toBe(200);
      expect(sendSMS).toHaveBeenCalledTimes(1);
    });

    it("bulk: needs a known type and group, and some text", async () => {
      for (const body of [
        { type: "sms", group: "students" },
        { type: "fax", group: "students", message: "hi" },
        { type: "sms", group: "everyone", message: "hi" },
      ]) {
        expect((await as(request(app).post(`${base}/messages/bulk`).send(body), adminTok)).status).toBe(400);
      }
      expect((await as(request(app).post(`${base}/messages/bulk`).send({ type: "sms", group: "students", message: "hi", rate: "bulk" }), adminTok)).status).toBe(200);
    });

    it("resend: needs a valid message id", async () => {
      expect((await as(request(app).post(`${base}/messages/resend`).send({ id: "nope" }), adminTok)).status).toBe(400);
      expect((await as(request(app).post(`${base}/messages/resend`).send({ id: { a: 1 } }), adminTok)).status).toBe(400);
    });
  });

  describe("opt-in pagination", () => {
    let school, teacher, teacherTok, admin, adminTok;

    beforeAll(async () => {
      school = await createSchool();
      teacher = await createUser(school, "teacher");
      admin = await createUser(school, "administrator");
      teacherTok = staffToken(teacher);
      adminTok = staffToken(admin);

      for (let i = 0; i < 5; i++) {
        await make(Notification, {
          user: teacher._id, school: school._id, session: oid(), term: oid(),
          type: "Info", title: `n${i}`, createdBy: admin._id,
        });
      }
      for (let i = 0; i < 3; i++) {
        await make(Student, { indexnumber: uniq("pg"), school: school._id, firstname: `S${i}`, phonenumber: "0240000031" });
      }
    });

    it("returns the whole list, unchanged, when no paging is asked for", async () => {
      const res = await as(request(app).get(`${base}/notifications`), teacherTok);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(5);
      expect(res.headers["x-total-count"]).toBeUndefined();
    });

    it("returns one page as the same array shape, with the total in a header", async () => {
      const first = await as(request(app).get(`${base}/notifications?limit=2&page=1`), teacherTok);
      const last = await as(request(app).get(`${base}/notifications?limit=2&page=3`), teacherTok);
      const beyond = await as(request(app).get(`${base}/notifications?limit=2&page=4`), teacherTok);
      expect(first.body).toHaveLength(2);
      expect(last.body).toHaveLength(1);
      expect(beyond.body).toHaveLength(0);
      expect(first.headers["x-total-count"]).toBe("5");
      expect(first.headers["x-page"]).toBe("1");
      expect(first.headers["x-page-size"]).toBe("2");

      const ids = [...first.body, ...(await as(request(app).get(`${base}/notifications?limit=2&page=2`), teacherTok)).body, ...last.body].map((n) => n._id);
      expect(new Set(ids).size).toBe(5);
    });

    it("answers a bad page or limit with a 400", async () => {
      for (const q of ["limit=0", "limit=abc", "page=-1", "limit=1.5"]) {
        const res = await as(request(app).get(`${base}/notifications?${q}`), teacherTok);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("VALIDATION_ERROR");
      }
    });

    it("pages the students list in a stable order without overlap", async () => {
      const all = await as(request(app).get(`${base}/students`), adminTok);
      expect(all.body).toHaveLength(3);
      const p1 = await as(request(app).get(`${base}/students?limit=2&page=1`), adminTok);
      const p2 = await as(request(app).get(`${base}/students?limit=2&page=2`), adminTok);
      expect(p1.body).toHaveLength(2);
      expect(p2.body).toHaveLength(1);
      expect(p1.headers["x-total-count"]).toBe("3");
      expect(new Set([...p1.body, ...p2.body].map((s) => s._id)).size).toBe(3);
    });
  });
});
