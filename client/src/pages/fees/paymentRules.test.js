import { describe, it, expect } from "vitest";
import { checkAmount, exceedsOutstanding, outstandingAfter, paymentBlocker, receiptFigures } from "./paymentRules";

describe("checkAmount", () => {
  it("accepts whole and 2-decimal amounts", () => {
    expect(checkAmount("150")).toEqual({ ok: true, amount: 150 });
    expect(checkAmount(" 150.5 ")).toEqual({ ok: true, amount: 150.5 });
    expect(checkAmount(0.25)).toEqual({ ok: true, amount: 0.25 });
  });
  it("explains each refusal", () => {
    expect(checkAmount("").message).toMatch(/Enter the amount/);
    expect(checkAmount(undefined).ok).toBe(false);
    expect(checkAmount("abc").message).toMatch(/must be a number/);
    expect(checkAmount("-5").ok).toBe(false);
    expect(checkAmount("1e3").ok).toBe(false);
    expect(checkAmount("10.123").message).toMatch(/2 decimal/);
    expect(checkAmount("0").message).toMatch(/more than zero/);
    expect(checkAmount("0.00").ok).toBe(false);
  });
});

describe("overpayment and balance", () => {
  it("compares in pesewas", () => {
    expect(exceedsOutstanding(0.3, 0.1 + 0.2)).toBe(false);
    expect(exceedsOutstanding(100.01, 100)).toBe(true);
    expect(exceedsOutstanding(100, 100)).toBe(false);
    expect(exceedsOutstanding(5, undefined)).toBe(true);
  });
  it("computes what is left", () => {
    expect(outstandingAfter(500, 200.5)).toBe(299.5);
    expect(outstandingAfter(100, 150)).toBe(-50);
    expect(outstandingAfter(0.3, 0.1)).toBe(0.2);
  });
});

describe("paymentBlocker", () => {
  const ok = { current: { _id: "c1" }, totalOutstanding: 300 };
  it("blocks until a student is chosen, loaded and has a record", () => {
    expect(paymentBlocker({ studentId: "", fees: ok })).toMatch(/Choose a student/);
    expect(paymentBlocker({ studentId: "s", fees: undefined, loading: true })).toMatch(/Loading/);
    expect(paymentBlocker({ studentId: "s", fees: undefined, failed: true })).toMatch(/could not be loaded/);
    expect(paymentBlocker({ studentId: "s", fees: { current: {}, totalOutstanding: 5 } })).toMatch(/no fee record/);
    expect(paymentBlocker({ studentId: "s", fees: { ...ok, totalOutstanding: 0 } })).toMatch(/fully paid/);
  });
  it("allows a payment when everything is in place", () => {
    expect(paymentBlocker({ studentId: "s", fees: ok })).toBe("");
  });
});

describe("receiptFigures", () => {
  it("adds this payment to what was paid before without float drift", () => {
    const r = receiptFigures({ paid: 0.2, feePaid: 0.1, outstanding: 50, fee: 400, arreas: 10 });
    expect(r).toEqual({ paidNow: 0.2, totalPaid: 0.3, outstanding: 50, termFee: 400, arrears: 10 });
  });
  it("never shows NaN when a figure is missing", () => {
    expect(receiptFigures({ paid: 100 })).toEqual({ paidNow: 100, totalPaid: 100, outstanding: 0, termFee: 0, arrears: 0 });
    expect(receiptFigures()).toMatchObject({ paidNow: 0, totalPaid: 0 });
  });
});
