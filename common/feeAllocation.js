/**
 * Pure rules for how a student's payments are applied across terms. No database here, so
 * every rule can be tested on its own.
 *
 * Owner decisions (2026-11-15/16):
 *  - Advance payments are not accepted: a payment may never exceed what is owed.
 *  - A payment is applied to the OLDEST unpaid term first, then the next, ending with the
 *    term it was recorded against.
 */
const { sumAmounts, subtract, toMinor } = require("./money");

const dateOf = (value) => {
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
};

/** Oldest first: by the term's start date, then its term number, then when it was created. */
const compareTerms = (a, b) => {
  const da = dateOf(a?.from) ?? (a?.createdAt ? +new Date(a.createdAt) : 0);
  const db = dateOf(b?.from) ?? (b?.createdAt ? +new Date(b.createdAt) : 0);
  if (da !== db) return da - db;
  const na = Number(a?.term) || 0;
  const nb = Number(b?.term) || 0;
  if (na !== nb) return na - nb;
  const ca = a?.createdAt ? +new Date(a.createdAt) : 0;
  const cb = b?.createdAt ? +new Date(b.createdAt) : 0;
  if (ca !== cb) return ca - cb;
  return String(a?._id).localeCompare(String(b?._id));
};

/** What is left to pay on one term: its fee less its payments (never below zero). */
const remainingOf = (fees, paid) => Math.max(subtract(fees, paid), 0);

/**
 * Splits `amount` over `rows` (oldest first, each { id, remaining }).
 * Returns { parts: [{ id, amount }], left } where `left` is what did not fit (an advance).
 */
const allocate = (rows, amount) => {
  let leftMinor = toMinor(amount);
  const parts = [];
  for (const row of rows) {
    if (leftMinor <= 0) break;
    const take = Math.min(leftMinor, toMinor(row.remaining));
    if (take > 0) {
      parts.push({ id: row.id, amount: take / 100 });
      leftMinor -= take;
    }
  }
  return { parts, left: leftMinor / 100 };
};

/** The balance shown on the payment screen, from the earlier terms and this term. */
const summarize = ({ earlier, termFees, paid }) => {
  const previous = {
    fees: sumAmounts(earlier, "fees"),
    paid: sumAmounts(earlier, "paid"),
    remaining: sumAmounts(earlier, "remaining"),
  };
  const current = { fees: termFees, paid, remaining: remainingOf(termFees, paid) };
  return {
    current,
    previous,
    totalFees: sumAmounts([termFees, previous.remaining]),
    totalOutstanding: sumAmounts([current.remaining, previous.remaining]),
  };
};

/**
 * Migration helper: before oldest-first allocation, money paid beyond a term's fee stayed on
 * that term's record and the older term still looked unpaid. Given a student's terms oldest
 * first ([{ id, fees, payments: [{ paid, ... }] }]) this plans moving that excess onto the
 * older terms that are still owing.
 *   moves:     [{ fromId, entryIndex, toId, amount }]  (each is part of one payment entry)
 *   unplaced:  money still above the fee that no older term owes (a genuine advance payment)
 * Nothing is changed here; it only returns the plan.
 */
const planOverflowMoves = (terms) => {
  const state = terms.map((t) => ({
    id: t.id,
    fees: t.fees,
    entries: t.payments.map((p, index) => ({ index, left: toMinor(p.paid) })),
    paidMinor: t.payments.reduce((s, p) => s + toMinor(p.paid), 0),
  }));
  const moves = [];
  const unplaced = [];

  state.forEach((row, i) => {
    let excess = row.paidMinor - toMinor(row.fees);
    if (excess <= 0) return;

    // Take the excess off the newest payments first.
    const takes = [];
    for (let k = row.entries.length - 1; k >= 0 && excess > 0; k--) {
      const t = Math.min(excess, row.entries[k].left);
      if (t > 0) {
        takes.push({ index: row.entries[k].index, minor: t });
        row.entries[k].left -= t;
        excess -= t;
      }
    }

    // Give it to the oldest earlier terms that still owe.
    for (const take of takes) {
      let minor = take.minor;
      for (let j = 0; j < i && minor > 0; j++) {
        const target = state[j];
        const owing = toMinor(target.fees) - target.paidMinor;
        if (owing <= 0) continue;
        const give = Math.min(minor, owing);
        moves.push({ fromId: row.id, entryIndex: take.index, toId: target.id, amount: give / 100 });
        target.paidMinor += give;
        row.paidMinor -= give;
        minor -= give;
      }
      if (minor > 0) unplaced.push({ id: row.id, entryIndex: take.index, amount: minor / 100 });
    }
  });

  return { moves, unplaced };
};

module.exports = { compareTerms, remainingOf, allocate, summarize, planOverflowMoves };
