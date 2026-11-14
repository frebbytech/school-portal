import { describe, expect, it } from "vitest";
import { listPaths, visibleRoutes } from "./access";
import { shellRoutes } from "./routeTable";

// These lists record the screens each role could open before the route table existed
// (taken from the old Root.jsx), so a change to who sees what shows up as a test failure.
const ALL = ["Departments & Houses", "School Fees", "Messages", "Data Imports", "Users", "Events", "Announcements", "Notes Board"];
const pathsFor = (role, permissions = ALL) => listPaths(visibleRoutes(shellRoutes, { role, permissions }));

describe("route table", () => {
  it("gives teachers these screens", () => {
    expect(pathsFor("teacher")).toEqual([
      "/", "/about",
      "/announcements", "/profile", "/notes",
      "/course", "/course", "/course/assign", "/course/assign/:levelId", "/course/assign/:levelId/upload",
      "/course/level", "/course/level/:levelId", "/course/level/:levelId/reports", "/course/level/:levelId/student",
      "/course/level/:levelId/upload", "/course/level/:id/attendance", "/course/level/:id/history",
      "/events", "/events/:id",
    ]);
  });

  it("never gives teachers an administrator screen", () => {
    const teacher = pathsFor("teacher");
    for (const p of ["/session", "/level", "/student", "/teacher", "/examination", "/fee", "/messages", "/uploads", "/settings", "/users"]) {
      expect(teacher.some((x) => x === p || x.startsWith(`${p}/`))).toBe(false);
    }
  });

  it("gives administrators every administrator screen when all modules are on", () => {
    const admin = pathsFor("administrator");
    for (const p of ["/session", "/session/new", "/level", "/level/:id/history", "/subject", "/student", "/student/view/:studentId/fees", "/teacher/:id/levels", "/examination/:levelId/upload", "/fee/receipt", "/messages/new", "/uploads", "/settings", "/users/:id/permissions", "/events/:id/edit", "/departments-houses", "/announcements", "/profile", "/notes"]) {
      expect(admin).toContain(p);
    }
    expect(admin).not.toContain("/course");
  });

  it("hides module screens when the school has not switched them on", () => {
    const admin = pathsFor("administrator", []);
    for (const p of ["/fee", "/messages", "/uploads", "/users", "/events", "/departments-houses", "/announcements", "/notes"]) {
      expect(admin.some((x) => x === p || x.startsWith(`${p}/`))).toBe(false);
    }
    // These need no module.
    for (const p of ["/session", "/level", "/student", "/teacher", "/examination", "/settings", "/profile"]) {
      expect(admin).toContain(p);
    }
  });

  it("shows only the dashboard and About to someone with no recognised role", () => {
    expect(pathsFor("parent")).toEqual(["/", "/about"]);
    expect(pathsFor(undefined)).toEqual(["/", "/about"]);
  });
});
