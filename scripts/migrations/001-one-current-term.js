/**
 * Migration 001: at most ONE current term per school (partial unique index).
 *
 *   MIGRATE_MONGO_URL="..." node scripts/migrations/001-one-current-term.js          # dry run
 *   MIGRATE_MONGO_URL="..." node scripts/migrations/001-one-current-term.js --apply  # create index
 *
 * Dry run (default) only reports. With --apply it creates the index
 * `one_current_term_per_school` on `terms` ({ school: 1 }, unique, only for documents
 * with status "current"), and ONLY if no school currently has two current terms; if
 * some do, it lists them and changes nothing (fix them with PATCH /terms/:id?status=).
 * It never modifies or deletes documents. Run `scripts/data-audit.js` first.
 *
 * Rollback: db.terms.dropIndex("one_current_term_per_school")
 */
require("dotenv").config();
const mongoose = require("mongoose");

const url = process.env.MIGRATE_MONGO_URL;
const apply = process.argv.includes("--apply");
const INDEX_NAME = "one_current_term_per_school";

if (!url) {
  console.error("Set MIGRATE_MONGO_URL.");
  process.exit(1);
}

(async () => {
  const connection = await mongoose.createConnection(url, { autoIndex: false, autoCreate: false }).asPromise();
  const terms = connection.db.collection("terms");

  const indexes = await terms.indexes();
  if (indexes.some((i) => i.name === INDEX_NAME)) {
    console.log(`Index ${INDEX_NAME} already exists. Nothing to do.`);
    return connection.close();
  }

  const conflicts = await terms
    .aggregate([
      { $match: { status: "current" } },
      { $group: { _id: "$school", n: { $sum: 1 }, terms: { $push: "$_id" } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();

  if (conflicts.length) {
    console.error(`${conflicts.length} school(s) have more than one current term. The index was NOT created:`);
    conflicts.forEach((c) => console.error(` - school ${c._id}: terms ${c.terms.join(", ")}`));
    console.error("Mark all but one of each as archived, then run this again.");
    await connection.close();
    process.exit(2);
  }

  if (!apply) {
    console.log(`Dry run: no school has two current terms, so ${INDEX_NAME} can be created. Re-run with --apply.`);
    return connection.close();
  }

  await terms.createIndex(
    { school: 1 },
    { name: INDEX_NAME, unique: true, partialFilterExpression: { status: "current" } }
  );
  console.log(`Created index ${INDEX_NAME}.`);
  await connection.close();
})().catch(async (error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
