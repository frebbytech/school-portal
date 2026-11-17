const { EventEmitter } = require("events");
const handlers = require("./handlers");
const { logger } = require("../common/logger");

/**
 * Background jobs (sending report cards takes minutes: PDFs, SMS and mail providers).
 *
 * Two drivers behind one small interface:
 *  - broker:   REDIS_URL is set. Jobs go to Redis (BullMQ); a separate worker process
 *              (`npm run worker`) runs them, so the API stays free for requests. Redis is
 *              also what lets several API instances see each job's progress.
 *  - memory:   no REDIS_URL. Jobs run one at a time inside the API process: same behaviour,
 *              nothing extra to host, but a restart loses a job that is still running
 *              (see `recoverInterrupted`) and heavy jobs share the API's CPU.
 *
 * Whichever driver is used, the API process re-emits what happens on `events`:
 *   "progress"  payload from the handler's progress() calls
 *   "finished"  the handler's result (or a failure)
 * and the socket layer (realtime/socket.js) turns those into messages to the browser.
 */

const QUEUE_NAME = "report-publish";
const events = new EventEmitter();

let queue = null;

const failureResult = (jobId, message) => ({ publicationId: String(jobId), status: "failed", message, needsLookup: true });

const createMemoryQueue = () => {
  let chain = Promise.resolve();
  return {
    driver: "memory",
    async add(name, data) {
      chain = chain.then(async () => {
        try {
          const handler = handlers[name];
          if (!handler) throw new Error(`No handler for job "${name}"`);
          const result = await handler(data, { progress: (payload) => events.emit("progress", payload) });
          events.emit("finished", result);
        } catch (error) {
          logger.error("background job failed", { err: error, job: name });
          events.emit("finished", failureResult(data?.publicationId, "The job stopped because of a server error."));
        }
      });
    },
    // Resolves when everything queued so far has finished (used by tests and shutdown)
    drain: () => chain,
    async close() {
      await chain;
    },
  };
};

const redisConnection = (url) => {
  const IORedis = require("ioredis");
  // BullMQ requires maxRetriesPerRequest: null on its connections
  return new IORedis(url, { maxRetriesPerRequest: null });
};

const createBrokerQueue = (url) => {
  const { Queue, QueueEvents } = require("bullmq");
  const bull = new Queue(QUEUE_NAME, { connection: redisConnection(url) });
  const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redisConnection(url) });

  queueEvents.on("progress", ({ data }) => {
    if (data && typeof data === "object") events.emit("progress", data);
  });
  queueEvents.on("completed", ({ returnvalue }) => {
    if (returnvalue && typeof returnvalue === "object") events.emit("finished", returnvalue);
  });
  queueEvents.on("failed", ({ jobId, failedReason }) => {
    events.emit("finished", failureResult(jobId, failedReason || "The job stopped because of a server error."));
  });
  queueEvents.on("error", (error) => logger.error("job events connection problem", { err: error }));
  bull.on("error", (error) => logger.error("job queue connection problem", { err: error }));

  return {
    driver: "broker",
    async add(name, data, options = {}) {
      await bull.add(name, data, {
        jobId: options.jobId,
        // Never retried automatically: a retry would send the same messages again
        attempts: 1,
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600 },
      });
    },
    async close() {
      await queueEvents.close();
      await bull.close();
    },
  };
};

const getQueue = () => {
  if (!queue) {
    const url = (process.env.REDIS_URL || "").trim();
    queue = url ? createBrokerQueue(url) : createMemoryQueue();
    logger.info("background jobs", { driver: queue.driver });
  }
  return queue;
};

const enqueue = (name, data, options) => getQueue().add(name, data, options);

/**
 * The worker side of the broker driver. Run by `worker.js`, or inside the API when
 * RUN_WORKER_IN_API=true. With the memory driver the API already runs jobs, so this is a no-op.
 */
const startWorker = () => {
  const url = (process.env.REDIS_URL || "").trim();
  if (!url) return null;
  const { Worker } = require("bullmq");
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) throw new Error(`No handler for job "${job.name}"`);
      return handler(job.data, { progress: (payload) => job.updateProgress(payload) });
    },
    {
      connection: redisConnection(url),
      // One at a time: each job starts headless-browser PDF work
      concurrency: 1,
      // A job that stalls is failed, not run again (running again would resend messages)
      maxStalledCount: 0,
      lockDuration: 60000,
    }
  );
  worker.on("error", (error) => logger.error("worker problem", { err: error }));
  worker.on("failed", (job, error) => logger.error("job failed", { err: error, jobId: job?.id }));
  return worker;
};

const closeQueue = async () => {
  if (queue) await queue.close();
  queue = null;
};

// Tests start with a fresh queue and no listeners
const resetForTests = async () => {
  await closeQueue();
  events.removeAllListeners();
};

module.exports = { QUEUE_NAME, events, getQueue, enqueue, startWorker, closeQueue, resetForTests };
