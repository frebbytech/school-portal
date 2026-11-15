import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { postCurrentFee, getCurrentFeeForStudent } from "./currentFeeAPI";

const base = "http://api.test/api/frebbys/v1";

describe("fee API", () => {
  it("a refused payment rejects, so it can never be shown as 'Payment Done'", async () => {
    server.use(http.post(`${base}/current-fees`, () => HttpResponse.json("Payment amount must be a positive amount with at most 2 decimals.", { status: 400 })));
    await expect(postCurrentFee({ _id: "c1", payment: { paid: -1 } })).rejects.toMatch(/positive amount/);
  });
  it("a recorded payment resolves with the receipt data", async () => {
    server.use(http.post(`${base}/current-fees`, () => HttpResponse.json({ id: "INV-1", paid: 50 })));
    await expect(postCurrentFee({ _id: "c1", payment: { paid: 50 } })).resolves.toEqual({ id: "INV-1", paid: 50 });
  });
  it("an unreachable server rejects with a readable error", async () => {
    server.use(http.post(`${base}/current-fees/student`, () => HttpResponse.error()));
    await expect(getCurrentFeeForStudent({ student: "s" })).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });
});
