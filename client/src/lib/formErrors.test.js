import { describe, it, expect, vi } from "vitest";
import { applyServerError, serverMessage } from "@/lib/formErrors";

const fail = (data) => ({ response: { data } });

describe("formErrors", () => {
  it("reads string and {message} bodies", () => {
    expect(serverMessage(fail("Index number already exists"))).toBe("Index number already exists");
    expect(serverMessage(fail({ message: "Nope" }))).toBe("Nope");
  });
  it("explains a network failure", () => {
    expect(serverMessage({ request: {} })).toMatch(/Cannot reach the server/);
  });
  it("puts a matching message on its field", () => {
    const setError = vi.fn();
    const r = applyServerError(fail("Index number 12 already exists"), setError, [
      { field: "personal.indexnumber", match: /index ?number/i },
    ]);
    expect(r.field).toBe("personal.indexnumber");
    expect(setError).toHaveBeenCalledWith("personal.indexnumber", {
      type: "server",
      message: "Index number 12 already exists",
    });
  });
  it("falls back to root.server", () => {
    const setError = vi.fn();
    applyServerError(fail("Boom"), setError, [{ field: "x", match: /zzz/ }]);
    expect(setError).toHaveBeenCalledWith("root.server", { type: "server", message: "Boom" });
  });
});

import { thrownMessage } from "@/lib/formErrors";
describe("thrownMessage", () => {
  it("handles strings, objects and nothing", () => {
    expect(thrownMessage("Wrong password")).toBe("Wrong password");
    expect(thrownMessage({ message: "Offline", code: "NETWORK_ERROR" })).toBe("Offline");
    expect(thrownMessage(undefined)).toMatch(/Something went wrong/);
    expect(thrownMessage({})).toMatch(/Something went wrong/);
  });
  it("serverMessage accepts thrown values too", () => {
    expect(serverMessage({ message: "Offline" })).toBe("Offline");
  });
});
