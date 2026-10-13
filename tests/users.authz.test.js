const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/userModel");
const School = require("../models/schoolModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const base = "/api/frebbys/v1/users";
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);

describe("users router authorization (finding C-5)", () => {
  let schoolA, schoolB, adminA, teacherA, otherTeacherA, adminB, teacherB;
  let adminToken, teacherToken, studentTok;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    otherTeacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
    teacherB = await createUser(schoolB, "teacher");
    adminToken = staffToken(adminA);
    teacherToken = staffToken(teacherA);
    studentTok = studentToken(new mongoose.Types.ObjectId(), schoolA);
  });

  describe("reading", () => {
    it("rejects student tokens on the list and by id", async () => {
      expect((await as(request(app).get(base), studentTok)).status).toBe(403);
      expect((await as(request(app).get(`${base}/${teacherA._id}`), studentTok)).status).toBe(403);
    });

    it("lists only the caller's school", async () => {
      const res = await as(request(app).get(base), teacherToken);
      expect(res.status).toBe(200);
      const ids = res.body.map((u) => String(u._id));
      expect(ids).toContain(String(adminA._id));
      expect(ids).not.toContain(String(adminB._id));
    });

    it("returns a user of the same school and hides other schools and missing ids", async () => {
      expect((await as(request(app).get(`${base}/${otherTeacherA._id}`), teacherToken)).status).toBe(200);
      expect((await as(request(app).get(`${base}/${teacherB._id}`), teacherToken)).status).toBe(404);
      expect((await as(request(app).get(`${base}/${new mongoose.Types.ObjectId()}`), teacherToken)).status).toBe(404);
      expect((await as(request(app).get(`${base}/not-an-id`), teacherToken)).status).toBe(404);
    });
  });

  describe("creating users (POST /users)", () => {
    const payload = (n, extra = {}) => ({
      firstname: "New",
      lastname: "Person",
      username: `new${n}`,
      email: `new${n}@example.com`,
      role: "teacher",
      password: "secret123",
      ...extra,
    });
    const n = () => new mongoose.Types.ObjectId().toString().slice(-8);

    it("is refused for teachers and students", async () => {
      expect((await as(request(app).post(base), teacherToken).send(payload(n()))).status).toBe(403);
      expect((await as(request(app).post(base), studentTok).send(payload(n()))).status).toBe(403);
    });

    it("lets an administrator create staff, always in their own school", async () => {
      const num = n();
      const res = await as(request(app).post(base), adminToken).send(payload(num, { school: String(schoolB._id) }));
      expect(res.status).toBe(201);
      const created = await User.findOne({ username: `new${num}` });
      expect(String(created.school)).toBe(String(schoolA._id));
      expect(await bcrypt.compare("secret123", created.password)).toBe(true);
    });

    it("rejects roles other than administrator and teacher, and weak passwords", async () => {
      expect((await as(request(app).post(base), adminToken).send(payload(n(), { role: "student" }))).status).toBe(400);
      expect((await as(request(app).post(base), adminToken).send(payload(n(), { password: "123" }))).status).toBe(400);
      expect((await as(request(app).post(base), adminToken).send(payload(n(), { password: undefined }))).status).toBe(400);
    });
  });

  describe("updating users (PUT and PATCH)", () => {
    it("lets a user edit their own profile but ignores role, permissions, school and active", async () => {
      const me = await createUser(schoolA, "teacher");
      const res = await as(request(app).put(base), staffToken(me)).send({
        _id: String(me._id),
        isOnlyUpdate: true,
        firstname: "Renamed",
        role: "administrator",
        permissions: ["Users"],
        school: String(schoolB._id),
        active: false,
      });
      expect(res.status).toBe(201);
      const after = await User.findById(me._id);
      expect(after.firstname).toBe("Renamed");
      expect(after.role).toBe("teacher");
      expect(after.permissions).toEqual([]);
      expect(String(after.school)).toBe(String(schoolA._id));
      expect(after.active).toBe(true);
    });

    it("refuses a teacher editing someone else", async () => {
      const res = await as(request(app).put(base), teacherToken).send({
        _id: String(otherTeacherA._id),
        isOnlyUpdate: true,
        firstname: "Hacked",
      });
      expect(res.status).toBe(403);
      expect((await User.findById(otherTeacherA._id)).firstname).not.toBe("Hacked");
    });

    it("lets an administrator change role and permissions in their school", async () => {
      const target = await createUser(schoolA, "teacher");
      const res = await as(request(app).put(base), adminToken).send({
        _id: String(target._id),
        isOnlyUpdate: true,
        permissions: ["Students"],
        role: "administrator",
      });
      expect(res.status).toBe(201);
      const after = await User.findById(target._id);
      expect(after.role).toBe("administrator");
      expect(after.permissions).toEqual(["Students"]);
    });

    it("hides users of other schools from an administrator", async () => {
      const res = await as(request(app).put(base), adminToken).send({
        _id: String(teacherB._id),
        isOnlyUpdate: true,
        firstname: "Hacked",
      });
      expect(res.status).toBe(404);
      expect((await User.findById(teacherB._id)).firstname).not.toBe("Hacked");
    });

    it("hashes a password sent through PUT and PATCH", async () => {
      const me = await createUser(schoolA, "teacher");
      await as(request(app).put(base), staffToken(me)).send({
        _id: String(me._id),
        isOnlyUpdate: true,
        password: "put-password",
      });
      let stored = await User.findById(me._id);
      expect(stored.password).not.toBe("put-password");
      expect(await bcrypt.compare("put-password", stored.password)).toBe(true);

      const res = await as(request(app).patch(base), staffToken(me)).send({ id: String(me._id), password: "patch-password" });
      expect(res.status).toBe(200);
      stored = await User.findById(me._id);
      expect(stored.password).not.toBe("patch-password");
      expect(await bcrypt.compare("patch-password", stored.password)).toBe(true);
    });

    it("PATCH cannot escalate privileges", async () => {
      const me = await createUser(schoolA, "teacher");
      const res = await as(request(app).patch(base), staffToken(me)).send({ id: String(me._id), role: "administrator" });
      expect(res.status).toBe(200);
      expect((await User.findById(me._id)).role).toBe("teacher");
    });
  });

  describe("passwords and accounts", () => {
    it("/reset only works for the caller's own id", async () => {
      const res = await as(request(app).put(`${base}/reset`), teacherToken).send({
        id: String(otherTeacherA._id),
        oldPassword: "password123",
        newPassword: "newpass123",
      });
      expect(res.status).toBe(403);
    });

    it("/reset changes the caller's own password with the right old one", async () => {
      const me = await createUser(schoolA, "teacher");
      const res = await as(request(app).put(`${base}/reset`), staffToken(me)).send({
        id: String(me._id),
        oldPassword: "password123",
        newPassword: "newpass123",
      });
      expect(res.status).toBe(200);
      expect(await bcrypt.compare("newpass123", (await User.findById(me._id)).password)).toBe(true);
    });

    it("/reset-password and /admin/reset-password are administrator-only and school-scoped", async () => {
      const target = await createUser(schoolA, "teacher");
      const body = { id: String(target._id), password: "reset-by-admin" };
      expect((await as(request(app).put(`${base}/reset-password`), teacherToken).send(body)).status).toBe(403);
      expect((await as(request(app).patch(`${base}/admin/reset-password`), teacherToken).send(body)).status).toBe(403);

      const foreign = { id: String(teacherB._id), password: "reset-by-admin" };
      expect((await as(request(app).put(`${base}/reset-password`), adminToken).send(foreign)).status).toBe(404);
      expect((await as(request(app).patch(`${base}/admin/reset-password`), adminToken).send(foreign)).status).toBe(404);

      expect((await as(request(app).put(`${base}/reset-password`), adminToken).send(body)).status).toBe(200);
      expect(await bcrypt.compare("reset-by-admin", (await User.findById(target._id)).password)).toBe(true);
    });

    it("/account is administrator-only and school-scoped", async () => {
      const target = await createUser(schoolA, "teacher");
      expect((await as(request(app).put(`${base}/account`), teacherToken).send({ id: String(target._id), active: false })).status).toBe(403);
      expect((await as(request(app).put(`${base}/account`), adminToken).send({ id: String(teacherB._id), active: false })).status).toBe(404);
      expect((await User.findById(teacherB._id)).active).toBe(true);
      expect((await as(request(app).put(`${base}/account`), adminToken).send({ id: String(target._id), active: false })).status).toBe(200);
      expect((await User.findById(target._id)).active).toBe(false);
    });
  });

  describe("PUT /users/school", () => {
    it("is refused for teachers", async () => {
      const res = await as(request(app).put(`${base}/school`), teacherToken).send({ name: "Taken Over" });
      expect(res.status).toBe(403);
    });

    it("updates only the administrator's own school and only descriptive fields", async () => {
      const before = await School.countDocuments();
      const res = await as(request(app).put(`${base}/school`), adminToken).send({
        name: "Renamed School",
        code: "HIJACK",
        unique: "HIJACK",
        permissions: ["Users", "Settings"],
        // a different school's identifier must not redirect the update
        _id: String(schoolB._id),
      });
      expect(res.status).toBe(200);
      const a = await School.findById(schoolA._id);
      const b = await School.findById(schoolB._id);
      expect(a.name).toBe("Renamed School");
      expect(a.code).not.toBe("HIJACK");
      expect(a.permissions).not.toContain("Settings");
      expect(b.name).toBe("Test School");
      expect(await School.countDocuments()).toBe(before);
    });
  });

  describe("session renewal for disabled accounts (finding H-1)", () => {
    const refreshCookie = (user) =>
      `refresh_token=${jwt.sign({ id: String(user._id), role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "1h" })}`;

    it("renews an active staff session", async () => {
      const user = await createUser(schoolA, "teacher");
      const res = await request(app).post(`${base}/verify`).set("Cookie", refreshCookie(user));
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it("refuses to renew a disabled staff account", async () => {
      const user = await createUser(schoolA, "teacher", { active: false });
      const res = await request(app).post(`${base}/verify`).set("Cookie", refreshCookie(user));
      expect(res.status).toBe(401);
    });
  });
});

describe("student logout (finding H-2)", () => {
  it("expires the refresh_token cookie", async () => {
    const res = await request(app).post("/api/frebbys/v1/student-auth/logout");
    expect(res.status).toBe(204);
    const cookies = (res.headers["set-cookie"] || []).join(";");
    expect(cookies).toMatch(/refresh_token=;/);
    expect(cookies).toMatch(/Path=\/api\/frebbys\/v1\/student-auth\/refresh/);
  });
});
