const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { events } = require("../jobs/queue");
const ReportPublication = require("../models/reportPublicationModel");
const { isAllowedOrigin } = require("../config/origins");
const { logger } = require("../common/logger");

/**
 * Live updates to the browser (Socket.IO).
 *
 * Only signed-in staff can connect: the access token is checked when the socket opens
 * (the app passes its current token and sends the new one when it reconnects after a
 * refresh). Each person joins a room of their own, and publishing progress and results go
 * to the person who started the publish, wherever they are in the app.
 *
 * Messages (the page also fetches the publication over HTTP, so a missed message is only a
 * delay, never lost information):
 *   publish:progress  { publicationId, levelId, scope, status, phase, done, total }
 *   publish:finished  { publicationId, levelId, scope, status, message, summary }
 */

const STAFF_ROLES = ["administrator", "teacher"];
const userRoom = (id) => `user:${id}`;

let io = null;
let detach = () => {};

const authenticate = (socket, next) => {
  const token = socket.handshake?.auth?.token;
  if (!token) return next(new Error("Unauthorized"));
  jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
    // "expired" tells the app to get a new access token before it tries again
    if (error) return next(new Error("Session has expired"));
    if (!user?.id || !STAFF_ROLES.includes(user?.role)) return next(new Error("Forbidden"));
    socket.data.user = { id: String(user.id), school: user.school ? String(user.school) : "" };
    next();
  });
};

const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(userRoom(userId)).emit(event, payload);
};

// What the browser needs; never the user or school ids
const publicPayload = ({ publicationId, levelId, scope, status, phase, done, total, message, summary }) => ({
  publicationId,
  levelId,
  scope,
  status,
  phase,
  done,
  total,
  message,
  summary,
});

// A job that crashed outside our own error handling reports only an id and a reason:
// close the record and find out whom to tell.
const resolveFailure = async (result) => {
  const publication = await ReportPublication.findOneAndUpdate(
    { _id: result.publicationId, status: { $in: ["queued", "running"] } },
    {
      status: "failed",
      phase: undefined,
      finishedAt: new Date(),
      message: `Publishing stopped: ${result.message}. Some messages may already have been sent, so check who received theirs before trying again.`,
    },
    { new: true }
  ).catch(() => null);
  const current = publication || (await ReportPublication.findById(result.publicationId).catch(() => null));
  if (!current) return null;
  return {
    publicationId: String(current._id),
    userId: String(current.requestedBy),
    levelId: String(current.level),
    scope: current.scope,
    status: current.status,
    message: current.message,
  };
};

const attach = (server) => {
  io = new Server(server, {
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
  });
  io.use(authenticate);
  io.on("connection", (socket) => {
    socket.join(userRoom(socket.data.user.id));
  });

  const onProgress = (payload) => emitToUser(payload?.userId, "publish:progress", publicPayload(payload || {}));
  const onFinished = async (result) => {
    try {
      const full = result?.needsLookup || !result?.userId ? await resolveFailure(result || {}) : result;
      if (full) emitToUser(full.userId, "publish:finished", publicPayload(full));
    } catch (error) {
      logger.error("could not send the publish result to the browser", { err: error });
    }
  };
  events.on("progress", onProgress);
  events.on("finished", onFinished);
  detach = () => {
    events.off("progress", onProgress);
    events.off("finished", onFinished);
  };

  return io;
};

const closeSockets = async () => {
  detach();
  detach = () => {};
  if (io) {
    await new Promise((resolve) => io.close(resolve));
    io = null;
  }
};

module.exports = { attach, closeSockets, emitToUser, authenticate, userRoom };
