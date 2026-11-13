import { setupServer } from "msw/node";

// Add request handlers per test with `server.use(http.get(...))`. Unhandled requests fail
// the test (see setup.js) so a screen can never silently call the real server.
export const server = setupServer();
