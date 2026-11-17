const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = require("../app");
const User = require("../models/userModel");
const StudentAuth = require("../models/studentAuthModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const base = "/api/frebbys/v1";
const bearer = (req, token) => req.set("Authorization", `Bearer ${token}`);

describe("first-login password prompt", () => {
  describe("staff", () => {
    it("login reports mustChangePassword, and /verify keeps reporting it after a reload", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher", { mustChangePassword: true });

      const login = await request(app)
        .post(`${base}/users/login`)
        .send({ username: user.username, password: "password123", code: String(school._id) });
      expect(login.status).toBe(200);
      expect(login.body.mustChangePassword).toBe(true);

      const refresh = jwt.sign({ id: String(user._id), role: "teacher" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "1d" });
      const verify = await request(app).post(`${base}/users/verify`).set("Cookie", `refresh_token=${refresh}`);
      expect(verify.status).toBe(200);
      expect(verify.body.mustChangePassword).toBe(true);
    });

    it("is false for an ordinary account", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher");
      const login = await request(app)
        .post(`${base}/users/login`)
        .send({ username: user.username, password: "password123", code: String(school._id) });
      expect(login.body.mustChangePassword).toBe(false);
    });

    it("changing the password clears the flag", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher", { mustChangePassword: true });
      const res = await bearer(request(app).put(`${base}/users/reset`), staffToken(user)).send({
        id: String(user._id),
        oldPassword: "password123",
        newPassword: "brand-new-pass",
      });
      expect(res.status).toBe(200);
      const saved = await User.findById(user._id);
      expect(saved.mustChangePassword).toBe(false);
      expect(await bcrypt.compare("brand-new-pass", saved.password)).toBe(true);
    });

    it("refuses a short, unchanged or missing password and keeps the flag", async () => {
      const school = await createSchool();
      const user = await createUser(school, "teacher", { mustChangePassword: true });
      const send = (body) =>
        bearer(request(app).put(`${base}/users/reset`), staffToken(user)).send({ id: String(user._id), ...body });

      expect((await send({ oldPassword: "password123", newPassword: "short" })).status).toBe(400);
      expect((await send({ oldPassword: "password123", newPassword: "password123" })).status).toBe(400);
      expect((await send({ newPassword: "long-enough-1" })).status).toBe(400);
      expect((await send({ oldPassword: "wrong-one", newPassword: "long-enough-1" })).status).toBe(404);
      expect((await User.findById(user._id)).mustChangePassword).toBe(true);
    });
  });

  describe("student", () => {
    const makeStudent = async (overrides = {}) => {
      const school = await createSchool();
      const id = new mongoose.Types.ObjectId();
      const n = id.toString().slice(-10);
      const auth = await StudentAuth.create({
        _id: id,
        school: school._id,
        indexnumber: `stu${n}`,
        email: `stu${n}@example.com`,
        phonenumber: "0240000000",
        password: await bcrypt.hash("0240000000", 4),
        mustChangePassword: true,
        ...overrides,
      });
      return { school, auth, token: studentToken(id, school) };
    };
    const change = (token, body) =>
      bearer(request(app).post(`${base}/student-auth/change-password`), token).send(body);

    it("changes the password with the current one and clears the flag", async () => {
      const { auth, token } = await makeStudent();
      const res = await change(token, { oldPassword: "0240000000", newPassword: "my-own-secret" });
      expect(res.status).toBe(200);
      const saved = await StudentAuth.findById(auth._id);
      expect(saved.mustChangePassword).toBe(false);
      expect(await bcrypt.compare("my-own-secret", saved.password)).toBe(true);
    });

    it("refuses a wrong current password, a short or unchanged new one", async () => {
      const { auth, token } = await makeStudent();
      expect((await change(token, { oldPassword: "nope-nope", newPassword: "my-own-secret" })).status).toBe(400);
      expect((await change(token, { oldPassword: "0240000000", newPassword: "short" })).status).toBe(400);
      expect((await change(token, { oldPassword: "0240000000", newPassword: "0240000000" })).status).toBe(400);
      expect((await change(token, { newPassword: "my-own-secret" })).status).toBe(400);
      expect((await StudentAuth.findById(auth._id)).mustChangePassword).toBe(true);
    });

    it("needs a student token", async () => {
      const school = await createSchool();
      const teacher = await createUser(school, "teacher");
      expect((await change(staffToken(teacher), { oldPassword: "password123", newPassword: "my-own-secret" })).status).toBe(403);
      const none = await request(app).post(`${base}/student-auth/change-password`).send({});
      expect([401, 403]).toContain(none.status);
    });

    it("changes only the caller's own account", async () => {
      const a = await makeStudent();
      const b = await makeStudent();
      await change(a.token, { oldPassword: "0240000000", newPassword: "my-own-secret" });
      expect((await StudentAuth.findById(b.auth._id)).mustChangePassword).toBe(true);
    });
  });
});
