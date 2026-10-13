const { errorHandler, classify } = require("../../middlewares/errorHandler");
const { NotFoundError, ConflictError } = require("../../common/errors");

const fakeRes = () => ({
  headersSent: false,
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const run = (error, { production = false, req = { id: "req-1", method: "GET", originalUrl: "/x?q=1" } } = {}) => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = production ? "production" : "test";
  const res = fakeRes();
  let forwarded = null;
  try {
    errorHandler(error, req, res, (e) => (forwarded = e));
  } finally {
    process.env.NODE_ENV = previous;
  }
  return { res, forwarded };
};

describe("classify", () => {
  it("maps duplicate keys to 409 and survives a missing keyValue", () => {
    const withKey = classify({ name: "MongoServerError", code: 11000, keyValue: { email: "a@b.c" } });
    expect(withKey.status).toBe(409);
    expect(withKey.message).toBe('The email "a@b.c" is already taken.');
    const withoutKey = classify({ name: "MongoServerError", code: 11000 });
    expect(withoutKey.status).toBe(409);
  });

  it("maps mongoose validation errors to 400 with the field messages", () => {
    const info = classify({
      name: "ValidationError",
      errors: { a: { message: "Path `a` is required." }, b: { message: "Too long" } },
    });
    expect(info.status).toBe(400);
    expect(info.message).toContain("Path `a` is required.");
    expect(info.message).toContain("Too long");
  });

  it("maps a CastError to 400 without echoing the value", () => {
    const info = classify({ name: "CastError", path: "_id", value: "<script>" });
    expect(info.status).toBe(400);
    expect(info.message).toBe("Invalid _id");
  });

  it("maps upload size errors to 413", () => {
    expect(classify({ name: "MulterError", code: "LIMIT_FILE_SIZE" }).status).toBe(413);
    expect(classify({ name: "MulterError", code: "LIMIT_UNEXPECTED_FILE" }).status).toBe(400);
  });

  it("keeps the status of http-style errors and defaults others to 500", () => {
    expect(classify({ status: 403, message: "no", expose: true }).status).toBe(403);
    expect(classify(new Error("boom")).status).toBe(500);
    expect(classify({ status: 99999 }).status).toBe(500);
  });
});

describe("errorHandler", () => {
  it("keeps the legacy body shape and adds code and requestId", () => {
    const { res } = run(new NotFoundError("Nothing here"));
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.statusCode).toBe(404);
    expect(res.body.message).toBe("Nothing here");
    expect(res.body.code).toBe("NOT_FOUND");
    expect(res.body.requestId).toBe("req-1");
  });

  it("hides internal error details from clients in production", () => {
    const { res } = run(new Error("connection to mongodb://u:pw@host failed"), { production: true });
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("An unexpected error occurred");
    expect(JSON.stringify(res.body)).not.toContain("pw");
  });

  it("shows the real message for server errors outside production (existing behaviour)", () => {
    const { res } = run(new Error("boom"));
    expect(res.body.message).toBe("boom");
  });

  it("still shows safe client-error messages in production", () => {
    const { res } = run(new ConflictError("Already exists"), { production: true });
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Already exists");
  });

  it("does not expose library error codes", () => {
    const err = Object.assign(new Error("reset"), { code: "ECONNRESET" });
    const { res } = run(err, { production: true });
    expect(res.body.code).toBeUndefined();
  });

  it("delegates when the response has already started", () => {
    const res = fakeRes();
    res.headersSent = true;
    const error = new Error("late");
    let forwarded = null;
    errorHandler(error, { id: "x" }, res, (e) => (forwarded = e));
    expect(forwarded).toBe(error);
    expect(res.body).toBeNull();
  });
});
