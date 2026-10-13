const { getTransport } = require("./transport");
const { logger } = require("../../common/logger");
const fs = require("fs").promises;
const path = require("path");

const sendReportMail = async ({ school, email, fullName, id }) => {
  try {
    const transportMail = getTransport();

    const mailOptions = {
      from: `${school?.name} ${process.env.MAIL_CLIENT_USER}`,
      sender: process.env.MAIL_CLIENT_USER,
      to: [email],
      subject: "Your Results Are Now Available",
      text: "Terminal Report",
      html: `<div>
      <h5>Dear ${fullName},</h5>
<p>We hope this message finds you well. We are excited to inform you that your results for the recent exams have been released and are now available for viewing. </p>
<p>Congratulations to all of you for your hard work and dedication during this semester. We wish you continued success in your academic journey.</p>
<p>If you have any questions or encounter any issues while accessing your results, please don't hesitate to contact our support team at [${
        school?.email || ""
      }] or [${school?.phonenumber || ""}]. We are here to assist you.</p> 
      
      </div>`,
      attachments: [
        {
          filename: `${id}.pdf`,
          path: `./reports/${id}.pdf`,
        },
      ],
    };

    const mailResult = await transportMail.sendMail(mailOptions);
    const filePath = path.join(process.cwd(), "reports", `${id}.pdf`);

    // Delete the file
    await fs.unlink(filePath);

    return mailResult;
  } catch (error) {
    // `mailResult` stays undefined, which callers treat as "not sent"
    logger.error("report email could not be sent", { err: error });
  }
};

module.exports = {
  sendReportMail,
};
