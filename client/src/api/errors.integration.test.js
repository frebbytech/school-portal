import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { getAllLevels } from "./levelAPI";

const url = "http://api.test/api/frebbys/v1/levels/session";

// Every API function used to read `error.response.data`, which crashes when there is no
// response. These tests run a real API function against mock server answers.
describe("API functions report failures", () => {
  it("returns the data on success", async () => {
    server.use(http.get(url, () => HttpResponse.json([{ _id: "1" }])));
    await expect(getAllLevels("s", "t")).resolves.toEqual([{ _id: "1" }]);
  });

  it("rejects with the server's message for a refusal", async () => {
    server.use(http.get(url, () => HttpResponse.json("You do not have permission to perform this action.", { status: 403 })));
    await expect(getAllLevels("s", "t")).rejects.toBe("You do not have permission to perform this action.");
  });

  it("rejects with the server's error object for a conflict", async () => {
    server.use(http.get(url, () => HttpResponse.json({ message: "Archive it instead", code: "CONFLICT" }, { status: 409 })));
    await expect(getAllLevels("s", "t")).rejects.toMatchObject({ message: "Archive it instead", code: "CONFLICT" });
  });

  it("rejects with a readable error (not a TypeError) when the server cannot be reached", async () => {
    server.use(http.get(url, () => HttpResponse.error()));
    await expect(getAllLevels("s", "t")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
