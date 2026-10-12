const mongoose = require("mongoose");

// The connection string must come from the environment. Never commit credentials.
//  - production:  MONGO_URL (required, the app refuses to start without it)
//  - otherwise:   MONGO_URL_LOCAL, falling back to a local unauthenticated MongoDB
const LOCAL_DEFAULT_URL = "mongodb://127.0.0.1:27017/SchoolDB?directConnection=true";

let MONGO_URL;

if (process.env.NODE_ENV === "production") {
  MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) {
    throw new Error("MONGO_URL environment variable is required in production");
  }
} else {
  MONGO_URL = process.env.MONGO_URL_LOCAL || LOCAL_DEFAULT_URL;
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
