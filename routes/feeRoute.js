const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const Fee = require("../models/feeModel");
const Level = require("../models/levelModel");
const CurrentFee = require("../models/currentFeeModel");
const _ = require("lodash");
const {
  Types: { ObjectId },
} = require("mongoose");
const { currencyConverter } = require("../config/currencyConverter");
const {
  requireStaff,
  requireRoleEnforced,
  pickFields,
} = require("../middlewares/authorize");
const { levelInSchool } = require("../middlewares/tenant");
const { isValidObjectId } = require("mongoose");

// Fee structures are staff-only; changing them is administrator-only. The student
// portal does not use this router.
router.use(requireStaff);
const adminOnly = requireRoleEnforced("administrator");

//@GET All school fees
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const fees = await Fee.find({
      school: req.user.school,
    }).populate({
      path: "level",
      select: "level"
    });
    if (_.isEmpty(fees)) return res.status(200).json([]);

    const modifiedFees = fees.map(({ _id, level, amount }) => {
      return {
        _id,
        level: level.level,
        fees: currencyConverter(_.sumBy(amount, "amount")),
        amount,
      };
    });

    res.status(200).json(modifiedFees);
  })
);



//@GET All school fees by session
router.get(
  "/all",
  asyncHandler(async (req, res) => {
    const { session, term } = req.query;

    const fees = await Fee.find({
      school: req.user.school,
      session,
      term,
    }).populate({
      path: "level",
      select: ["level", 'levelName', 'students']
    })

    //Check if null
    if (_.isEmpty(fees)) return res.status(200).json([]);

    const modifiedFees = fees.map(({ _id, level, amount }) => {
      const total = _.sumBy(amount, "amount");

      return {
        _id,
        noOfStudents: level?.noOfStudents,
        amount,
        levelId: level._id,
        level: level?.levelName,
        fee: total,
        fees: total,
        totalFees: Number(total * level?.noOfStudents),
      };
    });

    res.status(200).json(modifiedFees);
  })
);

//@GET  school fees by current level
router.post(
  "/current-level",
  asyncHandler(async (req, res) => {
    const { sessionId, termId, level } = req.body;

    const fees = await Fee.findOne({
      school: req.user.school,
      session: new ObjectId(sessionId),
      term: new ObjectId(termId),
      level: new ObjectId(level),
    }).populate("level");

    //Check if null
    if (_.isEmpty(fees)) return res.status(200).json({});

    const modifiedFees = {
      id: fees?._id,
      level: fees?.level.type,
      fees: _.sumBy(fees?.amount, "amount"),
      amount: fees?.amount,
    };

    res.status(200).json(modifiedFees);
  })
);



//@GET School Fees by id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const fee = isValidObjectId(req.params.id)
      ? await Fee.findOne({ _id: req.params.id, school: req.user.school }).populate("level")
      : null;
    if (_.isEmpty(fee)) return res.status(200).json([]);

    const modifiedFee = {
      _id: fee._id,
      level: fee.level?.type,
      amount: fee.amount,
    };

    res.status(200).json(modifiedFee);
  })
);

//Add new School Fees
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { session, term, level } = req.body;

    // The level must belong to the caller's school.
    if (!(await levelInSchool(req, level))) {
      return res.status(404).send("Error creating new Fee.Try again later");
    }

    const exists = await Fee.findOne({
      school: req.user.school,
      session,
      term,
      level
    });

    if (!_.isEmpty(exists)) {
      return res.status(400).send("Fees for this level already exists");
    }

    const fee = await Fee.create({
      ...pickFields(req.body, ["session", "term", "level", "amount", "active"]),
      school: req.user.school,
      createdBy: req.user.id
    });

    if (_.isEmpty(fee)) {
      return res.status(404).send("Error creating new Fee.Try again later");
    }

    const currentLevel = await Level.findOneAndUpdate(
      { _id: level, school: req.user.school },
      {
        $set: {
          fee: fee?._id,
        },
      },
      {
        new: true,
      }
    ).select('students');


    if (!_.isEmpty(currentLevel.students)) {
      const modifiedStudents = currentLevel?.students.map(async (student) => {
        return await CurrentFee.findOneAndUpdate({
          session,
          term,
          level,
          student
        }, {
          $set: {
            fee: fee?._id
          }
        }, {
          new: true,
          upsert: true

        })
      })
      await Promise.all(modifiedStudents)

    }
    res.status(201).json("New Fee created");
  })
);

//@PUT Update Existing School Fees
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const modifiedFee = isValidObjectId(req.body._id)
      ? await Fee.findOneAndUpdate(
          { _id: req.body._id, school: req.user.school },
          { amount: req.body.amount }
        )
      : null;

    if (_.isEmpty(modifiedFee)) {
      return res.status(404).send("Error updating Fees info.Try again later");
    }

    res.status(201).json("Fee details has been updated successfully!!!");
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    if (isValidObjectId(id)) {
      await Fee.findOneAndDelete({ _id: id, school: req.user.school });
    }

    res.status(201).json("Fee has been removed successfully");
  })
);


module.exports = router;
