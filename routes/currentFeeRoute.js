const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const CurrentFee = require("../models/currentFeeModel");
const Fee = require("../models/feeModel");
const _ = require("lodash");
const moment = require("moment");
const { randomUUID } = require("crypto");
const {
  Types: { ObjectId },
} = require("mongoose");
const { currencyConverter } = require("../config/currencyConverter");
const {
  processFeeForTerm,
  processWeeklyFees,
  getTotalFeesForWeek,
  getInvoiceId,
} = require("../config/helper");
const {
  getFeePaymentTrend,
  getTopFeePayments,
} = require("../config/helpers/fees");
const Term = require("../models/termModel");
const Student = require("../models/studentModel");
const Level = require("../models/levelModel");
const {
  requireStaff,
  requireRoleEnforced,
  enforce,
  getPrincipal,
  isSelf,
  pickFields,
} = require("../middlewares/authorize");
const {
  studentInSchool,
  termInSchool,
  levelInSchool,
  sessionInSchool,
} = require("../middlewares/tenant");
const { isValidObjectId } = require("mongoose");
const { sumAmounts, subtract, percentPaid, parseMoney, toMinor } = require("../common/money");
const { termFeeFor, termLabel, balanceFor, planPayment, overpaymentMessage } = require("../common/feeBalance");
const { logger } = require("../common/logger");
const { withPagination } = require("../common/pagination");

const MAX_PAYMENTS_PER_RECORD = 500;
const RESERVED_PAYMENT_KEYS = ["_id", "id", "createdAt", "issuerID", "issuerName"];

// A payment entry: `paid` is required and must be a real amount; other details the
// client sends (method, note, ...) are kept if they are short plain values, but the
// receipt id, time and issuer are always set by the server.
const cleanPayment = (input, { allowZero = false } = {}) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const paid = parseMoney(input.paid, { allowZero });
  if (paid === null) return null;

  const clean = { paid };
  let extras = 0;
  for (const [key, value] of Object.entries(input)) {
    if (key === "paid" || RESERVED_PAYMENT_KEYS.includes(key)) continue;
    if (key.startsWith("$") || key.includes(".") || ++extras > 20) continue;
    if (key === "outstanding") {
      const outstanding = parseMoney(value, { allowZero: true, allowNegative: true });
      if (outstanding !== null) clean.outstanding = outstanding;
    } else if (["string", "number", "boolean"].includes(typeof value)) {
      clean[key] = typeof value === "string" ? value.slice(0, 200) : value;
    }
  }
  return clean;
};

// CurrentFee has no `school` field (audit D-1), so ownership is derived from the
// related term (or, failing that, the student).
const FORBIDDEN = "You do not have permission to perform this action.";
const adminOnly = requireRoleEnforced("administrator");

const ownedCurrentFee = async (req, id) => {
  if (!isValidObjectId(id)) return null;
  const doc = await CurrentFee.findById(id);
  if (!doc) return null;
  const owned = doc.term
    ? await termInSchool(req, doc.term)
    : await studentInSchool(req, doc.student);
  return owned ? doc : null;
};

/**
 * The two endpoints the student portal calls (audit 13.2): staff of the student's
 * school, or the student themself. Nobody else.
 */
const staffOrOwnStudent = (getStudentId) =>
  enforce(async (req, res, next) => {
    try {
      const principal = getPrincipal(req);
      const studentId = getStudentId(req);
      if (principal.kind === "student") {
        if (!isSelf(req, studentId)) return res.status(403).json(FORBIDDEN);
        return next();
      }
      if (principal.kind === "staff" && (await studentInSchool(req, studentId))) {
        return next();
      }
      return res.status(403).json(FORBIDDEN);
    } catch (error) {
      next(error);
    }
  });

//@GET All school current fees
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const termIds = await Term.find({ school: req.user.school }).distinct("_id");
    const filter = { term: { $in: termIds } };
    const currentFees = await withPagination(
      req,
      res,
      CurrentFee.find(filter).sort({ _id: 1 }),
      () => CurrentFee.countDocuments(filter)
    );
    res.status(200).json(currentFees);
  })
);

