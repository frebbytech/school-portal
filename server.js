require("dotenv").config();
const { assertEnv } = require("./config/env");
const { logger } = require("./common/logger");

// Validate configuration BEFORE loading anything that needs it (the database
// module throws on a missing MONGO_URL in production).
try {
  assertEnv();
} catch (error) {
  logger.error("startup aborted", { err: error });
  process.exit(1);
}

const app = require("./app");
const db = require("./db/DBConnection");
const { attach: attachSockets, closeSockets } = require("./realtime/socket");
const { startWorker, closeQueue } = require("./jobs/queue");
const { recoverInterrupted } = require("./jobs/recovery");

// Server port
const port = process.env.PORT || 8002;

const SHUTDOWN_TIMEOUT_MS = 10000;

// Database connection and server startup
db.asPromise()
  .then(() => {
    const server = app.listen(port, () => {
      logger.info("server started", { port });
    });

    // Live updates (publishing progress and results) over WebSocket
    attachSockets(server);

    // Without REDIS_URL the API runs background jobs itself; close any left over from a restart.
    recoverInterrupted().catch((error) => logger.error("could not close interrupted jobs", { err: error }));

    // With REDIS_URL the jobs normally run in the separate worker (`npm run worker`);
    // RUN_WORKER_IN_API=true runs one here too, for a single-server setup.
    const inlineWorker = process.env.RUN_WORKER_IN_API === "true" ? startWorker() : null;

    // Graceful shutdown: stop accepting requests, let in-flight ones finish,
    // then close the database. A timer forces exit if something hangs.
    let shuttingDown = false;
    const shutdown = (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info("shutting down", { signal });

      const force = setTimeout(() => {
        logger.error("forced shutdown after timeout");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      force.unref();

      server.close(async () => {
        try {
          await closeSockets();
          if (inlineWorker) await inlineWorker.close();
          await closeQueue();
          await db.close();
          logger.info("shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("error while closing the database", { err: error });
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  })
  .catch((error) => {
    logger.error("database connection failed", { err: error });
    process.exit(1);
  });

// An uncaught exception leaves the process in an unknown state: log and exit so the
// host (e.g. Render) restarts it.
process.on("uncaughtException", (err) => {
  logger.error("uncaught exception", { err });
  process.exit(1);
});

// A rejected promise nobody awaited (for example a failed fire-and-forget email)
// must not take the whole API down for every school. Log it with full detail.
process.on("unhandledRejection", (reason) => {
  logger.error("unhandled promise rejection", {
    err: reason instanceof Error ? reason : new Error(String(reason)),
  });
});
