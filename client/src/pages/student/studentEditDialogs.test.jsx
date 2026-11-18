import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "@/test/server";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { StudentContext } from "@/context/providers/StudentProvider";
import MedicalInformationEdit, { medicalDefaults } from "./MedicalInformationEdit";
import ParentEdit from "./tab/ParentEdit";

vi.mock("@/components/dialog/CustomDialogTitle", () => ({ default: ({ title }) => <h2>{title}</h2> }));

const base = "http://api.test/api/frebbys/v1";
const client = () => new QueryClient({ defaultOptions: { mutations: { retry: false } } });

describe("medical defaults", () => {
  it("fills every question and the contact, and drops the student id", () => {
    const out = medicalDefaults({ id: "s1", asthma: "Yes", emergencyContact: { fullname: "Kofi" } });
    expect(out.id).toBeUndefined();
    expect(out.asthma).toBe("Yes");
    expect(out.heartDisease).toBe("No");
    expect(out.emergencyContact).toEqual({ fullname: "Kofi", phonenumber: "", address: "" });
  });
  it("copes with a student who has no medical record yet", () => {
    expect(medicalDefaults(undefined).emergencyContact.fullname).toBe("");
  });
});

describe("medical dialog", () => {
  const setup = () => {
    const dispatch = vi.fn();
    render(
      <QueryClientProvider client={client()}>
        <MemoryRouter initialEntries={["/?mi=true"]}>
          <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
            <MedicalInformationEdit
              medical={{ id: "s1", asthma: "Yes", emergencyContact: { fullname: "Kofi", phonenumber: "0240000000", address: "Accra" } }}
            />
          </SchoolSessionContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    );
    return { dispatch, user: userEvent.setup() };
  };

  it("sends the record as a medical update for this student", async () => {
    let body;
    server.use(
      http.put(`${base}/students`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json("Changes Saved!!!");
      })
    );
    const { dispatch, user } = setup();
    await user.click(await screen.findByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(body.type).toBe("medical");
    expect(body._id).toBe("s1");
    expect(body.medical.asthma).toBe("Yes");
    expect(body.medical.id).toBeUndefined();
  });

  it("shows the server's reason and stays open when refused", async () => {
    server.use(http.put(`${base}/students`, () => HttpResponse.json("Medical information is not valid.", { status: 400 })));
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Medical information is not valid.");
    expect(screen.getByText("Medical History")).toBeInTheDocument();
  });

  it("asks for the emergency contact before sending", async () => {
    let called = false;
    server.use(http.put(`${base}/students`, () => ((called = true), HttpResponse.json("ok"))));
    const { user } = setup();
    await user.clear(await screen.findByLabelText("Fullname"));
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(await screen.findByText("Required*")).toBeInTheDocument();
    expect(called).toBe(false);
  });
});

describe("parent dialog", () => {
  const parent = {
    _id: "p1",
    firstname: "Esi",
    surname: "Mensah",
    gender: "female",
    relationship: "Mother",
    phonenumber: "0240000000",
    address: "Accra",
    residence: "Accra",
    nationality: "Ghanaian",
  };
  const setup = () => {
    const dispatch = vi.fn();
    const studentDispatch = vi.fn();
    render(
      <QueryClientProvider client={client()}>
        <SchoolSessionContext.Provider value={{ schoolSessionDispatch: dispatch }}>
          <StudentContext.Provider value={{ studentState: { editParentData: { open: true, data: parent } }, studentDispatch }}>
            <ParentEdit />
          </StudentContext.Provider>
        </SchoolSessionContext.Provider>
      </QueryClientProvider>
    );
    return { dispatch, studentDispatch, user: userEvent.setup() };
  };

  it("shows the parent being edited", async () => {
    setup();
    expect(await screen.findByDisplayValue("Esi")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mensah")).toBeInTheDocument();
  });

  it("keeps the dialog open and says why when the server refuses (not a false success)", async () => {
    server.use(http.put(`${base}/parents`, () => HttpResponse.json("Error updating parent info.Try again later", { status: 404 })));
    const { dispatch, studentDispatch, user } = setup();
    await user.click(await screen.findByRole("button", { name: /save changes/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error updating parent info");
    expect(studentDispatch).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ severity: "error" }) }));
  });

  it("closes after a successful save", async () => {
    server.use(http.put(`${base}/parents`, () => HttpResponse.json("Parent information has been updated successfully!!!", { status: 201 })));
    const { studentDispatch, user } = setup();
    await user.click(await screen.findByRole("button", { name: /save changes/i }));
    await waitFor(() => expect(studentDispatch).toHaveBeenCalledWith({ type: "editParent", payload: { open: false, data: {} } }));
  });
});
