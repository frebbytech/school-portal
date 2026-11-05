/**
 * READ-ONLY data audit. Run it before any migration or new unique index.
 *
 *   AUDIT_MONGO_URL="mongodb+srv://<read-only user>@..." node scripts/data-audit.js [report.md]
 *
 * Safety:
 *  - It uses its own connection string (AUDIT_MONGO_URL), never MONGO_URL, so it cannot
 *    be pointed at the live write user by accident. Create a database user with the
 *    built-in `read` role and use that.
 *  - It does NOT load the application's models: loading a Mongoose model creates its
 *    indexes (a write). Collections are read through the bare driver, and only
 *    find / aggregate / countDocuments / indexes are called, through a wrapper that
 *    exposes nothing else.
 *  - The report contains counts and database ids only: no names, phone numbers,
 *    emails or index numbers. Keep it private anyway.
 *
 * Output: a Markdown report (default `data-audit-report.md`) and a short summary on
 * the console. Nothing is changed.
 */
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");

const url = process.env.AUDIT_MONGO_URL;
if (!url) {
  console.error("Set AUDIT_MONGO_URL (use a read-only database user).");
  process.exit(1);
}
const outFile = process.argv[2] || "data-audit-report.md";
const SAMPLE = 10; // ids shown per finding

const findings = [];
const notes = [];

