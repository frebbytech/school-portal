import { describe, it, expect } from "vitest";
import { addItem, removeItem, totalOf, normalizeItems } from "./feeItems";

describe("fee items", () => {
  it("adds an item", () => {
    const r = addItem([], " Tuition ", "500");
    expect(r.ok).toBe(true);
    expect(r.list).toEqual([{ fee: "Tuition", amount: 500 }]);
  });
  it("updates the amount when the same name is added again, ignoring case", () => {
    const r = addItem([{ fee: "Tuition", amount: 500 }], "tuition", "550.5");
    expect(r.list).toEqual([{ fee: "Tuition", amount: 550.5 }]);
    expect(r.updated).toBe(true);
  });
  it("refuses a missing name or a bad amount and leaves the list alone", () => {
    const list = [{ fee: "PTA", amount: 10 }];
    expect(addItem(list, "", "5").ok).toBe(false);
    expect(addItem(list, "Books", "").message).toMatch(/Enter the amount/);
    expect(addItem(list, "Books", "-5").ok).toBe(false);
    expect(addItem(list, "Books", "1.234").message).toMatch(/2 decimal/);
    expect(addItem(list, "Books", "5").list).not.toBe(list);
    expect(addItem(list, "", "5").list).toBe(list);
  });
  it("allows a zero item (for example a waived fee)", () => {
    expect(addItem([], "Library", "0").ok).toBe(true);
  });
  it("removes by name and totals without rounding noise", () => {
    expect(removeItem([{ fee: "A", amount: 1 }, { fee: "B", amount: 2 }], "a")).toEqual([{ fee: "B", amount: 2 }]);
    expect(totalOf([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
    expect(totalOf(undefined)).toBe(0);
  });
  it("reads older items that used `name`", () => {
    expect(normalizeItems([{ name: "Tuition", amount: "300" }])).toEqual([{ name: "Tuition", fee: "Tuition", amount: 300 }]);
    expect(normalizeItems(undefined)).toEqual([]);
  });
});
