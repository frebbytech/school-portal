import { describe, expect, it } from "vitest";
import { socketOrigin } from "./socketOrigin";

describe("socket address", () => {
  it("is the API's origin without its path", () => {
    expect(socketOrigin("https://api.example.com/api/frebbys/v1")).toBe("https://api.example.com");
    expect(socketOrigin("http://localhost:8002/api/frebbys/v1")).toBe("http://localhost:8002");
  });
  it("is empty when there is no usable address", () => {
    expect(socketOrigin(undefined)).toBe("");
    expect(socketOrigin("not a url")).toBe("");
  });
});
