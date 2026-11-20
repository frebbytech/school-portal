const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const _ = require("lodash");
const Student = require("../models/studentModel");
const User = require("../models/userModel");
const Parent = require("../models/parentModel");
const Message = require("../models/messageModel");
const sendMail = require("../config/mail/mailer");
const { sendSMS } = require("../config/sms/messenger");
const { messageLimiter } = require("../middlewares/rateLimiters");
const {
  requireStaff,
  requireRoleEnforced,
  getPrincipal,
} = require("../middlewares/authorize");
const { isValidObjectId } = require("mongoose");
const { validate, text, oneOfValues, objectId, phone, email } = require("../common/validation");
const { withPagination } = require("../common/pagination");
const { deliverMessage, summarize, clean, plainText, TYPES } = require("../common/messageDelivery");

const MESSAGE_TYPES = ["sms", "email", "both"];
const MESSAGE_GROUPS = ["students", "teachers", "parents"];

// Messaging is a staff feature (students never call these routes); sending to a
// whole group is administrator-only.
router.use(requireStaff);

//POST message

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = { school: req.user.school };
    const messages = await withPagination(
      req,
      res,
      Message.find(filter).sort({ createdAt: -1, _id: -1 }),
      () => Message.countDocuments(filter)
    );

    // //console.log(messages);

    res.status(200).json(messages);
  })
);
//POST message

// An SMS carries the readable text of the editor's HTML (an email keeps the HTML)
const send = {
  sms: (body, numbers) => sendSMS({ ...body, message: plainText(body?.message) }, numbers),
  mail: sendMail,
};
const NOTHING_WRITTEN = "Write a message before sending.";

// Sends a stored message and answers truthfully (see common/messageDelivery.js). A message
// that could not be fully delivered stays inactive so it can be sent again.
const sendAndAnswer = async (res, message, { individual }) => {
  const result = await deliverMessage({
    type: message.type,
    body: message.body,
    numbers: message.recipient?.phonenumber,
    emails: message.recipient?.email,
    send,
  });
  if (result.status === "sent") {
    await Message.findByIdAndUpdate(message._id, { $set: { active: true } });
  }
  const { http, message: text } = summarize(result, { type: message.type, individual });
  return res.status(http).json(text);
};

router.post(
  "/quick",
  messageLimiter,
  validate(
    oneOfValues("body", "type", MESSAGE_TYPES),
    text("body", "title", { optional: true, min: 0, max: 200 }),
    text("body", "message", { max: 1000 }),
    phone("body", "phonenumber", { optional: true }),
    email("body", "email", { optional: true })
  ),
  asyncHandler(async (req, res) => {
    const newMessage = req.body;
    if (!plainText(newMessage.message)) return res.status(400).json(NOTHING_WRITTEN);
    const numbers = newMessage?.phonenumber ? [newMessage.phonenumber] : [];
    const emails = newMessage?.email ? [newMessage.email] : [];

    // nothing to send to: say so, and do not keep a message nobody received
    const wanted = TYPES[newMessage.type] || [];
    if (!(wanted.includes("sms") && numbers.length) && !(wanted.includes("email") && emails.length)) {
      const { message: reason } = summarize({ status: "no-recipients" }, { type: newMessage.type, individual: true });
      return res.status(422).json(reason);
    }

    const message = await Message.create({
      school: req.user.school,
      createdBy: req.user.id,
      type: newMessage?.type,
      recipient: { type: "Individual", phonenumber: numbers, email: emails },
      body: { title: newMessage?.title, message: newMessage?.message },
    });

    return sendAndAnswer(res, message, { individual: true });
  })
);

router.post(
  "/resend",
  messageLimiter,
  validate(objectId("body", "id")),
  asyncHandler(async (req, res) => {
    const { id } = req.body;

    // Resend what was stored for this school, not whatever the caller posts, so
    // this route cannot be used to send arbitrary content (finding C-6e).
    const stored = isValidObjectId(id)
      ? await Message.findOne({ _id: id, school: getPrincipal(req).schoolId })
      : null;
    if (!stored) {
      return res.status(404).json("Couldnt send message.Try again later!!!");
    }

    return sendAndAnswer(res, stored, { individual: stored.recipient?.type === "Individual" });
  })
);

// People of a group in the caller's own school (finding C-6d). Deactivated people are not
// messaged. Teachers are staff accounts (users), not the unused Teacher collection.
const contactsOf = (school, group) => {
  switch (group) {
    case "teachers":
      return User.find({ school, role: "teacher", active: { $ne: false } }).select("email phonenumber");
    case "parents":
      return Parent.find({ school, active: { $ne: false } }).select("email phonenumber");
    default:
      return Student.find({ school, active: { $ne: false } }).select("email phonenumber");
  }
};

router.post(
  "/bulk",
  requireRoleEnforced("administrator"),
  messageLimiter,
  validate(
    oneOfValues("body", "type", MESSAGE_TYPES),
    oneOfValues("body", "group", MESSAGE_GROUPS, { optional: true }),
    text("body", "title", { optional: true, min: 0, max: 200 }),
    text("body", "message", { max: 1000 })
  ),
  asyncHandler(async (req, res) => {
    const newMessage = req.body;
    if (!plainText(newMessage.message)) return res.status(400).json(NOTHING_WRITTEN);
    const group = newMessage.group || "students";
    const contacts = await contactsOf(req.user.school, group);

    const wanted = TYPES[newMessage.type] || [];
    const numbers = wanted.includes("sms") ? clean(contacts.map((c) => c.phonenumber)) : [];
    const emails = wanted.includes("email") ? clean(contacts.map((c) => c.email)) : [];

    // nobody to send to: nothing is stored or sent
    if (numbers.length === 0 && emails.length === 0) {
      const { message: reason } = summarize({ status: "no-recipients" }, { type: newMessage.type });
      return res.status(422).json(reason);
    }

    const message = await Message.create({
      school: req.user.school,
      createdBy: req.user.id,
      type: newMessage.type,
      recipient: { type: group, phonenumber: numbers, email: emails },
      body: { title: newMessage?.title, message: newMessage?.message },
    });

    return sendAndAnswer(res, message, { individual: false });
  })
);
//DELETE message

router.delete(
  "/:id",
  requireRoleEnforced("administrator"),
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const message = isValidObjectId(id)
      ? await Message.findOneAndDelete({ _id: id, school: req.user.school })
      : null;

    if (_.isEmpty(message)) {
      return res.status(404).json("Error removing message.Try again later...");
    }

    res.status(200).json("Message deleted successfully!!!");
  })
);

module.exports = router;
