const http = require("http");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { io: connect } = require("socket.io-client");

const { attach, closeSockets } = require("../realtime/socket");
const { events } = require("../jobs/queue");
const ReportPublication = require("../models/reportPublicationModel");
const { createSchool, createUser, staffToken } = require("./helpers");

const oid = () => new mongoose.Types.ObjectId();
const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const connectError = (socket) => new Promise((resolve) => socket.once("connect_error", resolve));

describe("live updates (socket)", () => {
  let server, url, school, teacher, other, clients;

  const open = (token) => {
    const socket = connect(url, { auth: { token }, transports: ["websocket"], reconnection: false, forceNew: true });
    clients.push(socket);
    return socket;
  };

  beforeAll(async () => {
    school = await createSchool();
    teacher = await createUser(school, "teacher");
    other = await createUser(school, "teacher");
    server = http.createServer();
    attach(server);
    await new Promise((resolve) => server.listen(0, resolve));
    url = `http://localhost:${server.address().port}`;
  });

  afterAll(async () => {
    await closeSockets();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(() => {
    clients = [];
  });
  afterEach(() => clients.forEach((c) => c.close()));

  it("refuses a connection without a token", async () => {
    const error = await connectError(open(undefined));
    expect(error.message).toBe("Unauthorized");
  });

  it("refuses a token that is not valid", async () => {
    const error = await connectError(open("not-a-token"));
    expect(error.message).toBe("Session has expired");
  });

  it("refuses students", async () => {
    const token = jwt.sign({ id: String(oid()), role: "student", school: String(school._id) }, process.env.JWT_SECRET);
    const error = await connectError(open(token));
    expect(error.message).toBe("Forbidden");
  });

  it("tells the person who started a publish how it went, and nobody else", async () => {
    const mine = open(staffToken(teacher));
    const theirs = open(staffToken(other));
    await Promise.all([once(mine, "connect"), once(theirs, "connect")]);

    const received = jest.fn();
    theirs.on("publish:finished", received);
    const finished = once(mine, "publish:finished");

    events.emit("finished", {
      publicationId: "p1", userId: String(teacher._id), schoolId: String(school._id), levelId: "l1",
      scope: "class", status: "completed", message: "Report cards for 3 students. SMS: 3 sent.",
      summary: { sms: { sent: 3, failed: 0, skipped: 0 } },
    });

    const payload = await finished;
    expect(payload).toMatchObject({ publicationId: "p1", levelId: "l1", status: "completed" });
    // The browser never receives user or school ids
    expect(payload.userId).toBeUndefined();
    expect(payload.schoolId).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(received).not.toHaveBeenCalled();
  });

  it("passes progress along", async () => {
    const mine = open(staffToken(teacher));
    await once(mine, "connect");
    const progress = once(mine, "publish:progress");
    events.emit("progress", { publicationId: "p2", userId: String(teacher._id), levelId: "l1", scope: "class", status: "running", phase: "sending", done: 4, total: 10 });
    expect(await progress).toMatchObject({ publicationId: "p2", phase: "sending", done: 4, total: 10 });
  });

  it("closes a job that crashed and still tells the person", async () => {
    const publication = await ReportPublication.create({
      school: school._id, term: oid(), level: oid(), scope: "class", type: "sms", requestedBy: teacher._id, status: "running",
    });
    const mine = open(staffToken(teacher));
    await once(mine, "connect");
    const finished = once(mine, "publish:finished");
    events.emit("finished", { publicationId: String(publication._id), status: "failed", message: "job stalled", needsLookup: true });
    const payload = await finished;
    expect(payload.status).toBe("failed");
    expect(payload.message).toMatch(/Some messages may already have been sent/);
    expect((await ReportPublication.findById(publication._id)).status).toBe("failed");
  });
});
