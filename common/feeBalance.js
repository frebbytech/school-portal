/**
 * What a student owes, worked out on the server. The payment screen, the receipt and the
 * "no advance payments" rule all use these, so they cannot disagree.
 *
 * Owner decision (2026-11-15): advance payments are not accepted. The payments on a fee
 * record may never add up to more than this term's fee plus the arrears from earlier terms.
 */
const CurrentFee = require("../models/currentFeeModel");
const Fee = require("../models/feeModel");
const { sumAmounts, subtract, toMinor } = require("./money");

/** This term's fee for a class: the sum of the fee items set for it. */
const termFeeFor = async (level, term) => {
  const fee = await Fee.findOne({ level, term }).select("amount");
  return sumAmounts(fee?.amount, "amount");
};

/** Earlier terms: what was owed there (that term's fee for that class) less what was paid. */
const previousArrears = async (student, term) => {
  const records = await CurrentFee.find({ student, term: { $ne: term } }).select(["payment", "level", "term"]);
  const rows = await Promise.all(
    records.map(async ({ level, term: previousTerm, payment }) => {
      const fees = await termFeeFor(level, previousTerm);
      const paid = sumAmounts(payment, "paid");
      return { fees, paid, remaining: Math.max(subtract(fees, paid), 0) };
    })
  );
  return {
    fees: sumAmounts(rows, "fees"),
    paid: sumAmounts(rows, "paid"),
    remaining: sumAmounts(rows, "remaining"),
  };
};

/**
 * The balance, from plain numbers. `paid` is everything paid on this term's record.
 * Money paid beyond this term's fee goes toward the arrears.
 */
const balanceOf = ({ termFees, previous, paid }) => {
  const overflow = Math.max(subtract(paid, termFees), 0);
  const arrearsLeft = Math.max(subtract(previous.remaining, overflow), 0);
  const totalFees = sumAmounts([termFees, previous.remaining]);
  return {
    current: { fees: termFees, paid, remaining: Math.max(subtract(termFees, paid), 0) },
    previous: {
      fees: previous.fees,
      paid: sumAmounts([previous.paid, subtract(previous.remaining, arrearsLeft)]),
      remaining: arrearsLeft,
    },
    totalFees,
    totalOutstanding: Math.max(subtract(totalFees, paid), 0),
  };
};

/** The most a record's payments may add up to: this term's fee plus earlier arrears. */
const paymentLimit = ({ termFees, previous }) => sumAmounts([termFees, previous.remaining]);

const money = (n) => `GHS ${Number(n).toFixed(2)}`;

/** The refusal shown when a payment is more than what is owed. */
const overpaymentMessage = (amount, owed) =>
  Number(owed) > 0
    ? `This payment (${money(amount)}) is more than the ${money(owed)} still owed. Advance payments are not accepted.`
    : `Nothing is owed on this record, so a payment (${money(amount)}) cannot be recorded. Advance payments are not accepted.`;

const exceeds = (amount, owed) => toMinor(amount) > toMinor(owed);

module.exports = { termFeeFor, previousArrears, balanceOf, paymentLimit, overpaymentMessage, exceeds };
