import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { renderRoutes } from "./renderRoutes";
import { visibleRoutes } from "./access";

vi.mock("@/components/items/PageTitle", () => ({ default: () => null }));
vi.mock("@/config/Loader", () => ({ default: () => <p>loading</p> }));

const Layout = () => (
  <div>
    <h1>Fees layout</h1>
    <Outlet />
  </div>
);
const Home = () => <p>Fee home</p>;
const Pay = ({ mode }) => <p>Pay ({mode})</p>;
const Notes = () => <p>Notes page</p>;

const table = [
  { path: "/fee", roles: ["administrator"], permission: "School Fees", component: Layout, children: [
    { index: true, component: Home },
    { path: "payment", component: Pay, props: { mode: "cash" } },
  ] },
  { path: "/notes", permission: "Notes Board", component: Notes },
];

const app = (path, ctx) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/">{renderRoutes(visibleRoutes(table, ctx))}</Route>
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </MemoryRouter>
  );

const admin = { role: "administrator", permissions: ["School Fees"] };

describe("rendering the route table", () => {
  it("renders a parent page with its index child", async () => {
    app("/fee", admin);
    expect(await screen.findByText("Fees layout")).toBeInTheDocument();
    expect(await screen.findByText("Fee home")).toBeInTheDocument();
  });

  it("passes props from the table to the page", async () => {
    app("/fee/payment", admin);
    expect(await screen.findByText("Pay (cash)")).toBeInTheDocument();
  });

  it("shows not-found for a screen the person may not open", () => {
    app("/fee", { role: "teacher", permissions: ["School Fees"] });
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Fees layout")).not.toBeInTheDocument();
  });

  it("shows not-found when the school has the module switched off", () => {
    app("/notes", { role: "administrator", permissions: [] });
    expect(screen.getByText("Page not found")).toBeInTheDocument();
  });
});
