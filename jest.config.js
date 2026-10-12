module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.js"],
  globalSetup: "<rootDir>/tests/setup/global-setup.js",
  globalTeardown: "<rootDir>/tests/setup/global-teardown.js",
  setupFiles: ["<rootDir>/tests/setup/env.js"],
  testTimeout: 30000,
};
