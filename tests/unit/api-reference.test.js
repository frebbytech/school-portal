const { spawnSync } = require("child_process");
const path = require("path");

it("docs/api-reference.md matches the routes (run node scripts/generate-api-reference.js to refresh it)", () => {
  const result = spawnSync("node", [path.join(__dirname, "..", "..", "scripts", "generate-api-reference.js"), "--check"], { encoding: "utf8" });
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
});
