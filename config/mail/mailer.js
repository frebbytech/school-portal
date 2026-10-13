const { getTransport } = require('./transport');
const { logger } = require('../../common/logger');

const sendMail = async (body, emailList) => {
  try {
    const transportMail = getTransport();

    const mailOptions = {
      from: `FrebbyTech School Portal ${process.env.MAIL_CLIENT_USER}`,
      sender: process.env.MAIL_CLIENT_USER,
      to: emailList,
      subject: body?.title,
      text: 'FrebbyTech School Portal',
      html: `<!DOCTYPE html>
      <html lang="en">
      <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet">
      <style>

      html{
        font-family:'Inter',sans-serif !important;
        font-size:15px;
      } 
      </style>
  </head>
      <body style='font-family:"Inter",sans-serif;background-color:whitesmoke;padding:20px;color:#333;'>
     <h3 style="text-decoration:underline;font-weight:bold;">${body?.title}</h3>
      <div>${body?.message}</div>
      </body>
      </html>
      
      `,
    };

    await transportMail.sendMail(mailOptions);
    return true;
  } catch (error) {
    logger.error('email could not be sent', { err: error, subject: body?.title });
    // Callers historically ignore the result; it is returned so they can start
    // reporting failures accurately.
    return false;
  }
};

module.exports = sendMail;
