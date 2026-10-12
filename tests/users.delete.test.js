const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const User = require("../models/userModel");
const { createSchool, createUser, staffToken, studentToken } = require("./helpers");

const url = (id) => `/api/frebbys/v1/users/${id}`;

describe("DELETE /users/:id (finding C-2)", () => {
  let schoolA, schoolB, adminA, teacherA, adminB, targetA, targetB;

  beforeAll(async () => {
    schoolA = await createSchool();
    schoolB = await createSchool();
    adminA = await createUser(schoolA, "administrator");
    teacherA = await createUser(schoolA, "teacher");
    adminB = await createUser(schoolB, "administrator");
  });

  beforeEach(async () => {
    targetA = await createUser(schoolA, "teacher");
    targetB = await createUser(schoolB, "teacher");
  });

  it("rejects requests without a token", async () => {
    const res = await request(app).delete(url(targetA._id));
    expect(res.status).toBe(401);
    expect(await User.exists({ _id: targetA._id })).toBeTruthy();
  });

  it("rejects a student token", async () => {
    const res = await request(app)
      .delete(url(targetA._id))
      .set("Authorization", `Bearer ${studentToken(new mongoose.Types.ObjectId(), schoolA)}`);
    expect(res.status).toBe(403);
    expect(await User.exists({ _id: targetA._id })).toBeTruthy();
  });

  it("rejects a non-administrator staff token", async () => {
    const res = await request(app)
      .delete(url(targetA._id))
      .set("Authorization", `Bearer ${staffToken(teacherA)}`);
    expect(res.status).toBe(403);
    expect(await User.exists({ _id: targetA._id })).toBeTruthy();
  });

  it("rejects an administrator of another school and does not reveal the user", async () => {
    const res = await request(app)
      .delete(url(targetA._id))
      .set("Authorization", `Bearer ${staffToken(adminB)}`);
    expect(res.status).toBe(403);
    expect(await User.exists({ _id: targetA._id })).toBeTruthy();
  });

  it("returns 401 for a malformed id (existing behaviour preserved)", async () => {
    const res = await request(app)
      .delete(url("not-an-id"))
      .set("Authorization", `Bearer ${staffToken(adminA)}`);
    expect(res.status).toBe(401);
  });

  it("lets an administrator delete a user of their own school", async () => {
    const res = await request(app)
      .delete(url(targetA._id))
      .set("Authorization", `Bearer ${staffToken(adminA)}`);
    expect(res.status).toBe(200);
    expect(res.body).toBe("User has been removed successfully !!!");
    expect(await User.exists({ _id: targetA._id })).toBeNull();
  });
});
