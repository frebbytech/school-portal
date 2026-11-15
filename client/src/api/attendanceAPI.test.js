import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { postAttendance, getAttendanceHistory } from "./attendanceAPI";

const base = "http://api.test/api/frebbys/v1";

describe("attendance API", () => {
  it("rejects when the server refuses a save, so it is never shown as success", async () => {
    server.use(http.post(`${base}/attendances`, () => HttpResponse.json("Attendance cannot be taken for a future date.", { status: 400 })));
    await expect(postAttendance({ level: "l1" })).rejects.toBe("Attendance cannot be taken for a future date.");
  });
  it("rejects with a readable object when the server cannot be reached", async () => {
    server.use(http.get(`${base}/attendances/history/l1`, () => HttpResponse.error()));
    await expect(getAttendanceHistory({ id: "l1", session: "s", term: "t" })).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
