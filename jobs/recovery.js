const ReportPublication = require("../models/reportPublicationModel");
const { logger } = require("../common/logger");

// With the in-process driver a restart loses whatever was running or waiting. Left alone
// those publications would show "sending" forever, so they are closed as failed. (With a
// broker the job survives in Redis and the worker picks it up again, so nothing is done.)
const recoverInterrupted = async () => {
  if ((process.env.REDIS_URL || "").trim()) return 0;
  const { modifiedCount } = await ReportPublication.updateMany(
    { status: { $in: ["queued", "running"] } },
    {
      status: "failed",
      phase: undefined,
      finishedAt: new Date(),
      message:
        "The server restarted before publishing finished. Some messages may already have been sent, so check who received theirs before trying again.",
    }
  );
  if (modifiedCount) logger.warn("closed interrupted publications", { count: modifiedCount });
  return modifiedCount;
};

module.exports = { recoverInterrupted };
