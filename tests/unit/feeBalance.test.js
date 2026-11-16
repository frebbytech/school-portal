const { balanceOf, paymentLimit, overpaymentMessage, exceeds } = require("../../common/feeBalance");

describe("fee balance", () => {
  const previous = { fees: 300, paid: 100, remaining: 200 };

  it("starts at term fee plus arrears", () => {
    const b = balanceOf({ termFees: 500.1, previous, paid: 0 });
    expect(b.totalFees).toBe(700.1);
    expect(b.totalOutstanding).toBe(700.1);
    expect(b.current.remaining).toBe(500.1);
    expect(b.previous.remaining).toBe(200);
  });

  it("pays this term first, then clears arrears with the overflow", () => {
    const b = balanceOf({ termFees: 500, previous: { fees: 300, paid: 100, remaining: 200 }, paid: 600 });
    expect(b.current.remaining).toBe(0);
    expect(b.previous.remaining).toBe(100);
    expect(b.previous.paid).toBe(200);
    expect(b.totalOutstanding).toBe(100);
  });

  it("never goes negative and is exact to the pesewa", () => {
    expect(balanceOf({ termFees: 0.3, previous: { fees: 0, paid: 0, remaining: 0 }, paid: 0.1 + 0.2 }).totalOutstanding).toBe(0);
    expect(balanceOf({ termFees: 100, previous: { fees: 0, paid: 0, remaining: 0 }, paid: 150 }).totalOutstanding).toBe(0);
  });

  it("limits total payments to term fee plus arrears", () => {
    expect(paymentLimit({ termFees: 500.1, previous })).toBe(700.1);
  });

  it("compares in pesewas and words the refusal", () => {
    expect(exceeds(0.3, 0.1 + 0.2)).toBe(false);
    expect(exceeds(100.01, 100)).toBe(true);
    expect(overpaymentMessage(150, 100)).toBe("This payment (GHS 150.00) is more than the GHS 100.00 still owed. Advance payments are not accepted.");
    expect(overpaymentMessage(5, 0)).toMatch(/Nothing is owed/);
  });
});
