// One place for dates. Every screen imports dayjs from here so the plugins
// (ordinals like "14th", L/LL/LLL formats, isBetween, ...) are always loaded.
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import localizedFormat from "dayjs/plugin/localizedFormat";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);

/** Value for <input type="date">: "YYYY-MM-DD", or "" when empty/invalid. */
export const toDateInput = (value) => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

/** Safe display: returns `fallback` instead of "Invalid Date". */
export const formatDate = (value, pattern = "Do MMMM YYYY", fallback = "") => {
  if (!value) return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(pattern) : fallback;
};

export default dayjs;
