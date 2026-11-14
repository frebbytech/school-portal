const { cookieSettings, refreshCookieOptions, clearCookieOptions } = require("../../common/cookies");
const { validateEnv } = require("../../config/env");

const PATH = "/api/frebbys/v1/users/verify";

describe("sign-in cookie settings", () => {
  it("defaults to today's behaviour: Secure, SameSite=None, no Domain attribute", () => {
    expect(cookieSettings({})).toEqual({ sameSite: "none", domain: undefined, secure: true });
    const options = refreshCookieOptions(PATH, {});
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: PATH });
    expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000);
    expect("domain" in options).toBe(false);
  });

  it("never carries the old hard-coded host", () => {
    expect(JSON.stringify(refreshCookieOptions(PATH, { NODE_ENV: "production" }))).not.toMatch(/onrender/);
  });

  it("uses COOKIE_DOMAIN when set (trimmed) and ignores blank", () => {
    expect(refreshCookieOptions(PATH, { COOKIE_DOMAIN: " example.com " }).domain).toBe("example.com");
    expect("domain" in refreshCookieOptions(PATH, { COOKIE_DOMAIN: "  " })).toBe(false);
  });

  it("supports one-site hosting with Lax and lets Secure be switched off only then", () => {
    expect(cookieSettings({ COOKIE_SAMESITE: "Lax" })).toMatchObject({ sameSite: "lax", secure: true });
    expect(cookieSettings({ COOKIE_SAMESITE: "lax", COOKIE_SECURE: "false" }).secure).toBe(false);
    // Browsers reject SameSite=None without Secure, so it is forced on.
    expect(cookieSettings({ COOKIE_SAMESITE: "none", COOKIE_SECURE: "false" }).secure).toBe(true);
  });

  it("falls back to None for an unknown SameSite value", () => {
    expect(cookieSettings({ COOKIE_SAMESITE: "sometimes" }).sameSite).toBe("none");
  });

  it("clears with the same attributes it sets, apart from maxAge", () => {
    const env = { COOKIE_DOMAIN: "example.com", COOKIE_SAMESITE: "lax" };
    const { maxAge, ...set } = refreshCookieOptions(PATH, env);
    expect(maxAge).toBeGreaterThan(0);
    expect(clearCookieOptions(PATH, env)).toEqual(set);
  });
});

describe("cookie settings in startup validation", () => {
  const warn = (env) => validateEnv(env).warnings.join(" | ");
  it("is quiet for good values", () => {
    expect(warn({ COOKIE_DOMAIN: "example.com", COOKIE_SAMESITE: "lax", COOKIE_SECURE: "true" })).toBe("");
  });
  it("warns about a bad SameSite, a domain with a scheme, and Secure=false with None", () => {
    expect(warn({ COOKIE_SAMESITE: "x" })).toMatch(/COOKIE_SAMESITE/);
    expect(warn({ COOKIE_DOMAIN: "https://example.com" })).toMatch(/COOKIE_DOMAIN/);
    expect(warn({ COOKIE_SECURE: "false" })).toMatch(/COOKIE_SECURE/);
    expect(warn({ COOKIE_SECURE: "false", COOKIE_SAMESITE: "lax" })).toBe("");
  });
});
