import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import TeacherHome from "./TeacherHome";
import TutorAssignedCourses from "./assigned/TutorAssignedCourses";
import AssignTutorLevel from "./assigned/AssignTutorLevel";

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock("@/components/custom/CustomTitle", () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock("@/components/dialog/CustomDialogTitle", () => ({ default: ({ title }) => <h2>{title}</h2> }));
vi.mock("./TeacherAdd", () => ({ default: () => null }));
// The table is not what is under test: show its rows and the buttons the screens give it
vi.mock("@/components/tables/CustomizedMaterialTable", () => ({
  default: ({ data = [], onRowClick }) => (
    <ul>
      {data.map((row) => (
        <li key={row._id}>
          <button onClick={() => onRowClick?.(row)}>{row.fullname || row.level}</button>
        </li>
      ))}
    </ul>
  ),
}));

const levelState = { levelsOption: [], levelError: null };
vi.mock("@/components/hooks/useLevel", () => ({
  default: () => ({ ...levelState, levelRefetch: vi.fn(), levelLoading: false }),
}));

const base = "http://api.test/api/frebbys/v1";
const dispatch = vi.fn();
const wrap = (ui) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
      <MemoryRouter initialEntries={["/teacher"]}>
        <Routes>
          <Route path="/teacher" element={ui} />
          <Route path="/teacher/:id" element={<p>teacher page</p>} />
        </Routes>
      </MemoryRouter>
    </SchoolSessionContext.Provider>
  </QueryClientProvider>
);

describe("teacher list", () => {
  it("opens a teacher by id only (no profile image in the address)", async () => {
    server.use(
      http.get(`${base}/teachers`, () =>
        HttpResponse.json([{ _id: "t1", fullname: "Kofi Mensah", profile: "data:image/png;base64,AAAA", active: true }])
      )
    );
    render(wrap(<TeacherHome />));
    await userEvent.click(await screen.findByRole("button", { name: "Kofi Mensah" }));
    expect(await screen.findByText("teacher page")).toBeInTheDocument();
  });

  it("says the teachers could not be loaded, and retries", async () => {
    let calls = 0;
    server.use(
      http.get(`${base}/teachers`, () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json("Server busy", { status: 500 })
          : HttpResponse.json([{ _id: "t1", fullname: "Ama Boateng", active: true }]);
      })
    );
    render(wrap(<TeacherHome />));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the teachers");
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByRole("button", { name: "Ama Boateng" })).toBeInTheDocument();
  });
});

describe("assigned courses", () => {
  it("shows a Try again banner when the courses cannot be loaded", async () => {
    server.use(http.get(`${base}/teachers/courses`, () => HttpResponse.json("No access", { status: 403 })));
    render(wrap(<TutorAssignedCourses />));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the assigned courses");
  });
});

describe("assign teacher to a class dialog", () => {
  const teachers = [
    { _id: "t1", fullname: "Kofi Mensah", active: true },
    { _id: "t2", fullname: "Old Teacher", active: false },
  ];
  const open = () => {
    server.use(http.get(`${base}/teachers`, () => HttpResponse.json(teachers)));
    return render(wrap(<AssignTutorLevel open setOpen={() => {}} />));
  };

  it("offers only active teachers and classes without a class teacher", async () => {
    levelState.levelsOption = [
      { _id: "l1", type: "Basic 1A", teacher: {} },
      { _id: "l2", type: "Basic 2A", teacher: { _id: "t9", fullName: "Someone" } },
    ];
    open();
    await userEvent.click(await screen.findByLabelText("Choose Teacher"));
    expect(await screen.findByRole("option", { name: "Kofi Mensah" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Old Teacher" })).toBeNull();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByLabelText("Class"));
    expect(await screen.findByRole("option", { name: "Basic 1A" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Basic 2A" })).toBeNull();
  });

  it("says so when every class already has a teacher", async () => {
    levelState.levelsOption = [{ _id: "l2", type: "Basic 2A", teacher: { _id: "t9" } }];
    open();
    expect(await screen.findByText("Every class already has a class teacher.")).toBeInTheDocument();
  });

  it("sends the class and teacher, and shows the server's refusal above the fields", async () => {
    levelState.levelsOption = [{ _id: "l1", type: "Basic 1A", teacher: {} }];
    let body;
    server.use(
      http.put(`${base}/levels/assign-teacher`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Level already assigned to Someone", { status: 400 });
      })
    );
    open();
    await userEvent.click(await screen.findByLabelText("Choose Teacher"));
    await userEvent.click(await screen.findByRole("option", { name: "Kofi Mensah" }));
    await userEvent.click(screen.getByLabelText("Class"));
    await userEvent.click(await screen.findByRole("option", { name: "Basic 1A" }));
    await userEvent.click(screen.getByRole("button", { name: "Assign Teacher" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already assigned");
    expect(body).toEqual({ _id: "l1", teacher: "t1" });
    await waitFor(() => expect(screen.getByLabelText("Choose Teacher")).toHaveValue("Kofi Mensah"));
  });
});
