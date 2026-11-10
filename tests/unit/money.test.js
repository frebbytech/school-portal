const { sumAmounts, subtract, percentPaid, parseMoney } = require("../../common/money");

describe("money helpers", () => {
  it("sums without floating point drift", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumAmounts([{ paid: 0.1 }, { paid: 0.2 }], "paid")).toBe(0.3);
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
  });

  it("ignores missing and non-numeric values and non-arrays", () => {
    expect(sumAmounts([{ paid: 5 }, {}, { paid: "x" }, null], "paid")).toBe(5);
    expect(sumAmounts(undefined, "paid")).toBe(0);
    expect(sumAmounts([{ paid: "10.50" }], "paid")).toBe(10.5);
  });

  it("subtracts exactly", () => {
    expect(subtract(0.3, 0.1)).toBe(0.2);
    expect(subtract(100, 100.01)).toBe(-0.01);
  });

  it("never returns NaN or Infinity for a percentage", () => {
    expect(percentPaid(50, 0)).toBe(0);
    expect(percentPaid(0, undefined)).toBe(0);
    expect(percentPaid(50, 200)).toBe(25);
  });

  it("accepts real amounts and rejects the rest", () => {
    expect(parseMoney(10)).toBe(10);
    expect(parseMoney("10.5")).toBe(10.5);
    expect(parseMoney(" 7 ")).toBe(7);
    for (const bad of [0, -5, "abc", "", NaN, Infinity, 1.234, "1e3", {}, null, undefined, 2e9]) {
      expect(parseMoney(bad)).toBeNull();
    }
    expect(parseMoney(0, { allowZero: true })).toBe(0);
    expect(parseMoney(-3, { allowNegative: true })).toBe(-3);
  });
});
