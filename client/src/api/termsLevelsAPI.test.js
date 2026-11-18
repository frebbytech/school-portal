import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { switchTerm, deleteTerm } from "./termAPI";
import { postLevel, deleteLevel, getAllPreviousLevels } from "./levelAPI";

const base = "http://api.test/api/frebbys/v1";

describe("terms and levels API", () => {
  it("rejects when a term cannot be removed, so the screen shows the reason", async () => {
    const reason = "This session cannot be removed because it holds records. Archive it instead.";
    server.use(http.delete(`${base}/terms/t1`, () => HttpResponse.json(reason, { status: 409 })));
    await expect(deleteTerm("t1")).rejects.toBe(reason);
  });
  it("rejects an invalid term switch", async () => {
    server.use(http.patch(`${base}/terms/t1`, () => HttpResponse.json("Invalid information provided.", { status: 400 })));
    await expect(switchTerm({ id: "t1", status: "bogus" })).rejects.toBe("Invalid information provided.");
  });
  it("resolves with the server message on success", async () => {
    server.use(http.patch(`${base}/terms/t1`, () => HttpResponse.json("Changes Saved")));
    await expect(switchTerm({ id: "t1", status: "current" })).resolves.toBe("Changes Saved");
  });
  it("rejects a duplicate level and a level that cannot be deleted", async () => {
    server.use(http.post(`${base}/levels`, () => HttpResponse.json("Level already exists", { status: 409 })));
    await expect(postLevel({})).rejects.toBe("Level already exists");
    server.use(http.delete(`${base}/levels`, () => HttpResponse.json("Level has students", { status: 409 })));
    await expect(deleteLevel({ id: "l1" })).rejects.toBe("Level has students");
  });
  it("no longer swallows errors when loading previous levels", async () => {
    server.use(http.get(`${base}/levels/previous`, () => HttpResponse.error()));
    await expect(getAllPreviousLevels("s1")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