//@GET All school current fees
router.get(
  "/day",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term, date } = req.query;

    if (!isValidObjectId(session) || !(await termInSchool(req, term))) {
      return res.status(200).json([]);
    }

    const currentFees = await CurrentFee.find({
      session: new ObjectId(session),
      term: new ObjectId(term),
    })
      .populate({
        path: "student",
        select: ["firstname", "surname", "othername"],
      })
      .populate({
        path: "level",
        select: "level",
      })
      .select("payment");

    if (_.isEmpty(currentFees)) {
      return res.status(200).json([]);
    }

    const studentPaymentForOnADate = currentFees.map(
      ({ student, level, payment }) => {
        const paidForToday = payment.filter((pay) => {
          return moment(new Date(pay?.date || pay?.createdAt)).isSame(
            moment(new Date(date)),
            "day"
          );
        });
        if (_.isEmpty(paidForToday)) return null;

        const results = paidForToday?.map((fee) => {
          return {
            student: student?.fullName,
            level: level?.levelName,
            payment: fee,
          };
        });

        return results;
      }
    );

    res.status(200).json(_.compact(_.flatMapDeep(studentPaymentForOnADate)));
  })
);

//GET Student fee History
router.get(
  "/history",
  staffOrOwnStudent((req) => req.query.studentId),
  asyncHandler(async (req, res) => {
    const { studentId } = req.query;

    const studFees = await CurrentFee.find({
      student: studentId,
    })
      .sort({ createdAt: -1 })
      .populate("student")
      .populate({
        path: "term",
        select: ["term", "academicYear"],
      })
      .populate({
        path: "level",
        select: ["level"],
      })
      .select("payment");

    const modifiedFees = studFees.map(async (currentFee) => {
      const fee = await Fee.findOne({
        level: currentFee?.level?._id,
        term: currentFee?.term?._id,
      });

      return {
        _id: currentFee?._id,
        academicYear: currentFee?.term?.academicYear,
        term: currentFee?.term?.term,
        level: currentFee?.level?.levelName,
        fees: sumAmounts(fee?.amount, "amount"),
        payment: currentFee?.payment,
        paid: sumAmounts(currentFee?.payment, "paid"),
      };
    });
    const fees = await Promise.all(modifiedFees);

    res.status(200).json(fees);
  })
);

//GET Student fee History
router.get(
  "/current/:id",
  staffOrOwnStudent((req) => req.params.id),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const studFees = await CurrentFee.find({
      student: id,
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "term",
        select: ["term", "academicYear"],
      })
      .populate({
        path: "level",
        select: ["level", "active"],
      })
      .select(["student", "payment"]);

    let activeLevel = null;

    const modifiedFees = studFees.map(async (currentFee) => {
      const fee = await Fee.findOne({
        level: currentFee?.level?._id,
        term: currentFee?.term?._id,
      });

      const fees = sumAmounts(fee?.amount, "amount");
      const paid = sumAmounts(currentFee?.payment, "paid");
      if (currentFee?.level?.active) {
        activeLevel = {
          term: currentFee?.term?.term,
          level: currentFee?.level?.levelName,
          fees: fees,
          paid: paid,
          arrears: subtract(fees, paid),
          percentage: percentPaid(paid, fees),
        };
      }
      return {
        _id: currentFee?._id,
        academicYear: currentFee?.term?.academicYear,
        term: currentFee?.term?.term,
        level: currentFee?.level?.levelName,
        payment: currentFee?.payment,
        fees: fees,
        paid: paid,
      };
    });
    const fees = await Promise.all(modifiedFees);

    //Sum of fees for each term
    const totalFees = sumAmounts(fees, "fees");
    const totalPaid = sumAmounts(fees, "paid");
    const totalArrears = subtract(totalFees, totalPaid);
    const feePaymentTrend = getFeePaymentTrend(fees);
    const topFeePayments = getTopFeePayments(fees);

    const lastFeePaid = _.first(topFeePayments);

    res.status(200).json({
      totalFees,
      totalPaid,
      lastFeePaid,
      totalArrears,
      feePaymentTrend,
      topFeePayments,
      activeLevel,
    });
  })
);

