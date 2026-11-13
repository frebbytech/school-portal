import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

// Tests run in a simulated browser (jsdom). The real API is never contacted: requests are
// answered by Mock Service Worker handlers (see src/test/server.js).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      css: false,
      env: { VITE_BASE_URL: "http://api.test/api/frebbys/v1" },
      include: ["src/**/*.test.{js,jsx}"],
    },
  })
);
