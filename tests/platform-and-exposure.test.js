const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const User = require("../models/userModel");
const School = require("../models/schoolModel");
const Student = require("../models/studentModel");
const StudentAuth = require("../models/studentAuthModel");
const Term = require("../models/termModel");
const {
  createSchool,
  createUser,
  staffToken,
  studentToken,
  createPlatformAdmin,
  platformToken,
} = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

describe("platform administrator and closed exposures (Stage 4e)", () => {
  let schoolA, schoolB, adminA, teacherA, teacherB;
  let adminTok, teacherTok, platform, platformTok, studentTokA;

  beforeAll(async () => {
    schoolA = await createSchool({ unique: "internal-key", motto: "Be kind" });
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    teacherB = await createUser(schoolB, "teacher");
    adminTok = staffToken(adminA);
    teacherTok = staffToken(teacherA);
    platform = await createPlatformAdmin();
    platformTok = platformToken(platform);
    studentTokA = studentToken(oid(), schoolA);
  });

  describe("platform login", () => {
    it("signs a platform administrator in with username and password", async () => {
      const res = await request(app).post(`${base}/platform/login`).send({ username: platform.username, password: "platform-pass-123" });
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe("string");
      expect((await as(request(app).get(`${base}/platform/schools`), res.body.token)).status).toBe(200);
    });

    it("rejects a wrong password, school accounts and malformed input with the same answer", async () => {
      const wrong = await request(app).post(`${base}/platform/login`).send({ username: platform.username, password: "nope-nope-nope" });
      const school = await request(app).post(`${base}/platform/login`).send({ username: adminA.username, password: "password123" });
      const malformed = await request(app).post(`${base}/platform/login`).send({ username: { $ne: "" }, password: { $ne: "" } });
      for (const res of [wrong, school, malformed]) expect(res.status).toBe(404);
    });

    it("cannot be used through the school login", async () => {
      const res = await request(app).post(`${base}/users/login`).send({ username: platform.username, password: "platform-pass-123" });
      expect(res.status).toBe(404);
      expect(res.body.token).toBeUndefined();
    });
  });

  describe("platform routes", () => {
    it("are closed to everyone but a platform administrator", async () => {
      for (const token of [adminTok, teacherTok, studentTokA]) {
        expect((await as(request(app).get(`${base}/platform/schools`), token)).status).toBe(403);
        expect((await as(request(app).post(`${base}/platform/schools`).send({ name: "X" }), token)).status).toBe(403);
        expect((await as(request(app).put(`${base}/platform/schools/${schoolA._id}`).send({ name: "X" }), token)).status).toBe(403);
        expect((await as(request(app).post(`${base}/platform/schools/${schoolA._id}/administrators`).send({}), token)).status).toBe(403);
      }
      expect((await request(app).get(`${base}/platform/schools`)).status).toBe(401);
    });

    it("create a school, set its modules, and create its first administrator who can sign in", async () => {
      const code = uniq("PLT");
      const created = await as(
        request(app).post(`${base}/platform/schools`).send({ name: "Platform School", code, permissions: ["Students", "Teachers"] }),
        platformTok
      );
      expect(created.status).toBe(201);
      expect(created.body.permissions).toEqual(["Students", "Teachers"]);
      const schoolId = created.body._id;

      const edited = await as(
        request(app).put(`${base}/platform/schools/${schoolId}`).send({ permissions: ["Students", "Teachers", "School Fees"], _id: String(schoolA._id) }),
        platformTok
      );
      expect(edited.status).toBe(200);
      expect(edited.body.permissions).toContain("School Fees");
      expect(String(edited.body._id)).toBe(schoolId);

      const username = uniq("first");
      const admin = await as(
        request(app).post(`${base}/platform/schools/${schoolId}/administrators`).send({
          username, email: `${username}@example.com`, firstname: "First", lastname: "Admin",
          password: "a-good-password", role: "platform_admin", school: String(schoolA._id),
        }),
        platformTok
      );
      expect(admin.status).toBe(201);
      const saved = await User.findOne({ username });
      expect(saved.role).toBe("administrator");
      expect(String(saved.school)).toBe(schoolId);

      const login = await request(app).post(`${base}/users/login`).send({ username, password: "a-good-password", code: schoolId });
      expect(login.status).toBe(200);
      expect(login.body.token).toBeTruthy();
    });

    it("validate the administrator's password and uniqueness", async () => {
      const url = `${base}/platform/schools/${schoolB._id}/administrators`;
      const short = await as(request(app).post(url).send({ username: uniq("u"), email: `${uniq("e")}@x.com`, firstname: "A", lastname: "B", password: "short" }), platformTok);
      expect(short.status).toBe(400);
      const dup = await as(request(app).post(url).send({ username: adminA.username, email: `${uniq("e")}@x.com`, firstname: "A", lastname: "B", password: "long-enough-pass" }), platformTok);
      expect(dup.status).toBe(400);
      expect((await as(request(app).post(`${base}/platform/schools/${oid()}/administrators`).send({ username: uniq("u"), password: "long-enough-pass" }), platformTok)).status).toBe(404);
    });

    it("a platform token is refused by every school-level endpoint", async () => {
      for (const path of ["students", "teachers", "levels/recent/birthday", "events", "notes", "notifications", "parents", "fees", "schools"]) {
        expect((await as(request(app).get(`${base}/${path}`), platformTok)).status).toBe(403);
      }
      expect((await as(request(app).post(`${base}/users`).send({ username: "x" }), platformTok)).status).toBe(403);
    });

    it("school creation through /schools is platform-only too", async () => {
      expect((await as(request(app).post(`${base}/schools`).send({ name: "N", code: uniq("N") }), adminTok)).status).toBe(403);
      expect((await as(request(app).post(`${base}/schools`).send({ name: "N", code: uniq("N") }), platformTok)).status).toBe(201);
    });
  });

  describe("public and unauthenticated exposures", () => {
    it("GET /schools/:code shows only public fields", async () => {
      const res = await request(app).get(`${base}/schools/${schoolA.code}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Test School");
      expect(res.body.motto).toBe("Be kind");
      expect(res.body._id).toBeTruthy();
      expect(res.body.unique).toBeUndefined();
      expect(res.body.createdAt).toBeUndefined();
      expect((await request(app).get(`${base}/schools/does-not-exist`)).status).toBe(404);
    });

    it("GET /users/school needs a token and returns the caller's own school", async () => {
      expect((await request(app).get(`${base}/users/school`)).status).toBe(401);
      const staff = await as(request(app).get(`${base}/users/school`), teacherTok);
      expect(staff.status).toBe(200);
      expect(String(staff.body._id)).toBe(String(schoolA._id));
      const other = await as(request(app).get(`${base}/users/school`), staffToken(teacherB));
      expect(String(other.body._id)).toBe(String(schoolB._id));
      const student = await as(request(app).get(`${base}/users/school`), studentTokA);
      expect(String(student.body._id)).toBe(String(schoolA._id));
      expect((await as(request(app).get(`${base}/users/school`), platformTok)).status).toBe(403);
    });

    describe("GET /student-auth/:id", () => {
      let student, otherStudent, studentB, account;

      beforeAll(async () => {
        await make(Term, { school: schoolA._id, status: "current", active: true });
        student = await make(Student, { indexnumber: uniq("sa"), school: schoolA._id, firstname: "Ann", phonenumber: "0240000021" });
        otherStudent = await make(Student, { indexnumber: uniq("sc"), school: schoolA._id, firstname: "Cy", phonenumber: "0240000022" });
        studentB = await make(Student, { indexnumber: uniq("sb"), school: schoolB._id, firstname: "Bob", phonenumber: "0240000023" });
        account = await make(StudentAuth, { school: schoolA._id, indexnumber: student.indexnumber, phonenumber: "0240000021", password: "x" });
      });

      it("requires a token", async () => {
        expect((await request(app).get(`${base}/student-auth/${student._id}`)).status).toBe(401);
      });

      it("lets staff of the student's school and the student themselves read it", async () => {
        expect((await as(request(app).get(`${base}/student-auth/${student._id}`), teacherTok)).status).toBe(200);
        const own = await as(request(app).get(`${base}/student-auth/${student._id}`), studentToken(account._id, schoolA));
        expect(own.status).toBe(200);
      });

      it("refuses other schools, other students and platform tokens alike", async () => {
        expect((await as(request(app).get(`${base}/student-auth/${studentB._id}`), teacherTok)).status).toBe(403);
        expect((await as(request(app).get(`${base}/student-auth/${oid()}`), teacherTok)).status).toBe(400);
        expect((await as(request(app).get(`${base}/student-auth/${otherStudent._id}`), studentToken(account._id, schoolA))).status).toBe(403);
        expect((await as(request(app).get(`${base}/student-auth/${student._id}`), staffToken(teacherB))).status).toBe(403);
        expect((await as(request(app).get(`${base}/student-auth/${student._id}`), platformTok)).status).toBe(403);
        expect((await as(request(app).get(`${base}/student-auth/not-an-id`), teacherTok)).status).toBe(403);
      });
    });

    it("no longer serves the internal static folders", async () => {
      for (const path of ["reports/me.html", "views/report.ejs", "templates/students.xlsx", "images/anything.png"]) {
        const res = await request(app).get(`${base}/${path}`);
        expect(res.status).not.toBe(200);
      }
    });

    it("keeps the authenticated import-template download working", async () => {
      expect((await request(app).get(`${base}/template?name=students`)).status).toBe(401);
      expect((await as(request(app).get(`${base}/template?name=students`), teacherTok)).status).toBe(200);
    });
  });
});
