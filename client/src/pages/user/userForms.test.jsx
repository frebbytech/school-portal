import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import UserAdd from "./UserAdd";
import UserEdit, { editDefaults } from "./UserEdit";
import UserUpdatePassword from "./UserUpdatePassword";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock("@/components/dialog/CustomDialogTitle", () => ({ default: ({ title }) => <h2>{title}</h2> }));
vi.mock("@/components/Back", () => ({ default: () => null }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));

const base = "http://api.test/api/frebbys/v1";
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const dispatch = vi.fn();
const wrap = (ui, path = "/", route = "/") => (
  <QueryClientProvider client={client()}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={ui} />
          <Route path="/users/:id" element={<p>user page</p>} />
          <Route path="/users" element={<p>users list</p>} />
        </Routes>
      </MemoryRouter>
    </SchoolSessionContext.Provider>
  </QueryClientProvider>
);

const record = {
  _id: "u1", firstname: "Kofi", lastname: "Mensah", username: "kofi", gender: "male", role: "teacher",
  email: "k@example.com", phonenumber: "0240000000", address: "Accra", residence: "Accra",
  nationality: "Ghanaian", dateofbirth: "1990-05-01T00:00:00.000Z",
};

describe("editDefaults", () => {
  it("fills every field and leaves a missing or bad date empty", () => {
    expect(editDefaults({ ...record }).dateofbirth).not.toBeNull();
    expect(editDefaults({ ...record, dateofbirth: undefined }).dateofbirth).toBeNull();
    expect(editDefaults({ ...record, dateofbirth: "nonsense" }).dateofbirth).toBeNull();
    expect(editDefaults(undefined).firstname).toBe("");
  });
});

describe("Add user", () => {
  it("asks for the missing details and sends nothing", async () => {
    let called = false;
    server.use(http.post(`${base}/users`, () => ((called = true), HttpResponse.json("x", { status: 201 }))));
    render(wrap(<UserAdd />));
    await userEvent.click(screen.getByRole("button", { name: /save user/i }));
    expect((await screen.findAllByText("Required*")).length).toBeGreaterThan(3);
    expect(called).toBe(false);
  });
  it("offers only the roles the server accepts", async () => {
    render(wrap(<UserAdd />));
    await userEvent.click(screen.getByLabelText("Role"));
    expect(await screen.findByRole("option", { name: "Administrator" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Teacher" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /director|secretary|coordinator/i })).toBeNull();
  });
  it("checks the two passwords match", async () => {
    render(wrap(<UserAdd />));
    await userEvent.type(screen.getByLabelText("Password"), "longenough1");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "different22");
    await userEvent.click(screen.getByRole("button", { name: /save user/i }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
  });
});

describe("Edit user", () => {
  const open = () => {
    server.use(http.get(`${base}/users/u1`, () => HttpResponse.json(record)));
    return render(wrap(<UserEdit />, "/users/u1/edit", "/users/:id/edit"));
  };
  it("shows the saved details", async () => {
    open();
    expect(await screen.findByDisplayValue("Kofi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0240000000")).toBeInTheDocument();
  });
  it("says why a save was refused, keeps what was typed and stays on the page", async () => {
    server.use(http.put(`${base}/users`, () => HttpResponse.json("A school must keep at least one active administrator.", { status: 409 })));
    open();
    const first = await screen.findByDisplayValue("Kofi");
    await userEvent.clear(first);
    await userEvent.type(first, "Kwame");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least one active administrator");
    expect(screen.getByDisplayValue("Kwame")).toBeInTheDocument();
    expect(screen.queryByText("user page")).toBeNull();
  });
  it("sends the edit and returns to the user", async () => {
    let body;
    server.use(
      http.put(`${base}/users`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Profile Updated!!!", { status: 201 });
      })
    );
    open();
    await screen.findByDisplayValue("Kofi");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText("user page")).toBeInTheDocument();
    expect(body._id).toBe("u1");
    expect(body.isOnlyUpdate).toBe(true);
    expect(body.firstname).toBe("Kofi");
    expect(body.dateofbirth).toMatch(/\d/);
  });
  it("shows a Try again banner when the user cannot be loaded", async () => {
    server.use(http.get(`${base}/users/u1`, () => HttpResponse.json("No User with such id", { status: 403 })));
    render(wrap(<UserEdit />, "/users/u1/edit", "/users/:id/edit"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this user");
  });
});

describe("Password reset dialog", () => {
  const Host = () => {
    const [open, setOpen] = React.useState(true);
    return (
      <>
        <button onClick={() => setOpen(false)}>shut</button>
        <button onClick={() => setOpen(true)}>reopen</button>
        <UserUpdatePassword open={open} setOpen={setOpen} />
      </>
    );
  };
  const mount = () => render(wrap(<Host />, "/users/u1/reset", "/users/:id/reset"));

  it("refuses a short password and a mismatch before sending", async () => {
    let called = false;
    server.use(http.put(`${base}/users/reset-password`, () => ((called = true), HttpResponse.json("ok"))));
    mount();
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findAllByText("Password must be at least 8 characters")).not.toHaveLength(0);
    expect(called).toBe(false);
  });
  it("sends only the id and the password, and shows the server's refusal", async () => {
    let body;
    server.use(
      http.put(`${base}/users/reset-password`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Error updating user info.Try Again Later.", { status: 404 });
      })
    );
    mount();
    await userEvent.type(screen.getByLabelText("Password"), "a-good-password");
    await userEvent.type(screen.getByLabelText("Confirm Password"), "a-good-password");
    await userEvent.click(screen.getByRole("button", { name: /update password/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error updating user info");
    expect(body).toEqual({ id: "u1", password: "a-good-password" });
  });
  it("does not keep a typed password after the dialog is closed", async () => {
    mount();
    await userEvent.type(screen.getByLabelText("Password"), "secret-typed-1");
    await userEvent.click(screen.getByRole("button", { name: "shut", hidden: true }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "reopen" }));
    expect(await screen.findByLabelText("Password")).toHaveValue("");
  });
});
