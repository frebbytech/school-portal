// Closes the app's database connection when a test file finishes, so Jest can exit
// without "did not exit" / open-handle warnings.
afterAll(async () => {
  try {
    await require("../../db/DBConnection").close();
  } catch (error) {
    // already closed, or never opened by this test file
  }
});
