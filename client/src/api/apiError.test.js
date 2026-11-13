import { normalizeApiError, NETWORK_ERROR_MESSAGE, TIMEOUT_ERROR_MESSAGE } from "./apiError";

describe("normalizeApiError", () => {
  it("passes the server's body through unchanged (string or object)", () => {
    expect(normalizeApiError({ response: { status: 403, data: "You do not have permission to perform this action." } }))
      .toBe("You do not have permission to perform this action.");
    const body = { status: "error", statusCode: 409, message: "Archive it instead", code: "CONFLICT", requestId: "abc" };
    expect(normalizeApiError({ response: { status: 409, data: body } })).toBe(body);
  });

  it("describes an empty error response instead of throwing an empty value", () => {
    expect(normalizeApiError({ response: { status: 502, data: "" } })).toEqual({
      message: "The server could not complete the request (502).",
      statusCode: 502,
      code: "HTTP_ERROR",
    });
  });

  it("handles no response at all (offline, server down) without crashing", () => {
    expect(normalizeApiError({ message: "Network Error", code: "ERR_NETWORK" })).toEqual({
      message: NETWORK_ERROR_MESSAGE,
      code: "NETWORK_ERROR",
    });
    expect(normalizeApiError(undefined)).toMatchObject({ code: "NETWORK_ERROR" });
    expect(normalizeApiError(new TypeError("x"))).toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("recognises timeouts", () => {
    expect(normalizeApiError({ code: "ECONNABORTED" })).toEqual({ message: TIMEOUT_ERROR_MESSAGE, code: "TIMEOUT" });
  });
});
