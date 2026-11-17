const request = require("supertest");
const mongoose = require("mongoose");

jest.mock("../config/sms/messenger", () => ({
  sendSMS: jest.fn(),
  sendReportSMS: jest.fn(),
}));
jest.mock("../config/mail/mail2", () => ({ sendReportMail: jest.fn() }));
jest.mock("../config/generateReportTemplate", () => jest.fn().mockResolvedValue("<html></html>"));
jest.mock("../config/generateReport", () => jest.fn().mockResolvedValue("file.pdf"));

const { sendReportSMS } = require("../config/sms/messenger");
const app = require("../app");
const { getQueue, events, closeQueue } = require("../jobs/queue");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Subject = require("../models/subjectModel");
const Examination = require("../models/examinationModel");
const ReportPublication = require("../models/reportPublicationModel");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });
const uniq = (p) => `${p}${oid().toString().slice(-10)}`;

// Publishing is queued: the request answers 202 and the work runs in the background.
// With no REDIS_URL (as here) the queue runs jobs inside this process; drain() waits for them.
describe("publishing report cards (queued)", () => {
  let tok, admin, school, session, term, level, emptyLevel, exam, finished;

  beforeAll(async () => {
    school = await createSchool();
    admin = await createUser(school, "administrator");
    tok = staffToken(admin);
    session = await make(Session, { school: school._id });
    term = await make(Term, { school: school._id, session: session._id, active: true, status: "current" });
    const maths = await make(Subject, { school: school._id, name: "Maths", subject: "Maths" });
    // One student with a phone number and no email
    const student = await make(Student, {
      indexnumber: uniq("p"), school: school._id, firstname: "Ama", surname: "T", gender: "female", phonenumber: "0240000001",
    });
    level = await make(Level, { school: school._id, session: session._id, term: term._id, subjects: [maths._id], students: [student._id] });
    emptyLevel = await make(Level, { school: school._id, session: session._id, term: term._id, subjects: [maths._id], students: [] });
    exam = await make(Examination, {
      session: session._id, term: term._id, level: level._id, student: student._id, school: school._id, createdBy: admin._id,
      scores: [{ _id: maths._id, subject: "Maths", classScore: 20, examsScore: 40, totalScore: 60 }], overallScore: 60,
    });
    events.on("finished", (result) => finished.push(result));
  });

  afterAll(async () => {
    await closeQueue();
  });

  beforeEach(async () => {
    sendReportSMS.mockReset();
    finished = [];
    await ReportPublication.deleteMany({ school: school._id });
  });

  const body = (lvl, extra = {}) => ({ sessionId: String(session._id), termId: String(term._id), levelId: String(lvl._id), type: "sms", ...extra });
  const publish = (data) => request(app).post(`${base}/examinations/publish`).set("Authorization", `Bearer ${tok}`).send(data);
  const settle = async (res) => {
    await getQueue().drain();
    return ReportPublication.findById(res.body.publicationId);
  };

  it("refuses a publish type it does not know", async () => {
    const res = await publish(body(level, { type: "fax" }));
    expect(res.status).toBe(400);
    expect(await ReportPublication.countDocuments({ school: school._id })).toBe(0);
  });

  it("says there is nothing to publish when no results exist", async () => {
    const res = await publish(body(emptyLevel));
    expect(res.status).toBe(404);
    expect(res.body).toMatch(/nothing to publish/);
  });

  it("answers at once with 202 and finishes in the background", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    const res = await publish(body(level));
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("queued");

    const done = await settle(res);
    expect(done.status).toBe("completed");
    expect(done.summary.sms).toEqual({ sent: 1, failed: 0, skipped: 0 });
    expect(done.message).toMatch(/SMS: 1 sent/);
    expect(String(done.requestedBy)).toBe(String(admin._id));
    expect(sendReportSMS).toHaveBeenCalledTimes(1);
  });

  it("announces the result to the person who started it", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    const res = await publish(body(level));
    await getQueue().drain();
    const result = finished.find((r) => r.publicationId === res.body.publicationId);
    expect(result).toMatchObject({ status: "completed", userId: String(admin._id), levelId: String(level._id), scope: "class" });
  });

  it("does not claim success when the SMS provider refuses every message", async () => {
    sendReportSMS.mockResolvedValue(undefined);
    const done = await settle(await publish(body(level)));
    expect(done.status).toBe("failed");
    expect(done.message).toMatch(/None of the reports could be sent/);
  });

  it("fails clearly when nobody has the contact detail needed (no email on record)", async () => {
    const done = await settle(await publish(body(level, { type: "email" })));
    expect(done.status).toBe("failed");
    expect(done.message).toMatch(/email address/);
  });

  it("asks before sending the same report cards again", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    await settle(await publish(body(level)));

    const again = await publish(body(level));
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("ALREADY_PUBLISHED");
    expect(sendReportSMS).toHaveBeenCalledTimes(1);

    const confirmed = await publish(body(level, { resend: true }));
    expect(confirmed.status).toBe(202);
    const done = await settle(confirmed);
    expect(done.resend).toBe(true);
    expect(sendReportSMS).toHaveBeenCalledTimes(2);
  });

  it("does not start a second send while one is still running", async () => {
    const running = await ReportPublication.create({
      school: school._id, session: session._id, term: term._id, level: level._id,
      scope: "class", type: "sms", requestedBy: admin._id, status: "running",
    });
    const res = await publish(body(level));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("PUBLISH_IN_PROGRESS");
    expect(res.body.publicationId).toBe(String(running._id));
  });

  it("a publication that is no longer queued is never run again", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    const res = await publish(body(level));
    await getQueue().drain();
    await getQueue().add("publish-reports", { publicationId: res.body.publicationId });
    await getQueue().drain();
    expect(sendReportSMS).toHaveBeenCalledTimes(1);
  });

  it("publishes one student's report card the same way", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    const res = await request(app)
      .post(`${base}/examinations/${exam._id}/publish`)
      .set("Authorization", `Bearer ${tok}`)
      .send({ type: "sms" });
    expect(res.status).toBe(202);
    const done = await settle(res);
    expect(done.scope).toBe("student");
    expect(String(done.examination)).toBe(String(exam._id));
    expect(done.status).toBe("completed");
  });

  it("lists what has been published for the class, newest first", async () => {
    sendReportSMS.mockResolvedValue({ status: "ok" });
    await settle(await publish(body(level)));
    const res = await request(app)
      .get(`${base}/examinations/publications?levelId=${level._id}&termId=${term._id}`)
      .set("Authorization", `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ status: "completed", scope: "class", type: "sms" });
  });

  it("no longer sends anything from a GET", async () => {
    const res = await request(app).get(`${base}/examinations/${exam._id}?publish=true&type=sms`).set("Authorization", `Bearer ${tok}`);
    expect(res.status).toBe(405);
    expect(sendReportSMS).not.toHaveBeenCalled();
  });
});
