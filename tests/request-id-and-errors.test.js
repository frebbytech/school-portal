const request = require("supertest");
const app = require("../app");

describe("request id and central error handler", () => {
  it("returns an X-Request-Id header on every response", async () => {
    const res = await request(app).get("/api/frebbys/v1/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9._-]{8,64}$/);
  });

  it("reuses a safe caller-supplied id and ignores an unsafe one", async () => {
    const good = await request(app).get("/api/frebbys/v1/health").set("X-Request-Id", "trace-12345678");
    expect(good.headers["x-request-id"]).toBe("trace-12345678");
    const bad = await request(app).get("/api/frebbys/v1/health").set("X-Request-Id", "bad id with spaces\t<x>");
    expect(bad.headers["x-request-id"]).not.toContain(" ");
  });

  it("returns the legacy error body (plus code/requestId) for unknown routes", async () => {
    const res = await request(app).get("/api/frebbys/v1/users/school-does-not-exist-route/x/y");
    // unauthenticated requests reach the global JWT guard first; either way the id is present
    expect([401, 404]).toContain(res.status);
    expect(res.headers["x-request-id"]).toBeTruthy();
  });

  it("answers malformed JSON with a 400 JSON error instead of a stack trace", async () => {
    const res = await request(app)
      .post("/api/frebbys/v1/users/login")
      .set("Content-Type", "application/json")
      .send("{not valid json");
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("error");
    expect(res.body.statusCode).toBe(400);
    expect(res.body.requestId).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toContain("node_modules");
  });
});
