const { compareTerms, remainingOf, allocate, summarize, planOverflowMoves } = require("../../common/feeAllocation");

describe("term order", () => {
  it("orders by start date, then term number, then creation", () => {
    const a = { _id: "a", from: "2020-01-01", term: "1" };
    const b = { _id: "b", from: "2020-06-01", term: "2" };
    expect(compareTerms(a, b)).toBeLessThan(0);
    expect(compareTerms(b, a)).toBeGreaterThan(0);
    expect(compareTerms({ _id: "x", from: "2020-01-01", term: "2" }, { _id: "y", from: "2020-01-01", term: "1" })).toBeGreaterThan(0);
  });
  it("falls back to when the term was created", () => {
    const old = { _id: "1", createdAt: "2020-01-01T00:00:00Z" };
    const recent = { _id: "2", createdAt: "2021-01-01T00:00:00Z" };
    expect(compareTerms(old, recent)).toBeLessThan(0);
  });
});

describe("allocate (oldest first)", () => {
  const rows = [{ id: "t1", remaining: 150 }, { id: "t2", remaining: 0 }, { id: "t3", remaining: 100 }];
  it("fills the oldest unpaid term first and skips settled ones", () => {
    expect(allocate(rows, 200)).toEqual({ parts: [{ id: "t1", amount: 150 }, { id: "t3", amount: 50 }], left: 0 });
  });
  it("puts a small payment on the oldest term only", () => {
    expect(allocate(rows, 40)).toEqual({ parts: [{ id: "t1", amount: 40 }], left: 0 });
  });
  it("reports what does not fit (an advance payment)", () => {
    expect(allocate(rows, 250.5)).toEqual({ parts: [{ id: "t1", amount: 150 }, { id: "t3", amount: 100 }], left: 0.5 });
    expect(allocate([], 10)).toEqual({ parts: [], left: 10 });
  });
  it("is exact to the pesewa", () => {
    expect(allocate([{ id: "a", remaining: 0.3 }], 0.1 + 0.2)).toEqual({ parts: [{ id: "a", amount: 0.3 }], left: 0 });
  });
});

describe("summarize", () => {
  it("adds earlier terms' remaining to this term's", () => {
    const earlier = [{ fees: 300, paid: 100, remaining: 200 }];
    const s = summarize({ earlier, termFees: 500.1, paid: 0 });
    expect(s.previous).toEqual({ fees: 300, paid: 100, remaining: 200 });
    expect(s.current).toEqual({ fees: 500.1, paid: 0, remaining: 500.1 });
    expect(s.totalFees).toBe(700.1);
    expect(s.totalOutstanding).toBe(700.1);
  });
  it("never shows a negative remaining", () => {
    expect(summarize({ earlier: [], termFees: 100, paid: 150 }).current.remaining).toBe(0);
    expect(remainingOf(100, 150)).toBe(0);
  });
});

describe("planOverflowMoves (migration)", () => {
  it("moves money paid beyond a term's fee onto the older term that still owes", () => {
    const terms = [
      { id: "t1", fees: 300, payments: [{ paid: 100 }] }, // owes 200
      { id: "t2", fees: 500, payments: [{ paid: 400 }, { paid: 300 }] }, // 700 paid: 200 too much
    ];
    expect(planOverflowMoves(terms)).toEqual({
      moves: [{ fromId: "t2", entryIndex: 1, toId: "t1", amount: 200 }],
      unplaced: [],
    });
  });
  it("splits one excess over several older terms, oldest first", () => {
    const terms = [
      { id: "t1", fees: 100, payments: [] },
      { id: "t2", fees: 100, payments: [{ paid: 50 }] },
      { id: "t3", fees: 100, payments: [{ paid: 300 }] }, // 200 too much
    ];
    const { moves, unplaced } = planOverflowMoves(terms);
    expect(moves).toEqual([
      { fromId: "t3", entryIndex: 0, toId: "t1", amount: 100 },
      { fromId: "t3", entryIndex: 0, toId: "t2", amount: 50 },
    ]);
    expect(unplaced).toEqual([{ id: "t3", entryIndex: 0, amount: 50 }]);
  });
  it("leaves a true advance (nothing older owes) for the owner to review", () => {
    const { moves, unplaced } = planOverflowMoves([{ id: "t1", fees: 100, payments: [{ paid: 130 }] }]);
    expect(moves).toEqual([]);
    expect(unplaced).toEqual([{ id: "t1", entryIndex: 0, amount: 30 }]);
  });
  it("changes nothing when no term is overpaid", () => {
    expect(planOverflowMoves([{ id: "t1", fees: 100, payments: [{ paid: 100 }] }])).toEqual({ moves: [], unplaced: [] });
  });
});