// A receipt by its number (reprint), for staff of the school the payment belongs to.
router.get(
  "/receipt/:invoice",
  requireStaff,
  asyncHandler(async (req, res) => {
    const invoice = String(req.params.invoice || "").slice(0, 100);
    // A payment applied to several terms is stored on each of those terms' records.
    const found = invoice ? await CurrentFee.find({ "payment.id": invoice }).select("-__v") : [];
    const owned = [];
    for (const record of found) {
      const ok = await ownedCurrentFee(req, record._id);
      if (!ok) return res.status(404).json("Receipt not found.");
      owned.push(ok);
    }
    if (owned.length === 0) return res.status(404).json("Receipt not found.");

    const entries = owned.flatMap((r) => r.payment.filter((p) => p?.id === invoice));
    const entry = entries[0];
    // The record the payment was made against is the newest term among the parts.
    const target = [...owned].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    const [student, level] = await Promise.all([
      Student.findById(target.student).select("firstname surname othername"),
      Level.findById(target.level).select("name type"),
    ]);

    const paidNow = entry.receiptTotal ?? sumAmounts(entries, "paid");
    res.status(200).json({
      ...entry,
      paid: paidNow,
      // Older payments were recorded before the figures were kept: work them out from the record.
      fee: entry.termFees ?? (await termFeeFor(target.level, target.term)),
      arreas: entry.arrears ?? 0,
      feePaid: entry.paidBefore ?? 0,
      paidThisTerm: entry.paidThisTerm,
      studentName: student?.fullName || "",
      levelName: `${level?.name ?? ""}${level?.type ?? ""}`.trim(),
    });
  })
);

router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    // Another school's record looks like a missing one (legacy: 200 with null).
    const currentFee = await ownedCurrentFee(req, req.params.id);
    res.status(200).json(currentFee);
  })
);
//@GET All school current fees summary
router.post(
  "/summary",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term, from, to } = req.body;

    if (!(await termInSchool(req, term))) return res.status(403).json(FORBIDDEN);

    const currentFees = await CurrentFee.find({
      session,
      term,
    })
      .populate({
        path: "level",
        select: ["level"],
      })
      .populate({
        path: "student",
        select: ["firstname", "surname", "othername"],
      })
      .sort({ updatedAt: -1 })
      .select("payment");

    //Recent Payments
    const recentFees = _.take(
      currentFees.flatMap(({ _id, level, student, payment }) => {
        return payment.map(({ createdAt, paid, outstanding }) => {
          return {
            _id,
            date: createdAt,
            student: student?.fullName,
            level: level?.levelName,
            paid: currencyConverter(paid),
            outstanding: currencyConverter(outstanding),
          };
        });
      }),
      10
    );

    //GET all payments
    const allPayments = currentFees.flatMap(({ payment }) => payment);

    const monthlyProjection = processFeeForTerm(from, to, allPayments);
    const weeklyProjection = processWeeklyFees(allPayments);

    ///GET all fees for today
    const feesForToday = _.filter(allPayments, ({ createdAt }) =>
      moment(new Date(createdAt)).isSame(moment(), "day")
    );
    const totalfeesForToday = sumAmounts(feesForToday, "paid");

    ///GET all fees for the month
    const feesForMonth = _.filter(allPayments, ({ createdAt }) => {
      return (
        moment(new Date(createdAt)).isSame(moment(), "month") &&
        moment(new Date(createdAt)).isSame(moment(), "year")
      );
    });
    const totalfeesForMonth = sumAmounts(feesForMonth, "paid");

    ///GET all fees for the term
    const feesFrom = moment(new Date(from));
    const feesTo = moment(new Date(to));

    const feesForTerm = _.filter(allPayments, ({ createdAt }) => {
      return moment(new Date(createdAt)).isBetween(
        feesFrom,
        feesTo,
        null,
        "[]"
      );
    });
    const totalfeesForTerm = sumAmounts(feesForTerm, "paid");

    ///GET all fees for the week
    const totalfeesForWeek = getTotalFeesForWeek(allPayments);

    const feeSummary = {
      recentFees: _.orderBy(recentFees, "date", "desc"),
      today: totalfeesForToday || 0,
      month: totalfeesForMonth || 0,
      term: totalfeesForTerm || 0,
      week: totalfeesForWeek || 0,
      monthlyProjection,
      weeklyProjection,
    };

    res.status(200).json(feeSummary);
  })
);

