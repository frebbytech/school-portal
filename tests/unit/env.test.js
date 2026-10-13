const { validateEnv, assertEnv, DEFAULT_REFRESH_TOKEN_EXPIRY } = require("../../config/env");

const LONG = (c) => c.repeat(40);
const prodEnv = (overrides = {}) => ({
  NODE_ENV: "production",
  MONGO_URL: "mongodb://example/db",
  JWT_SECRET: LONG("a"),
  JWT_REFRESH_SECRET: LONG("b"),
  REFRESH_TOKEN_SECRET: LONG("c"),
  SESSION_SECRET: LONG("d"),
  ...overrides,
});

const silentLog = () => {
  const lines = { warn: [], error: [] };
  return { lines, warn: (m) => lines.warn.push(m), error: (m) => lines.error.push(m) };
};

describe("validateEnv", () => {
  it("reports every missing required variable in production", () => {
    const { errors } = validateEnv({ NODE_ENV: "production" });
    expect(errors).toHaveLength(5);
    expect(errors.join(" ")).toContain("MONGO_URL");
    expect(errors.join(" ")).toContain("SESSION_SECRET");
  });

  it("requires nothing outside production", () => {
    expect(validateEnv({ NODE_ENV: "development" }).errors).toHaveLength(0);
    expect(validateEnv({}).errors).toHaveLength(0);
  });

  it("treats blank values as missing", () => {
    const { errors } = validateEnv(prodEnv({ JWT_SECRET: "   " }));
    expect(errors).toHaveLength(1);
  });

  it("warns about short secrets without failing", () => {
    const { errors, warnings } = validateEnv(prodEnv({ JWT_SECRET: "short" }));
    expect(errors).toHaveLength(0);
    expect(warnings.join(" ")).toContain("JWT_SECRET is shorter");
  });

  it("warns when two secrets share a value", () => {
    const { warnings } = validateEnv(prodEnv({ JWT_REFRESH_SECRET: LONG("a") }));
    expect(warnings.join(" ")).toContain("same value");
  });

  it("never includes secret values in its messages", () => {
    const { errors, warnings } = validateEnv(prodEnv({ JWT_SECRET: "super-secret-value", MONGO_URL: "" }));
    expect((errors.concat(warnings)).join(" ")).not.toContain("super-secret-value");
  });
});

describe("assertEnv", () => {
  it("throws on a bad production config and logs the problems", () => {
    const log = silentLog();
    let thrown = null;
    try {
      assertEnv({ NODE_ENV: "production" }, log);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeTruthy();
    expect(log.lines.error).toHaveLength(5);
  });

  it("passes a complete production config", () => {
    const log = silentLog();
    assertEnv(prodEnv(), log);
    expect(log.lines.error).toHaveLength(0);
  });

  it("defaults REFRESH_TOKEN_EXPIRY when it is missing", () => {
    const env = prodEnv();
    assertEnv(env, silentLog());
    expect(env.REFRESH_TOKEN_EXPIRY).toBe(DEFAULT_REFRESH_TOKEN_EXPIRY);
  });

  it("keeps an explicit REFRESH_TOKEN_EXPIRY", () => {
    const env = prodEnv({ REFRESH_TOKEN_EXPIRY: "30d" });
    assertEnv(env, silentLog());
    expect(env.REFRESH_TOKEN_EXPIRY).toBe("30d");
  });
});
