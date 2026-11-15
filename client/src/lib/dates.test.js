import { describe, it, expect } from "vitest";
import dayjs, { toDateInput, formatDate } from "@/lib/dates";

describe("dates", () => {
  it("prints ordinals and long months", () => {
    expect(dayjs("2026-11-14T12:00:00").format("Do MMMM YYYY")).toBe("14th November 2026");
    expect(dayjs("2026-11-01T12:00:00").format("Do MMM, YYYY")).toBe("1st Nov, 2026");
  });
  it("supports localized formats", () => {
    expect(dayjs("2026-11-14T12:00:00").format("L")).toBe("11/14/2026");
    expect(dayjs("2026-11-14T12:00:00").format("LL")).toBe("November 14, 2026");
  });
  it("isBetween is inclusive with '[]'", () => {
    const from = dayjs("2026-01-01");
    const to = dayjs("2026-03-01");
    expect(dayjs("2026-03-01").isBetween(from, to, undefined, "[]")).toBe(true);
    expect(dayjs("2026-03-02").isBetween(from, to, undefined, "[]")).toBe(false);
  });
  it("isSameOrAfter works", () => {
    expect(dayjs("2026-03-01").isSameOrAfter(dayjs("2026-03-01"))).toBe(true);
  });
  it("parses MM/DD/YYYY strictly", () => {
    expect(dayjs("03/25/2026", "MM/DD/YYYY").format("YYYY-MM-DD")).toBe("2026-03-25");
  });
  it("toDateInput handles empty and bad values", () => {
    expect(toDateInput("")).toBe("");
    expect(toDateInput(null)).toBe("");
    expect(toDateInput("nonsense")).toBe("");
    expect(toDateInput("2026-11-14T23:00:00")).toBe("2026-11-14");
  });
  it("formatDate falls back instead of Invalid Date", () => {
    expect(formatDate(undefined, "Do MMMM YYYY", "-")).toBe("-");
    expect(formatDate("nonsense", "Do MMMM YYYY", "-")).toBe("-");
    expect(formatDate("2026-11-14T12:00:00")).toBe("14th November 2026");
  });
});