//@GET School current Fees for a particular level id
router.post(
  "/level",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { level, term } = req.body;

    if (!(await termInSchool(req, term)) || !(await levelInSchool(req, level))) {
      return res.status(200).json(0);
    }
    //console.log(level, term);
    const currentFee = await CurrentFee.find({
      term: new ObjectId(term),
      level: new ObjectId(level),
    }).select("payment");

    if (_.isEmpty(currentFee)) {
      return res.status(200).json(0);
    }

    const allPaymentsByLevel = sumAmounts(
      currentFee.flatMap((fee) => fee.payment),
      "paid"
    );

    res.status(200).json(allPaymentsByLevel);
  })
);

//GET Student fee info
router.post(
  "/student",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { session, term, level, student } = req.body;

    if (
      !(await studentInSchool(req, student)) ||
      !(await termInSchool(req, term)) ||
      !(await levelInSchool(req, level)) ||
      !(await sessionInSchool(req, session))
    ) {
      return res.status(403).json(FORBIDDEN);
    }

    // The student's record for this term. It is created on first use (as before);
    // `create(...).select()` threw, and the upsert avoids two requests both creating it.
    const currentStudentFee = await CurrentFee.findOneAndUpdate(
      {
        session: new ObjectId(session),
        term: new ObjectId(term),
        level: new ObjectId(level),
        student: new ObjectId(student),
      },
      { $setOnInsert: { payment: [], createdBy: req.user.id, school: req.user.school } },
      { new: true, upsert: true }
    ).select("payment");

    // Earlier terms are worked out from each term's own record (payments go to the oldest
    // unpaid term first), so arrears are never counted twice.
    const balance = await balanceFor({ student, term, level, currentPayments: currentStudentFee?.payment });

    res.status(200).json({
      current: { _id: currentStudentFee?._id, ...balance.current },
      previous: balance.previous,
      totalFees: balance.totalFees,
      totalOutstanding: balance.totalOutstanding,
    });
  })
);

