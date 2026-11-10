/**
 * Money helpers. Amounts are stored as plain numbers (cedis) and that does not change
 * here, but every sum and comparison is done in whole pence/pesewas so that 0.1 + 0.2
 * style errors never reach a balance or a receipt.
 */
const toMinor = (value) => Math.round(Number(value) * 100);

/** Sum `key` of each item (or the items themselves when no key) in minor units, returned as a 2-decimal number. */
const sumAmounts = (items, key) => {
  let total = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const n = Number(key ? item?.[key] : item);
    if (Number.isFinite(n)) total += toMinor(n);
  }
  return total / 100;
};

/** a - b, exact to 2 decimals. */
const subtract = (a, b) => (toMinor(a) - toMinor(b)) / 100;

/** Percentage paid, never NaN/Infinity: 0 when nothing is owed. */
const percentPaid = (paid, fees) => (Number(fees) > 0 ? (Number(paid) / Number(fees)) * 100 : 0);

const MAX_AMOUNT = 1e9;

/**
 * Parse a client-supplied amount (number or numeric string). Returns the number, or
 * null when it is not a finite amount with at most 2 decimals within range.
 */
const parseMoney = (value, { allowZero = false, allowNegative = false } = {}) => {
  if (typeof value === "string") {
    if (!/^-?\d+(\.\d+)?$/.test(value.trim())) return null;
    value = Number(value);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Math.abs(value) > MAX_AMOUNT) return null;
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return null;
  if (value < 0 && !allowNegative) return null;
  if (value === 0 && !allowZero) return null;
  return Math.round(value * 100) / 100;
};

module.exports = { toMinor, sumAmounts, subtract, percentPaid, parseMoney, MAX_AMOUNT };
