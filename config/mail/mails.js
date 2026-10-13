const { getTransport } = require("./transport");
const { logger } = require("../../common/logger");

const sendVerificationEmail = async (email_address, code) => {
  try {
    const transportMail = getTransport();

    const mailOptions = {
      from: `FrebbyTech School Portal ${process.env.MAIL_CLIENT_USER}`,
      sender: process.env.MAIL_CLIENT_USER,
      to: [email_address],
      subject: "Password Reset Code",
      text: `Your verification code is: ${code}`,
    };

    const mailResult = await transportMail.sendMail(mailOptions);

    return mailResult;
  } catch (error) {
    logger.error("verification email could not be sent", { err: error });
  }
};

module.exports = { sendVerificationEmail };