// Recording a payment: administrators only (owner decision 2026-10-25)
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { _id, payment } = req.body;

    const record = await ownedCurrentFee(req, _id);
    const clean = record ? cleanPayment(payment) : null;
    if (record && !clean) {
      return res.status(400).send("Payment amount must be a positive amount with at most 2 decimals.");
    }
    if (record && (record.payment?.length || 0) >= MAX_PAYMENTS_PER_RECORD) {
      return res.status(400).send("This fee record has too many payments.");
    }
    if (!record) {
      return res
        .status(404)
        .send("Error creating new CurrentFee.Try again later");
    }

    // No advance payments, oldest term first. What is owed is worked out here, never taken
    // from the browser.
    const plan = await planPayment(record, clean.paid);
    if (plan.refused) {
      return res.status(400).send(overpaymentMessage(clean.paid, plan.owed));
    }

    const invoice = getInvoiceId({ includeTimestamp: true });
    const targetPart = plan.parts.find((p) => p.id === String(record._id))?.amount || 0;
    const shared = {
      ...clean,
      id: invoice,
      createdAt: new Date(),
      issuerID: req.user.id,
      issuerName: req.user?.fullname,
      // The whole payment, and what the receipt showed at the time (kept so a reprint never
      // changes later). `paid` on each stored entry is only the part applied to that term.
      receiptTotal: clean.paid,
      outstanding: subtract(plan.owed, clean.paid),
      termFees: plan.current.fees,
      arrears: plan.earlierRemaining,
      paidBefore: plan.current.paid,
      paidThisTerm: sumAmounts([plan.current.paid, targetPart]),
      appliedTo: plan.parts.map((p) => ({ term: termLabel(p.row.term), amount: p.amount })),
    };

    // Each part is pushed with an atomic check that the term's payments still fit its fee, so
    // two simultaneous payments cannot together exceed it. If any part no longer fits, the
    // parts already written are taken back out (by this receipt's number) and nothing is kept.
    const written = [];
    for (const part of plan.parts) {
      const updated = await CurrentFee.findOneAndUpdate(
        {
          _id: part.id,
          $expr: { $lte: [{ $add: [{ $sum: "$payment.paid" }, part.amount] }, part.row.fees + 0.005] },
        },
        { $push: { payment: { ...shared, paid: part.amount } } },
        { new: true }
      );
      if (!updated) {
        await Promise.all(written.map((id) => CurrentFee.updateOne({ _id: id }, { $pull: { payment: { id: invoice } } })));
        return res
          .status(409)
          .send("Another payment was just recorded for this student. Reload the balance and try again.");
      }
      written.push(part.id);
    }
    const newPayment = { ...shared, paid: clean.paid };

    logger.info("payment recorded", {
      feeRecord: String(record._id),
      receipt: newPayment.id,
      paid: newPayment.paid,
      by: String(req.user.id),
    });

    res.status(200).json(newPayment);
  })
);

// Editing a fee record (which can rewrite its payments): administrators only
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    // The record must belong to the caller's school, and it cannot be moved to a
    // different student/term/level/session.
    const owned = await ownedCurrentFee(req, req.body.id);
    const changes = pickFields(req.body, ["payment", "fee", "active"]);

    if (owned && "payment" in changes) {
      const entries = changes.payment;
      const cleaned = Array.isArray(entries) && entries.length <= MAX_PAYMENTS_PER_RECORD
        ? entries.map((entry) => {
            const amount = parseMoney(entry?.paid, { allowZero: true });
            return amount === null ? null : { ...entry, paid: amount };
          })
        : null;
      if (!cleaned || cleaned.includes(null)) {
        return res.status(400).send("Every payment needs a valid amount (0 or more, at most 2 decimals).");
      }
      changes.payment = cleaned;

      // Edits may not push this term's payments above this term's fee (they can always lower
      // them). Money for earlier terms is recorded on those terms' own records.
      const limit = await termFeeFor(owned.level, owned.term);
      const paidAfter = sumAmounts(cleaned, "paid");
      if (toMinor(paidAfter) > toMinor(limit) && toMinor(paidAfter) > toMinor(sumAmounts(owned.payment, "paid"))) {
        return res
          .status(400)
          .send(`These payments add up to GHS ${paidAfter.toFixed(2)}, which is more than the GHS ${limit.toFixed(2)} fee for this term. Advance payments are not accepted.`);
      }
    }

    const modifiedCurrentFee = owned
      ? await CurrentFee.findByIdAndUpdate(owned._id, { $set: changes })
      : null;

    if (!modifiedCurrentFee) {
      return res
        .status(404)
        .send("Error updating current Fees info.Try again later");
    }

    if ("payment" in changes) {
      // Editing payments rewrites financial history, so leave a trail.
      logger.info("fee record payments edited", {
        feeRecord: String(owned._id),
        by: String(req.user.id),
        paidBefore: sumAmounts(owned.payment, "paid"),
        paidAfter: sumAmounts(changes.payment, "paid"),
      });
    }

    res.send(modifiedCurrentFee);
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const owned = await ownedCurrentFee(req, req.params.id);
    // Payments are financial records: a fee record that holds any is never deleted.
    if (owned && owned.payment?.length) {
      return res.status(409).json("This fee record has payments and cannot be deleted.");
    }
    if (owned) await CurrentFee.findByIdAndDelete(owned._id);

    res.sendStatus(201);
  })
);

module.exports = router;
