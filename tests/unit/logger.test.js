const { redact, serializeError, logger } = require("../../common/logger");

describe("redact", () => {
  it("hides values of sensitive keys, at any depth, case-insensitively", () => {
    const out = redact({
      username: "ama",
      Password: "p1",
      nested: { refresh_token: "t", accessToken: "t2", Authorization: "Bearer x", ok: 1 },
      list: [{ apiKey: "k" }],
    });
    expect(out.username).toBe("ama");
    expect(out.Password).toBe("[REDACTED]");
    expect(out.nested.refresh_token).toBe("[REDACTED]");
    expect(out.nested.accessToken).toBe("[REDACTED]");
    expect(out.nested.Authorization).toBe("[REDACTED]");
    expect(out.nested.ok).toBe(1);
    expect(out.list[0].apiKey).toBe("[REDACTED]");
  });

  it("strips credentials from connection strings inside text", () => {
    const out = redact({ message: "failed to connect to mongodb+srv://admin:hunter2@cluster.example/db" });
    expect(out.message).not.toContain("hunter2");
    expect(out.message).not.toContain("admin:");
    expect(out.message).toContain("cluster.example");
  });

  it("survives circular structures and very deep objects", () => {
    const a = { name: "a" };
    a.self = a;
    expect(redact(a).self).toBe("[Circular]");
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: 1 } } } } } };
    expect(JSON.stringify(redact(deep))).toContain("[Object]");
  });

  it("serializes errors without losing the message and with credentials removed", () => {
    const err = new Error("cannot reach mongodb://u:pw@host/db");
    const out = serializeError(err);
    expect(out.name).toBe("Error");
    expect(out.message).not.toContain("pw");
    expect(out.message).toContain("host/db");
  });
});

describe("logger output", () => {
  it("writes one JSON line per entry with redacted context", () => {
    const originalWrite = process.stdout.write;
    const previous = process.env.LOG_LEVEL;
    let captured = "";
    process.env.LOG_LEVEL = "info";
    process.stdout.write = (chunk) => {
      captured += chunk;
      return true;
    };
    try {
      logger.info("hello", { requestId: "r1", password: "secret", count: 2 });
    } finally {
      process.stdout.write = originalWrite;
      if (previous === undefined) delete process.env.LOG_LEVEL;
      else process.env.LOG_LEVEL = previous;
    }
    const entry = JSON.parse(captured.trim());
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("hello");
    expect(entry.requestId).toBe("r1");
    expect(entry.password).toBe("[REDACTED]");
    expect(entry.count).toBe(2);
  });

  it("is silent under NODE_ENV=test unless LOG_LEVEL is set", () => {
    const originalWrite = process.stdout.write;
    const previous = process.env.LOG_LEVEL;
    delete process.env.LOG_LEVEL;
    let captured = "";
    process.stdout.write = (chunk) => {
      captured += chunk;
      return true;
    };
    try {
      logger.info("should not appear");
    } finally {
      process.stdout.write = originalWrite;
      if (previous !== undefined) process.env.LOG_LEVEL = previous;
    }
    expect(captured).toBe("");
  });
});
