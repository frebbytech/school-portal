import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { UserContext } from "@/context/providers/UserProvider";
import TeacherAdd from "./TeacherAdd";
import TeacherEdit, { teacherDefaults } from "./TeacherEdit";
import TeacherAssignLevel from "./TeacherAssignLevel";
import TeacherAssignCourse from "./TeacherAssignCourse";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock("@/components/Back", () => ({ default: () => null }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("./TeacherLevels", () => ({ default: () => null }));
vi.mock("./TeacherCourses", () => ({ default: () => null }));
vi.mock("@/components/hooks/useLevel", () => ({
  default: () => ({ levelsOption: [{ _id: "l1", type: "Basic 1" }], levelLoading: false }),
}));
vi.mock("@/components/hooks/useLevelById", () => ({
  default: () => ({ subjects: [{ _id: "s1", name: "Maths" }], levelLoading: false }),
}));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
const wrap = (ui, path, route) => (
  <QueryClientProvider client={client()}>
    <UserContext.Provider value={{ session: { sessionId: "se1", termId: "te1" } }}>
      <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={route} element={ui} />
            <Route path="/teacher/:id" element={<p>teacher page</p>} />
          </Routes>
        </MemoryRouter>
      </SchoolSessionContext.Provider>
    </UserContext.Provider>
  </QueryClientProvider>
);

const teacher = {
  _id: "t1", fullname: "Kofi Mensah", firstname: "Kofi", lastname: "Mensah", username: "kofi",
  gender: "male", email: "k@example.com", phonenumber: "0240000000", address: "Accra",
  residence: "Accra", nationality: "Ghanaian", dateofbirth: "1990-05-01T00:00:00.000Z",
};

describe("teacherDefaults", () => {
  it("has no role field and leaves a missing date empty", () => {
    const out = teacherDefaults({ ...teacher, dateofbirth: undefined });
    expect(out.role).toBeUndefined();
    expect(out.dateofbirth).toBeNull();
    expect(teacherDefaults(teacher).firstname).toBe("Kofi");
  });
});

describe("Add teacher", () => {
  it("starts with an empty date of birth, asks for the missing details and sends nothing", async () => {
    let called = false;
    server.use(http.post(`${base}/teachers`, () => ((called = true), HttpResponse.json("x", { status: 201 }))));
    render(wrap(<TeacherAdd setTab={vi.fn()} />, "/", "/"));
    expect(screen.queryByLabelText("Role")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /save teacher/i }));
    expect((await screen.findAllByText("Required*")).length).toBeGreaterThan(3);
    expect(called).toBe(false);
  });
  it("tells the administrator what the first password is", () => {
    render(wrap(<TeacherAdd setTab={vi.fn()} />, "/", "/"));
    expect(screen.getByText(/first password is their telephone number/i)).toBeInTheDocument();
  });
});

describe("Edit teacher", () => {
  const open = () => {
    server.use(http.get(`${base}/teachers/t1`, () => HttpResponse.json(teacher)));
    return render(wrap(<TeacherEdit />, "/teacher/t1/edit", "/teacher/:id/edit"));
  };
  it("keeps the form open with the server's reason when the username is taken", async () => {
    server.use(http.put(`${base}/teachers`, () => HttpResponse.json("Teacher with username 'ama' already exists! ", { status: 400 })));
    open();
    const user = await screen.findByDisplayValue("kofi");
    await userEvent.clear(user);
    await userEvent.type(user, "ama");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already exists");
    expect(screen.getByDisplayValue("ama")).toBeInTheDocument();
  });
  it("sends the edit with the teacher id, and returns to the teacher", async () => {
    let body;
    server.use(
      http.put(`${base}/teachers`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Changes Saved!!!", { status: 201 });
      })
    );
    open();
    await screen.findByDisplayValue("kofi");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText("teacher page")).toBeInTheDocument();
    expect(body._id).toBe("t1");
    expect(body.role).toBeUndefined();
  });
});

describe("Assign level and course", () => {
  const load = (data) => server.use(http.get(`${base}/teachers/t1`, () => HttpResponse.json(data)));

  it("does not allow a class for a deactivated teacher", async () => {
    load({ ...teacher, active: false });
    render(wrap(<TeacherAssignLevel />, "/teacher/t1/levels", "/teacher/:id/levels"));
    expect(await screen.findByText(/teacher is deactivated/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign Level" })).toBeDisabled();
  });
  it("assigns the chosen class and shows the server's refusal", async () => {
    load(teacher);
    let body;
    server.use(
      http.put(`${base}/levels/assign-teacher`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Level already assigned to Ama Owusu", { status: 400 });
      })
    );
    render(wrap(<TeacherAssignLevel />, "/teacher/t1/levels", "/teacher/:id/levels"));
    await userEvent.click(await screen.findByLabelText("Select a level"));
    await userEvent.click(await screen.findByRole("option", { name: "Basic 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Assign Level" }));
    await vi.waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ severity: "error" }) })));
    expect(body).toEqual({ _id: "l1", teacher: "t1" });
  });
  it("needs a class before a subject, and a deactivated teacher gets no course", async () => {
    load({ ...teacher, active: false });
    render(wrap(<TeacherAssignCourse />, "/teacher/t1/courses", "/teacher/:id/courses"));
    expect(await screen.findByText(/teacher is deactivated/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign Course" })).toBeDisabled();
  });
});
