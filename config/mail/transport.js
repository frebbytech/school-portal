const nodemailer = require("nodemailer");
const { logger } = require("../../common/logger");

/**
 * One shared SMTP transport (previously every email created its own transport and
 * opened an extra verification connection).
 *
 * TLS certificate verification is ON. If a mail provider's certificate chain
 * genuinely cannot be verified, set MAIL_TLS_REJECT_UNAUTHORIZED=false as a
 * temporary, logged exception rather than weakening it in code.
 */

let transport;
let warned = false;

const rejectUnauthorized = () => process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== "false";

function getTransport() {
  if (!transport) {
    if (!rejectUnauthorized() && !warned) {
      warned = true;
      logger.warn("SMTP TLS certificate verification is DISABLED (MAIL_TLS_REJECT_UNAUTHORIZED=false)");
    }

    transport = nodemailer.createTransport({
      service: process.env.MAIL_CLIENT_SERVICE,
      auth: {
        user: process.env.MAIL_CLIENT_USER,
        pass: process.env.MAIL_CLIENT_PASS,
      },
      tls: { rejectUnauthorized: rejectUnauthorized() },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });
  }
  return transport;
}

// For tests
const resetTransport = () => {
  transport = undefined;
  warned = false;
};

module.exports = { getTransport, resetTransport };
