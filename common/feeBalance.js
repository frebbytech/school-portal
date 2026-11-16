/**
 * What a student owes, worked out on the server. The payment screen, the receipt and the
 * "no advance payments" rule all use this, so they cannot disagree.
 *
 * Rules (owner decisions 2026-11-15/16):
 *  - Advance payments are not accepted: a payment may never exceed what is owed.
 *  - A payment goes to the OLDEST unpaid term first (see feeAllocation.js).
 */
const CurrentFee = require("../models/currentFeeModel");
const Fee = require("../models/feeModel");
const Term = require("../models/termModel");
const { sumAmounts, toMinor } = require("./money");
const { compareTerms, remainingOf, allocate, summarize } = require("./feeAllocation");

/** This term's fee for a class: the sum of the fee items set for it. */
const termFeeFor = async (level, term) => {
  const fee = await Fee.findOne({ level, term }).select("amount");
  return sumAmounts(fee?.amount, "amount");
};

const termLabel = (term) => {
  const bits = [term?.name, term?.term ? `Term ${term.term}` : ""].filter(Boolean);
  return bits.join(" ") || "Earlier term";
};

/**
 * Every fee record of a student with what each term charged and has been paid, oldest term
 * first. Each row: { record, term, fees, paid, remaining }.
 */
const ledgerFor = async (student, extraTermId) => {
  const records = await CurrentFee.find({ student }).select(["payment", "level", "term"]);
  const termIds = [...new Set([...records.map((r) => String(r.term)), ...(extraTermId ? [String(extraTermId)] : [])])];
  const terms = await Term.find({ _id: { $in: termIds } }).select(["from", "term", "name", "createdAt"]);
  const termById = new Map(terms.map((t) => [String(t._id), t]));

  const rows = await Promise.all(
    records.map(async (record) => {
      const fees = await termFeeFor(record.level, record.term);
      const paid = sumAmounts(record.payment, "paid");
      return { record, term: termById.get(String(record.term)), fees, paid, remaining: remainingOf(fees, paid) };
    })
  );
  rows.sort((a, b) => compareTerms(a.term, b.term));
  return { rows, termById };
};

/** The rows for terms before `term`, and the row for `term` itself (when it has a record). */
const splitLedger = (ledger, term) => {
  const at = ledger.termById.get(String(term));
  const earlier = ledger.rows.filter(
    (r) => String(r.record.term) !== String(term) && compareTerms(r.term, at) < 0
  );
  const current = ledger.rows.find((r) => String(r.record.term) === String(term));
  return { earlier, current };
};

/** The balance for the payment screen. */
const balanceFor = async ({ student, term, level, currentPayments }) => {
  const ledger = await ledgerFor(student, term);
  const { earlier } = splitLedger(ledger, term);
  const termFees = await termFeeFor(level, term);
  return summarize({ earlier, termFees, paid: sumAmounts(currentPayments, "paid") });
};

/**
 * Plans a payment against one record: which terms it is applied to (oldest first) and what is
 * owed. `plan.refused` is set when the amount is more than is owed.
 */
const planPayment = async (record, amount) => {
  const ledger = await ledgerFor(record.student, record.term);
  const { earlier, current } = splitLedger(ledger, record.term);
  // A record is always in its own ledger; guard anyway so a bad id cannot pass as "nothing owed".
  if (!current) return { refused: true, owed: 0 };
  const candidates = [...earlier, current];
  const owed = sumAmounts(candidates, "remaining");
  const { parts, left } = allocate(
    candidates.map((r) => ({ id: String(r.record._id), remaining: r.remaining })),
    amount
  );
  const byId = new Map(candidates.map((r) => [String(r.record._id), r]));
  return {
    owed,
    refused: toMinor(left) > 0,
    parts: parts.map((p) => ({ ...p, row: byId.get(p.id) })),
    earlierRemaining: sumAmounts(earlier, "remaining"),
    current,
  };
};

const money = (n) => `GHS ${Number(n).toFixed(2)}`;

/** The refusal shown when a payment is more than what is owed. */
const overpaymentMessage = (amount, owed) =>
  Number(owed) > 0
    ? `This payment (${money(amount)}) is more than the ${money(owed)} still owed. Advance payments are not accepted.`
    : `Nothing is owed on this record, so a payment (${money(amount)}) cannot be recorded. Advance payments are not accepted.`;

module.exports = { termFeeFor, termLabel, ledgerFor, splitLedger, balanceFor, planPayment, overpaymentMessage };
