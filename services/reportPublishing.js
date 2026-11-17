const _ = require("lodash");
const {
  Types: { ObjectId },
} = require("mongoose");
const Examination = require("../models/examinationModel");
const School = require("../models/schoolModel");
const ReportPublication = require("../models/reportPublicationModel");
const generateReportTemplate = require("../config/generateReportTemplate");
const generateReport = require("../config/generateReport");
const { convertImageToBase64 } = require("../config/helper");
const { sendReportSMS } = require("../config/sms/messenger");
const { sendReportMail } = require("../config/mail/mail2");
const { getMyPosition } = require("../config/helpers/examination");
const { studentReportDetails } = require("./studentReport");
const { deliverReports, summarizeDelivery, failureMessage } = require("../common/reportDelivery");
const { logger } = require("../common/logger");
const pLimit = require("p-limit");

// Runs one queued publication: builds each student's report, sends it by SMS and/or email,
// and records what happened. Runs in the worker (or in the API process when there is no
// broker). It reports progress through `ctx.progress` and never sends the same publication
// twice: only a publication that is still "queued" can be started.

const STUDENT_FIELDS = ["firstname", "surname", "othername", "indexnumber", "phonenumber", "email", "profile", "academic"];

// Outside production only the first student is published so a test run cannot message a whole
// school. PUBLISH_MAX_STUDENTS overrides it (0 = no limit).
const studentLimit = () => {
  const configured = process.env.PUBLISH_MAX_STUDENTS;
  if (configured !== undefined && configured !== "" && Number.isInteger(Number(configured)) && Number(configured) >= 0) {
    return Number(configured);
  }
  return process.env.NODE_ENV === "production" ? 0 : 1;
};

const resultOf = (publication, extra = {}) => ({
  publicationId: String(publication._id),
  userId: String(publication.requestedBy),
  schoolId: String(publication.school),
  levelId: String(publication.level),
  scope: publication.scope,
  status: publication.status,
  message: publication.message,
  ...extra,
});

const recordsFor = async (publication) => {
  const query =
    publication.scope === "student"
      ? { _id: publication.examination }
      : { session: publication.session, term: publication.term, level: publication.level };

  return Examination.find({ ...query, school: publication.school })
    .populate("term")
    .populate({ path: "level", select: ["level", "students", "grades"] })
    .populate({ path: "student", select: STUDENT_FIELDS });
};

const finish = async (publication, fields) => {
  const updated = await ReportPublication.findByIdAndUpdate(
    publication._id,
    { ...fields, finishedAt: new Date() },
    { new: true }
  );
  return updated || publication;
};

async function runPublication(publicationId, ctx = {}) {
  const progress = ctx.progress || (() => {});

  // Claim it atomically: a second worker (or a retry) finds nothing to do.
  const publication = await ReportPublication.findOneAndUpdate(
    { _id: publicationId, status: "queued" },
    { status: "running", startedAt: new Date(), phase: "preparing", done: 0 },
    { new: true }
  );
  if (!publication) {
    const existing = await ReportPublication.findById(publicationId);
    return existing ? resultOf(existing, { skipped: true }) : { publicationId: String(publicationId), status: "failed", skipped: true };
  }

  const type = publication.type;
  try {
    const records = await recordsFor(publication);
    if (_.isEmpty(records)) {
      const done = await finish(publication, {
        status: "failed",
        phase: undefined,
        message: "No results have been entered for this class this term, so there is nothing to publish.",
      });
      return resultOf(done);
    }

    const school = await School.findById(publication.school);
    const scorePreference = records[0]?.term?.exams?.scorePreference?.split("/") || ["50", "50"];
    school.termDetails = {
      report: records[0]?.term?.report,
      class: scorePreference[0],
      exams: scorePreference[1],
      headmaster: records[0]?.term?.headmaster,
    };
    school.badge = school.badge ? await convertImageToBase64(school.badge) : "";

    // Build every student's report card figures
    const built = await Promise.all(
      records.map(async (record) => {
        const position = await getMyPosition(String(publication.term), String(publication.level), record._id);
        return studentReportDetails(record, position, "print");
      })
    );

    const max = studentLimit();
    const results = max > 0 ? _.take(built, max) : built;
    const limited = max > 0 && built.length > max;

    const limit = pLimit(5);
    let lastSaved = 0;
    const save = async (fields, force = false) => {
      const now = Date.now();
      if (!force && now - lastSaved < 1500) return;
      lastSaved = now;
      await ReportPublication.updateOne({ _id: publication._id }, fields).catch(() => {});
    };
    const report = (phase, done, total) => {
      progress({ ...resultOf(publication), status: "running", phase, done, total });
      return save({ phase, done, total });
    };

    // Email needs each report's PDF first
    const wantsEmail = type === "email" || type === "both";
    const emailTotal = results.filter((r) => r?.email && String(r.email).trim()).length;
    let prepared = 0;
    if (wantsEmail) await report("preparing", 0, emailTotal);

    const prepare = async (items) => {
      const ids = await Promise.all(
        items.map((result) =>
          limit(async () => {
            try {
              const template = await generateReportTemplate({ report: result, school });
              if (!template) return null;
              await generateReport({ id: result?.report_id, template });
              return result?.report_id;
            } catch (error) {
              logger.error("report could not be generated", { err: error });
              return null;
            } finally {
              prepared += 1;
              report("preparing", prepared, emailTotal);
            }
          })
        )
      );
      return _.compact(ids);
    };

    const outcomes = await deliverReports({
      results,
      type,
      limit,
      prepare,
      onProgress: ({ done, total }) => {
        report("sending", done, total);
      },
      send: {
        sms: (result) => sendReportSMS(result, school),
        mail: ({ fullName, email, report_id }) =>
          sendReportMail({
            school: { name: school?.name, email: school?.email, phonenumber: school?.phonenumber },
            id: report_id,
            email,
            fullName,
          }),
      },
    });

    const summary = summarizeDelivery(outcomes, { total: results.length, type });
    const note = limited
      ? ` Test mode: only the first ${max} of ${built.length} students were sent (PUBLISH_MAX_STUDENTS=0 sends to everyone).`
      : "";

    let status = "completed";
    let message = summary.message + note;
    if (summary.allFailed || summary.nobodyReachable) {
      status = "failed";
      message = failureMessage(summary, type);
    }

    const done = await finish(publication, { status, phase: undefined, summary, message, done: results.length, total: results.length });
    return resultOf(done, { summary });
  } catch (error) {
    logger.error("publishing report cards failed", { err: error, publicationId: String(publicationId) });
    const done = await finish(publication, {
      status: "failed",
      phase: undefined,
      message:
        "Publishing stopped because of a server error. Some messages may already have been sent, so check who received theirs before trying again.",
    });
    return resultOf(done);
  }
}

module.exports = { runPublication, studentLimit };
