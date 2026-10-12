require("dotenv").config();
const app = require("./app");
const db = require("./db/DBConnection");

// Server port
const port = process.env.PORT || 8002;

// Database connection and server startup
db.asPromise()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`${signal} received: shutting down server`);
      server.close(() => {
        console.log("HTTP server closed");
        db.closeConnection();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("Unhandled Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
