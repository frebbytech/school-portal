const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const { body, validationResult } = require("express-validator");

const { isValidObjectId } = require("mongoose");
const Note = require("../models/noteModel");
const { requireMember, getPrincipal, pickFields } = require("../middlewares/authorize");

// Notes are private: every query below is limited to the caller's own notes.
const NOTE_FIELDS = ["title", "content", "color", "position"];

router.use(requireMember);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const notes = await Note.find({
      user: getPrincipal(req).id,
    }).sort({ createdAt: -1 });

    res.json(notes);
  })
);

router.post(
  "/",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
    body("color").isHexColor().withMessage("Invalid color format"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty())
      return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const note = new Note({
        ...pickFields(req.body, NOTE_FIELDS),
        user: getPrincipal(req).id,
      });
      await note.save();
      res.status(201).json(note);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

// PUT - Update a note
router.put(
  "/:id",
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("content").trim().notEmpty().withMessage("Content is required"),
    body("color").isHexColor().withMessage("Invalid color format"),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const note = isValidObjectId(req.params.id)
        ? await Note.findOneAndUpdate(
            { _id: req.params.id, user: getPrincipal(req).id },
            {
              title: req.body.title,
              content: req.body.content,
              color: req.body.color,
            },
            { new: true, runValidators: true }
          )
        : null;

      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      res.json(note);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  })
);

// DELETE - Delete a note
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const note = isValidObjectId(req.params.id)
      ? await Note.findOneAndDelete({ _id: req.params.id, user: getPrincipal(req).id })
      : null;

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  })
);

module.exports = router;
