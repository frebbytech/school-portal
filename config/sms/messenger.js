const axios = require("axios");
const { logger } = require("../../common/logger");
const { getInitials, SUBJECT_OPTIONS } = require("../helper");

// The text of one SMS: the title, then the message on the next line. A message with no
// title has no "undefined" in front of it, and there are no stray indentation spaces.
const smsText = (body) =>
  [body?.title, body?.message]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join("\n");

const sendSMS = async (body, telephoneNumber) => {
  try {
    // SEND SMS
    const message = smsText(body);

    const data = {
      sender: "FrebbyTech",
      message,
      recipients: telephoneNumber,
    };

    const res = await axios({
      method: "POST",
      url: process.env.SMS_URL,
      headers: {
        "api-key": process.env.SMS_API_KEY,
      },
      data: data,
    });
    //console.log(res.data);
    return res.data;
  } catch (error) {
    logger.error("SMS could not be sent", { err: error });
    // throw new Error("Error sending message.Try again later");
  }
};

const sendReportSMS = async (generatedResult, school) => {
  const sortedScores = generatedResult?.scores.sort(
    (a, b) =>
      SUBJECT_OPTIONS.indexOf(a.subject) - SUBJECT_OPTIONS.indexOf(b.subject)
  );
  const selectedScores = sortedScores.map(({ subject, totalScore }) => {
    return `${subject}: ${totalScore}`;
  });

  const scores = selectedScores.join(", ");

  const message = `${school?.name} -  
  Dear ${generatedResult?.fullName} (${generatedResult?.indexnumber}), your ${generatedResult.level}, ${generatedResult.term} exams results are: ${scores}. Total: ${generatedResult?.overallScore}. Best regards!`;

  try {
    const data = {
      sender: getInitials(school?.name) || school?.name?.split(" ")[0],
      message,
      recipients: [generatedResult?.phonenumber],
    };

    const res = await axios({
      method: "POST",
      url: process.env.SMS_URL,
      headers: {
        "api-key": process.env.SMS_API_KEY,
      },
      data: data,
    });
    //console.log(res.data);
    return res.data;
  } catch (error) {

    logger.error("SMS could not be sent", { err: error });
    // throw new Error("Error sending message.Try again later");
  }
};

module.exports = { sendSMS, sendReportSMS, smsText };