(async () => {
  const connection = await mongoose.createConnection(url, { autoIndex: false, autoCreate: false }).asPromise();
  const db = connection.db;

  // Read-only view of a collection
  const col = (name) => {
    const c = db.collection(name);
    return {
      find: (...a) => c.find(...a),
      aggregate: (...a) => c.aggregate(...a),
      count: (f = {}) => c.countDocuments(f),
      indexes: () => c.indexes().catch(() => []),
    };
  };

  const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const has = (name) => existing.has(name);

  const record = (area, title, count, ids = [], detail = "") =>
    findings.push({ area, title, count, ids: ids.slice(0, SAMPLE).map(String), detail });

  const idsOf = async (cursor) => (await cursor.toArray()).map((d) => d._id);

  // ---- helper: records whose reference points nowhere ---------------------------
  const dangling = async (from, field, to, { match = {}, area = from, label } = {}) => {
    if (!has(from) || !has(to)) return;
    const rows = await col(from)
      .aggregate([
        { $match: { ...match, [field]: { $type: "objectId" } } },
        { $lookup: { from: to, localField: field, foreignField: "_id", as: "_t" } },
        { $match: { _t: { $size: 0 } } },
        { $project: { _id: 1 } },
        { $limit: 100000 },
      ])
      .toArray();
    if (rows.length) record(area, label || `${from}.${field} points to a missing ${to} record`, rows.length, rows.map((r) => r._id));
  };

  const missingField = async (name, field, label, extra = {}) => {
    if (!has(name)) return;
    const filter = { $or: [{ [field]: { $exists: false } }, { [field]: null }], ...extra };
    const n = await col(name).count(filter);
    if (n) record(name, label, n, await idsOf(col(name).find(filter, { projection: { _id: 1 } }).limit(SAMPLE)));
  };

  // ---- 1. Totals -----------------------------------------------------------------
  const totals = {};
  for (const name of ["schools", "users", "students", "studentauths", "terms", "sessions", "levels", "courses", "subjects", "grades", "fees", "currentfees", "examinations", "attendances", "parents"]) {
    if (has(name)) totals[name] = await col(name).count();
  }

  // ---- 2. Identity duplicates (multi-school rule: unique index numbers/usernames) --
  if (has("students")) {
    const dup = await col("students")
      .aggregate([
        { $group: { _id: { $toLower: { $trim: { input: { $toString: "$indexnumber" } } } }, n: { $sum: 1 }, schools: { $addToSet: "$school" }, ids: { $push: "$_id" } } },
        { $match: { n: { $gt: 1 } } },
        { $limit: 100000 },
      ])
      .toArray();
    const cross = dup.filter((d) => d.schools.length > 1);
    if (dup.length) record("students", "index numbers used by more than one student (ignoring case/spaces)", dup.length, dup.flatMap((d) => d.ids));
    if (cross.length) record("students", "...of which shared by DIFFERENT schools", cross.length, cross.flatMap((d) => d.ids));
    await missingField("students", "indexnumber", "students without an index number");
  }
  if (has("users")) {
    for (const field of ["username", "email"]) {
      const dup = await col("users")
        .aggregate([
          { $match: { [field]: { $type: "string" } } },
          { $group: { _id: { $toLower: { $trim: { input: `$${field}` } } }, n: { $sum: 1 }, ids: { $push: "$_id" } } },
          { $match: { n: { $gt: 1 } } },
        ])
        .toArray();
      if (dup.length) record("users", `${field} used by more than one user (ignoring case/spaces)`, dup.length, dup.flatMap((d) => d.ids));
    }
    await missingField("users", "school", "users without a school (expected only for platform_admin)", { role: { $ne: "platform_admin" } });
    const badRole = await col("users").count({ role: { $nin: ["administrator", "teacher", "student", "parent", "platform_admin"] } });
    if (badRole) record("users", "users with an unknown role", badRole);
  }
  if (has("studentauths") && has("students")) {
    const rows = await col("studentauths")
      .aggregate([
        { $lookup: { from: "students", localField: "indexnumber", foreignField: "indexnumber", as: "_s" } },
        { $match: { _s: { $size: 0 } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    if (rows.length) record("studentauths", "student login accounts whose index number matches no student", rows.length, rows.map((r) => r._id));
  }

  // ---- 3. Missing tenant ids on tenant-owned records ------------------------------
  for (const name of ["students", "terms", "sessions", "levels", "courses", "grades", "fees", "parents", "studentauths"]) {
    await missingField(name, "school", `${name} without a school`);
  }
  await dangling("users", "school", "schools", { label: "users pointing to a missing school" });
  for (const name of ["students", "terms", "sessions", "levels", "courses", "parents"]) {
    await dangling(name, "school", "schools", { label: `${name} pointing to a missing school` });
  }

  // ---- 4. Orphans -----------------------------------------------------------------
  await dangling("terms", "session", "sessions");
  await dangling("levels", "term", "terms");
  await dangling("levels", "session", "sessions");
  await dangling("levels", "teacher", "users");
  await dangling("levels", "grades", "grades");
  await dangling("courses", "level", "levels");
  await dangling("courses", "subject", "subjects");
  await dangling("courses", "teacher", "users");
  await dangling("courses", "term", "terms");
  await dangling("subjects", "term", "terms");
  await dangling("students", "level", "levels");
  await dangling("currentfees", "student", "students");
  await dangling("currentfees", "term", "terms");
  await dangling("currentfees", "level", "levels");
  await dangling("examinations", "student", "students");
  await dangling("examinations", "term", "terms");
  await dangling("examinations", "level", "levels");
  await dangling("attendances", "term", "terms");
  await dangling("attendances", "level", "levels");
  await dangling("parents", "student", "students");

  // level.students entries that point to nothing, and students not listed in their level
  if (has("levels") && has("students")) {
    const ghosts = await col("levels")
      .aggregate([
        { $unwind: "$students" },
        { $lookup: { from: "students", localField: "students", foreignField: "_id", as: "_s" } },
        { $match: { _s: { $size: 0 } } },
        { $group: { _id: "$_id", n: { $sum: 1 } } },
      ])
      .toArray();
    if (ghosts.length) record("levels", "levels listing student ids that no longer exist", ghosts.length, ghosts.map((g) => g._id), `${ghosts.reduce((s, g) => s + g.n, 0)} dangling entries in total`);

    const unlisted = await col("students")
      .aggregate([
        { $match: { level: { $type: "objectId" } } },
        { $lookup: { from: "levels", localField: "level", foreignField: "_id", as: "_l" } },
        { $match: { "_l.0": { $exists: true } } },
        { $match: { $expr: { $not: { $in: ["$_id", { $ifNull: [{ $arrayElemAt: ["$_l.students", 0] }, []] }] } } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    if (unlisted.length) record("students", "students whose level does not list them", unlisted.length, unlisted.map((r) => r._id));
  }

  // Cross-school references (a record pointing at another school's parent record)
  const crossSchool = async (from, field, to) => {
    if (!has(from) || !has(to)) return;
    const rows = await col(from)
      .aggregate([
        { $match: { [field]: { $type: "objectId" }, school: { $type: "objectId" } } },
        { $lookup: { from: to, localField: field, foreignField: "_id", as: "_t" } },
        { $unwind: "$_t" },
        { $match: { $expr: { $ne: ["$_t.school", "$school"] } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    if (rows.length) record("cross-school", `${from}.${field} points to ${to} of a DIFFERENT school`, rows.length, rows.map((r) => r._id));
  };
  await crossSchool("students", "level", "levels");
  await crossSchool("levels", "term", "terms");
  await crossSchool("levels", "teacher", "users");
  await crossSchool("courses", "teacher", "users");
  await crossSchool("courses", "level", "levels");
  await crossSchool("parents", "student", "students");

  // ---- 5. Terms: one current term per school ---------------------------------------
  if (has("terms")) {
    const multi = async (field, value, label) => {
      const rows = await col("terms")
        .aggregate([{ $match: { [field]: value } }, { $group: { _id: "$school", n: { $sum: 1 }, ids: { $push: "$_id" } } }, { $match: { n: { $gt: 1 } } }])
        .toArray();
      if (rows.length) record("terms", label, rows.length, rows.flatMap((r) => r.ids), "counts schools affected; ids are the terms involved");
    };
    await multi("status", "current", "schools with more than one term marked current");
    await multi("active", true, "schools with more than one term marked active");
    const noCurrent = await col("schools")
      .aggregate([
        { $lookup: { from: "terms", let: { s: "$_id" }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$school", "$$s"] }, { $eq: ["$status", "current"] }, { $eq: ["$active", true] }] } } }], as: "_t" } },
        { $match: { _t: { $size: 0 } } },
        { $project: { _id: 1 } },
      ])
      .toArray();
    if (noCurrent.length) record("terms", "schools with NO current+active term (student login and refresh fail for them)", noCurrent.length, noCurrent.map((r) => r._id));
  }

  // ---- 6. Duplicates that would block unique indexes (Stage 9 / 8) -------------------
  const dupKeys = async (name, key, label, match = {}) => {
    if (!has(name)) return;
    const rows = await col(name)
      .aggregate([{ $match: match }, { $group: { _id: key, n: { $sum: 1 }, ids: { $push: "$_id" } } }, { $match: { n: { $gt: 1 } } }, { $limit: 100000 }])
      .toArray();
    if (rows.length) record(name, label, rows.length, rows.flatMap((r) => r.ids), `${rows.reduce((s, r) => s + r.n - 1, 0)} surplus records`);
  };
  await dupKeys("examinations", { term: "$term", level: "$level", student: "$student" }, "duplicate examination records per (term, level, student)");
  await dupKeys("currentfees", { term: "$term", student: "$student" }, "duplicate fee records per (term, student)");
  await dupKeys("attendances", { level: "$level", date: "$date" }, "duplicate attendance registers per (level, date)");
  await dupKeys("courses", { term: "$term", level: "$level", subject: "$subject" }, "duplicate courses per (term, level, subject)");
  await dupKeys("subjects", { term: "$term", name: "$name" }, "duplicate subjects per (term, name)");
  await dupKeys("levels", { school: "$school", term: "$term", initials: "$initials", name: "$level.name", type: "$level.type" }, "duplicate levels per (school, term, name/type)");
  await dupKeys("grades", "$name", "grade systems sharing a name (name is globally unique in the schema)");

  // ---- 7. Payments ------------------------------------------------------------------
  if (has("currentfees")) {
    const bad = await col("currentfees")
      .aggregate([
        { $match: { payment: { $type: "array", $ne: [] } } },
        { $unwind: "$payment" },
        { $match: { $or: [{ "payment.paid": { $not: { $type: "number" } } }, { "payment.paid": { $lt: 0 } }] } },
        { $group: { _id: "$_id", n: { $sum: 1 } } },
      ])
      .toArray();
    if (bad.length) record("fees", "fee records with a payment whose amount is missing, not a number, or negative", bad.length, bad.map((b) => b._id));
    const noId = await col("currentfees")
      .aggregate([{ $match: { payment: { $type: "array", $ne: [] } } }, { $unwind: "$payment" }, { $match: { "payment.id": { $exists: false } } }, { $group: { _id: "$_id" } }])
      .toArray();
    if (noId.length) record("fees", "fee records with a payment that has no receipt id", noId.length, noId.map((b) => b._id));
    const fractional = await col("currentfees")
      .aggregate([
        { $match: { payment: { $type: "array", $ne: [] } } },
        { $unwind: "$payment" },
        { $match: { "payment.paid": { $type: "number" }, $expr: { $ne: ["$payment.paid", { $round: ["$payment.paid", 2] }] } } },
        { $group: { _id: "$_id" } },
      ])
      .toArray();
    if (fractional.length) record("fees", "payments with more than 2 decimal places (matters for the integer-minor-unit change)", fractional.length, fractional.map((b) => b._id));
  }

  // ---- 8. Examination data shape -----------------------------------------------------
  if (has("examinations")) {
    const badScores = await col("examinations")
      .aggregate([
        { $match: { scores: { $type: "array", $ne: [] } } },
        { $unwind: "$scores" },
        { $match: { $or: [{ "scores._id": { $exists: false } }, { "scores.classScore": { $lt: 0 } }, { "scores.examsScore": { $lt: 0 } }, { "scores.classScore": { $gt: 100 } }, { "scores.examsScore": { $gt: 100 } }] } },
        { $group: { _id: "$_id" } },
      ])
      .toArray();
    if (badScores.length) record("examinations", "records with a score missing its subject id, or outside 0-100", badScores.length, badScores.map((b) => b._id));
  }

  // ---- 9. Index inventory (to compare with the models) --------------------------------
  const indexLines = [];
  for (const name of ["users", "students", "studentauths", "schools", "terms", "levels", "grades", "currentfees", "examinations", "attendances"]) {
    if (!has(name)) continue;
    const idx = await col(name).indexes();
    indexLines.push(`- **${name}**: ` + idx.map((i) => `\`${i.name}\`${i.unique ? " (unique)" : ""}${i.partialFilterExpression ? " (partial)" : ""}`).join(", "));
  }

  // ---- Report -------------------------------------------------------------------------
  const lines = [];
  lines.push(`# Data audit report`, ``, `Generated ${new Date().toISOString()} (read-only; nothing was changed).`, ``);
  lines.push(`## Record counts`, ``, ...Object.entries(totals).map(([k, v]) => `- ${k}: ${v}`), ``);
  lines.push(`## Findings (${findings.length})`, ``);
  if (!findings.length) lines.push(`No problems found by these checks.`, ``);
  const byArea = {};
  findings.forEach((f) => (byArea[f.area] ||= []).push(f));
  for (const [area, list] of Object.entries(byArea)) {
    lines.push(`### ${area}`, ``);
    for (const f of list) {
      lines.push(`- **${f.title}**: ${f.count}${f.detail ? ` (${f.detail})` : ""}`);
      if (f.ids.length) lines.push(`  - sample ids: ${f.ids.map((i) => `\`${i}\``).join(", ")}`);
    }
    lines.push(``);
  }
  lines.push(`## Indexes found`, ``, ...indexLines, ``);
  if (notes.length) lines.push(`## Notes`, ``, ...notes.map((n) => `- ${n}`), ``);

  fs.writeFileSync(outFile, lines.join("\n"));
  console.log(`Audit complete: ${findings.length} finding(s). Report written to ${outFile}`);
  findings.forEach((f) => console.log(` - [${f.area}] ${f.title}: ${f.count}`));

  await connection.close();
})().catch((error) => {
  console.error("Audit failed:", error.message);
  process.exit(1);
});
