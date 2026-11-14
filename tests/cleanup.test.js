const fs = require("fs");
const path = require("path");
const request = require("supertest");
const mongoose = require("mongoose");

const app = require("../app");
const db = require("../db/DBConnection");
const Session = require("../models/sessionModel");
const Term = require("../models/termModel");
const Level = require("../models/levelModel");
const Student = require("../models/studentModel");
const Grade = require("../models/gradeModel");
const Attendance = require("../models/attendanceModel");
const CurrentFee = require("../models/currentFeeModel");
const { createSchool, createUser, staffToken } = require("./helpers");

const base = "/api/frebbys/v1";
const oid = () => new mongoose.Types.ObjectId();
const as = (req, token) => req.set("Authorization", `Bearer ${token}`);
const make = (Model, data) => new Model(data).save({ validateBeforeSave: false });

describe("cleanup and performance (Stage 10)", () => {
  describe("schemas", () => {
    // Load every model so they are all registered on the connection.
    const dir = path.join(__dirname, "..", "models");
    // academicModel.js is an unreferenced, byte-identical copy of medicalModel.js (it registers
    // the same "Medical" model), so loading both would throw; it is skipped here.
    fs.readdirSync(dir).filter((f) => f.endsWith(".js") && f !== "academicModel.js").forEach((f) => require(path.join(dir, f)));

    it("declares no index twice (the 'Duplicate schema index' warning)", () => {
      const problems = [];
      for (const name of db.modelNames()) {
        const seen = new Set();
        for (const [fields] of db.model(name).schema.indexes()) {
          const key = JSON.stringify(fields);
          if (seen.has(key)) problems.push(`${name} ${key}`);
          seen.add(key);
        }
      }
      expect(problems).toEqual([]);
    });

    it("gives each grading system its own default name", async () => {
      const a = new Grade({ school: oid() });
      const b = new Grade({ school: oid() });
      expect(a.name).not.toBe(b.name);
    });
  });

  describe("lists and history", () => {
    let school, admin, tok, session, term, level;

    beforeAll(async () => {
      school = await createSchool();
      admin = await createUser(school, "administrator");
      tok = staffToken(admin);
      session = await make(Session, { school: school._id });
      term = await make(Term, { school: school._id, session: session._id, status: "current", active: true });
      level = await make(Level, { school: school._id, session: session._id, term: term._id });
    });

    it("paginates the attendance list only when asked, keeping the same array shape", async () => {
      for (let day = 1; day <= 5; day++) {
        await make(Attendance, { level: level._id, session: session._id, term: term._id, date: new Date(`2026-10-0${day}`), status: [], active: true, createdBy: admin._id });
      }
      const all = await as(request(app).get(`${base}/attendances`), tok);
      expect(all.status).toBe(200);
      expect(all.body).toHaveLength(5);
      expect(all.headers["x-total-count"]).toBeUndefined();

      const first = await as(request(app).get(`${base}/attendances?page=1&limit=2`), tok);
      const second = await as(request(app).get(`${base}/attendances?page=2&limit=2`), tok);
      expect(first.body).toHaveLength(2);
      expect(first.headers["x-total-count"]).toBe("5");
      const ids = [...first.body, ...second.body].map((a) => a._id);
      expect(new Set(ids).size).toBe(4);
      expect((await as(request(app).get(`${base}/attendances?page=0`), tok)).status).toBe(400);
    });

    it("paginates the fee records list only when asked", async () => {
      for (let i = 0; i < 3; i++) {
        await make(CurrentFee, { school: school._id, session: session._id, term: term._id, level: level._id, student: oid(), payment: [] });
      }
      const all = await as(request(app).get(`${base}/current-fees`), tok);
      expect(all.body).toHaveLength(3);
      const page = await as(request(app).get(`${base}/current-fees?page=1&limit=2`), tok);
      expect(page.body).toHaveLength(2);
      expect(page.headers["x-total-count"]).toBe("3");
    });

    it("attendance history shows who took each register and the present/absent counts", async () => {
      const other = await createUser(school, "teacher");
      const s1 = oid();
      await make(Attendance, {
        level: level._id, session: session._id, term: term._id, date: new Date("2026-10-20"), active: true, createdBy: other._id,
        status: [{ _id: s1, status: "Present" }, { _id: oid(), status: "Absent" }, { _id: oid(), status: "Present" }],
      });
      const res = await as(request(app).get(`${base}/attendances/history/${level._id}?session=${session._id}&term=${term._id}`), tok);
      expect(res.status).toBe(200);
      const row = res.body.find((r) => r.createdBy.id === String(other._id));
      expect(row).toMatchObject({ present: 2, absent: 1 });
      expect(row.createdBy.name).toBeTruthy();
      // newest first
      const dates = res.body.map((r) => new Date(r.date).getTime());
      expect(dates).toEqual([...dates].sort((a, b) => b - a));
    });

    it("answers a bad session or term in the history query with an empty list, not an error", async () => {
      const res = await as(request(app).get(`${base}/attendances/history/${level._id}?session=bad&term=bad`), tok);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
