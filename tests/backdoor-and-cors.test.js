const request = require("supertest");
const app = require("../app");
const User = require("../models/userModel");

describe("removed admin backdoor (finding C-3)", () => {
  it("GET /users/admin/add/:token no longer creates anything", async () => {
    const before = await User.countDocuments();
    const res = await request(app).get("/api/frebbys/v1/users/admin/add/anything");
    expect([401, 404]).toContain(res.status);
    expect(await User.countDocuments()).toBe(before);
  });
});

describe("CORS allowlist (finding H-10)", () => {
  const preflight = (origin) =>
    request(app)
      .options("/api/frebbys/v1/health")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET");

  it("allows an origin whose allowlist entry was written with a trailing slash", async () => {
    const res = await preflight("https://school.example");
    expect(res.headers["access-control-allow-origin"]).toBe("https://school.example");
  });

  it("allows an origin listed without a trailing slash", async () => {
    const res = await preflight("https://student.example");
    expect(res.headers["access-control-allow-origin"]).toBe("https://student.example");
  });

  it("rejects an origin that is not listed", async () => {
    const res = await preflight("https://evil.example");
    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
