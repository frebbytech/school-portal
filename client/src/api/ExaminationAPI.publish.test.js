import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { publishReport, publishReports } from "./ExaminationAPI";

const base = "http://api.test/api/frebbys/v1";

describe("publishing report cards", () => {
  it("sends the class, term and channel, and returns the counts", async () => {
    let seen;
    server.use(
      http.get(`${base}/examinations/publish`, ({ request }) => {
        seen = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ message: "Report cards for 2 students. SMS: 2 sent.", sms: { sent: 2, failed: 0, skipped: 0 } });
      })
    );
    const data = await publishReports({ sessionId: "s1", termId: "t1", levelId: "l1", value: "both" });
    expect(seen).toEqual({ sessionId: "s1", termId: "t1", levelId: "l1", type: "both" });
    expect(data.sms.sent).toBe(2);
  });

  it("rejects with the server's reason when nothing could be sent", async () => {
    server.use(http.get(`${base}/examinations/publish`, () => HttpResponse.json("None of the reports could be sent", { status: 502 })));
    await expect(publishReports({ sessionId: "s", termId: "t", levelId: "l", value: "sms" })).rejects.toBe("None of the reports could be sent");
  });

  it("publishes one student's report with the publish flag", async () => {
    let seen;
    server.use(
      http.get(`${base}/examinations/e1`, ({ request }) => {
        seen = Object.fromEntries(new URL(request.url).searchParams);
        return HttpResponse.json({ message: "ok", sms: { sent: 1, failed: 0, skipped: 0 } });
      })
    );
    await publishReport({ id: "e1", value: "sms" });
    expect(seen).toEqual({ type: "sms", publish: "true" });
  });
});
