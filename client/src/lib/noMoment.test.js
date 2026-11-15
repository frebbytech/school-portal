import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Tests run from the app folder (where package.json is).
const root = join(process.cwd(), "src");
const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(jsx?|tsx?)$/.test(n) ? [p] : [];
  });

describe("dates", () => {
  it("no screen imports moment; everything goes through lib/dates", () => {
    const bad = walk(root).filter((f) =>
      /from\s+['"]moment|require\(['"]moment|AdapterMoment/.test(readFileSync(f, "utf8"))
    );
    expect(bad).toEqual([]);
  });
});
