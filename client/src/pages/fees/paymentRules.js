// Money rules for the payment screen and receipt, kept apart so they can be tested.
// Amounts are compared in pesewas (whole numbers) so 0.1 + 0.2 style rounding never
// decides whether a payment is "more than what is owed".

const toPesewas = (value) => Math.round(Number(value) * 100);

/** Checks what was typed in "Amount to be paid". Returns { ok, amount, message }. */
export const checkAmount = (raw, { allowZero = false } = {}) => {
  const text = String(raw ?? "").trim();
  if (text === "") return { ok: false, message: "Enter the amount paid" };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, message: "Amount must be a number, for example 150 or 150.50" };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false, message: "Use at most 2 decimal places" };
  const amount = Number(text);
  if (amount <= 0 && !allowZero) return { ok: false, message: "Amount should be more than zero" };
  return { ok: true, amount };
};

/** True when `amount` is more than `outstanding` (both in cedis). */
export const exceedsOutstanding = (amount, outstanding) =>
  toPesewas(amount) > toPesewas(outstanding || 0);

/** What will still be owed after paying `amount` (can be negative on an overpayment). */
export const outstandingAfter = (outstanding, amount) =>
  (toPesewas(outstanding || 0) - toPesewas(amount)) / 100;

/**
 * Whether a payment can be started, and if not, why (shown to the person).
 * `fees` is the student's fee summary from the server, or undefined while it loads.
 */
export const paymentBlocker = ({ studentId, fees, loading, failed }) => {
  if (!studentId) return "Choose a student first.";
  if (loading) return "Loading this student's fees…";
  if (failed || !fees) return "This student's fees could not be loaded. Try again.";
  if (!fees.current?._id) return "This student has no fee record for this term, so a payment cannot be recorded.";
  if (Number(fees.totalOutstanding) === 0) return "Fees are fully paid.";
  return "";
};

/** The numbers printed on a receipt, from what the payment screen passed along. */
export const receiptFigures = (fee = {}) => {
  const paidNow = Number(fee.paid) || 0;
  const paidBefore = Number(fee.feePaid) || 0;
  return {
    paidNow,
    // A payment can be split over several terms, so the server says what was paid for THIS term.
    totalPaid:
      fee.paidThisTerm !== undefined && fee.paidThisTerm !== null
        ? Number(fee.paidThisTerm) || 0
        : (toPesewas(paidNow) + toPesewas(paidBefore)) / 100,
    appliedTo: Array.isArray(fee.appliedTo) ? fee.appliedTo : [],
    outstanding: Number(fee.outstanding) || 0,
    termFee: Number(fee.fee) || 0,
    arrears: Number(fee.arreas) || 0,
  };
};

const money = (n) => `GHS ${Number(n).toFixed(2)}`;

/** Advance payments are not accepted (owner decision 2026-11-15). The server enforces it too. */
export const overpaymentMessage = (owed) =>
  Number(owed) > 0
    ? `This is more than the ${money(owed)} still owed. Advance payments are not accepted.`
    : "Nothing is owed, so a payment cannot be recorded. Advance payments are not accepted.";
