import dayjs from "@/lib/dates";

// Pure rules for the attendance screen, kept apart so they can be tested without the page.

export const isWeekendDay = (date) => [0, 6].includes(dayjs(date).day());

/** Today, or the most recent Mon-Fri before it (the date picker refuses weekends). */
export const latestWeekday = (from = dayjs()) => {
  let d = dayjs(from);
  while (isWeekendDay(d)) d = d.subtract(1, "day");
  return d.format("YYYY-MM-DD");
};

/**
 * The server's register with the teacher's unsaved marks laid over it.
 * `marks` is { [studentId]: { status, reason } } and only holds what was changed.
 */
export const mergeMarks = (students = [], marks = {}) =>
  students.map((s) => (marks[s._id] ? { ...s, ...marks[s._id] } : s));

export const isMarked = (s) => s?.status === "Present" || s?.status === "Absent";
export const countMarked = (rows) => rows.filter(isMarked).length;

/** What is sent for one student. The same for the "Save" on a row on phones and desktops. */
export const entryOf = (s) => ({
  _id: s._id,
  fullName: s.fullName,
  gender: s.gender,
  status: s.status || "",
  reason: s.status === "Absent" ? s.reason || "" : "",
});
