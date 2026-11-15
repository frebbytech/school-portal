import { describe, expect, it } from "vitest";
import { REPORT_CARD_PAGE_STYLE as css } from "./reportCardPrint";

describe("report card print rules", () => {
  it("prints on A4 with no printer margin", () => {
    expect(css).toMatch(/@page\s*{\s*size:\s*A4 portrait;\s*margin:\s*0;/);
  });
  it("lets a long card grow instead of cutting it off", () => {
    expect(css).toMatch(/height:\s*auto !important/);
    expect(css).toMatch(/overflow:\s*visible !important/);
  });
  it("keeps a short card to one page (just under A4, so no blank page follows)", () => {
    expect(css).toMatch(/min-height:\s*296mm !important/);
  });
  it("starts each card on a new page except the last", () => {
    expect(css).toMatch(/\.report-card\s*{[^}]*break-after:\s*page/);
    expect(css).toMatch(/\.report-card:last-child\s*{[^}]*break-after:\s*auto/);
  });
  it("prints background colours", () => {
    expect(css).toMatch(/print-color-adjust:\s*exact/);
  });
});
