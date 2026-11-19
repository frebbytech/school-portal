import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { publishReport, publishReports } from "./ExaminationAPI";

const base = "http://api.test/api/frebbys/v1";

describe("publishing report cards", () => {
  it("sends the class, term and channel, and returns the counts", async () => {
    let seen;
    server.use(
      http.post(`${base}/examinations/publish`, async ({ request }) => {
        seen = await request.json();
        return HttpResponse.json({ publicationId: "p1", status: "queued" }, { status: 202 });
      })
    );
    const data = await publishReports({ sessionId: "s1", termId: "t1", levelId: "l1", value: "both" });
    expect(seen).toEqual({ sessionId: "s1", termId: "t1", levelId: "l1", type: "both" });
    expect(data.status).toBe("queued");
  });

  it("rejects with the server's reason when nothing could be sent", async () => {
    server.use(http.post(`${base}/examinations/publish`, () => HttpResponse.json("None of the reports could be sent", { status: 502 })));
    await expect(publishReports({ sessionId: "s", termId: "t", levelId: "l", value: "sms" })).rejects.toBe("None of the reports could be sent");
  });

  it("publishes one student's report, and sends resend only when confirmed", async () => {
    const seen = [];
    server.use(
      http.post(`${base}/examinations/e1/publish`, async ({ request }) => {
        seen.push(await request.json());
        return HttpResponse.json({ publicationId: "p2", status: "queued" }, { status: 202 });
      })
    );
    await publishReport({ id: "e1", value: "sms" });
    await publishReport({ id: "e1", value: "sms", resend: true });
    expect(seen).toEqual([{ type: "sms" }, { type: "sms", resend: true }]);
  });
});
