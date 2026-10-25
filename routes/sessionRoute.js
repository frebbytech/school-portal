const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const { isValidObjectId } = require("mongoose");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
  pickFields,
} = require("../middlewares/authorize");

const adminOnly = requireRoleEnforced("administrator");

// Fields an administrator may set; `school` and `createdBy` always come from the token.
const SESSION_FIELDS = ["from", "to", "academicYear", "name", "active"];

//@GET All school sessions
router.get(
  "/",
  requireStaff,
  asyncHandler(async (req, res) => {
    const sessions = await Session.find({ school: getPrincipal(req).schoolId });
    res.status(200).json(sessions);
  })
);

//@GET School Session by id
router.get(
  "/:id",
  requireStaff,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const session = isValidObjectId(id)
      ? await Session.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;
    res.status(200).json(session);
  })
);

//Add new School Session
router.post(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const principal = getPrincipal(req);
    const session = await Session.create({
      ...pickFields(req.body, SESSION_FIELDS),
      school: principal.schoolId,
      createdBy: principal.id,
    });

    if (!session) {
      return res.status(404).send("Error creating new session.Try again later");
    }
    res.send(session);
  })
);

//@PUT Update Existing School Session
router.put(
  "/",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.body || {};
    if (!isValidObjectId(id)) {
      return res.status(404).send("Error updating session info.Try again later");
    }

    const modifiedSession = await Session.findOneAndUpdate(
      { _id: id, school: getPrincipal(req).schoolId },
      { $set: pickFields(req.body, SESSION_FIELDS) }
    );

    if (!modifiedSession) {
      return res.status(404).send("Error updating session info.Try again later");
    }

    res.send(modifiedSession);
  })
);

router.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { schoolId } = getPrincipal(req);
    if (!isValidObjectId(id)) return res.sendStatus(204);

    // A session that still has terms would leave them orphaned (term lifecycle is
    // reworked in Stage 6); refuse instead of silently breaking them.
    const inUse = await Term.exists({ session: id, school: schoolId });
    if (inUse) {
      return res
        .status(409)
        .json("This session still has terms. Remove its terms first.");
    }

    await Session.findOneAndDelete({ _id: id, school: schoolId });
    res.sendStatus(204);
  })
);

module.exports = router;
