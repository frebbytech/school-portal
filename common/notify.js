const { logger } = require("./logger");

/**
 * Best-effort notification of one user (in-app record + email) AFTER the main change
 * has been saved. A failure here (mail server down, user without an email) is logged
 * and swallowed: it used to turn a successful course/level assignment into a 500 and
 * leave the person unsure whether it had been saved.
 */
const notifyUser = async ({ Notification, User, sendMail }, { userId, notification, title, message }) => {
  try {
    if (!userId) return;
    await Notification.create({ ...notification, user: userId });
  } catch (error) {
    logger.warn("could not save notification", { err: error });
  }

  try {
    const user = userId ? await User.findById(userId).select("firstname lastname email") : null;
    if (!user?.email) return;
    await sendMail(
      { title, message: `Dear ${user.firstname} ${user.lastname}, ${message}` },
      user.email
    );
  } catch (error) {
    logger.warn("could not send notification email", { err: error });
  }
};

module.exports = { notifyUser };
