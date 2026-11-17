require("dotenv").config();
const { assertEnv } = require("./config/env");
const { logger } = require("./common/logger");

// The background worker: runs jobs from the broker (Redis), e.g. sending report cards.
// Start it next to the API with `npm run worker`. It needs the same environment as the API
// (database, SMS, mail settings) plus REDIS_URL.
try {
  assertEnv();
} catch (error) {
  logger.error("worker startup aborted", { err: error });
  process.exit(1);
}

if (!(process.env.REDIS_URL || "").trim()) {
  logger.error("worker needs REDIS_URL; without it the API runs jobs itself and no worker is needed");
  process.exit(1);
}

const db = require("./db/DBConnection");
const { startWorker } = require("./jobs/queue");

db.asPromise()
  .then(() => {
    const worker = startWorker();
    logger.info("worker started");

    let stopping = false;
    const stop = async (signal) => {
      if (stopping) return;
      stopping = true;
      logger.info("worker stopping", { signal });
      const force = setTimeout(() => process.exit(1), 30000);
      force.unref();
      try {
        // Lets the job in hand finish before closing
        await worker.close();
        await db.close();
        process.exit(0);
      } catch (error) {
        logger.error("error while stopping the worker", { err: error });
        process.exit(1);
      }
    };
    process.on("SIGINT", () => stop("SIGINT"));
    process.on("SIGTERM", () => stop("SIGTERM"));
  })
  .catch((error) => {
    logger.error("worker database connection failed", { err: error });
    process.exit(1);
  });
