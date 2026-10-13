const router = require("express").Router();
const asyncHandler = require("express-async-handler");
const _ = require("lodash");
const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const Parent = require("../models/parentModel");
const Message = require("../models/messageModel");
const sendMail = require("../config/mail/mailer");
const { sendSMS } = require("../config/sms/messenger");
const { messageLimiter } = require("../middlewares/rateLimiters");

//POST message

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const messages = await Message.find({
      school: req.user.school,
    }).sort({ createdAt: -1 });

    // //console.log(messages);

    res.status(200).json(messages);
  })
);
//POST message

router.post(
  "/quick",
  messageLimiter,
  asyncHandler(async (req, res) => {
    const newMessage = req.body;
    //console.log(newMessage);
    const message = await Message.create({
      school: req.user.school,
      type: newMessage?.type,
      recipient: {
        type: "Individual",
        phonenumber:
          newMessage?.phonenumber === undefined
            ? []
            : [newMessage?.phonenumber],
        email: newMessage?.email === undefined ? [] : [newMessage?.email],
      },
      body: {
        title: newMessage?.title,
        message: newMessage?.message,
      },
    });

    if (_.isEmpty(message)) {
      return res
        .status(404)
        .json("Couldnt send message.Please try again later...");
    }

    try {
      // ONLY SMS
      // if (process.env.NODE_ENV === 'production') {
      if (message.type === "sms") {
        await sendSMS(message?.body, message?.recipient?.phonenumber);
      }
      //ONLY EMAIL
      if (message.type === "email") {
        await sendMail(message?.body, message?.recipient?.email);
      }
      //BOTH EMAIL AND SMS
      if (message.type === "both") {
        await sendMail(message?.body, message?.recipient?.email);
        await sendSMS(message?.body, message?.recipient?.phonenumber);
      }
      // }

      await Message.findByIdAndUpdate(message?._id, {
        $set: {
          active: true,
        },
      });
      return res.status(200).json("Message delivered successfully!!!");
    } catch (error) {
      return res.status(404).json("Couldnt send message.Try again later!!!");
    }
  })
);

router.post(
  "/resend",
  messageLimiter,
  asyncHandler(async (req, res) => {
    const { id, type, body } = req.body;

    const recipient = req?.body?.recipient;

    try {
      if (type === "sms") {
        await sendSMS(body, recipient?.phonenumber);
      }
      if (type === "email") {
        await sendMail(body, recipient?.email);
      }
      if (type === "both") {
        await sendSMS(body, recipient?.phonenumber);
        await sendMail(body, recipient?.email);
      }

      await Message.findByIdAndUpdate(id, {
        $set: {
          active: true,
        },
      });

      return res.status(200).json("Message delivered successfully!!!");
    } catch (error) {
      return res.status(404).json("Couldnt send message.Try again later!!!");
    }
  })
);

//POST message

router.post(
  "/bulk",
  messageLimiter,
  asyncHandler(async (req, res) => {
    const newMessage = req.body;
    let emailAddresses = [];
    let phoneNumbers = [];
    let groups = [];

    switch (newMessage.group) {
      case "students":
        groups = await Student.find({}).select("email phonenumber");
        break;

      case "teachers":
        groups = await Teacher.find({}).select("email phonenumber");
        break;

      case "parents":
        groups = await Parent.find({}).select("email phonenumber");
        break;

      default:
        groups = await Student.find({}).select("email phonenumber");
    }

    ///Check message type
    if (newMessage.type === "sms") {
      phoneNumbers = groups.map(({ phonenumber }) => phonenumber);
    }
    if (newMessage.type === "email") {
      emailAddresses = groups.map(({ email }) => email);
    }
    if (newMessage.type === "both") {
      groups.map(({ phonenumber, email }) => {
        phoneNumbers.push(phonenumber);
        emailAddresses.push(email);
      });
    }

    //Remove empty emails and phone numbers and select only uniq values
    const emails = _.uniqWith(_.compact(emailAddresses), _.isEqual);
    const numbers = _.uniqWith(_.compact(phoneNumbers), _.isEqual);

    // emails
    // numbers

    const message = await Message.create({
      school: req.user.school,
      type: newMessage?.type,
      recipient: {
        type: newMessage.group,
        phonenumber: numbers,
        email: emails,
      },
      body: {
        title: newMessage?.title,
        message: newMessage?.message,
      },
    });

    if (_.isEmpty(message)) {
      return res
        .status(404)
        .json("Couldn't deliver message.Please try again later...");
    }

    try {
      // ONLY SMS
      // if (process.env.NODE_ENV === 'production') {
      if (message.type === "sms") {
        await sendSMS(message?.body, numbers);
      }
      //ONLY EMAIL
      if (message.type === "email") {
        await sendMail(message?.body, emails);
      }
      //BOTH EMAIL AND SMS
      if (message.type === "both") {
        await sendSMS(message?.body, numbers);
        await sendMail(message?.body, emails);
      }
      // }

      await Message.findByIdAndUpdate(message?._id, {
        $set: {
          active: true,
        },
      });
      res.status(200).json("Message delivered successfully!!!");
    } catch (error) {
      return res.status(404).json("Couldnt send message.Try again later!!!");
    }
  })
);
//DELETE message

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;

    const message = await Message.findByIdAndDelete(id, {
      new: true,
    });

    if (_.isEmpty(message)) {
      return res.status(404).json("Error removing message.Try again later...");
    }

    res.status(200).json("Message deleted successfully!!!");
  })
);

module.exports = router;
