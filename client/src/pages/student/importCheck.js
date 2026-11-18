// Checks a student file in the browser before it is sent, so the common mistakes are shown at
// once. The server checks again (and is the one that decides).

// Index numbers are compared the way the server stores them: trimmed, lower case.
const normalize = (value) => String(value ?? "").trim().toLowerCase();

/** Index numbers that appear more than once in the file, as typed the first time. */
export const repeatedIndexNumbers = (rows) => {
  const seen = new Map();
  const repeated = new Map();
  for (const row of rows || []) {
    const key = normalize(row?.indexnumber);
    if (!key) continue;
    if (seen.has(key)) repeated.set(key, seen.get(key));
    else seen.set(key, String(row.indexnumber).trim());
  }
  return [...repeated.values()];
};

/** Rows (1-based, as in the sheet) with no index number. */
export const rowsWithoutIndexNumber = (rows) =>
  (rows || []).reduce((found, row, i) => (normalize(row?.indexnumber) ? found : [...found, i + 1]), []);

/** The first problem worth stopping for, as a sentence; "" when the file looks fine. */
export const importProblem = (rows) => {
  if (!rows?.length) return "The file has no students.";
  const missing = rowsWithoutIndexNumber(rows);
  if (missing.length) {
    const shown = missing.slice(0, 10).join(", ");
    return `Row${missing.length === 1 ? "" : "s"} ${shown}${missing.length > 10 ? " and more" : ""} ${missing.length === 1 ? "has" : "have"} no index number.`;
  }
  const repeated = repeatedIndexNumbers(rows);
  if (repeated.length) {
    return `These index numbers appear more than once in the file: ${repeated.slice(0, 10).join(", ")}${repeated.length > 10 ? " and more" : ""}.`;
  }
  return "";
};
