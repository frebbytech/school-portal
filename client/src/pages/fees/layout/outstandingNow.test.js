import { describe, it, expect } from "vitest";
import { outstandingNow } from "./FeeReportTemplate";

describe("fee statement outstanding", () => {
  it("is the balance stored on the latest payment", () => {
    expect(outstandingNow({ fees: 500, paid: 300, payment: [{ outstanding: 300 }, { outstanding: 200 }] })).toBe(200);
  });
  it("is the whole fee when nothing has been paid, never NaN", () => {
    expect(outstandingNow({ fees: 500, paid: 0, payment: [] })).toBe(500);
    expect(outstandingNow({ fees: 500 })).toBe(500);
    expect(outstandingNow(undefined)).toBe(0);
  });
  it("is zero, not negative, if more than the fee was paid", () => {
    expect(outstandingNow({ fees: 100, paid: 150 })).toBe(0);
  });
});
