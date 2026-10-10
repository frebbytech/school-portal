const mongoose = require("mongoose");

// let MONGO_URL = process.env.MONGO_URL;
let MONGO_URL;

if (process.env.NODE_ENV === "production") {
  MONGO_URL =
    "mongodb+srv://akwasi:Akwasi21guy@school-portal.726ca1p.mongodb.net/SchoolDB?retryWrites=true&w=majority";

} else {
  // MONGO_URL = process.env.MONGO_URL_LOCAL;
  MONGO_URL =
    // "mongodb+srv://akwasi:Akwasi21guy@school-portal.726ca1p.mongodb.net/SchoolDB?retryWrites=true&w=majority";
  MONGO_URL = 'mongodb://127.0.0.1:27017/SchoolDB?directConnection=true';
}

const db = mongoose.createConnection(MONGO_URL);

db.on("connected", () => {
  console.log("db connected");
});

db.on("disconnected", () => {
  //console.log("db disconnected");
});

process.on("SIGINT", async () => {
  await db.close();
  process.exit(0);
});

module.exports = db;
