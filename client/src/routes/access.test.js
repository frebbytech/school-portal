import { describe, expect, it } from "vitest";
import { isAllowed, listPaths, visibleRoutes } from "./access";

const table = [
  { index: true },
  { path: "/profile", roles: ["administrator", "teacher"] },
  { path: "/fee", roles: ["administrator"], permission: "School Fees", children: [{ index: true }, { path: "new" }] },
  { path: "/course", roles: ["teacher"], children: [{ index: true }, { path: "level/:levelId" }] },
  { path: "/notes", permission: "Notes Board" },
];

describe("route access", () => {
  it("allows a route with no rules for anyone", () => {
    expect(isAllowed({ path: "/x" }, { role: "teacher", permissions: [] })).toBe(true);
  });

  it("limits a route to its roles", () => {
    expect(isAllowed(table[3], { role: "teacher" })).toBe(true);
    expect(isAllowed(table[3], { role: "administrator" })).toBe(false);
    expect(isAllowed(table[3], { role: undefined })).toBe(false);
  });

  it("hides a route when the school has not switched its module on", () => {
    expect(isAllowed(table[2], { role: "administrator", permissions: [] })).toBe(false);
    expect(isAllowed(table[2], { role: "administrator", permissions: undefined })).toBe(false);
    expect(isAllowed(table[2], { role: "administrator", permissions: ["School Fees"] })).toBe(true);
  });

  it("drops a hidden route together with its children", () => {
    const paths = listPaths(visibleRoutes(table, { role: "administrator", permissions: [] }));
    expect(paths).toEqual(["/", "/profile"]);
  });

  it("builds the list a teacher and an administrator see", () => {
    const admin = listPaths(visibleRoutes(table, { role: "administrator", permissions: ["School Fees", "Notes Board"] }));
    expect(admin).toEqual(["/", "/profile", "/fee", "/fee", "/fee/new", "/notes"]);
    const teacher = listPaths(visibleRoutes(table, { role: "teacher", permissions: ["Notes Board"] }));
    expect(teacher).toEqual(["/", "/profile", "/course", "/course", "/course/level/:levelId", "/notes"]);
  });

  it("shows nothing role-specific to someone with no role", () => {
    expect(listPaths(visibleRoutes(table, { role: undefined, permissions: [] }))).toEqual(["/"]);
  });
});
