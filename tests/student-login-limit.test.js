const request = require("supertest");
const app = require("../app");

const login = (studentId) =>
  request(app).post("/api/frebbys/v1/student-auth/login").send({ studentId, password: "wrong-password" });

describe("student login rate limit (per student id and IP, failed attempts only)", () => {
  const previous = process.env.STUDENT_LOGIN_RATE_LIMIT_MAX;

  beforeAll(() => {
    process.env.STUDENT_LOGIN_RATE_LIMIT_MAX = "3";
  });
  afterAll(() => {
    if (previous === undefined) delete process.env.STUDENT_LOGIN_RATE_LIMIT_MAX;
    else process.env.STUDENT_LOGIN_RATE_LIMIT_MAX = previous;
  });

  it("blocks repeated failed attempts for one student id", async () => {
    const id = `limit-${Date.now()}-a`;
    for (let i = 0; i < 3; i++) {
      const res = await login(id);
      expect(res.status).toBe(401);
    }
    const blocked = await login(id);
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toMatch(/Too many/);
  });

  it("does not block a different student id from the same IP", async () => {
    const noisy = `limit-${Date.now()}-b`;
    for (let i = 0; i < 4; i++) await login(noisy);
    const other = await login(`limit-${Date.now()}-c`);
    expect(other.status).toBe(401);
  });
});
