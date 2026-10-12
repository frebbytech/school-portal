// Starts a throw-away MongoDB for the test run. Tests never touch a real database.
const { MongoMemoryServer } = require("mongodb-memory-server");

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  // Picked up by db/DBConnection.js (NODE_ENV is "test", i.e. not production)
  process.env.MONGO_URL_LOCAL = mongod.getUri("school_portal_test");
};
