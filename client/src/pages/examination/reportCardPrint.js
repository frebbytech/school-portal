// Print rules for report cards, passed to react-to-print as `pageStyle` (used for one card
// and for a whole class).
//
// Before, every card was a fixed 11.7 inch box with hidden overflow, and the printer added
// its own margins. A card with many subjects was cut off at the bottom, and even a short
// one could spill a few millimetres onto a blank second page.
//
// Now: A4 with no printer margin (the card has its own padding), a card is at least one page
// tall but grows if it has more to show, each card starts a new page, and background colours
// and the watermark are printed.
export const REPORT_CARD_PAGE_STYLE = `
  @page { size: A4 portrait; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-card {
    box-sizing: border-box;
    width: 210mm !important;
    height: auto !important;
    min-height: 296mm !important;
    margin: 0 !important;
    border: 0 !important;
    overflow: visible !important;
    break-after: page;
    page-break-after: always;
  }
  .report-card:last-child {
    break-after: auto;
    page-break-after: auto;
  }
`;
