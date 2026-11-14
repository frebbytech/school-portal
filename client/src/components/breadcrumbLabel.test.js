import { describe, expect, it } from "vitest";
import { breadcrumbLabel } from "./breadcrumbLabel";

describe("breadcrumbLabel", () => {
  it("hides database ids", () => {
    expect(breadcrumbLabel("691780392684d5c5b9fa28e6")).toBe("Details");
    expect(breadcrumbLabel("691780392684D5C5B9FA28E6")).toBe("Details");
  });
  it("keeps normal words and turns dashes into spaces", () => {
    expect(breadcrumbLabel("examination")).toBe("examination");
    expect(breadcrumbLabel("departments-houses")).toBe("departments houses");
  });
  it("decodes URL encoding and survives bad encoding", () => {
    expect(breadcrumbLabel("Day%20Care")).toBe("Day Care");
    expect(breadcrumbLabel("100%")).toBe("100%");
  });
  it("does not treat a 24-character word as an id", () => {
    expect(breadcrumbLabel("abcdefghijklmnopqrstuvwx")).toBe("abcdefghijklmnopqrstuvwx");
  });
});
