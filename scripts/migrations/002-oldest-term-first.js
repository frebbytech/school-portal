/**
 * Migration 002: apply earlier overpayments to the oldest unpaid term.
 *
 *   MIGRATE_MONGO_URL="..." node scripts/migrations/002-oldest-term-first.js          # dry run
 *   MIGRATE_MONGO_URL="..." node scripts/migrations/002-oldest-term-first.js --apply  # change data
 *
 * Why: from now on every payment is applied to the student's oldest unpaid term first.
 * Before, money paid beyond a term's fee stayed on that term's record while the older term
 * still looked unpaid. This moves that excess onto the older terms that still owe, so the
 * balances agree with the new rule. Each moved part keeps its receipt number, date and payer.
 *
 * Dry run (default) only prints the plan. With --apply, for every payment that was too
 * large, the original entry keeps what fits and a new entry for the moved amount is added
 * to the older term's record. Money is never created or removed; the student's total paid is
 * unchanged. Anything that no older term owes (a true advance payment) is left untouched and
 * listed for you to decide. Running it twice is safe (the second run finds nothing to move).
 *
 * TAKE A BACKUP FIRST. This rewrites payment history.
 * Rollback: restore the backup (or reverse the printed moves by hand).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { compareTerms, planOverflowMoves } = require("../../common/feeAllocation");
const { toMinor } = require("../../common/money");

const url = process.env.MIGRATE_MONGO_URL;
const apply = process.argv.includes("--apply");

if (!url) {
  console.error("Set MIGRATE_MONGO_URL.");
  process.exit(1);
}

const feeTotal = (fee) => (fee?.amount || []).reduce((s, i) => s + toMinor(i?.amount), 0) / 100;

(async () => {
  const connection = await mongoose.createConnection(url, { autoIndex: false, autoCreate: false }).asPromise();
  const db = connection.db;
  const currentFees = db.collection("currentfees");
  const termsCol = db.collection("terms");
  const feesCol = db.collection("fees");

  const records = await currentFees.find({ student: { $ne: null } }).project({ student: 1, term: 1, level: 1, payment: 1 }).toArray();
  const terms = new Map((await termsCol.find({}).project({ from: 1, term: 1, createdAt: 1 }).toArray()).map((t) => [String(t._id), t]));
  const fees = new Map();
  for (const f of await feesCol.find({}).project({ level: 1, term: 1, amount: 1 }).toArray()) {
    fees.set(`${f.level}:${f.term}`, feeTotal(f));
  }

  const byStudent = new Map();
  for (const r of records) {
    const key = String(r.student);
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key).push(r);
  }

  let studentsChanged = 0;
  let movedTotal = 0;
  const unplacedAll = [];
  const operations = [];

  for (const [student, list] of byStudent) {
    list.sort((a, b) => compareTerms(terms.get(String(a.term)), terms.get(String(b.term))));
    const rows = list.map((r) => ({
      id: String(r._id),
      fees: fees.get(`${r.level}:${r.term}`) || 0,
      payments: (r.payment || []).map((p) => ({ paid: Number(p?.paid) || 0 })),
    }));
    const { moves, unplaced } = planOverflowMoves(rows);
    for (const u of unplaced) unplacedAll.push({ student, ...u });
    if (moves.length === 0) continue;
    studentsChanged += 1;
    const byId = new Map(list.map((r) => [String(r._id), r]));

    // Group the moves by the entry they are taken from.
    const takenFrom = new Map();
    for (const m of moves) {
      const key = `${m.fromId}:${m.entryIndex}`;
      if (!takenFrom.has(key)) takenFrom.set(key, []);
      takenFrom.get(key).push(m);
      movedTotal += toMinor(m.amount);
    }
    for (const [key, group] of takenFrom) {
      const [fromId, indexText] = key.split(":");
      const entry = byId.get(fromId).payment[Number(indexText)];
      const movedMinor = group.reduce((s, m) => s + toMinor(m.amount), 0);
      operations.push({ student, fromId, entry, group, keptMinor: toMinor(entry.paid) - movedMinor });
      console.log(`student ${student}: receipt ${entry.id ?? "(none)"} GHS ${entry.paid} -> keep ${(toMinor(entry.paid) - movedMinor) / 100}, move ${group.map((m) => `${m.amount} to ${m.toId}`).join(", ")}`);
    }
  }

  console.log(`\n${studentsChanged} student(s) affected, GHS ${movedTotal / 100} to move.`);
  if (unplacedAll.length) {
    console.log(`${unplacedAll.length} payment(s) are more than ANY term owes (true advance payments); left untouched:`);
    for (const u of unplacedAll) console.log(`  student ${u.student}, record ${u.id}, GHS ${u.amount}`);
  }

  if (!apply) {
    console.log("\nDry run only. Nothing was changed. Take a backup, then re-run with --apply.");
    return connection.close();
  }

  const noId = operations.filter((o) => !o.entry.id);
  if (noId.length) {
    console.error(`\n${noId.length} payment(s) have no receipt number, so they cannot be changed safely. Nothing was applied.`);
    await connection.close();
    process.exit(2);
  }

  for (const op of operations) {
    const { fromId, entry, group, keptMinor } = op;
    const original = Number(entry.paid);
    const { ObjectId } = mongoose.Types;
    for (const m of group) {
      await currentFees.updateOne(
        { _id: new ObjectId(m.toId) },
        { $push: { payment: { ...entry, paid: m.amount, receiptTotal: entry.receiptTotal ?? original, movedFromRecord: fromId } } }
      );
    }
    if (keptMinor > 0) {
      await currentFees.updateOne(
        { _id: new ObjectId(fromId), "payment.id": entry.id },
        { $set: { "payment.$.paid": keptMinor / 100, "payment.$.receiptTotal": entry.receiptTotal ?? original } }
      );
    } else {
      await currentFees.updateOne({ _id: new ObjectId(fromId) }, { $pull: { payment: { id: entry.id } } });
    }
  }
  console.log("\nApplied.");
  await connection.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
