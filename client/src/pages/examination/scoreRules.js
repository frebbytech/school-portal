// Rules shared by the score-entry and import screens.
//
// The term decides how a subject's 100 marks are split between class work and the exam
// (shown as "40/60"). The server enforces the same limits and works out the totals itself;
// these helpers only let the screens warn early and show the right limits.

export const DEFAULT_SPLIT = { classMax: 50, examsMax: 50 };

// "40/60" -> { classMax: 40, examsMax: 60 }; anything unusable gives 50/50, as before.
export function parseScorePreference(value) {
  const [c, e] = String(value ?? "").split("/").map((part) => Number(part));
  if (!Number.isFinite(c) || !Number.isFinite(e) || c < 0 || e < 0 || c + e <= 0) return { ...DEFAULT_SPLIT };
  return { classMax: c, examsMax: e };
}

// A number from a cell or text box; blank or not a number gives null.
export function toScore(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

// Problem with one pair of scores, or "" when fine.
export function scoreProblem(classScore, examsScore, { classMax, examsMax }) {
  const c = toScore(classScore);
  const e = toScore(examsScore);
  if (c === null && e === null) return "No scores";
  if (c !== null && (c < 0 || c > classMax)) return `Class score must be from 0 to ${classMax}`;
  if (e !== null && (e < 0 || e > examsMax)) return `Exams score must be from 0 to ${examsMax}`;
  return "";
}

export const totalOf = (classScore, examsScore) => (toScore(classScore) ?? 0) + (toScore(examsScore) ?? 0);

// Checks every row of an imported sheet before anything is sent. Rows are numbered as in
// the spreadsheet (row 1 is the header, so the first student is row 2).
// Returns the rows that can be imported and, for the others, a plain reason each.
export function checkImportRows(rows, { studentIndexNumbers, classMax, examsMax }) {
  const known = new Set((studentIndexNumbers || []).map((i) => String(i).trim().toLowerCase()));
  const seen = new Set();
  const valid = [];
  const problems = [];

  (rows || []).forEach((row, i) => {
    const rowNumber = i + 2;
    const indexnumber = String(row["index number"] ?? row.indexnumber ?? "").trim();
    const classRaw = row["class score"] ?? row.classscore;
    const examsRaw = row["exams score"] ?? row.examsscore;
    const fail = (message) => problems.push({ row: rowNumber, indexnumber, message });

    if (indexnumber === "") return fail("No index number");
    const key = indexnumber.toLowerCase();
    if (!known.has(key)) return fail("This index number is not in this class");
    if (seen.has(key)) return fail("This student appears more than once");
    const bad = scoreProblem(classRaw, examsRaw, { classMax, examsMax });
    if (bad) return fail(bad);

    seen.add(key);
    valid.push({
      indexnumber,
      student: row.student ?? "",
      classScore: toScore(classRaw) ?? 0,
      examsScore: toScore(examsRaw) ?? 0,
    });
  });

  return { valid, problems };
}
